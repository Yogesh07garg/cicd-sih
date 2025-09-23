import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  Calendar,
  TrendingUp,
  UserCheck,
  Building,
  BookOpen
} from 'lucide-react';
import axios from 'axios';

interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalRevenue: number;
  pendingAdmissions: number;
  attendanceRate: number;
  hostelOccupancy: number;
  activeNotices: number;
  libraryBooks: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalRevenue: 0,
    pendingAdmissions: 0,
    attendanceRate: 0,
    hostelOccupancy: 0,
    activeNotices: 0,
    libraryBooks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get('/api/admin/dashboard-stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12% from last month'
    },
    {
      title: 'Faculty Members',
      value: stats.totalFaculty,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+3 new this month'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '+8% from last month'
    },
    {
      title: 'Pending Admissions',
      value: stats.pendingAdmissions,
      icon: UserCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: 'Needs review'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          AI Screen Agent available in sidebar →
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
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

          {/* Additional dashboard content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">New student registered</p>
                    <p className="text-xs text-blue-600">John Doe - Computer Science</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900">Notice published</p>
                    <p className="text-xs text-green-600">Exam schedule updated</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Attendance Rate</span>
                  <span className="font-semibold">{stats.attendanceRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Hostel Occupancy</span>
                  <span className="font-semibold">{stats.hostelOccupancy}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Notices</span>
                  <span className="font-semibold">{stats.activeNotices}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Library Books</span>
                  <span className="font-semibold">{stats.libraryBooks.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;