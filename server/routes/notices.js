import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Get notices for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(String(page)) - 1) * parseInt(String(limit));

    const notices = await prisma.notice.findMany({
      where: {
        isPublished: true,
        OR: [
          { targetAudience: 'ALL' },
          { 
            AND: [
              { targetAudience: 'STUDENTS' },
              { author: { role: { in: ['ADMIN', 'FACULTY'] } } }
            ]
          },
          { 
            AND: [
              { targetAudience: 'FACULTY' },
              { author: { role: 'ADMIN' } }
            ]
          },
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
        },
        recipients: {
          where: { userId },
          select: { readAt: true }
        }
      },
      orderBy: { publishedAt: 'desc' },
      skip,
      take: parseInt(String(limit))
    });

    res.json(notices);
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
});

// Create notice (Admin/Faculty only)
router.post('/', auditLog('CREATE', 'Notice'), async (req, res) => {
  try {
    const authorId = req.user.id;
    const { title, content, priority, targetAudience, targetValue, publishNow } = req.body;

    if (!['ADMIN', 'FACULTY'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to create notices' });
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        priority: priority || 'NORMAL',
        targetAudience: targetAudience || 'ALL',
        targetValue,
        authorId,
        isPublished: publishNow || false,
        publishedAt: publishNow ? new Date() : null
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    if (publishNow) {
      const io = req.app.get('io');
      
      let targetRooms = [];
      if (targetAudience === 'ALL') {
        targetRooms = ['STUDENT', 'FACULTY', 'ADMIN', 'ACCOUNTANT', 'LIBRARIAN', 'WARDEN'];
      } else if (targetAudience === 'STUDENTS') {
        targetRooms = ['STUDENT'];
      } else if (targetAudience === 'FACULTY') {
        targetRooms = ['FACULTY'];
      }

      targetRooms.forEach(room => {
        io.to(room).emit('new_notice', {
          id: notice.id,
          title: notice.title,
          priority: notice.priority,
          author: notice.author
        });
      });
    }

    res.status(201).json(notice);
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Failed to create notice' });
  }
});

// Mark notice as read
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.noticeRecipient.upsert({
      where: {
        noticeId_userId: {
          noticeId: id,
          userId
        }
      },
      update: {
        readAt: new Date()
      },
      create: {
        noticeId: id,
        userId,
        readAt: new Date()
      }
    });

    res.json({ message: 'Notice marked as read' });
  } catch (error) {
    console.error('Mark notice read error:', error);
    res.status(500).json({ message: 'Failed to mark notice as read' });
  }
});

// Admin: list all notices (with filters, pagination)
router.get('/admin', async (req, res) => {
  try {
    if (!['ADMIN', 'FACULTY'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { page = 1, limit = 20, search, category, author } = req.query;
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where = {
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
      ]
    };

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: String(search), mode: 'insensitive' } },
          { content: { contains: String(search), mode: 'insensitive' } }
        ]
      });
    }

    if (category) {
      where.AND.push({ priority: String(category) });
    }

    if (author) {
      where.AND.push({
        OR: [
          { author: { firstName: { contains: String(author), mode: 'insensitive' } } },
          { author: { lastName: { contains: String(author), mode: 'insensitive' } } }
        ]
      });
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
        },
        orderBy: [{ publishedAt: 'desc' }],
        skip,
        take: limitNum
      }),
      prisma.notice.count({ where })
    ]);

    res.json({ notices, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (error) {
    console.error('Admin get notices error:', error);
    res.status(500).json({ message: 'Failed to fetch notices' });
  }
});

// Admin: update a notice
router.put('/:id', auditLog('UPDATE', 'Notice'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!['ADMIN', 'FACULTY'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, content, priority, targetAudience, targetValue, isPublished, publishedAt, expiresAt } = req.body;

    const updated = await prisma.notice.update({
      where: { id },
      data: {
        title,
        content,
        priority,
        targetAudience,
        targetValue,
        isPublished: typeof isPublished === 'boolean' ? isPublished : undefined,
        publishedAt: publishedAt ? new Date(publishedAt) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } }
      }
    });

    if (updated.isPublished) {
      const io = req.app.get('io');
      const targetRooms = updated.targetAudience === 'ALL' ? ['STUDENT','FACULTY','ADMIN','ACCOUNTANT','LIBRARIAN','WARDEN'] :
        updated.targetAudience === 'STUDENTS' ? ['STUDENT'] :
        updated.targetAudience === 'FACULTY' ? ['FACULTY'] : [];
      targetRooms.forEach(room => io.to(room).emit('new_notice', {
        id: updated.id, title: updated.title, priority: updated.priority, author: updated.author
      }));
    }

    res.json(updated);
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ message: 'Failed to update notice' });
  }
});

// Admin: delete a notice
router.delete('/:id', auditLog('DELETE', 'Notice'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!['ADMIN', 'FACULTY'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.notice.delete({ where: { id } });
    res.json({ message: 'Notice deleted' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Failed to delete notice' });
  }
});

export default router;