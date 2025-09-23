import React from 'react';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';

const AccountantDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">₹25,00,000</p>
              <p className="text-sm text-green-600 font-medium">+12% from last month</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Management Dashboard</h2>
        <p className="text-gray-600">Manage student fees, track payments, and generate financial reports.</p>
      </div>
    </div>
  );
};

export default AccountantDashboard;