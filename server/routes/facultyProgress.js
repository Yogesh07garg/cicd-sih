import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/faculty/progress/students
// Return list of students with aggregated progress metrics (avg %, assignments submitted)
router.get('/students', authorize('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    // fetch students
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, firstName: true, lastName: true, studentId: true, department: true }
    });

    // For each student, compute aggregates (batch queries would be better for large data)
    const summaries = await Promise.all(students.map(async (s) => {
      const progAgg = await prisma.studentProgress.aggregate({
        _avg: { marksObtained: true, totalMarks: true },
        _sum: { assignmentsSubmitted: true, assignmentsTotal: true },
        where: { studentId: s.id }
      });

      const assignmentsCount = await prisma.assignmentSubmission.count({ where: { studentId: s.id } });

      // compute average percentage: sum(marks)/sum(total) if available
      const progresses = await prisma.studentProgress.findMany({
        where: { studentId: s.id },
        select: { marksObtained: true, totalMarks: true }
      });

      let avgPercent = 0;
      if (progresses.length > 0) {
        const totalObtained = progresses.reduce((acc, p) => acc + (p.marksObtained || 0), 0);
        const totalPossible = progresses.reduce((acc, p) => acc + (p.totalMarks || 0), 0);
        if (totalPossible > 0) avgPercent = Math.round((totalObtained / totalPossible) * 100);
      }

      return {
        student: s,
        averagePercent: avgPercent,
        assignmentsSubmitted: progAgg._sum.assignmentsSubmitted || 0,
        assignmentsTotal: progAgg._sum.assignmentsTotal || 0,
        assignmentsCount
      };
    }));

    res.json({ success: true, students: summaries });
  } catch (err) {
    console.error('Faculty progress - list students error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student progress summaries' });
  }
});

// GET /api/faculty/progress/student/:id
// Return detailed progress entries and assignment submissions for a student
router.get('/student/:id', authorize('FACULTY', 'ADMIN'), async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, studentId: true, department: true }
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const progress = await prisma.studentProgress.findMany({
      where: { studentId },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const assignments = await prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { submittedAt: 'desc' }
    });

    res.json({ success: true, data: { student, progress, assignments } });
  } catch (err) {
    console.error('Faculty progress - student detail error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student detail' });
  }
});

// POST /api/faculty/progress/student/:id
// Add a progress entry (FACULTY only)
router.post('/student/:id', authorize('FACULTY'), async (req, res) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;
    const { subject, marksObtained, totalMarks, assignmentsSubmitted = 0, assignmentsTotal = 0, notes } = req.body;

    if (!subject || marksObtained === undefined || totalMarks === undefined) {
      return res.status(400).json({ success: false, message: 'subject, marksObtained and totalMarks are required' });
    }

    const created = await prisma.studentProgress.create({
      data: {
        studentId,
        subject: String(subject),
        marksObtained: Number(marksObtained),
        totalMarks: Number(totalMarks),
        assignmentsSubmitted: Number(assignmentsSubmitted),
        assignmentsTotal: Number(assignmentsTotal),
        teacherId,
        notes: notes ? String(notes) : null
      }
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('Faculty progress - create entry error:', err);
    res.status(500).json({ success: false, message: 'Failed to create progress entry' });
  }
});

// POST /api/faculty/progress/student/:id/assignment
// Add an assignment submission entry (FACULTY only)
router.post('/student/:id/assignment', authorize('FACULTY'), async (req, res) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;
    const { title, submittedAt, marks, maxMarks, remarks } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'title is required' });

    const created = await prisma.assignmentSubmission.create({
      data: {
        studentId,
        teacherId,
        title: String(title),
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
        marks: marks !== undefined ? Number(marks) : null,
        maxMarks: maxMarks !== undefined ? Number(maxMarks) : null,
        remarks: remarks ? String(remarks) : null
      }
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('Faculty progress - add assignment error:', err);
    res.status(500).json({ success: false, message: 'Failed to add assignment submission' });
  }
});

export default router;
