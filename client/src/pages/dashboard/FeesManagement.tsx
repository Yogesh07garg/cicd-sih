import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FeesManagement: React.FC = () => {
  const [structures, setStructures] = useState<any[]>([]);
  const [studentId, setStudentId] = useState('');
  const [studentData, setStudentData] = useState<any>(null);
  const [txn, setTxn] = useState({ amount: '', method: 'CASH', reference: '' });

  useEffect(() => {
    fetchStructures();
  }, []);

  const fetchStructures = async () => {
    try {
      const res = await axios.get('/api/fees/structures');
      setStructures(res.data || []);
    } catch (err: any) {
      console.error('Fetch fee structures error', err);
      if (err.response?.status === 401) {
        toast.error('Please login to view fee structures');
      } else if (err.response?.status === 403) {
        toast.error('Not authorized to view fee structures');
      } else {
        toast.error('Failed to load fee structures');
      }
      setStructures([]);
    }
  };

  const fetchStudent = async () => {
    if (!studentId) return;
    try {
      const res = await axios.get(`/api/fees/student/${studentId}`);
      setStudentData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch student fees');
    }
  };

  const recordPayment = async () => {
    try {
      await axios.post('/api/fees/transactions', { studentId, amount: parseFloat(txn.amount), method: txn.method, reference: txn.reference });
      toast.success('Payment recorded');
      setTxn({ amount: '', method: 'CASH', reference: '' });
      fetchStudent();
    } catch (err:any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fees Management</h1>
        <div>
          <button onClick={fetchStructures} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Fee Structures</h2>
          <ul className="space-y-2">
            {structures.map(s => (
              <li key={s.id} className="flex justify-between text-sm">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.course || s.academicYear}</div>
                </div>
                <div>₹{s.amount}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Student Fees Lookup</h2>
          <div className="space-y-2">
            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Student internal id" className="w-full p-2 border rounded" />
            <div className="flex space-x-2">
              <button onClick={fetchStudent} className="px-3 py-2 bg-primary-600 text-white rounded">Lookup</button>
              <button onClick={() => { setStudentId(''); setStudentData(null); }} className="px-3 py-2 bg-gray-100 rounded">Clear</button>
            </div>

            {studentData && (
              <div className="mt-3 text-sm">
                <div className="font-medium">{studentData.fees?.length || 0} fee items</div>
                <div>Total due: <strong>₹{studentData.totalDue?.toLocaleString() || 0}</strong></div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Record Payment</h2>
          <div className="space-y-2">
            <input value={txn.amount} onChange={e => setTxn(s => ({ ...s, amount: e.target.value }))} placeholder="Amount" className="w-full p-2 border rounded" />
            <select value={txn.method} onChange={e => setTxn(s => ({ ...s, method: e.target.value }))} className="w-full p-2 border rounded">
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
            </select>
            <input value={txn.reference} onChange={e => setTxn(s => ({ ...s, reference: e.target.value }))} placeholder="Reference (optional)" className="w-full p-2 border rounded" />
            <button disabled={!studentId || !txn.amount} onClick={recordPayment} className="w-full bg-primary-600 text-white py-2 rounded">Record Payment</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeesManagement;
