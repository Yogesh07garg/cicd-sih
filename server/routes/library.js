import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorize } from '../middleware/auth.js';
import auditLog from '../middleware/audit.js';

const router = express.Router();
const prisma = new PrismaClient();

// require authentication for all library routes
router.use(authenticateToken);

/**
 * GET /api/library/books
 * Public for authenticated users. Supports optional search/category.
 */
router.get('/books', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 200 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(500, parseInt(String(limit) || '200'));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { author: { contains: String(search), mode: 'insensitive' } },
        { isbn: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (category) where.category = String(category);

    const [books, total] = await Promise.all([
      prisma.book.findMany({ where, orderBy: { title: 'asc' }, skip, take: limitNum }),
      prisma.book.count({ where })
    ]);

    res.json({ success: true, books, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('List books error:', err);
    res.status(500).json({ success: false, message: 'Failed to list books' });
  }
});

/**
 * GET /api/library/students
 * Return students list for dropdown — LIBRARIAN or ADMIN only.
 */
router.get('/students', authorize('LIBRARIAN', 'ADMIN'), async (req, res) => {
  try {
    const { search, limit = 200 } = req.query;
    const where= { role: 'STUDENT' };
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: 'insensitive' } },
        { lastName: { contains: String(search), mode: 'insensitive' } },
        { studentId: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    const students = await prisma.user.findMany({
      where,
      select: { id: true, firstName: true, lastName: true, studentId: true, department: true },
      orderBy: { firstName: 'asc' },
      take: Math.min(1000, parseInt(String(limit)))
    });

    res.json({ success: true, students });
  } catch (err) {
    console.error('List students error:', err);
    res.status(500).json({ success: false, message: 'Failed to list students' });
  }
});

/**
 * POST /api/library/books
 * Create book (LIBRARIAN/ADMIN)
 */
router.post('/books', authorize('LIBRARIAN', 'ADMIN'), auditLog('CREATE', 'Book'), async (req, res) => {
  try {
    const {
      title, author, isbn = null, category = 'General',
      totalCopies = 1, availableCopies = undefined, publisher = null, publishedYear = null, location = null
    } = req.body;

    if (!title || !author) return res.status(400).json({ success: false, message: 'title and author are required' });

    const total = Number(totalCopies) || 1;
    const available = availableCopies !== undefined ? Number(availableCopies) : total;

    const created = await prisma.book.create({
      data: {
        title: String(title).trim(),
        author: String(author).trim(),
        isbn: isbn ? String(isbn).trim() : null,
        category: String(category),
        totalCopies: total,
        availableCopies: available,
        publisher: publisher ? String(publisher) : null,
        publishedYear: publishedYear ? Number(publishedYear) : null,
        location: location ? String(location) : null
      }
    });

    res.status(201).json({ success: true, book: created });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ success: false, message: 'Failed to create book' });
  }
});

/**
 * PUT /api/library/books/:id
 * Update book (LIBRARIAN/ADMIN)
 */
router.put('/books/:id', authorize('LIBRARIAN', 'ADMIN'), auditLog('UPDATE', 'Book'), async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found' });

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: payload.title !== undefined ? String(payload.title).trim() : undefined,
        author: payload.author !== undefined ? String(payload.author).trim() : undefined,
        isbn: payload.isbn !== undefined ? (payload.isbn ? String(payload.isbn).trim() : null) : undefined,
        category: payload.category !== undefined ? String(payload.category) : undefined,
        totalCopies: payload.totalCopies !== undefined ? Number(payload.totalCopies) : undefined,
        availableCopies: payload.availableCopies !== undefined ? Number(payload.availableCopies) : undefined,
        publisher: payload.publisher !== undefined ? (payload.publisher ? String(payload.publisher) : null) : undefined,
        publishedYear: payload.publishedYear !== undefined ? (payload.publishedYear ? Number(payload.publishedYear) : null) : undefined,
        location: payload.location !== undefined ? (payload.location ? String(payload.location) : null) : undefined
      }
    });

    res.json({ success: true, book: updated });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ success: false, message: 'Failed to update book' });
  }
});

/**
 * DELETE /api/library/books/:id
 * Delete book (LIBRARIAN/ADMIN) — prevents delete if copies issued
 */
