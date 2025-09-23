import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// all routes require auth
router.use(authenticateToken);

/**
 * GET /api/fees/structures
 * Return fee structures
 */
router.get('/structures', async (req, res) => {
  try {
    const structures = await prisma.feeStructure.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: Array.isArray(structures) ? structures : [] });
  } catch (err) {
    console.error('Get fee structures error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch fee structures' });
  }
});

/**
 * GET /api/fees/transactions
 * Admin paging/listing endpoint
 */
router.get('/transactions', authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, mode, sortBy = 'transactionAt', sortDir = 'desc' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '20'));
    const skip = (pageNum - 1) * limitNum;

    const where= {};
    if (search) {
      where.OR = [
        { reference: { contains: String(search) } },
        { method: { contains: String(search) } },
        { feeCategory: { contains: String(search) } },
        { student: { firstName: { contains: String(search) } } },
        { student: { lastName: { contains: String(search) } } }
      ];
    }
    if (mode) where.method = String(mode);

    const [items, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: { student: { select: { id: true, firstName: true, lastName: true, studentId: true } }, fee: true },
        orderBy: { [String(sortBy)]: sortDir === 'asc' ? 'asc' : 'desc' },
        skip,
        take: limitNum
      }),
      prisma.paymentTransaction.count({ where })
    ]);

    res.json({
      success: true,
      transactions: items,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
    });
  } catch (err) {
    console.error('List transactions error', err);
    res.status(500).json({ success: false, message: 'Failed to list transactions' });
  }
});

/**
 * POST /api/fees/transactions
 * Record a payment (student or admin)
 */
router.post('/transactions', auditLog('CREATE', 'PaymentTransaction'), async (req, res) => {
  try {
    const { studentId, feeId, amount, method = 'ONLINE', reference, feeCategory } = req.body;
    if (!studentId || !amount) {
      return res.status(400).json({ success: false, message: 'studentId and amount are required' });
    }

    const txRes = await prisma.$transaction(async (tx) => {
      // create transaction
      const created = await tx.paymentTransaction.create({
        data: {
          studentId,
          feeId: feeId || null,
          amount: Number(amount),
          method: String(method),
          reference: reference ? String(reference) : null,
          feeCategory: feeCategory ? String(feeCategory) : null,
          status: 'COMPLETED'
        }
      });

      // If feeId provided update Fee paidAmount / status
      if (feeId) {
        const f = await tx.fee.findUnique({ where: { id: feeId } });
        if (f) {
          const newPaid = (f.paidAmount || 0) + Number(amount);
          const newStatus = newPaid >= (f.amount || 0) ? 'PAID' : 'PENDING';
          await tx.fee.update({ where: { id: feeId }, data: { paidAmount: newPaid, paidAt: newPaid >= (f.amount || 0) ? new Date() : f.paidAt, status: newStatus } });
        }
      }

      return created;
    });

    res.status(201).json({ success: true, data: txRes });
  } catch (err) {
    console.error('Create transaction error', err);
    res.status(500).json({ success: false, message: 'Failed to create transaction' });
  }
});

/**
 * GET /api/fees/student/:id
 * Return student fees, transactions and summary
 */
router.get('/student/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fees = await prisma.fee.findMany({ where: { studentId: id }, orderBy: { dueDate: 'asc' } });
    const transactions = await prisma.paymentTransaction.findMany({
      where: { studentId: id },
      orderBy: { transactionAt: 'desc' },
      include: { fee: true }
    });

    const summary = {
      totalAmount: fees.reduce((s, f) => s + (f.amount || 0), 0),
      totalPaid: fees.reduce((s, f) => s + (f.paidAmount || 0), 0),
      totalDue: fees.reduce((s, f) => s + (Math.max(0, (f.amount || 0) - (f.paidAmount || 0))), 0),
      overdueFees: fees.filter(f => new Date(f.dueDate) < new Date() && f.status !== 'PAID').length
    };

    res.json({ success: true, data: { student: { id }, fees, transactions, summary } });
  } catch (err) {
    console.error('Student fees error', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student fees' });
  }
});

export default router;