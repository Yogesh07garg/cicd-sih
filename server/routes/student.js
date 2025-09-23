import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and student authorization to all routes
router.use(authenticateToken);
router.use(authorize('STUDENT'));

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get attendance percentage
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { studentId }
    });

    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(record => record.isPresent).length;
    const attendancePercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    // Get pending fees
    const pendingFees = await prisma.fee.aggregate({
      _sum: { amount: true },
      where: {
        studentId,
        status: 'PENDING'
      }
    });

    // Get recent notices (limit 3)
    const recentNotices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: 'STUDENTS' },
          { 
            AND: [
              { targetAudience: 'DEPARTMENT' },
              { targetValue: req.user.department }
            ]
          }
        ]
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 3
    });

    res.json({
      attendancePercentage,
      pendingFees: pendingFees._sum.amount || 0,
      recentNotices,
      totalClasses: totalSessions,
      presentClasses: presentCount
    });
  } catch (error) {
    console.error('Student dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get recent notices
router.get('/recent-notices', async (req, res) => {
  try {
    const notices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        OR: [
          { targetAudience: 'ALL' },
          { targetAudience: 'STUDENTS' },
          { 
            AND: [
              { targetAudience: 'DEPARTMENT' },
              { targetValue: req.user.department }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        priority: true,
        publishedAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { publishedAt: 'desc' },
      take: 5
    });

    res.json(notices);
  } catch (error) {
    console.error('Recent notices error:', error);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
});

export default router;