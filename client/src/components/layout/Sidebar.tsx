import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X, 
  LayoutDashboard, 
  Users, 
  FileText, 
  Calendar, 
  BookOpen, 
  DollarSign, 
  Building, 
  QrCode,
  Settings,
  BarChart3,
  Bell,
  UserCheck,
  GraduationCap,
  CreditCard,
  Home,
  UserCog,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const getMenuItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard/home', icon: LayoutDashboard },
    ];

    switch (user?.role) {
      case 'ADMIN':
        return [
          ...baseItems,
          { name: 'User Management', href: '/dashboard/users', icon: Users },
          { name: 'Admissions', href: '/dashboard/admissions', icon: UserCheck },
          { name: 'Notice Board', href: '/dashboard/notices', icon: Bell },
          { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3 },
          { name: 'Fees Management', href: '/dashboard/fees', icon: DollarSign },
          { name: 'Examinations', href: '/dashboard/exams', icon: ClipboardList },
          { name: 'Hostel Management', href: '/dashboard/hostel', icon: Building },
          // { name: 'AI Tools', href: '/dashboard/ai-tools', icon: Settings },
        ];
      
      case 'FACULTY':
        return [
          ...baseItems,
          { name: 'QR Attendance', href: '/dashboard/attendance', icon: QrCode },
          { name: 'Examinations', href: '/dashboard/exams', icon: ClipboardList },
          { name: 'Academics', href: '/dashboard/academics', icon: BookOpen },
          { name: 'Notices', href: '/dashboard/notices', icon: Bell },
          { name: 'Student Progress', href: '/dashboard/students', icon: GraduationCap },
        ];
      
      case 'STUDENT':
        return [
          ...baseItems,
          { name: 'QR Code', href: '/dashboard/qr-code', icon: QrCode },
          { name: 'Academics', href: '/dashboard/academics', icon: BookOpen },
          { name: 'Fees', href: '/dashboard/fees', icon: CreditCard },
          { name: 'Library', href: '/dashboard/library', icon: BookOpen },
          { name: 'Hostel', href: '/dashboard/hostel', icon: Home },
          { name: 'Placement', href: '/dashboard/placement', icon: GraduationCap },
        ];
      
      case 'ACCOUNTANT':
        return [
          ...baseItems,
          { name: 'Fees Management', href: '/dashboard/fees', icon: DollarSign },
          { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
          { name: 'Scholarships', href: '/dashboard/scholarships', icon: GraduationCap },
        ];
      
      case 'LIBRARIAN':
        return [
          ...baseItems,
          { name: 'Book Management', href: '/dashboard/books', icon: BookOpen },
          { name: 'Student Records', href: '/dashboard/student-records', icon: Users },
          { name: 'Digital Library', href: '/dashboard/digital-library', icon: FileText },
        ];
      
      case 'WARDEN':
        return [
          ...baseItems,
          { name: 'Hostel Management', href: '/dashboard/hostel', icon: Building },
          { name: 'Room Allocation', href: '/dashboard/rooms', icon: Home },
          { name: 'Student Life', href: '/dashboard/student-life', icon: Users },
          { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
        ];
      
      default:
        return baseItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
        transition-transform duration-300 ease-in-out
      `}>
        <div className="flex items-center justify-between p-4 border-b border-sidebar-hover">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-sidebar" />
            </div>
            <h1 className="text-white text-xl font-bold">College ERP</h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-4">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-sidebar-light text-white' 
                      : 'text-gray-200 hover:bg-sidebar-hover hover:text-white'
                    }
                  `}
                  onClick={() => onClose()}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-hover">
          <div className="flex items-center space-x-3 text-gray-200">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <UserCog className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;