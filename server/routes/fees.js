import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Validation helper functions
const validateFeeStructure = (data) => {
  const errors = [];
  if (!data.name || data.name.trim().length === 0) errors.push('Name is required');
  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) errors.push('Valid amount is required');
  if (!data.academicYear || data.academicYear.trim().length === 0) errors.push('Academic year is required');
  if (!data.course || data.course.trim().length === 0) errors.push('Course is required');
  return errors;
};

const validatePaymentTransaction = (data) => {
  const errors = [];
  if (!data.studentId && !data.studentIdentifier) errors.push('Student identifier is required');
  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) errors.push('Valid amount is required');
  return errors;
};

// Public: list fee structures with optional filtering
router.get('/structures', authenticateToken, async (req, res) => {
  try {
    const { course, academicYear, year } = req.query;
    
    const where = {};
    if (course) where.course = String(course);
    if (academicYear) where.academicYear = String(academicYear);
    if (year) where.year = String(year);

    const structures = await prisma.feeStructure.findMany({ 
      where,
      orderBy: { createdAt: 'desc' } 
    });
    
    res.json({ success: true, data: structures });
  } catch (error) {
    console.error('Get fee structures error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee structures' });
  }
});

// Admin: create fee structure
router.post('/structures', authenticateToken, authorize('ADMIN'), auditLog('CREATE', 'FeeStructure'), async (req, res) => {
  try {
    const validationErrors = validateFeeStructure(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: validationErrors });
    }

    const { name, description, amount, academicYear, course, year } = req.body;
    
    const structure = await prisma.feeStructure.create({
      data: { 
        name: name.trim(), 
        description: description?.trim(), 
        amount: parseFloat(amount), 
        academicYear, 
        course, 
        year: year || null 
      }
    });
    
    res.status(201).json({ success: true, data: structure });
  } catch (error) {
    console.error('Create fee structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to create fee structure' });
  }
});

// Admin: update fee structure
router.put('/structures/:id', authenticateToken, authorize('ADMIN'), auditLog('UPDATE', 'FeeStructure'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if structure exists
    const existingStructure = await prisma.feeStructure.findUnique({ where: { id } });
    if (!existingStructure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }

    const data = { ...req.body };
    if (data.amount) data.amount = parseFloat(data.amount);
    
    const updated = await prisma.feeStructure.update({ 
      where: { id }, 
      data 
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update fee structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fee structure' });
  }
});

// Admin: delete fee structure
router.delete('/structures/:id', authenticateToken, authorize('ADMIN'), auditLog('DELETE', 'FeeStructure'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if structure exists
    const structure = await prisma.feeStructure.findUnique({ where: { id } });
    
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Fee structure not found' });
    }
    
    // Note: there is no direct relation from Fee to FeeStructure in the schema.
    // If you later add a relation, prefer checking for associated fees here before deleting.
    await prisma.feeStructure.delete({ where: { id } });
    
    res.json({ success: true, message: 'Fee structure deleted successfully' });
  } catch (error) {
    console.error('Delete fee structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete fee structure' });
  }
});

// Get student's fee summary and transactions
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization: students can only view their own data
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this student\'s fees' });
    }

    const [fees, transactions, student] = await Promise.all([
      prisma.fee.findMany({
        where: { studentId },
        orderBy: { dueDate: 'asc' }
      }),
      prisma.paymentTransaction.findMany({
        where: { studentId },
        orderBy: { transactionAt: 'desc' },
        take: 50,
        include: {
          fee: { select: { feeType: true } }
        }
      }),
      prisma.user.findUnique({
        where: { id: studentId },
        select: { firstName: true, lastName: true, studentId: true, email: true, department: true }
      })
    ]);

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Calculate summary
    const totalDue = fees.reduce((acc, fee) => acc + (fee.amount - (fee.paidAmount || 0)), 0);
    const totalPaid = fees.reduce((acc, fee) => acc + (fee.paidAmount || 0), 0);
    const totalAmount = fees.reduce((acc, fee) => acc + fee.amount, 0);
    const overdueFees = fees.filter(fee => fee.status === 'OVERDUE').length;

    res.json({
      success: true,
      data: {
        student,
        summary: { totalDue, totalPaid, totalAmount, overdueFees, totalFees: fees.length },
        fees,
        transactions
      }
    });
  } catch (error) {
    console.error('Get student fees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch student fees' });
  }
});

