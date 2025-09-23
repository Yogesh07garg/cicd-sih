import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const [enrollment, setEnrollment] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    // Enrollment (ADMIN)
    try {
      const enrRes = await axios.get('/api/reports/enrollment');
      setEnrollment(enrRes.data.byDepartment || enrRes.data);
    } catch (err: any) {
      console.error('Enrollment fetch error', err);
      if (err.response?.status === 403) {
        toast.error('Not authorized to view enrollment report');
      } else {
        toast.error('Failed to load enrollment report');
      }
      setEnrollment([]);
    }

    // Attendance (ADMIN)
    try {
      const attRes = await axios.get('/api/reports/attendance');
      setAttendance(attRes.data);
    } catch (err: any) {
      console.error('Attendance fetch error', err);
      if (err.response?.status === 403) {
        toast.error('Not authorized to view attendance report');
      } else {
        toast.error('Failed to load attendance report');
      }
      setAttendance(null);
    }

    // Finance trends (ACCOUNTANT or ADMIN)
    try {
      const finRes = await axios.get('/api/reports/finance/trends?months=6');
      setFinance(finRes.data);
    } catch (err: any) {
      console.error('Finance fetch error', err);
      if (err.response?.status === 403) {
        // Not authorized — show info but do not break the rest
        toast.error('Not authorized to view finance trends');
      } else {
        toast.error('Failed to load finance trends');
      }
      setFinance(null);
    }

    setLoading(false);
  };

  if (loading) return <div>Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div>
          <button onClick={fetchAll} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Enrollment by Department</h2>
          <ul className="space-y-2">
            {enrollment.length === 0 ? <li className="text-sm text-gray-500">No data or not authorized</li> : enrollment.map((d:any) => (
              <li key={d.department} className="flex justify-between">
                <span>{d.department}</span>
                <span className="font-medium">{d.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Attendance Overview</h2>
          {attendance ? (
            <>
              <p>Overall rate: <strong>{attendance.overallRate}%</strong></p>
              <div className="mt-3 space-y-2 max-h-48 overflow-auto">
                {attendance.byDept?.map((d:any) => (
                  <div key={d.department} className="flex justify-between text-sm">
                    <div>{d.department}</div>
                    <div>{d.rate}%</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">No data or not authorized</p>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Finance Trends (last months)</h2>
          {finance ? (
            <div className="text-sm">
              {finance.labels?.map((lab:string, idx:number) => (
                <div key={lab} className="flex justify-between">
                  <span>{lab}</span>
                  <span>₹{(finance.data[idx] || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No data or not authorized</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
