import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Enrollment by department & year
router.get('/enrollment', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    // group by department
    const depts = await prisma.user.groupBy({
      by: ['department'],
      where: { role: 'STUDENT' },
      _count: { id: true }
    });

    // simple year-wise using studentId pattern or custom field (if available)
    res.json({ byDepartment: depts.map(d => ({ department: d.department || 'UNSPECIFIED', count: d._count.id })) });
  } catch (error) {
    console.error('Enrollment report error:', error);
    res.status(500).json({ message: 'Failed to generate enrollment report' });
  }
});

// Attendance analytics: overall and department-wise
router.get('/attendance', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const totalRecords = await prisma.attendanceRecord.count();
    const present = await prisma.attendanceRecord.count({ where: { isPresent: true } });
    const overallRate = totalRecords > 0 ? Math.round((present / totalRecords) * 100) : 0;

    // department-wise
    const students = await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true, department: true } });
    const departments = Array.from(new Set(students.map(s => s.department || 'UNSPECIFIED')));
    const byDept = [];
    for (const dept of departments) {
      const ids = students.filter(s => (s.department || 'UNSPECIFIED') === dept).map(s => s.id);
      if (!ids.length) continue;
      const deptTotal = await prisma.attendanceRecord.count({ where: { studentId: { in: ids } } });
      const deptPresent = await prisma.attendanceRecord.count({ where: { studentId: { in: ids }, isPresent: true } });
      const rate = deptTotal > 0 ? Math.round((deptPresent / deptTotal) * 100) : 0;
      byDept.push({ department: dept, total: deptTotal, present: deptPresent, rate });
    }

    res.json({ overallRate, byDept });
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ message: 'Failed to generate attendance report' });
  }
});

// Finance trends: monthly revenue for past N months
// Allow ACCOUNTANT and ADMIN (Admin should be able to view trends)
router.get('/finance/trends', authenticateToken, async (req, res) => {
  try {
    // authorize: allow accountant or admin
    const role = req.user?.role;
    if (role !== 'ACCOUNTANT' && role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const months = parseInt(req.query.months || '6');
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0,0,0,0);

    const txns = await prisma.paymentTransaction.findMany({
      where: { status: 'COMPLETED', transactionAt: { gte: since } },
      select: { amount: true, transactionAt: true }
    });

    const buckets = {};
    txns.forEach(t => {
      const d = new Date(t.transactionAt);
      const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
      buckets[key] = (buckets[key] || 0) + t.amount;
    });

    // ensure months order
    const labels = [];
    const data = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
      labels.push(key);
      data.push(buckets[key] || 0);
    }

    res.json({ labels, data });
  } catch (error) {
    console.error('Finance trends error:', error);
    res.status(500).json({ message: 'Failed to generate finance trends' });
  }
});

// Outstanding dues per student (paginated)
router.get('/outstanding', authenticateToken, authorize('ACCOUNTANT'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Find students with outstanding > 0
    const fees = await prisma.fee.findMany({
      where: {},
      select: { studentId: true, amount: true, paidAmount: true },
    });

    const map = {};
    fees.forEach(f => {
      map[f.studentId] = (map[f.studentId] || 0) + Math.max(0, f.amount - (f.paidAmount || 0));
    });

    const items = Object.entries(map).map(([studentId, outstanding]) => ({ studentId, outstanding })).filter(i => i.outstanding > 0);
    const total = items.length;
    const paged = items.sort((a,b)=>b.outstanding - a.outstanding).slice(skip, skip + limitNum);

    // enrich with student info
    const studentIds = paged.map(p => p.studentId);
    const students = await prisma.user.findMany({ where: { id: { in: studentIds } }, select: { id: true, firstName: true, lastName: true, department: true, studentId: true } });
    const results = paged.map(p => ({ ...p, student: students.find(s => s.id === p.studentId) }));

    res.json({ results, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Outstanding report error:', error);
    res.status(500).json({ message: 'Failed to generate outstanding report' });
  }
});

export default router;