// Get payment transactions with advanced filtering
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const role = req.user?.role;
    if (role !== 'ACCOUNTANT' && role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions' });
    }

    const {
      page = 1,
      limit = 20,
      search = '',
      method,
      status,
      startDate,
      endDate,
      sortBy = 'transactionAt',
      sortDir = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (method) where.method = String(method);
    if (status) where.status = String(status);
    
    // Date range filter
    if (startDate || endDate) {
      where.transactionAt = {};
      if (startDate) where.transactionAt.gte = new Date(startDate);
      if (endDate) where.transactionAt.lte = new Date(endDate);
    }
    
    // Search filter
    if (search) {
      const searchTerm = String(search);
      where.OR = [
        { reference: { contains: searchTerm, mode: 'insensitive' } },
        { fee: { feeType: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { studentId: { contains: searchTerm, mode: 'insensitive' } } },
        { student: { email: { contains: searchTerm, mode: 'insensitive' } } }
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          student: { 
            select: { id: true, firstName: true, lastName: true, studentId: true, email: true, department: true } 
          },
          fee: { select: { id: true, feeType: true, amount: true } }
        },
        orderBy: { [String(sortBy)]: String(sortDir).toLowerCase() === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limitNum
      }),
      prisma.paymentTransaction.count({ where })
    ]);

    // return feeCategory is a scalar on the transaction; it will be present in transactions
    res.json({
      success: true,
      data: {
        transactions,
        pagination: { 
          total, 
          page: pageNum, 
          pages: Math.ceil(total / limitNum),
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// Record a payment transaction
router.post('/transactions', authenticateToken, auditLog('CREATE', 'PaymentTransaction'), async (req, res) => {
  try {
    const validationErrors = validatePaymentTransaction(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: validationErrors });
    }

    const { studentId: providedStudentId, studentIdentifier, feeId, amount, method, reference, feeCategory } = req.body;
    const identifier = providedStudentId || studentIdentifier;

    // Resolve student
    const student = await prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { studentId: identifier },
          { email: identifier }
        ],
        role: 'STUDENT'
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Authorization check
    const userRole = req.user.role;
    if (userRole === 'STUDENT' && req.user.id !== student.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to record transactions for other students' });
    }
    
    if (!['ACCOUNTANT', 'ADMIN', 'STUDENT'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Not authorized to record transactions' });
    }

    const parsedAmount = parseFloat(amount);
    
    // Validate fee if provided
    if (feeId) {
      const fee = await prisma.fee.findUnique({ where: { id: feeId } });
      if (!fee) {
        return res.status(404).json({ success: false, message: 'Fee not found' });
      }
      if (fee.studentId !== student.id) {
        return res.status(400).json({ success: false, message: 'Fee does not belong to the specified student' });
      }
    }

    // Create transaction within a transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.paymentTransaction.create({
        data: {
          studentId: student.id,
          feeId: feeId || null,
          amount: parsedAmount,
          method: method || 'OFFLINE',
          reference: reference || null,
          feeCategory: feeCategory || null,
          status: 'COMPLETED'
        },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, studentId: true } },
          fee: { select: { id: true, feeType: true } }
        }
      });

      // Update fee status if linked to a fee
      if (feeId) {
        const fee = await tx.fee.findUnique({ where: { id: feeId } });
        if (fee) {
          const newPaidAmount = (fee.paidAmount || 0) + parsedAmount;
          const isFullyPaid = newPaidAmount >= fee.amount;
          const isOverdue = !isFullyPaid && new Date() > new Date(fee.dueDate);
          
          const newStatus = isFullyPaid ? 'PAID' : (isOverdue ? 'OVERDUE' : 'PENDING');
          const paidAt = isFullyPaid ? new Date() : fee.paidAt;

          await tx.fee.update({
            where: { id: feeId },
            data: { 
              paidAmount: newPaidAmount, 
              paidAt, 
              status: newStatus 
            }
          });
        }
      }

      return transaction;
    });

    res.status(201).json({ 
      success: true, 
      message: 'Payment transaction recorded successfully', 
      data: result 
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to record transaction' });
  }
});

// Get outstanding dues summary
router.get('/outstanding/summary', authenticateToken, authorize('ACCOUNTANT', 'ADMIN'), async (req, res) => {
  try {
    const [feeSummary, departmentSummary] = await Promise.all([
      // Overall summary
      prisma.fee.aggregate({
        _sum: { amount: true, paidAmount: true },
        _count: { id: true }
      }),
      
      // Department-wise summary using Prisma's groupBy
      prisma.fee.groupBy({
        by: ['student.department'],
        where: {
          student: { role: 'STUDENT' }
        },
        _sum: {
          amount: true,
          paidAmount: true
        },
        _count: { id: true }
      })
    ]);

    const totalAmount = feeSummary._sum.amount || 0;
    const totalPaid = feeSummary._sum.paidAmount || 0;
    const totalOutstanding = Math.max(0, totalAmount - totalPaid);
    const totalFees = feeSummary._count.id || 0;

    const byDepartment = departmentSummary.map(dept => ({
      department: dept.student?.department || 'UNSPECIFIED',
      total: dept._sum.amount || 0,
      paid: dept._sum.paidAmount || 0,
      outstanding: Math.max(0, (dept._sum.amount || 0) - (dept._sum.paidAmount || 0)),
      feeCount: dept._count.id || 0
    }));

    // Get overdue fees count
    const overdueCount = await prisma.fee.count({
      where: { status: 'OVERDUE' }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalAmount,
          totalPaid,
          totalOutstanding,
          totalFees,
          overdueFees: overdueCount
        },
        byDepartment
      }
    });
  } catch (error) {
    console.error('Outstanding summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute outstanding summary' });
  }
});

// Get transaction statistics for dashboard
router.get('/statistics', authenticateToken, authorize('ACCOUNTANT', 'ADMIN'), async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year
    
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    const [recentTransactions, totalCollected, transactionCount] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: {
          transactionAt: { gte: startDate },
          status: 'COMPLETED'
        }
      }),
      prisma.paymentTransaction.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      }),
      prisma.paymentTransaction.count({
        where: { status: 'COMPLETED' }
      })
    ]);

    res.json({
      success: true,
      data: {
        period: String(period),
        recentAmount: recentTransactions._sum.amount || 0,
        totalCollected: totalCollected._sum.amount || 0,
        totalTransactions: transactionCount,
        startDate: startDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

export default router;