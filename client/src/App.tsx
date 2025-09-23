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
                <Route path="users" element={<UsersManagement />} />
                <Route path="admissions" element={<AdmissionsManagement />} />
                <Route path="notices" element={<NoticesManagement />} />
                <Route path="reports" element={<Reports />} />
                <Route path="fees" element={<FeesManagement />} />
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

export default App;