router.delete('/books/:id', authorize('LIBRARIAN', 'ADMIN'), auditLog('DELETE', 'Book'), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found' });

    const issuedCount = await prisma.bookIssue.count({ where: { bookId: id, status: { not: 'RETURNED' } } });
    if (issuedCount > 0) return res.status(400).json({ success: false, message: 'Cannot delete book while copies are issued' });

    await prisma.book.delete({ where: { id } });
    res.json({ success: true, message: 'Book deleted' });
  } catch (err) {
    console.error('Delete book error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete book' });
  }
});

/**
 * GET /api/library/issued
 * Issued book records (LIBRARIAN/ADMIN)
 */
router.get('/issued', authorize('LIBRARIAN', 'ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '50'));
    const skip = (pageNum - 1) * limitNum;
    const where = {};
    if (status) where.status = String(status);

    const [items, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where,
        include: {
          book: true,
          student: { select: { id: true, firstName: true, lastName: true, studentId: true, department: true } }
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.bookIssue.count({ where })
    ]);

    res.json({ success: true, issues: items, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('List issued books error:', err);
    res.status(500).json({ success: false, message: 'Failed to list issued books' });
  }
});

/**
 * POST /api/library/issue
 * Issue a book to a student (LIBRARIAN/ADMIN)
 */
router.post('/issue', authorize('LIBRARIAN', 'ADMIN'), auditLog('CREATE', 'BookIssue'), async (req, res) => {
  try {
    const { studentId, bookId, dueDate } = req.body;
    if (!studentId || !bookId) return res.status(400).json({ success: false, message: 'studentId and bookId are required' });

    const result = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book) throw { status: 404, message: 'Book not found' };
      if ((book.availableCopies || 0) <= 0) throw { status: 400, message: 'No available copies to issue' };

      const issue = await tx.bookIssue.create({
        data: {
          bookId,
          studentId,
          dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'ISSUED'
        },
        include: { book: true, student: { select: { id: true, firstName: true, lastName: true, studentId: true } } }
      });

      await tx.book.update({ where: { id: bookId }, data: { availableCopies: { decrement: 1 } } });

      return issue;
    });

    const io = req.app.get('io');
    if (io) io.to('LIBRARIAN').emit('book_issued', { issueId: result.id, bookId: result.bookId, studentId: result.studentId });

    res.status(201).json({ success: true, issue: result });
  } catch (err) {
    console.error('Issue book error:', err);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: err.message || 'Failed to issue book' });
  }
});

/**
 * POST /api/library/return/:issueId
 * Mark a book issue as returned (librarian/admin or the student who borrowed)
 */
router.post('/return/:issueId', authenticateToken, async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await prisma.bookIssue.findUnique({ where: { id: issueId } });
    if (!issue) return res.status(404).json({ success: false, message: 'Issue record not found' });

    if (req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN' && req.user.id !== issue.studentId) {
      return res.status(403).json({ success: false, message: 'Not authorized to mark return' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.bookIssue.update({ where: { id: issueId }, data: { returnDate: new Date(), status: 'RETURNED' } });
      await tx.book.update({ where: { id: issue.bookId }, data: { availableCopies: { increment: 1 } } });
      return u;
    });

    const io = req.app.get('io');
    if (io) io.to('LIBRARIAN').emit('book_returned', { issueId: updated.id, bookId: updated.bookId });

    res.json({ success: true, issue: updated });
  } catch (err) {
    console.error('Return book error:', err);
    res.status(500).json({ success: false, message: 'Failed to return book' });
  }
});

/**
 * GET /api/library/digital
 * Digital library - lists study materials (any authenticated user)
 */
router.get('/digital', async (req, res) => {
  try {
    const { page = 1, limit = 50, course, subject } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '50'));
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    if (course) where.course = String(course);
    if (subject) where.subject = String(subject);

    const [materials, total] = await Promise.all([
      prisma.studyMaterial.findMany({
        where,
        include: { author: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.studyMaterial.count({ where })
    ]);

    res.json({ success: true, materials, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('Digital library error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch digital library' });
  }
});

/**
 * GET /api/library/issued/me
 * Returns issued book records for the currently authenticated student
 */
router.get('/issued/me', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page) || '1'));
    const limitNum = Math.min(200, parseInt(String(limit) || '50'));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      prisma.bookIssue.findMany({
        where: { studentId },
        include: {
          book: true
        },
        orderBy: { issueDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.bookIssue.count({ where: { studentId } })
    ]);

    res.json({ success: true, issues: items, pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error('List issued books (me) error:', err);
    res.status(500).json({ success: false, message: 'Failed to list your issued books' });
  }
});

export default router;
