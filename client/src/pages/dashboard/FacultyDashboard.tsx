import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  QrCode, 
  BookOpen,
  ClipboardList,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface FacultyStats {
  totalClasses: number;
  studentsEnrolled: number;
  attendanceRate: number;
  pendingGrades: number;
  activeNotices: number;
  upcomingExams: number;
}

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FacultyStats>({
    totalClasses: 0,
    studentsEnrolled: 0,
    attendanceRate: 0,
    pendingGrades: 0,
    activeNotices: 0,
    upcomingExams: 0
  });
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, classesResponse] = await Promise.all([
        axios.get('/api/faculty/dashboard-stats'),
        axios.get('/api/faculty/today-classes')
      ]);
      
      setStats(statsResponse.data);
      setTodayClasses(classesResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Classes',
      value: stats.totalClasses,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: 'This semester'
    },
    {
      title: 'Students Enrolled',
      value: stats.studentsEnrolled,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: 'Across all classes'
    },
    {
      title: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'Average'
    },
    {
      title: 'Pending Grades',
      value: stats.pendingGrades,
      icon: ClipboardList,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: 'To be graded'
    }
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, Prof. {user?.firstName} {user?.lastName}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.department} • Employee ID: {user?.employeeId}
          </p>
        </div>
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
      </div>

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

      {/* QR Attendance and Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-primary-600" />
            QR Attendance System
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Start Attendance Session</h3>
              <p className="text-sm text-blue-700 mb-3">
                Generate QR session for students to mark attendance
              </p>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                Start New Session
              </button>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Scan Student QR</h3>
              <p className="text-sm text-green-700 mb-3">
                Use camera to scan student QR codes
              </p>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                Open QR Scanner
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">Data Structures</p>
                <p className="text-sm text-blue-600">CS-301 • 9:00 AM - 10:30 AM</p>
                <p className="text-xs text-blue-500">Room 101 • 45 students</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Start
              </button>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-900">Algorithms</p>
                <p className="text-sm text-green-600">CS-401 • 11:00 AM - 12:30 PM</p>
                <p className="text-xs text-green-500">Room 205 • 38 students</p>
              </div>
              <button className="text-green-600 hover:text-green-700 text-sm font-medium">
                Start
              </button>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
              <div className="flex-1">
                <p className="font-medium text-purple-900">Database Lab</p>
                <p className="text-sm text-purple-600">CS-302L • 2:00 PM - 4:00 PM</p>
                <p className="text-xs text-purple-500">Lab 3 • 25 students</p>
              </div>
              <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                Start
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-center">
              <ClipboardList className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-blue-900">Grade Assignments</span>
            </button>
            <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-green-900">Upload Resources</span>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-center">
              <Bell className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-purple-900">Send Notice</span>
            </button>
            <button className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-center">
              <Users className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-orange-900">View Students</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <QrCode className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Attendance session completed
                </p>
                <p className="text-xs text-gray-500">Data Structures - 42 students marked</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <ClipboardList className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Grades uploaded for Assignment 3
                </p>
                <p className="text-xs text-gray-500">Algorithms course - 38 submissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="h-4 w-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Notice sent to CS students
                </p>
                <p className="text-xs text-gray-500">Mid-term exam schedule updated</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;