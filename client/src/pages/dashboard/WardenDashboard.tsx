import React from 'react';
import { Building, Users, TrendingUp, Calendar } from 'lucide-react';

const WardenDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Warden Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Hostel Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">85%</p>
              <p className="text-sm text-green-600 font-medium">+5% this semester</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <Building className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hostel Management</h2>
        <p className="text-gray-600">Manage rooms, allocations, and student life activities.</p>
      </div>
    </div>
  );
};

export default WardenDashboard;