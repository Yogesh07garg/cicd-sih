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
      trend: '+12%'
    },
    {
      title: 'Total Faculty',
      value: stats.totalFaculty,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+3%'
    },
    {
      title: 'Revenue (Monthly)',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      trend: '+8%'
    },
    {
      title: 'Pending Admissions',
      value: stats.pendingAdmissions,
      icon: UserCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: '-5%'
    },
    {
      title: 'Attendance Rate',
      value: `${stats.attendanceRate}%`,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: '+2%'
    },
    {
      title: 'Hostel Occupancy',
      value: `${stats.hostelOccupancy}%`,
      icon: Building,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '+15%'
    },
    {
      title: 'Active Notices',
      value: stats.activeNotices,
      icon: Calendar,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      trend: '+4'
    },
    {
      title: 'Library Books',
      value: stats.libraryBooks,
      icon: BookOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      trend: '+50'
    }
  ];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString()}
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
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">
                      {card.trend}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-primary-600" />
                <span className="font-medium text-primary-900">Create New User</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Create Notice</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-900">Generate Reports</span>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New student registration
                </p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Calendar className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Notice published: Semester exam schedule
                </p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Fee payment received
                </p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;