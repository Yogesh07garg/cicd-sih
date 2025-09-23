import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  CreditCard, 
  QrCode,
  Bell,
  GraduationCap,
  TrendingUp,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  Scan,
  Camera,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useLocation } from '../../hooks/useLocation';
import QRScanner from '../../components/QRScanner';
import axios from 'axios';
import toast from 'react-hot-toast';

interface StudentStats {
  attendancePercentage: number;
  pendingAssignments: number;
  upcomingExams: number;
  pendingFees: number;
  totalClasses: number;
  presentClasses: number;
  recentNotices: any[];
}

interface AttendanceRecord {
  id: string;
  markedAt: string;
  isValid: boolean;
  session: {
    subject: string;
    className: string;
    startTime: string;
    teacher: {
      firstName: string;
      lastName: string;
      employeeId: string;
    };
  };
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { location, error: locationError, loading: locationLoading, requestLocation } = useLocation();
  
  const [stats, setStats] = useState<StudentStats>({
    attendancePercentage: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
    pendingFees: 0,
    totalClasses: 0,
    presentClasses: 0,
    recentNotices: []
  });
  
  const [loading, setLoading] = useState(true);
  const [studentQR, setStudentQR] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentAttendance();
    generateStudentQR();

    // Socket listeners for real-time updates
    if (socket) {
      socket.on('attendance_marked', () => {
        fetchRecentAttendance();
        fetchDashboardData();
      });

      socket.on('class_session_started', (data: any) => {
        // use toast(...) instead of toast.info
        toast(`📚 New class session: ${data.subject} - ${data.className}`);
      });

      return () => {
        socket.off('attendance_marked');
        socket.off('class_session_started');
      };
    }
  }, [socket]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/student/dashboard-stats');
      setStats({
        ...response.data,
        pendingAssignments: 5, // Mock data
        upcomingExams: 2, // Mock data
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const response = await axios.get('/api/qr-attendance/student/attendance-history?limit=5');
      setRecentAttendance(response.data.attendance || []);
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
    }
  };

  const generateStudentQR = async () => {
    try {
      const response = await axios.post('/api/qr-attendance/student/generate-qr');
      setStudentQR(response.data.qrCode);
    } catch (error: any) {
      console.error('Failed to generate student QR:', error);
    }
  };

  const handleQRScan = async (qrData: string) => {
    if (!location) {
      // Allow scanning without location for development / testing.
      toast.warning('Location not available — proceeding without location (development/testing). Attendance will be recorded but location validation will be skipped.', { duration: 6000 });
    }

    setMarkingAttendance(true);
    
    try {
      const payload = {
        sessionQRData: qrData,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        deviceInfo: navigator.userAgent
      };

      const response = await axios.post('/api/qr-attendance/student/mark-attendance', payload);
      
      if (response.data.locationValid) {
        toast.success('✅ Attendance marked successfully!');
        if (socket) {
          socket.emit('attendance_marked', {
            subject: response.data.session.subject,
            studentId: user?.id
          });
        }
      } else {
        // When we don't have location, server will set locationValid according to session and provided coords.
        toast.success('⚠️ Attendance marked. Note: location validation not available or failed.');
      }
      
      // Refresh data
      await Promise.all([
        fetchDashboardData(),
        fetchRecentAttendance()
      ]);
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
      setShowScanner(false);
    }
  };

  const startQRScanning = async () => {
    // Check if student QR exists first
    if (!studentQR) {
      toast.error('Please generate your student QR code first');
      await generateStudentQR();
      return;
    }

    // If location not available, allow proceeding for development/testing.
    if (!location) {
      toast('Location not available — opening camera. You can still scan QR for testing.');
    } else {
      // still try to refresh location if possible (no blocking)
      requestLocation().catch(() => {});
    }

    setShowScanner(true);
  };

  const statCards = [
    {
      title: 'Attendance',
      value: `${stats.attendancePercentage}%`,
      icon: Calendar,
      color: stats.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.attendancePercentage >= 75 ? 'bg-green-50' : 'bg-red-50',
      trend: `${stats.presentClasses}/${stats.totalClasses} classes`
    },
    {
      title: 'Pending Assignments',
      value: stats.pendingAssignments,
      icon: BookOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: 'Due soon'
    },
    {
      title: 'Upcoming Exams',
      value: stats.upcomingExams,
      icon: GraduationCap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'This month'
    },
    {
      title: 'Pending Fees',
      value: `₹${stats.pendingFees.toLocaleString()}`,
      icon: CreditCard,
      color: stats.pendingFees > 0 ? 'text-red-600' : 'text-green-600',
      bgColor: stats.pendingFees > 0 ? 'bg-red-50' : 'bg-green-50',
      trend: stats.pendingFees > 0 ? 'Pay now' : 'All clear'
    }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.department} • Student ID: {user?.studentId}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchRecentAttendance();
            }}
            className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Location Status Alert */}
      {locationError && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Location Access Required</h3>
              <p className="text-sm text-orange-700 mt-1">{locationError}</p>
              <button
                onClick={requestLocation}
                className="mt-2 text-sm bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
              >
                Enable Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {card.trend}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QR Code and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* QR Code Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="h-5 w-5 mr-2 text-primary-600" />
            Mark Attendance
          </h2>
          
          <div className="text-center space-y-4">
            {location ? (
              <div className="flex items-center justify-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <MapPin className="h-4 w-4 mr-2" />
                Location enabled ✅
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2" />
                Location required
              </div>
            )}
            
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Camera className="h-10 w-10 text-white" />
              </div>
              {markingAttendance && (
                <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            
            <button
              onClick={startQRScanning}
              disabled={markingAttendance || locationLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              <Scan className="h-5 w-5 mr-2" />
              {markingAttendance ? 'Marking...' : 'Scan Class QR Code'}
            </button>
            
            <p className="text-xs text-gray-500">
              Click to open camera and scan teacher's QR code
            </p>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
              <Clock className="h-4 w-4 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Mathematics</p>
                <p className="text-xs text-blue-600">9:00 AM - 10:00 AM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
              <Clock className="h-4 w-4 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">Physics</p>
                <p className="text-xs text-green-600">10:30 AM - 11:30 AM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-2 bg-yellow-50 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">Chemistry Lab</p>
                <p className="text-xs text-yellow-600">2:00 PM - 4:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Notices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary-600" />
            Recent Notices
          </h2>
          <div className="space-y-3">
            {stats.recentNotices?.slice(0, 3).map((notice, index) => (
              <div key={notice.id || index} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{notice.title}</p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(notice.publishedAt)}</p>
              </div>
            ))}
            {(!stats.recentNotices || stats.recentNotices.length === 0) && (
              <div className="text-sm text-gray-500">No recent notices</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h2>
        
        {recentAttendance.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No attendance records found</p>
            <p className="text-sm">Start marking attendance to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${record.isValid ? 'bg-green-500' : 'bg-orange-500'}`} />
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {record.session.subject} - {record.session.className}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {record.session.teacher.firstName} {record.session.teacher.lastName}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(record.markedAt)}
                  </div>
                  <div className="flex items-center mt-1">
                    {record.isValid ? (
                      <span className="text-xs text-green-600 flex items-center">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid
                      </span>
                    ) : (
                      <span className="text-xs text-orange-600 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Location Issue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-blue-900">Academics</span>
          </button>
          <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
            <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-green-900">Fees</span>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
            <BookOpen className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-purple-900">Library</span>
          </button>
          <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center">
            <GraduationCap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <span className="text-sm font-medium text-orange-900">Placement</span>
          </button>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onScan={handleQRScan}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
};

export default StudentDashboard;