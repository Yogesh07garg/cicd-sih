import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  CreditCard, 
  QrCode,
  Bell,
  GraduationCap,
  TrendingUp,
  Clock
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

interface StudentStats {
  attendancePercentage: number;
  pendingAssignments: number;
  upcomingExams: number;
  pendingFees: number;
  borrowedBooks: number;
  notices: number;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats>({
    attendancePercentage: 0,
    pendingAssignments: 0,
    upcomingExams: 0,
    pendingFees: 0,
    borrowedBooks: 0,
    notices: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentNotices, setRecentNotices] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, noticesResponse] = await Promise.all([
        axios.get('/api/student/dashboard-stats'),
        axios.get('/api/student/recent-notices')
      ]);
      
      setStats(statsResponse.data);
      setRecentNotices(noticesResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Attendance',
      value: `${stats.attendancePercentage}%`,
      icon: Calendar,
      color: stats.attendancePercentage >= 75 ? 'text-green-600' : 'text-red-600',
      bgColor: stats.attendancePercentage >= 75 ? 'bg-green-50' : 'bg-red-50',
      trend: stats.attendancePercentage >= 75 ? 'Good' : 'Low'
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
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.department} • Student ID: {user?.studentId}
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
                  <p className={`text-sm mt-1 font-medium ${card.color}`}>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCode className="h-5 w-5 mr-2 text-primary-600" />
            Quick QR Access
          </h2>
          <div className="text-center">
            <div className="w-32 h-32 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <QrCode className="h-16 w-16 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Show this QR code to faculty for attendance
            </p>
            <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
              Generate QR Code
            </button>
          </div>
        </div>

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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-primary-600" />
            Recent Notices
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Semester Exam Schedule</p>
              <p className="text-xs text-gray-600 mt-1">Published 2 hours ago</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Library Holiday Notice</p>
              <p className="text-xs text-gray-600 mt-1">Published 1 day ago</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Fee Payment Reminder</p>
              <p className="text-xs text-gray-600 mt-1">Published 2 days ago</p>
            </div>
          </div>
        </div>
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
    </div>
  );
};

export default StudentDashboard;