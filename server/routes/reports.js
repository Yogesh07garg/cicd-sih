import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

/**
 * GET /api/reports/finance
 * Returns simple monthly totals for last N months
 */
router.get('/finance', async (req, res) => {
  try {
    const months = parseInt(String(req.query.months || '6'));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const txs = await prisma.paymentTransaction.findMany({
      where: { transactionAt: { gte: start }, status: 'COMPLETED' },
      orderBy: { transactionAt: 'asc' }
    });

    // Aggregate by YYYY-MM
    const map = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = 0;
    }

    txs.forEach(t => {
      const d = new Date(t.transactionAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + (t.amount || 0);
    });

    const data = Object.keys(map).map(k => ({ month: k, total: map[k] || 0 }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Finance report error', err);
    res.status(500).json({ success: false, message: 'Failed to generate finance report' });
  }
});

/**
 * GET /api/reports/enrollment
 * Returns counts per department for students
 */
router.get('/enrollment', async (req, res) => {
  try {
    const rows = await prisma.user.groupBy({
      by: ['department'],
      where: { role: 'STUDENT' },
      _count: { department: true }
    });

    // normalize
    const data = rows.map(r => ({ department: r.department || 'Unknown', count: r._count.department || 0 }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Enrollment report error', err);
    res.status(500).json({ success: false, message: 'Failed to generate enrollment report' });
  }
});

/**
 * GET /api/reports/fee-distribution
 * Returns distribution of fees by category
 */
router.get('/fee-distribution', async (req, res) => {
  try {
    const rows = await prisma.paymentTransaction.groupBy({
      by: ['feeCategory'],
      _sum: { amount: true }
    });

    const data = rows.map(r => ({ category: r.feeCategory || 'Uncategorized', total: r._sum?.amount || 0 }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('Fee distribution error', err);
    res.status(500).json({ success: false, message: 'Failed to generate fee distribution' });
  }
});

export default router;
    