import React from 'react';
import { BookOpen, Users, TrendingUp, Calendar } from 'lucide-react';

const LibrarianDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Librarian Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Books</p>
              <p className="text-2xl font-bold text-gray-900">15,450</p>
              <p className="text-sm text-blue-600 font-medium">+50 this month</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Library Management</h2>
        <p className="text-gray-600">Manage books, track borrowing, and maintain digital resources.</p>
      </div>
    </div>
  );
};

export default LibrarianDashboard;