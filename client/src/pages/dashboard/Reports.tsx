import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#6ec1ff', '#a2d39c'];

const Reports: React.FC = () => {
  const [finance, setFinance] = useState<any[]>([]);
  const [enrollment, setEnrollment] = useState<any[]>([]);
  const [feeDist, setFeeDist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [fRes, eRes, fdRes] = await Promise.all([
        axios.get('/api/reports/finance?months=6'),
        axios.get('/api/reports/enrollment'),
        axios.get('/api/reports/fee-distribution')
      ]);
      setFinance(fRes.data.data || []);
      setEnrollment(eRes.data.data || []);
      setFeeDist(fdRes.data.data || []);
    } catch (err) {
      console.error('Reports fetch error', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div>
          <button onClick={fetchReports} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow col-span-2">
          <h2 className="font-semibold mb-3">Finance Trends (last months)</h2>
          {loading ? <div>Loading...</div> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={finance}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-3">Fee Distribution</h2>
          {loading ? <div>Loading...</div> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={feeDist} dataKey="total" nameKey="category" outerRadius={80} label>
                  {feeDist.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Enrollment by Department</h2>
        {loading ? <div>Loading...</div> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={enrollment}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default Reports;

