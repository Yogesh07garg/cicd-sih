import express from 'express';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Generate Teacher QR Code
router.post('/teacher/generate-qr', authorize('FACULTY'), auditLog('CREATE', 'TeacherQRCode'), async (req, res) => {
  try {
    const teacherId = req.user.id;
    
    // Generate unique QR data for teacher
    const qrData = `TEACHER_${teacherId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Upsert teacher QR code
    const teacherQR = await prisma.teacherQRCode.upsert({
      where: { teacherId },
      update: {
        qrCodeData: qrData,
        generatedAt: new Date(),
        isActive: true
      },
      create: {
        teacherId,
        qrCodeData: qrData,
        isActive: true
      }
    });

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      qrCode: qrCodeImage,
      qrData: qrData,
      teacherInfo: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        employeeId: req.user.employeeId,
        department: req.user.department
      }
    });
  } catch (error) {
    console.error('Generate teacher QR error:', error);
    res.status(500).json({ message: 'Failed to generate teacher QR code' });
  }
});

// Teacher scans their QR to start class
router.post('/teacher/start-class', authorize('FACULTY'), auditLog('CREATE', 'ClassSession'), async (req, res) => {
  try {
    const { subject, className, location, latitude, longitude, attendanceWindow = 5 } = req.body;
    const teacherId = req.user.id;

    // Verify teacher's QR code exists
    const teacherQR = await prisma.teacherQRCode.findUnique({
      where: { teacherId }
    });

    if (!teacherQR || !teacherQR.isActive) {
      return res.status(400).json({ message: 'Please generate your teacher QR code first' });
    }

    // Generate unique session QR data
    const sessionQRData = `SESSION_${teacherId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    // Create class session
    const session = await prisma.classSession.create({
      data: {
        teacherId,
        subject,
        className,
        sessionQRData,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        attendanceWindow: parseInt(attendanceWindow),
        isActive: true
      }
    });

    // Update teacher QR last used time
    await prisma.teacherQRCode.update({
      where: { teacherId },
      data: { lastUsedAt: new Date() }
    });

    // Generate session QR code for students
    const sessionQRImage = await QRCode.toDataURL(sessionQRData);

    // Emit socket event for real-time notifications
    const io = req.app.get('io');
    if (io) {
      io.emit('class_session_started', {
        subject,
        className,
        teacherId,
        sessionId: session.id
      });
    }

    res.status(201).json({
      success: true,
      session,
      sessionQR: sessionQRImage,
      sessionQRData,
      message: 'Class session started successfully'
    });
  } catch (error) {
    console.error('Start class session error:', error);
    res.status(500).json({ message: 'Failed to start class session' });
  }
});

// End class session
router.post('/teacher/end-class/:sessionId', authorize('FACULTY'), auditLog('UPDATE', 'ClassSession'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.user.id;

    const session = await prisma.classSession.update({
      where: {
        id: sessionId,
        teacherId // Ensure teacher can only end their own sessions
      },
      data: {
        endTime: new Date(),
        isActive: false
      },
      include: {
        studentAttendance: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                studentId: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      session,
      totalStudents: session.studentAttendance.length,
      message: 'Class session ended successfully'
    });
  } catch (error) {
    console.error('End class session error:', error);
    res.status(500).json({ message: 'Failed to end class session' });
  }
});

// Get teacher's active sessions
router.get('/teacher/active-sessions', authorize('FACULTY'), async (req, res) => {
  try {
    const teacherId = req.user.id;

    const sessions = await prisma.classSession.findMany({
      where: {
        teacherId,
        isActive: true
      },
      include: {
        studentAttendance: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                studentId: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ message: 'Failed to fetch active sessions' });
  }
});

// Generate Student QR Code
router.post('/student/generate-qr', authorize('STUDENT'), auditLog('CREATE', 'StudentQRCode'), async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Generate unique QR data for student
    const qrData = `STUDENT_${studentId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Upsert student QR code
    const studentQR = await prisma.studentQRCode.upsert({
      where: { studentId },
      update: {
        qrCodeData: qrData,
        generatedAt: new Date(),
        isActive: true
      },
      create: {
        studentId,
        qrCodeData: qrData,
        isActive: true
      }
    });

    // Generate QR code image
    const qrCodeImage = await QRCode.toDataURL(qrData);

    res.json({
      success: true,
      qrCode: qrCodeImage,
      qrData: qrData,
      studentInfo: {
        name: `${req.user.firstName} ${req.user.lastName}`,
        studentId: req.user.studentId,
        department: req.user.department
      }
    });
  } catch (error) {
    console.error('Generate student QR error:', error);
    res.status(500).json({ message: 'Failed to generate student QR code' });
  }
});

// Student marks attendance by scanning session QR
router.post('/student/mark-attendance', authorize('STUDENT'), auditLog('CREATE', 'StudentClassAttendance'), async (req, res) => {
  try {
    const { sessionQRData, latitude, longitude, deviceInfo } = req.body;
    const studentId = req.user.id;

    // Find the session
    const session = await prisma.classSession.findUnique({
      where: { sessionQRData }
    });

    if (!session) {
      return res.status(404).json({ message: 'Invalid session QR code' });
    }

    if (!session.isActive) {
      return res.status(400).json({ message: 'This class session has ended' });
    }

    // Check if attendance window is still open
    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const windowEnd = new Date(sessionStart.getTime() + (session.attendanceWindow * 60 * 1000));

    if (now > windowEnd) {
      return res.status(400).json({ 
        message: `Attendance window has closed. Window was ${session.attendanceWindow} minutes.` 
      });
    }

    // Verify student's QR code exists and is active
    const studentQR = await prisma.studentQRCode.findUnique({
      where: { studentId }
    });

    if (!studentQR || !studentQR.isActive) {
      return res.status(400).json({ message: 'Please generate your student QR code first' });
    }

    // Check if student already marked attendance for this session
    const existingAttendance = await prisma.studentClassAttendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session' });
    }

    // Location validation (if session has location)
    let isValidLocation = true;
    if (session.latitude && session.longitude && latitude && longitude) {
      const distance = calculateDistance(
        session.latitude, session.longitude,
        parseFloat(latitude), parseFloat(longitude)
      );
      
      // Allow 100 meters radius
      isValidLocation = distance <= 0.1; // 0.1 km = 100 meters
    }

    // Mark attendance
    const attendance = await prisma.studentClassAttendance.create({
      data: {
        sessionId: session.id,
        studentId,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        deviceInfo: deviceInfo || req.get('User-Agent'),
        ipAddress: req.ip,
        isValid: isValidLocation
      }
    });

    // Update student QR last used time
    await prisma.studentQRCode.update({
      where: { studentId },
      data: { lastUsedAt: new Date() }
    });

    // Emit socket event for real-time attendance update
    const io = req.app.get('io');
    if (io) {
      io.emit('attendance_marked', {
        subject: session.subject,
        className: session.className,
        studentId,
        teacherId: session.teacherId,
        sessionId: session.id
      });
    }

    res.json({
      success: true,
      attendance,
      session: {
        subject: session.subject,
        className: session.className,
        startTime: session.startTime
      },
      locationValid: isValidLocation,
      message: isValidLocation 
        ? 'Attendance marked successfully' 
        : 'Attendance marked but location seems invalid'
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// Get student's attendance history
router.get('/student/attendance-history', authorize('STUDENT'), async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attendance, total] = await Promise.all([
      prisma.studentClassAttendance.findMany({
        where: { studentId },
        include: {
          session: {
            include: {
              teacher: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeId: true
                }
              }
            }
          }
        },
        orderBy: { markedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.studentClassAttendance.count({ where: { studentId } })
    ]);

    res.json({
      success: true,
      attendance,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance history' });
  }
});

// Admin: Get all attendance records with filters
router.get('/admin/attendance-records', authorize('ADMIN'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      teacherId, 
      studentId, 
      subject, 
      startDate, 
      endDate,
      department 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    
    if (teacherId) {
      where.session = { teacherId };
    }
    
    if (studentId) {
      where.studentId = studentId;
    }
    
    if (subject) {
      where.session = { ...where.session, subject: { contains: subject } };
    }
    
    if (department) {
      where.student = { department };
    }
    
    if (startDate || endDate) {
      where.markedAt = {};
      if (startDate) where.markedAt.gte = new Date(startDate);
      if (endDate) where.markedAt.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.studentClassAttendance.findMany({
        where,
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentId: true,
              department: true
            }
          },
          session: {
            include: {
              teacher: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeId: true
                }
              }
            }
          }
        },
        orderBy: { markedAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.studentClassAttendance.count({ where })
    ]);

    res.json({
      success: true,
      records,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in kilometers
  return d;
}

export default router;
