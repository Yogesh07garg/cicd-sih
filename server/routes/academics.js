import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/academics/materials
 * Query params: course, subject, authorId, limit, page
 * Public to any authenticated user (students & faculty)
 */
router.get('/materials', async (req, res) => {
  try {
    const { course, subject, authorId, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '50'));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (course) where.course = String(course);
    if (subject) where.subject = String(subject);
    if (authorId) where.authorId = String(authorId);

    const [materials, total] = await Promise.all([
      prisma.studyMaterial.findMany({
        where,
        include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.studyMaterial.count({ where })
    ]);

    res.json({ success: true, data: { materials, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } } });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch study materials' });
  }
});

/**
 * GET /api/academics/materials/:id
 */
router.get('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const mat = await prisma.studyMaterial.findUnique({
      where: { id },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });
    if (!mat) return res.status(404).json({ success: false, message: 'Material not found' });
    res.json({ success: true, data: mat });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch material' });
  }
});

/**
 * POST /api/academics/materials
 * Body: { title, description, course, subject, storagePath, visibility }
 * Only FACULTY or ADMIN can create
 */
router.post('/materials', authorize('FACULTY', 'ADMIN'), auditLog('CREATE', 'StudyMaterial'), async (req, res) => {
  try {
    let { title, description, course, subject, storagePath, visibility } = req.body;
    if (!title || !storagePath) return res.status(400).json({ success: false, message: 'Title and storagePath are required' });

    // If frontend sent a data URL (base64) for the file, save it to disk and replace storagePath with a short URL.
    if (typeof storagePath === 'string' && storagePath.startsWith('data:')) {
      const matches = storagePath.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ success: false, message: 'Invalid data URL for storagePath' });
      }

      const mime = matches[1];
      const b64 = matches[2];
      const ext = (mime.split('/')[1] || 'bin').split('+')[0];

      const uploadsDir = path.join(process.cwd(), 'uploads', 'study-materials');
      await fs.promises.mkdir(uploadsDir, { recursive: true });

      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
      const filepath = path.join(uploadsDir, filename);

      const buffer = Buffer.from(b64, 'base64');
      await fs.promises.writeFile(filepath, buffer);

      // Build a public URL based on the current request host
      storagePath = `${req.protocol}://${req.get('host')}/uploads/study-materials/${filename}`;
    } else {
      storagePath = String(storagePath);
    }

    const created = await prisma.studyMaterial.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        course: course ? String(course) : null,
        subject: subject ? String(subject) : null,
        storagePath,
        visibility: visibility ? String(visibility) : 'ALL',
        authorId: req.user.id
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });

    // Optionally broadcast new material event to role rooms (students)
    const io = req.app.get('io');
    if (io) {
      io.to('STUDENT').emit('new_study_material', { id: created.id, title: created.title, course: created.course });
    }

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ success: false, message: 'Failed to create material' });
  }
});

/**
 * DELETE /api/academics/materials/:id
 * Only the author or ADMIN may delete
 */
router.delete('/materials/:id', authorize('FACULTY', 'ADMIN'), auditLog('DELETE', 'StudyMaterial'), async (req, res) => {
  try {
    const { id } = req.params;
    const mat = await prisma.studyMaterial.findUnique({ where: { id } });
    if (!mat) return res.status(404).json({ success: false, message: 'Material not found' });

    // Allow ADMIN or author
    if (req.user.role !== 'ADMIN' && req.user.id !== mat.authorId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this material' });
    }

    await prisma.studyMaterial.delete({ where: { id } });
    res.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete material' });
  }
});

export default router;
