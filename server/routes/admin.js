import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(authorize('ADMIN'));

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    // basic counts/sums
    const [totalStudents, totalFaculty, pendingAdmissions, activeNotices, libraryBooksSum, revenueAgg] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', isActive: true } }),
      prisma.user.count({ where: { role: 'FACULTY', isActive: true } }),
      prisma.user.count({ where: { role: 'STUDENT', isActive: false } }), // pending admissions heuristic
      prisma.notice.count({ where: { isPublished: true, expiresAt: { gt: new Date() } } }),
      prisma.book.aggregate({ _sum: { totalCopies: true } }),
      prisma.fee.aggregate({
        _sum: { paidAmount: true },
        where: {
          status: 'PAID',
          paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        }
      })
    ]);

    // Attendance: compute present / total
    const [presentCount, totalAttendanceRecords] = await Promise.all([
      prisma.attendanceRecord.count({ where: { isPresent: true } }),
      prisma.attendanceRecord.count()
    ]);
    const attendanceRate = totalAttendanceRecords > 0 ? Math.round((presentCount / totalAttendanceRecords) * 100) : 0;

    // Hostel occupancy: sum occupied / sum capacity
    const [occupiedSumAgg, capacitySumAgg] = await Promise.all([
      prisma.hostelRoom.aggregate({ _sum: { occupied: true } }),
      prisma.hostelRoom.aggregate({ _sum: { capacity: true } })
    ]);
    const totalOccupied = occupiedSumAgg._sum?.occupied || 0;
    const totalCapacity = capacitySumAgg._sum?.capacity || 0;
    const hostelOccupancy = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    res.json({
      totalStudents,
      totalFaculty,
      totalRevenue: revenueAgg._sum.paidAmount || 0,
      pendingAdmissions,
      attendanceRate,
      hostelOccupancy,
      activeNotices,
      libraryBooks: libraryBooksSum._sum.totalCopies || 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// User Management Routes

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 10, search, department, status } = req.query;
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...(role && { role }),
      ...(department && { department: { contains: String(department) } }),
      ...(status === 'active' ? { isActive: true } : {}),
      ...(status === 'inactive' ? { isActive: false } : {}),
      ...(search && {
        OR: [
          { firstName: { contains: String(search) } },
          { lastName: { contains: String(search) } },
          { email: { contains: String(search) } },
          { studentId: { contains: String(search) } },
          { employeeId: { contains: String(search) } }
        ]
      })
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          department: true,
          studentId: true,
          employeeId: true,
          createdAt: true
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create user
router.post('/users', auditLog('CREATE', 'User'), async (req, res) => {
  try {
    const userData = req.body;
    
    // Hash password
    const bcrypt = await import('bcryptjs');
    userData.password = await bcrypt.hash(userData.password, 12);

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', auditLog('UPDATE', 'User'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove password from update data (handle separately if needed)
    delete updateData.password;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete/Deactivate user
router.delete('/users/:id', auditLog('DELETE', 'User'), async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to deactivate user' });
  }
});

export default router;