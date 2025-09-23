import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';
import QRCode from 'qrcode';

const router = express.Router();
const prisma = new PrismaClient();

// Create exam (ADMIN/FACULTY)
router.post('/', authenticateToken, authorize('ADMIN'), auditLog('CREATE', 'Exam'), async (req, res) => {
  try {
    const { title, type, academicYear, course } = req.body;
    const exam = await prisma.exam.create({
      data: {
        title, type, academicYear, course, createdById: req.user.id
      }
    });
    res.status(201).json({ success: true, data: exam });
  } catch (err) {
    console.error('Create exam error:', err);
    res.status(500).json({ message: 'Failed to create exam' });
  }
});

// Add: list exams (so frontend can populate "Select exam")
router.get('/', authenticateToken, async (req, res) => {
  try {
    const exams = await prisma.exam.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: exams });
  } catch (err) {
    console.error('List exams error:', err);
    res.status(500).json({ message: 'Failed to list exams' });
  }
});

// Schedule an exam session (FACULTY/ADMIN) -- allow ADMIN too
router.post('/sessions', authenticateToken, authorize('FACULTY', 'ADMIN'), auditLog('CREATE', 'ExamSession'), async (req, res) => {
  try {
    const { examId, subject, venue, hallCapacity, date, startTime, endTime, invigilatorId } = req.body;

    // Validate required fields
    if (!examId || !subject || !venue || !date || !startTime) {
      return res.status(400).json({ message: 'Missing required fields: examId, subject, venue, date, startTime' });
    }

    // Parse hallCapacity if provided (accept string or number)
    let hallCapacityInt = null;
    if (hallCapacity !== undefined && hallCapacity !== null && hallCapacity !== '') {
      const parsed = parseInt(String(hallCapacity), 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ message: 'Invalid hallCapacity. Must be a non-negative integer' });
      }
      hallCapacityInt = parsed;
    }

    // Parse dates (ensure valid Date objects)
    const parsedDate = new Date(date);
    const parsedStart = new Date(startTime);
    const parsedEnd = endTime ? new Date(endTime) : null;
    if (isNaN(parsedDate.getTime()) || isNaN(parsedStart.getTime()) || (parsedEnd && isNaN(parsedEnd.getTime()))) {
      return res.status(400).json({ message: 'Invalid date / startTime / endTime format' });
    }

    // Resolve invigilator if provided. Accept id OR employeeId OR email.
    let invigilatorUser = null;
    if (invigilatorId !== undefined && invigilatorId !== null && String(invigilatorId).trim() !== '') {
      invigilatorUser = await prisma.user.findFirst({
        where: {
          role: 'FACULTY',
          OR: [
            { id: String(invigilatorId) },
            { employeeId: String(invigilatorId) },
            { email: String(invigilatorId) }
          ]
        },
        select: { id: true, role: true }
      });

      if (!invigilatorUser) {
        return res.status(400).json({ message: 'Invigilator not found or not a faculty (provide user id, employeeId or email of a faculty)' });
      }

      // If the requester is FACULTY they should not be able to assign a different invigilator
      if (req.user.role === 'FACULTY' && invigilatorUser.id !== req.user.id) {
        return res.status(403).json({ message: 'Faculty cannot assign another faculty as invigilator' });
      }
    }

    const session = await prisma.examSession.create({
      data: {
        examId,
        subject,
        venue,
        hallCapacity: hallCapacityInt,
        date: parsedDate,
        startTime: parsedStart,
        endTime: parsedEnd || null,
        invigilatorId: invigilatorUser ? invigilatorUser.id : null
      }
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ message: 'Failed to create session' });
  }
});

// List sessions (role-aware)
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const where = {};
    // If examId provided filter by it
    if (req.query.examId) where.examId = String(req.query.examId);

    // Faculty should see sessions assigned to them OR unassigned sessions (so newly created sessions are visible)
    if (req.user.role === 'FACULTY') {
      where.OR = [
        { invigilatorId: req.user.id },
        { invigilatorId: null }
      ];
    }

    const sessions = await prisma.examSession.findMany({ where, orderBy: { date: 'asc' } });
    res.json({ data: sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ message: 'Failed to list sessions' });
  }
});

