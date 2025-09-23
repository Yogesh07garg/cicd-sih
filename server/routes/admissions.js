import express from 'express';
import { PrismaClient } from '@prisma/client';
import auditLog from '../middleware/audit.js';
import { authenticateToken, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Public: submit new application
router.post('/applications', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, department, applicationData } = req.body;

    const application = await prisma.admission.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        department,
        applicationData: applicationData ? JSON.stringify(applicationData) : null,
        status: 'PENDING'
      }
    });

    // In production send email/notification here
    res.status(201).json({ message: 'Application submitted', application });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ message: 'Failed to submit application' });
  }
});

// Admin: list applications with filters
router.get('/applications', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: String(search) } },
          { lastName: { contains: String(search) } },
          { email: { contains: String(search) } },
          { phone: { contains: String(search) } }
        ]
      })
    };

    const [applications, total] = await Promise.all([
      prisma.admission.findMany({
        where,
        orderBy: { appliedAt: 'desc' },
        skip: parseInt(String(skip)),
        take: parseInt(String(limit))
      }),
      prisma.admission.count({ where })
    ]);

    res.json({ applications, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
});

// Admin: get single application
router.get('/applications/:id', authenticateToken, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const application = await prisma.admission.findUnique({ where: { id } });
    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Failed to fetch application' });
  }
});

// Admin: update application status (approve/reject/waitlist)
router.put('/applications/:id/status', authenticateToken, authorize('ADMIN'), auditLog('UPDATE', 'Admission'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    const updated = await prisma.admission.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
        reviewedById: req.user.id
      }
    });

    // Optionally notify applicant here

    res.json({ message: 'Application updated', application: updated });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Failed to update application status' });
  }
});

export default router;
