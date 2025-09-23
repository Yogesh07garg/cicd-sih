import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get rooms and availability (any authenticated)
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await prisma.hostelRoom.findMany({
      include: {
        block: true,
        allocations: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, studentId: true, department: true }
            }
          }
        }
      },
      orderBy: { roomNumber: 'asc' }
    });
    res.json({ data: rooms });
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

// Manual allocation (WARDEN/ADMIN)
router.post('/allocate', authenticateToken, authorize('WARDEN'), auditLog('CREATE', 'HostelAllocation'), async (req, res) => {
  try {
    const { studentId, roomId, bedNumber } = req.body;
    // basic checks
    const room = await prisma.hostelRoom.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.occupied >= room.capacity) return res.status(400).json({ message: 'Room full' });

    const alloc = await prisma.hostelAllocation.create({
      data: { studentId, roomId, bedNumber: bedNumber || null, allocatedAt: new Date(), status: 'ACTIVE' }
    });

    // increment occupied
    await prisma.hostelRoom.update({ where: { id: roomId }, data: { occupied: { increment: 1 } } });

    res.status(201).json({ success: true, data: alloc });
  } catch (err) {
    console.error('Allocate error:', err);
    res.status(500).json({ message: 'Failed to allocate room' });
  }
});

// Define hostel fee structure (ADMIN)
router.post('/fee-structures', authenticateToken, authorize('ADMIN'), auditLog('CREATE', 'HostelFeeStructure'), async (req, res) => {
  try {
    const { name, roomType, amount, academicYear } = req.body;
    const fs = await prisma.hostelFeeStructure.create({ data: { name, roomType, amount: Number(amount), academicYear } });
    res.status(201).json({ success: true, data: fs });
  } catch (err) {
    console.error('Create hostel fee structure error:', err);
    res.status(500).json({ message: 'Failed to create fee structure' });
  }
});

// File complaints (STUDENT)
router.post('/complaints', authenticateToken, authorize('STUDENT'), auditLog('CREATE', 'HostelComplaint'), async (req, res) => {
  try {
    const { roomId, description } = req.body;
    const complaint = await prisma.hostelComplaint.create({ data: { studentId: req.user.id, roomId: roomId || null, description } });
    res.status(201).json({ success: true, data: complaint });
  } catch (err) {
    console.error('Create complaint error:', err);
    res.status(500).json({ message: 'Failed to create complaint' });
  }
});

// Warden view complaints
router.get('/complaints', authenticateToken, authorize('WARDEN'), async (req, res) => {
  try {
    const complaints = await prisma.hostelComplaint.findMany({ include: { student: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ data: complaints });
  } catch (err) {
    console.error('Get complaints error:', err);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// Assign maintenance (WARDEN)
router.post('/complaints/:id/assign', authenticateToken, authorize('WARDEN'), auditLog('UPDATE', 'HostelComplaint'), async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;
    const updated = await prisma.hostelComplaint.update({ where: { id }, data: { status: 'IN_PROGRESS', assignedTo: staffId } });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Assign maintenance error:', err);
    res.status(500).json({ message: 'Failed to assign maintenance' });
  }
});

// Visitor logs (WARDEN/STUDENT)
router.post('/visitor', authenticateToken, auditLog('CREATE', 'VisitorLog'), async (req, res) => {
  try {
    const { studentId, visitorName, relation } = req.body;
    const v = await prisma.visitorLog.create({ data: { studentId, visitorName, relation } });
    res.status(201).json({ success: true, data: v });
  } catch (err) {
    console.error('Create visitor log error:', err);
    res.status(500).json({ message: 'Failed to create visitor log' });
  }
});

// Hostel occupancy summary (ADMIN/WARDEN)
router.get('/summary', authenticateToken, authorize('WARDEN'), async (req, res) => {
  try {
    const rooms = await prisma.hostelRoom.findMany({ select: { id: true, blockId: true, capacity: true, occupied: true } });
    const totalRooms = rooms.length;
    const totalCapacity = rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const totalOccupied = rooms.reduce((acc, r) => acc + (r.occupied || 0), 0);
    res.json({ totalRooms, totalCapacity, totalOccupied, occupancyRate: totalCapacity ? Math.round((totalOccupied/totalCapacity)*100) : 0 });
  } catch (err) {
    console.error('Hostel summary error:', err);
    res.status(500).json({ message: 'Failed to compute summary' });
  }
});

export default router;