// Generate hall ticket for a student (ADMIN/FACULTY) - creates HallTicket record and returns QR/pdf placeholder
router.post('/sessions/:id/hallticket', authenticateToken, authorize('ADMIN'), auditLog('CREATE', 'HallTicket'), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { studentId } = req.body;
    // create unique ticket ref
    const ticketRef = `HT-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const ht = await prisma.hallTicket.create({
      data: { sessionId, studentId, ticketRef, approved: true } // admins issue approved tickets
    });

    // produce QR payload and dataUrl
    const qrPayload = JSON.stringify({ ticketRef, sessionId, studentId });
    const qrDataUrl = await QRCode.toDataURL(qrPayload);

    res.status(201).json({ success: true, data: ht, qr: qrDataUrl });
  } catch (err) {
    console.error('Create hall ticket error:', err);
    res.status(500).json({ message: 'Failed to create hall ticket' });
  }
});

// Upload question paper (FACULTY) - store metadata (file handling omitted; frontend should upload to storage and send path)
router.post('/question-papers', authenticateToken, authorize('FACULTY'), auditLog('CREATE', 'QuestionPaper'), async (req, res) => {
  try {
    const { examId, filename, storagePath, releaseAt } = req.body;
    const qp = await prisma.questionPaper.create({
      data: {
        examId,
        uploadedById: req.user.id,
        filename,
        storagePath,
        releaseAt: releaseAt ? new Date(releaseAt) : null,
        approved: false
      }
    });
    res.status(201).json({ success: true, data: qp });
  } catch (err) {
    console.error('Upload question paper error:', err);
    res.status(500).json({ message: 'Failed to upload question paper' });
  }
});

// Approve question paper (ADMIN)
router.post('/question-papers/:id/approve', authenticateToken, authorize('ADMIN'), auditLog('UPDATE', 'QuestionPaper'), async (req, res) => {
  try {
    const { id } = req.params;
    const qp = await prisma.questionPaper.update({ where: { id }, data: { approved: true } });
    res.json({ success: true, data: qp });
  } catch (err) {
    console.error('Approve question paper error:', err);
    res.status(500).json({ message: 'Failed to approve question paper' });
  }
});

// Mark exam attendance (FACULTY) - staff can mark (or scans create records)
router.post('/sessions/:id/attendance', authenticateToken, authorize('FACULTY'), auditLog('CREATE', 'ExamAttendance'), async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { studentId, method = 'MANUAL', status = 'PRESENT', notes } = req.body;

    // prevent duplicates
    const existing = await prisma.examAttendance.findUnique({ where: { sessionId_studentId: { sessionId, studentId } } });
    if (existing) return res.status(400).json({ message: 'Attendance already recorded' });

    const rec = await prisma.examAttendance.create({
      data: { sessionId, studentId, method, status, notes: notes || null }
    });

    res.status(201).json({ success: true, data: rec });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// Enter result (FACULTY)
router.post('/results', authenticateToken, authorize('FACULTY'), auditLog('CREATE', 'ExamResult'), async (req, res) => {
  try {
    const { examId, studentId, totalMarks, grade } = req.body;
    const upsert = await prisma.examResult.upsert({
      where: { examId_studentId: { examId, studentId } },
      update: { totalMarks: Number(totalMarks), grade, published: false },
      create: { examId, studentId, totalMarks: Number(totalMarks), grade, published: false }
    });
    res.json({ success: true, data: upsert });
  } catch (err) {
    console.error('Enter result error:', err);
    res.status(500).json({ message: 'Failed to record result' });
  }
});

// Publish results (ADMIN)
router.post('/results/:id/publish', authenticateToken, authorize('ADMIN'), auditLog('UPDATE', 'ExamResult'), async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await prisma.examResult.update({ where: { id }, data: { published: true, publishedAt: new Date() } });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Publish result error:', err);
    res.status(500).json({ message: 'Failed to publish result' });
  }
});

// Simple report: pass/fail ratio for an exam (ADMIN)
router.get('/:examId/report/pass-fail', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { examId } = req.params;
    const results = await prisma.examResult.findMany({ where: { examId } });
    const total = results.length;
    const pass = results.filter(r => r.grade && r.grade !== 'F' && r.totalMarks !== null).length;
    const fail = total - pass;
    res.json({ total, pass, fail, passRate: total ? Math.round((pass/total)*100) : 0 });
  } catch (err) {
    console.error('Pass-fail report error:', err);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

export default router;
