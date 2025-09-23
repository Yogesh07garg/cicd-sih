import express from 'express';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Create attendance session (Faculty only)
router.post('/sessions', authorize('FACULTY'), auditLog('CREATE', 'AttendanceSession'), async (req, res) => {
  try {
    const facultyId = req.user.id;
    const { subject, className, startTime, endTime, location } = req.body;

    // Generate unique QR code data
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = await prisma.attendanceSession.create({
      data: {
        subject,
        className,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location,
        qrCode: sessionId,
        facultyId,
        isActive: true
      }
    });

    res.status(201).json({
      session,
      qrCode: sessionId
    });
  } catch (error) {
    console.error('Create attendance session error:', error);
    res.status(500).json({ message: 'Failed to create attendance session' });
  }
});

// Get active sessions for faculty
router.get('/sessions/active', authorize('FACULTY'), async (req, res) => {
  try {
    const facultyId = req.user.id;

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        facultyId,
        isActive: true
      },
      include: {
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentId: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

// Generate student QR code for attendance (Student only)
router.post('/student-qr', authorize('STUDENT'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { sessionId } = req.body;

    // Verify session exists and is active
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Active session not found' });
    }

    // Generate QR code data for student
    const qrData = {
      studentId,
      sessionId,
      timestamp: Date.now(),
      studentInfo: {
        id: req.user.studentId,
        name: `${req.user.firstName} ${req.user.lastName}`
      }
    };

    const qrCodeData = JSON.stringify(qrData);
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    res.json({
      qrCode: qrCodeImage,
      data: qrData
    });
  } catch (error) {
    console.error('Generate student QR error:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// Mark attendance by scanning QR (Faculty only)
router.post('/mark', authorize('FACULTY'), auditLog('CREATE', 'AttendanceRecord'), async (req, res) => {
  try {
    const { qrData, sessionId } = req.body;
    
    let parsedData;
    try {
      parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid QR code data' });
    }

    // Verify session belongs to the faculty
    const session = await prisma.attendanceSession.findFirst({
      where: {
        id: sessionId,
        facultyId: req.user.id,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found or not authorized' });
    }

    // Check if attendance already marked
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: parsedData.studentId
        }
      }
    });

    if (existingRecord) {
      return res.status(400).json({ message: 'Attendance already marked for this student' });
    }

    // Mark attendance
    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId: parsedData.studentId,
        isPresent: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentId: true
          }
        }
      }
    });

    // Notify student via socket.io
    const io = req.app.get('io');
    io.to(`user-${parsedData.studentId}`).emit('attendance_marked', {
      subject: session.subject,
      markedAt: attendanceRecord.markedAt
    });

    res.json({
      message: 'Attendance marked successfully',
      record: attendanceRecord
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// Close attendance session (Faculty only)
router.put('/sessions/:id/close', authorize('FACULTY'), auditLog('UPDATE', 'AttendanceSession'), async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;

    const session = await prisma.attendanceSession.update({
      where: {
        id,
        facultyId
      },
      data: {
        isActive: false,
        endTime: new Date()
      }
    });

    res.json({
      message: 'Session closed successfully',
      session
    });
  } catch (error) {
    console.error('Close session error:', error);
    res.status(500).json({ message: 'Failed to close session' });
  }
});

// Get attendance records for student
router.get('/student-records', authorize('STUDENT'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      include: {
        session: {
          select: {
            subject: true,
            className: true,
            sessionDate: true,
            faculty: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { markedAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    res.json(records);
  } catch (error) {
    console.error('Get student records error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

export default router;