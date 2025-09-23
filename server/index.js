import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import facultyRoutes from './routes/faculty.js';
import studentRoutes from './routes/student.js';
import noticeRoutes from './routes/notices.js';
import attendanceRoutes from './routes/attendance.js';
import admissionsRoutes from './routes/admissions.js'; // Importing admissions routes
import feesRoutes from './routes/fees.js'; // Importing fees routes
import reportsRoutes from './routes/reports.js'; // Importing reports routes
import scholarshipsRoutes from './routes/scholarships.js'; // Import scholarships routes
import examsRoutes from './routes/exams.js';
import hostelRoutes from './routes/hostel.js';
import qrAttendanceRoutes from './routes/qr-attendance.js'; // Importing QR attendance routes
import academicsRoutes from './routes/academics.js'; // Import academics routes
import facultyProgressRoutes from './routes/facultyProgress.js'; // Import faculty progress routes
import libraryRoutes from './routes/library.js'; // Import library routes
import placementRoutes from './routes/placement.js'; // <-- added placement routes

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (created from data-URL uploads)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admissions', admissionsRoutes); // Registering admissions routes
app.use('/api/fees', feesRoutes); // Registering fees routes
app.use('/api/reports', reportsRoutes); // Registering reports routes
app.use('/api/scholarships', scholarshipsRoutes); // Registering scholarships routes
app.use('/api/exams', examsRoutes);
app.use('/api/hostel', hostelRoutes);
app.use('/api/qr-attendance', qrAttendanceRoutes); // Registering QR attendance routes
app.use('/api/academics', academicsRoutes); // Register academics routes
app.use('/api/faculty/progress', facultyProgressRoutes); // Faculty: student progress routes
app.use('/api/library', libraryRoutes); // Librarian: books, issued records, digital library
app.use('/api/placement', placementRoutes); // <-- register placement routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join user to their role-based room
  socket.on('join-role', (role) => {
    socket.join(role);
    console.log(`User joined ${role} room`);
  });
  
  // Join user to their personal room
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined personal room`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});

export default app;