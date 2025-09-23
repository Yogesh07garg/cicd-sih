import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import FacultyDashboard from './pages/dashboard/FacultyDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import AccountantDashboard from './pages/dashboard/AccountantDashboard';
import LibrarianDashboard from './pages/dashboard/LibrarianDashboard';
import WardenDashboard from './pages/dashboard/WardenDashboard';
import UsersManagement from './pages/dashboard/UsersManagement';
import AdmissionsManagement from './pages/dashboard/AdmissionsManagement';
import NoticesManagement from './pages/dashboard/NoticesManagement';
import Reports from './pages/dashboard/Reports';
import FeesManagement from './pages/dashboard/FeesManagement';
import Examinations from './pages/dashboard/Examinations';
import HostelManagement from './pages/dashboard/HostelManagement';
import TeacherQRAttendance from './pages/dashboard/TeacherQRAttendance';
import StudentQRAttendance from './pages/dashboard/StudentQRAttendance';
import Academics from './pages/dashboard/Academics';
import FacultyStudentProgress from './pages/dashboard/FacultyStudentProgress';
import BookManagement from './pages/dashboard/BookManagement';
import StudentRecords from './pages/dashboard/StudentRecords';
import DigitalLibrary from './pages/dashboard/DigitalLibrary';
import Scholarships from './pages/dashboard/Scholarships';
import StudentLibrary from './pages/dashboard/StudentLibrary';
import StudentHostel from './pages/dashboard/StudentHostel';
import Placement from './pages/dashboard/Placement'; // <-- add import

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard/home" replace />} />
                <Route path="home" element={<DashboardRouter />} />
                <Route path="academics" element={<Academics />} />
                <Route path="users" element={<UsersManagement />} />
                <Route path="admissions" element={<AdmissionsManagement />} />
                <Route path="notices" element={<NoticesManagement />} />
                <Route path="reports" element={<Reports />} />
                <Route path="fees" element={<FeesManagement />} />
                <Route path="exams" element={<Examinations />} />
                <Route path="hostel" element={<HostelRouter />} />
                <Route path="qr-attendance" element={<TeacherQRAttendance />} />
                <Route path="student-qr" element={<StudentQRAttendance />} />
                <Route path="students" element={<FacultyStudentProgress />} />
                <Route path="books" element={<BookManagement />} />
                <Route path="student-records" element={<StudentRecords />} />
                <Route path="digital-library" element={<DigitalLibrary />} />
                <Route path="scholarships" element={<Scholarships />} />
                <Route path="library" element={<LibraryRouter />} />
                <Route path="placement" element={<Placement />} /> {/* <-- add placement route */}
                {/* Additional nested routes will be added here */}
              </Route>
            </Routes>
            <Toaster position="top-right" />
          </div>
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

// Component to route to appropriate dashboard based on user role
const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'FACULTY':
      return <FacultyDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
    case 'ACCOUNTANT':
      return <AccountantDashboard />;
    case 'LIBRARIAN':
      return <LibrarianDashboard />;
    case 'WARDEN':
      return <WardenDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Add these routers below the Routes (keep near DashboardRouter)
const LibraryRouter: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STUDENT') return <StudentLibrary />;
  // non-students: show digital library/admin view
  return <DigitalLibrary />;
};

const HostelRouter: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'STUDENT') return <StudentHostel />;
  // non-students: show hostel management view
  return <HostelManagement />;
};

export default App;