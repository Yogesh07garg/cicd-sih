import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and faculty authorization to all routes
router.use(authenticateToken);
router.use(authorize('FACULTY'));

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const facultyId = req.user.id;

    // Mock data for now - replace with actual queries based on your schema
    const stats = {
      totalClasses: 6,
      studentsEnrolled: 180,
      attendanceRate: 85,
      pendingGrades: 12,
      activeNotices: 3,
      upcomingExams: 2
    };

    res.json(stats);
  } catch (error) {
    console.error('Faculty dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get today's classes
router.get('/today-classes', async (req, res) => {
  try {
    const facultyId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await prisma.attendanceSession.findMany({
      where: {
        facultyId,
        sessionDate: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        subject: true,
        className: true,
        startTime: true,
        endTime: true,
        isActive: true,
        location: true
      },
      orderBy: { startTime: 'asc' }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Today classes error:', error);
    res.status(500).json({ message: 'Failed to fetch today\'s classes' });
  }
});

export default router;