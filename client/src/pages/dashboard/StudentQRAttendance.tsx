import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { QrCode, Scan, MapPin, Clock, CheckCircle, AlertCircle, RefreshCw, Camera } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import QRScanner from '../../components/QRScanner';
import { useSocket } from '../../contexts/SocketContext';

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

const StudentQRAttendance: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { location, error: locationError, loading: locationLoading, requestLocation } = useLocation();
  const [studentQR, setStudentQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [markingAttendance, setMarkingAttendance] = useState(false);

  useEffect(() => {
    fetchAttendanceHistory();
    generateStudentQR();
    // listen for server broadcast when attendance is marked so UI updates straight away
    if (socket) {
      const handler = (data: any) => {
        // if server sends studentId we refresh only when relevant; otherwise refresh always
        if (!data || !data.studentId || data.studentId === user?.id) {
          fetchAttendanceHistory();
        }
      };
      socket.on('attendance_marked', handler);
      return () => {
        socket.off('attendance_marked', handler);
      };
    }
  }, [socket]);

  const generateStudentQR = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/qr-attendance/student/generate-qr');
      setStudentQR(response.data.qrCode);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (qrData: string) => {
    try {
      setMarkingAttendance(true);
      
      if (!location) {
        toast.warning('Location not available — proceeding without location (development/testing).', { duration: 6000 });
      }

      const payload = {
        sessionQRData: qrData,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        deviceInfo: navigator.userAgent
      };

      const response = await axios.post('/api/qr-attendance/student/mark-attendance', payload);
      
      if (response.data.locationValid) {
        toast.success('✅ Attendance marked successfully!');
      } else {
        toast.success('⚠️ Attendance marked but location seems invalid');
      }

      // Optimistically add returned attendance to the top of the list so it appears immediately.
      // Server returns `attendance` in the response (see qr-attendance mark-attendance).
      if (response.data?.attendance) {
        setAttendanceHistory(prev => {
          // avoid duplicate if already present
          const exists = prev.some(a => a.id === response.data.attendance.id);
          return exists ? prev : [response.data.attendance, ...prev];
        });
      } else {
        // fallback refresh
        fetchAttendanceHistory();
      }
      
      // also refresh to ensure consistent session/teacher info
      fetchAttendanceHistory();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(false);
      setShowScanner(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await axios.get('/api/qr-attendance/student/attendance-history?limit=10');
      setAttendanceHistory(response.data.attendance || []);
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
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
      // react-hot-toast does not expose `info()`; use toast(...) for informational message
      toast('Location not available — opening camera. You can still scan QR for testing.');
    } else {
      requestLocation().catch(() => {});
    }

    setShowScanner(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Attendance</h1>
          <p className="text-gray-600 mt-1">
            {user?.firstName} {user?.lastName} • {user?.studentId} • {user?.department}
          </p>
        </div>
        <button
          onClick={fetchAttendanceHistory}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student QR Code */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-blue-600" />
            Your Student QR Code
          </h2>
          
          {studentQR ? (
            <div className="text-center">
              <img src={studentQR} alt="Student QR Code" className="mx-auto mb-4 border rounded-lg" />
              <p className="text-sm text-gray-600 mb-4">
                This is your unique student QR code. Keep it secure and don't share it.
              </p>
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-blue-800">
                  ✅ QR Code Active • Generated for {user?.firstName} {user?.lastName}
                </p>
              </div>
              <button
                onClick={generateStudentQR}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Regenerate QR Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Generate your unique QR code to mark attendance in classes
              </p>
              <button
                onClick={generateStudentQR}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate My QR Code'}
              </button>
            </div>
          )}
        </div>

        {/* Mark Attendance with Camera Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="h-5 w-5 mr-2 text-green-600" />
            Mark Attendance
          </h2>
          
          <div className="space-y-4">
            {location ? (
              <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <MapPin className="h-4 w-4 mr-2" />
                Location services enabled ✅
              </div>
            ) : (
              <div className="flex items-center text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4 mr-2" />
                Location required for attendance
              </div>
            )}

            {!studentQR ? (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please generate your QR code first before marking attendance.
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <Camera className="h-10 w-10 text-white" />
                  </div>
                  {markingAttendance && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={startQRScanning}
                  disabled={markingAttendance || locationLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  <Scan className="h-5 w-5 mr-2" />
                  {markingAttendance ? 'Marking Attendance...' : 'Scan Teacher\'s QR Code'}
                </button>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-800 font-medium">How to mark attendance:</p>
                  <ol className="text-xs text-blue-700 mt-1 list-decimal list-inside space-y-1">
                    <li>Click "Scan Teacher's QR Code"</li>
                    <li>Allow camera permissions</li>
                    <li>Point camera at teacher's QR code</li>
                    <li>Wait for automatic scanning</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Attendance</h2>
        
        {attendanceHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No attendance records found</p>
            <p className="text-sm">Start marking attendance to see your history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendanceHistory.map((record) => (
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
                        Valid Location
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

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onScan={markAttendance}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
};

export default StudentQRAttendance;
