import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FeesManagement: React.FC = () => {
  const [structures, setStructures] = useState<any[]>([]);
  // Student lookup states
  const [studentQuery, setStudentQuery] = useState(''); // search by name / studentId / email
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null); // selected user object
  const [studentFees, setStudentFees] = useState<any[]>([]);
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
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Fee structures ----
  const fetchStructures = async () => {
    try {
      const res = await axios.get('/api/fees/structures');
      // accept: direct array OR { data: [...] } OR { success: true, data: [...] } OR { data: { structures: [...] } }
      const arr = extractArray(res, ['data', 'data.structures', 'structures']);
      setStructures(arr);
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
        feeId: txn.feeId || undefined,
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

  // ---- Payments table ----
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Structures */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Fee Structures</h2>
          <ul className="space-y-2">
            {(Array.isArray(structures) ? structures : []).map(s => (
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

        {/* Student Lookup & Fees */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Student Fees Lookup</h2>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input value={studentQuery} onChange={e => setStudentQuery(e.target.value)} placeholder="Search by name / student ID / email" className="flex-1 p-2 border rounded" />
              <button onClick={lookupStudent} className="px-3 py-2 bg-primary-600 text-white rounded">Find</button>
            </div>

            {selectedStudent ? (
              <div className="mt-3 text-sm border p-2 rounded">
                <div className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</div>
                <div className="text-xs text-gray-500">Student ID: {selectedStudent.studentId || '-'}</div>
                <div className="text-xs text-gray-500">Dept: {selectedStudent.department || '-'}</div>

                <div className="mt-3">
                  <div className="text-xs text-gray-600 mb-1">Outstanding Fees</div>
                  {studentFees.length === 0 ? <div className="text-sm text-gray-500">No fee items</div> : (
                    <ul className="text-sm space-y-1">
                      {studentFees.map(f => (
                        <li key={f.id} className="flex justify-between">
                          <div>
                            <div className="font-medium">{f.feeType}</div>
                            <div className="text-xs text-gray-500">{f.academicYear} {f.semester ? `• ${f.semester}` : ''}</div>
                          </div>
                          <div>
                            <div>₹{f.amount - (f.paidAmount || 0)}</div>
                            <div className="text-xs text-gray-500">{f.status}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : <div className="text-sm text-gray-500">No student selected</div>}
          </div>
        </div>

        {/* Record Payment */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Record Payment</h2>
          <div className="space-y-2">
            <div>
              <label className="text-sm">Student</label>
              <div className="text-sm">{selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : <span className="text-gray-500">None selected</span>}</div>
            </div>

            <div>
              <label className="text-sm block">Fee Type</label>
              <select value={txn.feeCategory} onChange={e => setTxn(s => ({ ...s, feeCategory: e.target.value }))} className="w-full p-2 border rounded">
                <option value="">-- Select fee type (optional) --</option>
                <option value="TUITION">Tuition</option>
                <option value="EXAMINATION">Examination</option>
                <option value="HOSTEL">Hostel</option>
                <option value="MESS">Mess</option>
                <option value="LIBRARY">Library</option>
                <option value="ANNUAL">Annual</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm block">Apply to Fee Item (optional)</label>
              <select value={txn.feeId} onChange={e => setTxn(s => ({ ...s, feeId: e.target.value }))} className="w-full p-2 border rounded">
                <option value="">-- Select fee item or leave blank --</option>
                {studentFees.map(f => (
                  <option key={f.id} value={f.id}>{f.feeType} • ₹{f.amount - (f.paidAmount || 0)} • {f.status}</option>
                ))}
              </select>
            </div>

            <input value={txn.amount} onChange={e => setTxn(s => ({ ...s, amount: e.target.value }))} placeholder="Amount" className="w-full p-2 border rounded" />
            <select value={txn.method} onChange={e => setTxn(s => ({ ...s, method: e.target.value }))} className="w-full p-2 border rounded">
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="ONLINE">Online</option>
            </select>
            <input value={txn.reference} onChange={e => setTxn(s => ({ ...s, reference: e.target.value }))} placeholder="Reference (optional)" className="w-full p-2 border rounded" />

            <button disabled={!selectedStudent || !txn.amount} onClick={recordPayment} className="w-full bg-primary-600 text-white py-2 rounded disabled:opacity-50">
              Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* Latest Payments Table */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Latest Fee Payments</h2>
          <div className="flex items-center space-x-2">
            <input value={paymentsSearch} onChange={e => setPaymentsSearch(e.target.value)} placeholder="Search name / student id / mode" className="px-3 py-2 border rounded" />
            <select value={paymentsModeFilter} onChange={e => { setPaymentsModeFilter(e.target.value); fetchPayments(1); }} className="px-3 py-2 border rounded">
              <option value="">All modes</option>
              <option>UPI</option>
              <option>CASH</option>
              <option>CARD</option>
              <option>ONLINE</option>
              <option>CHEQUE</option>
            </select>
            <button onClick={() => { setPaymentsPage(1); fetchPayments(1); }} className="px-3 py-2 bg-gray-100 rounded">Apply</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-sm font-medium">#</th>
                <th className="px-3 py-2 text-left text-sm font-medium cursor-pointer" onClick={() => toggleSort('transactionAt')}>Date & Time</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Student</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Fee Type</th>
                <th className="px-3 py-2 text-right text-sm font-medium cursor-pointer" onClick={() => toggleSort('amount')}>Amount (₹)</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Mode</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Status</th>
                <th className="px-3 py-2 text-center text-sm font-medium">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {paymentsLoading ? (
                <tr><td colSpan={8} className="p-4 text-center">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={8} className="p-4 text-center text-gray-500">No payments found</td></tr>
              ) : payments.map((p, idx) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-sm">{(paymentsPage - 1) * paymentsLimit + idx + 1}</td>
                  <td className="px-3 py-2 text-sm">{new Date(p.transactionAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium">{p.student ? `${p.student.firstName} ${p.student.lastName}` : '-'}</div>
                    <div className="text-xs text-gray-500">{p.student?.studentId || p.student?.email || '-'}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{p.feeCategory || p.fee?.feeType || '-'}</td>
                  <td className="px-3 py-2 text-sm text-right">₹{p.amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm">{p.method}</td>
                  <td className="px-3 py-2 text-sm">{p.status === 'COMPLETED' ? '✅ Success' : p.status === 'PENDING' ? '⏳ Pending' : '❌ Failed'}</td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => {
                      // printable receipt window and auto-print (user may choose Save as PDF)
                      const receiptHtml = `
                        <html>
                          <head>
                            <title>Receipt - ${p.id}</title>
                            <style>
                              body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                              .header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
                              .h1 { font-size:18px; font-weight:700; }
                              .table { width:100%; border-collapse: collapse; margin-top:12px; }
                              .table td { padding:8px 0; border-bottom:1px solid #e5e7eb; }
                              .right { text-align:right; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div>
                                <div class="h1">College ERP - Receipt</div>
                                <div>Txn ID: ${p.id}</div>
                              </div>
                              <div style="text-align:right">
                                <div>${new Date(p.transactionAt).toLocaleString()}</div>
                                <div>Mode: ${p.method}</div>
                              </div>
                            </div>

                            <table class="table">
                              <tr><td><strong>Student</strong></td><td class="right">${p.student ? `${p.student.firstName} ${p.student.lastName}` : '-'}</td></tr>
                              <tr><td><strong>Student ID</strong></td><td class="right">${p.student?.studentId || '-'}</td></tr>
                              <tr><td><strong>Fee Type</strong></td><td class="right">${p.feeCategory || p.fee?.feeType || '-'}</td></tr>
                              <tr><td><strong>Reference</strong></td><td class="right">${p.reference || '-'}</td></tr>
                              <tr><td><strong>Amount</strong></td><td class="right">₹${p.amount}</td></tr>
                            </table>

                            <div style="margin-top:24px; font-size:12px; color:#6b7280">
                              This is a system generated receipt. For queries contact accounts.
                            </div>

                            <script>
                              // Auto-trigger print dialog when opened
                              window.onload = function() {
                                setTimeout(() => { window.print(); }, 300);
                              };
                            </script>
                          </body>
                        </html>
                      `;
                      const w = window.open('', '_blank', 'noopener,noreferrer');
                      if (w) {
                        w.document.write(receiptHtml);
                        w.document.close();
                      } else {
                        toast.error('Unable to open receipt window (popup blocked?)');
                      }
                    }} className="text-blue-600 text-sm hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination (unchanged) */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Page {paymentsPage} of {paymentsTotalPages}</div>
          <div className="flex items-center space-x-2">
            <button disabled={paymentsPage <= 1} onClick={() => onPaymentsPageChange(paymentsPage - 1)} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Prev</button>
            <button disabled={paymentsPage >= paymentsTotalPages} onClick={() => onPaymentsPageChange(paymentsPage + 1)} className="px-3 py-1 bg-gray-100 rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeesManagement;
