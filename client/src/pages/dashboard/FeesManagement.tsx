import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

type StudentSummary = {
  totalDue: number;
  totalPaid: number;
  totalAmount: number;
  overdueFees: number;
  totalFees: number;
};

const FeesManagement: React.FC = () => {
  const { user } = useAuth();
  // Hardcoded fee structures (display-only)
  const HARDCODED_STRUCTURES = [
    { id: 'fs-exam', name: 'Examination Fee', description: 'Semester/term exam fee', amount: 500, academicYear: new Date().getFullYear().toString(), course: 'General' },
    { id: 'fs-tuition', name: 'Tuition Fee (Year)', description: 'Annual tuition fee', amount: 50000, academicYear: new Date().getFullYear().toString(), course: 'All' },
    { id: 'fs-hostel', name: 'Hostel Fee (Annual)', description: 'Hostel accommodation fee', amount: 30000, academicYear: new Date().getFullYear().toString(), course: 'Hostel' },
    { id: 'fs-mess', name: 'Mess Fee (Monthly)', description: 'Monthly mess charges', amount: 3000, academicYear: new Date().getFullYear().toString(), course: 'Hostel' },
    { id: 'fs-library', name: 'Library Fee', description: 'Library & resources fee', amount: 1000, academicYear: new Date().getFullYear().toString(), course: 'All' },
    { id: 'fs-annual', name: 'Annual Development Fee', description: 'One-time annual development fee', amount: 2000, academicYear: new Date().getFullYear().toString(), course: 'All' }
  ];

  const [structures, setStructures] = useState<any[]>(HARDCODED_STRUCTURES);
  // Student lookup states
  const [studentQuery, setStudentQuery] = useState(''); // search by name / studentId / email
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null); // selected user object
  // Payment form state
  const [txn, setTxn] = useState({ amount: '', method: 'CASH', reference: '', feeId: '', feeCategory: '' });

  // Payments table states
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsLimit] = useState(10);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsSearch, setPaymentsSearch] = useState('');
  const [paymentsModeFilter, setPaymentsModeFilter] = useState('');
  const [sortBy, setSortBy] = useState('transactionAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // --- Student specific state ---
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(null);
  const [studentTransactions, setStudentTransactions] = useState<any[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const isStudent = user?.role === 'STUDENT';

  // helper to safely extract array from various API response shapes
  const extractArray = (res: any, candidates: string[] = []) => {
    if (!res) return [];
    // if response is an array directly
    if (Array.isArray(res.data)) return res.data;
    // try candidate paths on res.data
    for (const path of candidates) {
      const parts = path.split('.');
      let current: any = res.data;
      for (const p of parts) {
        if (current == null) break;
        current = current[p];
      }
      if (Array.isArray(current)) return current;
    }
    // fallback: res.data.data if array
    if (Array.isArray(res.data?.data)) return res.data.data;
    // fallback: if res.data itself is array-like
    if (Array.isArray(res)) return res;
    return [];
  };

  // helper to extract object data safely
  const extractObject = (res: any, candidates: string[] = []) => {
    if (!res) return null;
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
    for (const path of candidates) {
      const parts = path.split('.');
      let current: any = res.data;
      for (const p of parts) {
        if (current == null) break;
        current = current[p];
      }
      if (current && typeof current === 'object' && !Array.isArray(current)) return current;
    }
    return null;
  };

  useEffect(() => {
    fetchStructures();
    if (isStudent) {
      fetchStudentData();
    } else {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch student fees & transactions
  const fetchStudentData = async () => {
    if (!user) return;
    try {
      setStudentLoading(true);
      const res = await axios.get(`/api/fees/student/${user.id}`);
      // server returns { success: true, data: { student, summary, fees, transactions } }
      const data = res.data?.data || res.data;
      setStudentFees(Array.isArray(data?.fees) ? data.fees : []);
      setStudentTransactions(Array.isArray(data?.transactions) ? data.transactions : []);
      setStudentSummary(data?.summary ?? null);
    } catch (err) {
      console.error('Fetch student fees error', err);
      toast.error('Failed to load your fee details');
      setStudentFees([]);
      setStudentTransactions([]);
      setStudentSummary(null);
    } finally {
      setStudentLoading(false);
    }
  };

  const payForFee = async (fee: any) => {
    if (!user) return toast.error('User not available');
    const due = Math.max(0, (fee.amount || 0) - (fee.paidAmount || 0));
    const input = prompt(`Enter amount to pay for "${fee.feeType || fee.name}" (due ₹${due.toLocaleString()})`, `${due}`);
    if (!input) return;
    const amount = Number(input);
    if (isNaN(amount) || amount <= 0) return toast.error('Enter a valid amount');
    try {
      setPaying(true);
      const payload: any = {
        studentId: user.id,
        feeId: fee.id,
        amount,
        method: 'ONLINE',
        reference: `WEBPAY-${Date.now()}`
      };
      await axios.post('/api/fees/transactions', payload);
      toast.success('Payment recorded');
      // Refresh student data to reflect updated amounts and transactions
      fetchStudentData();
    } catch (err: any) {
      console.error('Payment error', err);
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  // ---- Fee structures ----
  const fetchStructures = async () => {
    try {
      const res = await axios.get('/api/fees/structures');
      // accept: direct array OR { data: [...] } OR { success: true, data: [...] } OR { data: { structures: [...] } }
      const arr = extractArray(res, ['data', 'data.structures', 'structures']);
      // use server results if present, otherwise show hardcoded list
      setStructures((Array.isArray(arr) && arr.length > 0) ? arr : HARDCODED_STRUCTURES);
    } catch (err: any) {
      console.error('Fetch fee structures error', err);
      if (err.response?.status === 401) {
        toast.error('Please login to view fee structures');
      } else if (err.response?.status === 403) {
        toast.error('Not authorized to view fee structures');
      } else {
        toast.error('Failed to load fee structures — showing defaults');
      }
      // fallback to hardcoded structures when fetch fails
      setStructures(HARDCODED_STRUCTURES);
    }
  };

  // ---- Student lookup & fees ----
  const lookupStudent = async () => {
    if (!studentQuery) return toast.error('Enter student name / ID / email to search');
    try {
      // Use admin users endpoint - search students
      const res = await axios.get('/api/admin/users', { params: { search: studentQuery, role: 'STUDENT', limit: 5 } });
      const users = extractArray(res, ['users', 'data.users']) as any[];
      if (users.length === 0) {
        setSelectedStudent(null);
        setStudentFees([]);
        return toast.error('No student found');
      }
      const student = users[0];
      setSelectedStudent(student);
      // fetch student fees - handle multiple response shapes
      const feesRes = await axios.get(`/api/fees/student/${student.id}`);
      // possible shapes:
      // - array directly
      // - { fees: [...] }
      // - { data: { fees: [...], transactions: [...] } }
      // - { success: true, data: { fees: [...] } }
      const fees = extractArray(feesRes, ['fees', 'data.fees', 'data.data.fees', 'data.data']);
      setStudentFees(fees);
      toast.success(`Found ${student.firstName} ${student.lastName}`);
    } catch (err) {
      console.error(err);
      toast.error('Student lookup failed');
    }
  };

  // ---- Record payment ----
  const recordPayment = async () => {
    if (!selectedStudent) return toast.error('Please lookup and select a student first');
    if (!txn.amount || isNaN(Number(txn.amount)) || Number(txn.amount) <= 0) return toast.error('Enter a valid amount');
    try {
      const payload: any = {
        studentId: selectedStudent.id, // backend resolves by id
        amount: Number(txn.amount),
        method: txn.method,
        reference: txn.reference || undefined,
        // removed feeId from payload (optional fee-item apply removed)
        feeCategory: txn.feeCategory || undefined
      };
      await axios.post('/api/fees/transactions', payload);
      toast.success('Payment recorded');
      // reset form
      setTxn({ amount: '', method: 'CASH', reference: '', feeId: '', feeCategory: '' });
      // refresh student fees and payments table
      if (selectedStudent) {
        const feesRes = await axios.get(`/api/fees/student/${selectedStudent.id}`);
        // normalize possible response shape
        setStudentFees(feesRes.data?.fees || feesRes.data?.data?.fees || []);
      }
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  // ---- Payments table (admin) ----
  const fetchPayments = async (page = paymentsPage) => {
    try {
      setPaymentsLoading(true);
      const res = await axios.get('/api/fees/transactions', {
        params: {
          page,
          limit: paymentsLimit,
          search: paymentsSearch || undefined,
          mode: paymentsModeFilter || undefined,
          sortBy,
          sortDir
        }
      });

      // handle various server response shapes:
      // 1) { transactions: [...], pagination: {...} }
      // 2) { success: true, data: { transactions: [...], pagination: {...} } }
      // 3) { data: { transactions: [...], pagination: {...} } }
      // 4) { data: [...] } (unlikely)
      const dataObj = extractObject(res, ['data', 'data.data']) || {};
      const transactions = Array.isArray(res.data?.transactions)
        ? res.data.transactions
        : Array.isArray(res.data?.data?.transactions)
          ? res.data.data.transactions
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : Array.isArray(dataObj.transactions)
                ? dataObj.transactions
                : [];

      const pagination =
        res.data?.pagination ||
        res.data?.data?.pagination ||
        dataObj.pagination ||
        res.data?.data?.pagination ||
        { pages: 1, total: transactions.length };

      setPayments(transactions || []);
      setPaymentsTotalPages(pagination.pages || 1);
    } catch (err) {
      console.error('Fetch payments error', err);
      toast.error('Failed to load payments');
      setPayments([]);
      setPaymentsTotalPages(1);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const onPaymentsPageChange = (newPage: number) => {
    setPaymentsPage(newPage);
    fetchPayments(newPage);
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
    // refetch first page
    setPaymentsPage(1);
    fetchPayments(1);
  };

  // CSV export (Excel-compatible)
  const exportCSV = () => {
    if (!payments || payments.length === 0) return toast.error('No payments to export');
    const headers = ['Transaction ID','Date & Time','Student Name','Student ID','Fee Type','Amount (₹)','Mode','Status','Reference'];
    const rows = payments.map((p:any, idx:number) => {
      const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}` : '';
      const studentRefId = p.student?.studentId || p.student?.id || '';
      const feeType = p.fee?.feeType || '';
      return [
        p.id || (idx+1),
        new Date(p.transactionAt).toLocaleString(),
        studentName,
        studentRefId,
        feeType,
        p.amount,
        p.method,
        p.status,
        p.reference || ''
      ];
    });

    const csvContent = [headers, ...rows].map(r => r.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const date = new Date().toISOString().split('T')[0];
    const filename = `Fee_Payments_${date}.csv`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fees Management</h1>
        <div className="flex items-center space-x-2">
          <button onClick={() => { fetchStructures(); fetchPayments(1); }} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
          <button onClick={exportCSV} className="px-3 py-2 bg-green-600 text-white rounded">Export to Excel</button>
        </div>
      </div>

      {/* If current user is a student show student view, otherwise show admin view */}
      {isStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Your Summary</h2>
            {studentLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <div className="text-sm mb-2">Total Due</div>
                <div className="text-2xl font-bold mb-2">₹{(studentSummary?.totalDue ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">Total Paid: ₹{(studentSummary?.totalPaid ?? 0).toLocaleString()}</div>
                <div className="mt-3">
                  <button onClick={fetchStudentData} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-1 bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Outstanding Fees</h2>
            {studentLoading ? <p>Loading...</p> : studentFees.length === 0 ? (
              <div className="text-sm text-gray-500">No outstanding fees</div>
            ) : (
              <ul className="space-y-2">
                {studentFees.map(f => {
                  const due = Math.max(0, (f.amount || 0) - (f.paidAmount || 0));
                  return (
                    <li key={f.id || f.feeType} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <div className="font-medium">{f.feeType || f.name}</div>
                        <div className="text-xs text-gray-500">{f.academicYear || ''} {f.semester ? `• ${f.semester}` : ''}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{due.toLocaleString()}</div>
                        <div className="mt-2">
                          <button disabled={due <= 0 || paying} onClick={() => payForFee(f)} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">
                            {paying ? 'Processing...' : due <= 0 ? 'Paid' : 'Pay'}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="lg:col-span-1 bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Recent Payments</h2>
            {studentLoading ? <p>Loading...</p> : studentTransactions.length === 0 ? (
              <div className="text-sm text-gray-500">No payments found</div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-auto">
                {studentTransactions.map((p:any) => (
                  <div key={p.id} className="p-2 border rounded text-sm">
                    <div className="flex justify-between">
                      <div className="font-medium">{p.fee?.feeType || p.feeCategory || '-'}</div>
                      <div>₹{p.amount}</div>
                    </div>
                    <div className="text-xs text-gray-500">{new Date(p.transactionAt).toLocaleString()} • {p.method}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fee Structures */}
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-2">Fee Structures</h2>

            <ul className="space-y-2">
              {(Array.isArray(structures) ? structures : HARDCODED_STRUCTURES).slice(0, 6).map(s => (
                <li key={s.id || s.name} className="flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.course || s.academicYear}</div>
                  </div>
                  <div>₹{s.amount}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin payments table / controls (left as before) */}
          <div className="lg:col-span-2 bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-4">Latest Fee Payments</h2>
            {/* Admin payments table & controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input value={paymentsSearch} onChange={e=>setPaymentsSearch(e.target.value)} placeholder="Search transactions" className="px-3 py-2 border rounded" />
                <select value={paymentsModeFilter} onChange={e=>setPaymentsModeFilter(e.target.value)} className="px-3 py-2 border rounded">
                  <option value="">All modes</option>
                  <option value="ONLINE">Online</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
                <button onClick={() => { setPaymentsPage(1); fetchPayments(1); }} className="px-3 py-2 bg-gray-100 rounded">Apply</button>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => { setPaymentsPage(1); fetchPayments(1); }} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs text-gray-500">
                  <tr>
                    <th className="py-2 cursor-pointer" onClick={() => toggleSort('id')}>Txn ID</th>
                    <th className="py-2 cursor-pointer" onClick={() => toggleSort('transactionAt')}>Date</th>
                    <th className="py-2">Student</th>
                    <th className="py-2">Student ID</th>
                    <th className="py-2">Fee Type</th>
                    <th className="py-2 cursor-pointer" onClick={() => toggleSort('amount')}>Amount</th>
                    <th className="py-2">Mode</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsLoading ? (
                    <tr><td colSpan={9} className="p-4">Loading...</td></tr>
                  ) : payments.length === 0 ? (
                    <tr><td colSpan={9} className="p-4 text-sm text-gray-500">No payments found</td></tr>
                  ) : payments.map((p:any) => (
                    <tr key={p.id} className="border-t">
                      <td className="py-2">{p.id}</td>
                      <td className="py-2">{new Date(p.transactionAt).toLocaleString()}</td>
                      <td className="py-2">{p.student ? `${p.student.firstName} ${p.student.lastName}` : '-'}</td>
                      <td className="py-2">{p.student?.studentId || p.student?.id || '-'}</td>
                      <td className="py-2">{p.fee?.feeType || p.feeCategory || '-'}</td>
                      <td className="py-2">₹{Number(p.amount || 0).toLocaleString()}</td>
                      <td className="py-2">{p.method}</td>
                      <td className="py-2">{p.status}</td>
                      <td className="py-2">{p.reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <div>
                Page {paymentsPage} of {paymentsTotalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button disabled={paymentsPage <= 1} onClick={() => onPaymentsPageChange(paymentsPage - 1)} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Prev</button>
                <button disabled={paymentsPage >= paymentsTotalPages} onClick={() => onPaymentsPageChange(paymentsPage + 1)} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Next</button>
              </div>
            </div>
            {/* end admin payments */}
          </div>
        </div>
      )} 
    </div>
  );
};

export default FeesManagement;
