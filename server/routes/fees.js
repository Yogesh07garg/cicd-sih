import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Public: list fee structures
router.get('/structures', authenticateToken, async (req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(structures);
  } catch (error) {
    console.error('Get fee structures error:', error);
    res.status(500).json({ message: 'Failed to fetch fee structures' });
  }
});

// Admin: create fee structure
router.post('/structures', authenticateToken, authorize('ADMIN'), auditLog('CREATE', 'FeeStructure'), async (req, res) => {
  try {
    const { name, description, amount, academicYear, course, year } = req.body;
    const structure = await prisma.feeStructure.create({
      data: { name, description, amount: parseFloat(amount), academicYear, course, year }
    });
    res.status(201).json(structure);
  } catch (error) {
    console.error('Create fee structure error:', error);
    res.status(500).json({ message: 'Failed to create fee structure' });
  }
});

// Accountant/Admin: update fee structure
router.put('/structures/:id', authenticateToken, authorize('ADMIN'), auditLog('UPDATE', 'FeeStructure'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (data.amount) data.amount = parseFloat(data.amount);
    const updated = await prisma.feeStructure.update({ where: { id }, data });
    res.json(updated);
  } catch (error) {
    console.error('Update fee structure error:', error);
    res.status(500).json({ message: 'Failed to update fee structure' });
  }
});

// Get student's fee summary and transactions (student can view own; admin/accountant can view any)
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;

    // authorization: students can only view own
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fees = await prisma.fee.findMany({
      where: { studentId },
      orderBy: { dueDate: 'asc' }
    });

    const transactions = await prisma.paymentTransaction.findMany({
      where: { studentId },
      orderBy: { transactionAt: 'desc' },
      take: 50
    });

    // compute totals
    const totalDue = fees.reduce((acc, f) => acc + (f.amount - (f.paidAmount || 0)), 0);

    res.json({ fees, transactions, totalDue });
  } catch (error) {
    console.error('Get student fees error:', error);
    res.status(500).json({ message: 'Failed to fetch student fees' });
  }
});

// Record a payment transaction
router.post('/transactions', authenticateToken, auditLog('CREATE', 'PaymentTransaction'), async (req, res) => {
  try {
    const { studentId, feeId, amount, method, reference } = req.body;
    // basic auth: accountant or the student themself
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const txn = await prisma.paymentTransaction.create({
      data: {
        studentId,
        feeId: feeId || null,
        amount: parseFloat(amount),
        method: method || 'OFFLINE',
        reference: reference || null,
        status: 'COMPLETED'
      }
    });

    // If linked to a Fee, update paidAmount and status
    if (feeId) {
      const fee = await prisma.fee.findUnique({ where: { id: feeId } });
      if (fee) {
        const newPaid = (fee.paidAmount || 0) + parseFloat(amount);
        const newStatus = newPaid >= fee.amount ? 'PAID' : (new Date() > new Date(fee.dueDate) ? 'OVERDUE' : 'PENDING');
        await prisma.fee.update({
          where: { id: feeId },
          data: { paidAmount: newPaid, paidAt: newPaid >= fee.amount ? new Date() : fee.paidAt, status: newStatus }
        });
      }
    }

    res.status(201).json({ message: 'Transaction recorded', transaction: txn });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Failed to record transaction' });
  }
});

// Get outstanding dues aggregate (admin/accountant)
router.get('/outstanding/summary', authenticateToken, authorize('ACCOUNTANT'), async (req, res) => {
  try {
    // total pending amount
    const pending = await prisma.fee.aggregate({
      _sum: { amount: true, paidAmount: true },
      where: { status: { in: ['PENDING', 'OVERDUE'] } }
    });

    const totalAmount = pending._sum?.amount || 0;
    const totalPaid = pending._sum?.paidAmount || 0;
    const totalOutstanding = Math.max(0, totalAmount - totalPaid);

    // per-department outstanding (simple approach)
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { department: true, id: true }
    });
    const departments = Array.from(new Set(students.map(s => s.department || 'UNSPECIFIED')));

    const byDept = [];
    for (const dept of departments) {
      const studentIds = students.filter(s => (s.department || 'UNSPECIFIED') === dept).map(s => s.id);
      if (studentIds.length === 0) continue;
      const agg = await prisma.fee.aggregate({
        _sum: { amount: true, paidAmount: true },
        where: { studentId: { in: studentIds } }
      });
      const amt = agg._sum?.amount || 0;
      const paid = agg._sum?.paidAmount || 0;
      byDept.push({ department: dept, total: amt, paid, outstanding: Math.max(0, amt - paid) });
    }

    res.json({ totalAmount, totalPaid, totalOutstanding, byDept });
  } catch (error) {
    console.error('Outstanding summary error:', error);
    res.status(500).json({ message: 'Failed to compute outstanding summary' });
  }
});

export default router;
