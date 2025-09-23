import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { QrCode, MapPin, Clock, Users, Play, Square, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';

interface ActiveSession {
  id: string;
  subject: string;
  className: string;
  startTime: string;
  location?: string;
  attendanceWindow: number;
  studentAttendance: Array<{
    student: {
      firstName: string;
      lastName: string;
      studentId: string;
      department: string;
    };
    markedAt: string;
    isValid: boolean;
  }>;
}

const TeacherQRAttendance: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [teacherQR, setTeacherQR] = useState<string | null>(null);
  const [sessionQR, setSessionQR] = useState<string | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state for starting class
  const [classForm, setClassForm] = useState({
    subject: '',
    className: '',
    location: '',
    attendanceWindow: 5
  });

  // Location state
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    fetchActiveSessions();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location');
        }
      );
    }
  };

  const generateTeacherQR = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/qr-attendance/teacher/generate-qr');
      setTeacherQR(response.data.qrCode);
      toast.success('Teacher QR code generated!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const startClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...classForm,
        latitude: location?.latitude,
        longitude: location?.longitude
      };

      const response = await axios.post('/api/qr-attendance/teacher/start-class', payload);
      setSessionQR(response.data.sessionQR);
      setClassForm({ subject: '', className: '', location: '', attendanceWindow: 5 });
      toast.success('Class session started!');
      
      // Emit socket event for real-time notifications
      if (socket) {
        socket.emit('class_session_started', {
          subject: payload.subject,
          className: payload.className,
          teacherId: user?.id
        });
      }
      
      fetchActiveSessions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to start class');
    } finally {
      setLoading(false);
    }
  };

  const endClass = async (sessionId: string) => {
    try {
      await axios.post(`/api/qr-attendance/teacher/end-class/${sessionId}`);
      toast.success('Class session ended!');
      setSessionQR(null);
      fetchActiveSessions();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to end class');
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get('/api/qr-attendance/teacher/active-sessions');
      setActiveSessions(response.data.sessions);
    } catch (error) {
      console.error('Failed to fetch active sessions:', error);
    }
  };

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">QR Attendance System</h1>
          <p className="text-gray-600 mt-1">
            Welcome, {user?.firstName} {user?.lastName} • {user?.department}
          </p>
        </div>
        <button
          onClick={fetchActiveSessions}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate Teacher QR */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-blue-600" />
            Your Teacher QR Code
          </h2>
          
          {teacherQR ? (
            <div className="text-center">
              <img src={teacherQR} alt="Teacher QR Code" className="mx-auto mb-4 border rounded-lg" />
              <p className="text-sm text-gray-600 mb-4">
                This is your unique teacher QR code. Keep it secure.
              </p>
              <button
                onClick={generateTeacherQR}
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
              <button
                onClick={generateTeacherQR}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </div>
          )}
        </div>

        {/* Start New Class */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Play className="h-5 w-5 mr-2 text-green-600" />
            Start New Class
          </h2>
          
          <form onSubmit={startClass} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={classForm.subject}
                onChange={(e) => setClassForm({...classForm, subject: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Mathematics"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class/Section
              </label>
              <input
                type="text"
                required
                value={classForm.className}
                onChange={(e) => setClassForm({...classForm, className: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., CS-301A"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location (Optional)
              </label>
              <input
                type="text"
                value={classForm.location}
                onChange={(e) => setClassForm({...classForm, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Room 101"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendance Window (minutes)
              </label>
              <select
                value={classForm.attendanceWindow}
                onChange={(e) => setClassForm({...classForm, attendanceWindow: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
              </select>
            </div>

            {location && (
              <div className="flex items-center text-sm text-green-600">
                <MapPin className="h-4 w-4 mr-1" />
                Location captured
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !teacherQR}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Class Session'}
            </button>
            
            {!teacherQR && (
              <p className="text-sm text-orange-600">
                Generate your teacher QR code first
              </p>
            )}
          </form>
        </div>

        {/* Session QR for Students */}
        {sessionQR && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-purple-600" />
              Student Attendance QR
            </h2>
            
            <div className="text-center">
              <img src={sessionQR} alt="Session QR Code" className="mx-auto mb-4 border rounded-lg" />
              <p className="text-sm text-gray-600 mb-4">
                Students should scan this QR code to mark attendance
              </p>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800">
                  QR code is active and students can scan it now
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Class Sessions</h2>
        
        {activeSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active class sessions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {session.subject} - {session.className}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mt-1 space-x-4">
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        Started {formatDuration(session.startTime)} ago
                      </span>
                      {session.location && (
                        <span className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {session.location}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {session.studentAttendance.length} students
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => endClass(session.id)}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    End Class
                  </button>
                </div>
                
                {session.studentAttendance.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Present Students:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {session.studentAttendance.map((attendance, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                          <span>
                            {attendance.student.firstName} {attendance.student.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {attendance.student.studentId}
                          </span>
                          {!attendance.isValid && (
                            <span className="text-xs text-orange-600">⚠️</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherQRAttendance;
