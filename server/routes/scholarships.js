import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// POST /api/scholarships/eligible
// body: { minAverageMarks?, minAssignmentsRate?, minAttendancePercent?, department?, limit? }
router.post('/eligible', authorize('ADMIN', 'FACULTY', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { minAverageMarks = 70, department, limit = 100 } = req.body;

    // Compute average marks per student from StudentProgress (fallback to ExamResult)
    const progresses = await prisma.studentProgress.findMany({
      where: department ? { AND: [{ subject: { not: null } }, { student: { department } }] } : {},
      include: { student: true }
    });

    // group by student
    const map = new Map();
    progresses.forEach(p => {
      const arr = map.get(p.studentId) || [];
      arr.push(p);
      map.set(p.studentId, arr);
    });

    const candidates = [];
    for (const [studentId, arr] of map.entries()) {
      const avg = arr.reduce((s, it) => s + (it.marksObtained || 0), 0) / (arr.length || 1);
      if (avg >= Number(minAverageMarks)) {
        const student = arr[0].student;
        candidates.push({ id: student.id, name: `${student.firstName} ${student.lastName}`, avg, department: student.department });
      }
    }

    // fallback: if no candidates via studentProgress, try ExamResult
    if (candidates.length === 0) {
      const results = await prisma.examResult.groupBy({
        by: ['studentId'],
        _avg: { totalMarks: true },
        orderBy: { _avg: { totalMarks: 'desc' } },
        take: Number(limit)
      });
      for (const r of results) {
        if ((r._avg?.totalMarks || 0) >= Number(minAverageMarks)) {
          const stu = await prisma.user.findUnique({ where: { id: r.studentId } });
          if (stu) candidates.push({ id: stu.id, name: `${stu.firstName} ${stu.lastName}`, avg: r._avg.totalMarks, department: stu.department });
        }
      }
    }

    res.json({ success: true, data: candidates.slice(0, Number(limit)) });
  } catch (err) {
    console.error('Scholarship eligibility error', err);
    res.status(500).json({ success: false, message: 'Failed to compute eligible students' });
  }
});

// POST /api/scholarships/generate
// body: { studentIds: [], amount, type, reason, appliedById (optional) }
// creates FeeAdjustment records (negative amount = waiver)
router.post('/generate', authorize('ADMIN', 'ACCOUNTANT'), auditLog('CREATE', 'Scholarship'), async (req, res) => {
  try {
    const { studentIds = [], amount = 0, type = 'SCHOLARSHIP', reason = 'Merit based scholarship' } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds required' });
    }

    const created = [];
    const appliedById = req.user?.id || null;

    for (const sid of studentIds) {
      const adj = await prisma.feeAdjustment.create({
        data: {
          studentId: sid,
          amount: -Math.abs(Number(amount)), // negative for waiver
          type,
          reason,
          appliedById,
        }
      });
      created.push(adj);
    }

    res.status(201).json({ success: true, data: created, message: `Scholarship generated for ${created.length} students` });
  } catch (err) {
    console.error('Scholarship generate error', err);
    res.status(500).json({ success: false, message: 'Failed to generate scholarships' });
  }
});

// GET /api/scholarships/list
router.get('/list', authorize('ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const items = await prisma.feeAdjustment.findMany({ include: { student: true, appliedBy: true }, orderBy: { appliedAt: 'desc' }, take: 200 });
    res.json({ success: true, data: items });
  } catch (err) {
    console.error('Scholarship list error', err);
    res.status(500).json({ success: false, message: 'Failed to list scholarships' });
  }
});

export default router;
