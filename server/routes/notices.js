import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/notices
 * Notices visible to the current user (students see only published notices targeted to them)
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const where= { isPublished: true };

    // Students: filter by audience
    if (user.role === 'STUDENT') {
      where.OR = [
        { targetAudience: 'ALL' },
        { targetAudience: 'STUDENTS' },
        {
          AND: [
            { targetAudience: 'DEPARTMENT' },
            { targetValue: user.department || null }
          ]
        }
      ];
    } else {
      // Faculty/Admin/others: return all published notices by default
      // Admin/Faculty management endpoints use /admin route
    }

    const notices = await prisma.notice.findMany({
      where,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
        recipients: { select: { userId: true, readAt: true } }
      },
      orderBy: { publishedAt: 'desc' },
      take: 100
    });

    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices' });
  }
});

/**
 * POST /api/notices
 * Create notice (Admin/Faculty)
 */
router.post('/', authorize('ADMIN', 'FACULTY'), auditLog('CREATE', 'Notice'), async (req, res) => {
  try {
    const {
      title,
      content,
      priority = 'NORMAL',
      targetAudience = 'ALL',
      targetValue = null,
      attachments = null,
      isPublished = false,
      expiresAt = null,
      pinned = false
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    const publishedAt = isPublished ? new Date() : null;

    const created = await prisma.notice.create({
      data: {
        title: title.trim(),
        content,
        priority,
        targetAudience,
        targetValue,
        attachments,
        isPublished,
        publishedAt,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        pinned,
        authorId: req.user.id
      },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });

    // Broadcast only if published
    if (isPublished) {
      const io = req.app.get('io');
      if (io) {
        io.to('STUDENT').emit('new_notice', {
          id: created.id,
          title: created.title,
          priority: created.priority,
          targetAudience: created.targetAudience
        });
      }
    }

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to create notice' });
  }
});

/**
 * PUT /api/notices/:id
 * Update notice (Admin/Faculty)
 */
router.put('/:id', authorize('ADMIN', 'FACULTY'), auditLog('UPDATE', 'Notice'), async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Notice not found' });

    // Handle publishedAt if isPublished toggled
    if (payload.isPublished !== undefined) {
      if (payload.isPublished && !existing.isPublished) {
        payload.publishedAt = new Date();
      } else if (!payload.isPublished && existing.isPublished) {
        payload.publishedAt = null;
      }
    }

    if (payload.expiresAt === '') payload.expiresAt = null;

    const updated = await prisma.notice.update({
      where: { id },
      data: {
        ...payload,
        title: payload.title ? String(payload.title).trim() : undefined,
        content: payload.content ?? undefined
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } }
    });

    // If newly published, broadcast
    if (payload.isPublished && !existing.isPublished) {
      const io = req.app.get('io');
      if (io) {
        io.to('STUDENT').emit('new_notice', {
          id: updated.id,
          title: updated.title,
          priority: updated.priority
        });
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notice' });
  }
});

/**
 * POST /api/notices/:id/read
 * Mark notice as read for current user
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notice = await prisma.notice.findUnique({ where: { id } });
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

    // Upsert recipient (create if not exists, update readAt if exists)
    const existing = await prisma.noticeRecipient.findUnique({ where: { noticeId_userId: { noticeId: id, userId } } });
    if (existing) {
      await prisma.noticeRecipient.update({
        where: { id: existing.id },
        data: { readAt: new Date() }
      });
    } else {
      await prisma.noticeRecipient.create({
        data: { noticeId: id, userId, readAt: new Date() }
      });
    }

    res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

/**
 * GET /api/notices/admin
 * Admin/Faculty: list all notices with optional filters
 */
router.get('/admin', authorize('ADMIN', 'FACULTY'), async (req, res) => {
  try {
    const { page = 1, limit = 50, search, priority, audience } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '50'));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { content: { contains: String(search) } }
      ];
    }
    if (priority) where.priority = String(priority);
    if (audience) where.targetAudience = String(audience);

    const [items, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        include: {
          author: { select: { id: true, firstName: true, lastName: true, role: true } },
          recipients: { select: { userId: true, readAt: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.notice.count({ where })
    ]);

    res.json({ success: true, notices: items, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Admin list notices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices' });
  }
});

/**
 * DELETE /api/notices/:id
 * Admin/Faculty: delete a notice
 */
router.delete('/:id', authorize('ADMIN', 'FACULTY'), auditLog('DELETE', 'Notice'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Notice not found' });

    // Only author or admin can delete
    if (req.user.role !== 'ADMIN' && req.user.id !== existing.authorId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this notice' });
    }

    await prisma.notice.delete({ where: { id } });
    res.json({ success: true, message: 'Notice deleted' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notice' });
  }
});

export default router;