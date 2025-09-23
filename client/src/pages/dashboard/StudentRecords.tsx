import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

type Issue = {
  id: string;
  book: { title: string; author: string; isbn?: string };
  student: { id: string; firstName: string; lastName: string; studentId?: string; department?: string };
  issueDate: string;
  dueDate?: string;
  returnDate?: string | null;
  status: string;
};

const StudentRecords: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // New: modal & form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [form, setForm] = useState({ studentId: '', bookId: '', dueDate: '' });

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/library/issued');
      setIssues(res.data.issues || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load issued records');
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students & books for dropdowns
  const fetchDropdowns = async () => {
    try {
      const [sRes, bRes] = await Promise.all([
        axios.get('/api/library/students'),
        axios.get('/api/library/books')
      ]);
      setStudents(sRes.data.students || []);
      setBooks(bRes.data.books || []);
    } catch (err) {
      console.error('Dropdown fetch error', err);
      toast.error('Failed to load students or books for form');
    }
  };

  const openAddModal = async () => {
    setIsAddOpen(true);
    await fetchDropdowns();
  };

  const closeAddModal = () => {
    setIsAddOpen(false);
    setForm({ studentId: '', bookId: '', dueDate: '' });
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.studentId || !form.bookId) return toast.error('Select student and book');
      await axios.post('/api/library/issue', { studentId: form.studentId, bookId: form.bookId, dueDate: form.dueDate || undefined });
      toast.success('Book issued');
      closeAddModal();
      fetchIssues();
    } catch (err:any) {
      console.error('Issue error', err);
      toast.error(err.response?.data?.message || 'Failed to issue book');
    }
  };

  const markReturned = async (issueId: string) => {
    if (!confirm('Mark this book as returned?')) return;
    try {
      await axios.post(`/api/library/return/${issueId}`);
      toast.success('Marked returned');
      fetchIssues();
    } catch (err:any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to mark return');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Student Records — Book Issues</h1>
        <div className="flex items-center space-x-2">
          <button onClick={fetchIssues} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
          <button onClick={openAddModal} className="px-3 py-2 bg-primary-600 text-white rounded">Add Record</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {loading ? <div>Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2">Student</th>
                  <th className="py-2">Student ID</th>
                  <th className="py-2">Book</th>
                  <th className="py-2">Issued</th>
                  <th className="py-2">Due</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="py-2">{i.student.firstName} {i.student.lastName}</td>
                    <td className="py-2">{i.student.studentId || i.student.id}</td>
                    <td className="py-2">{i.book.title} — <span className="text-xs text-gray-500">{i.book.author}</span></td>
                    <td className="py-2">{new Date(i.issueDate).toLocaleDateString()}</td>
                    <td className="py-2">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '—'}</td>
                    <td className="py-2">{i.status}</td>
                    <td className="py-2">
                      {i.status !== 'RETURNED' ? (
                        <button onClick={()=>markReturned(i.id)} className="px-3 py-1 bg-green-600 text-white rounded">Mark Returned</button>
                      ) : (
                        <span className="text-sm text-gray-500">Returned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Book Issue Record</h3>
              <button onClick={closeAddModal} className="text-gray-600">Close</button>
            </div>

            <form onSubmit={submitAdd} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Student</label>
                <select required value={form.studentId} onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))} className="w-full p-2 border rounded">
                  <option value="">Select student</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} {s.studentId ? `• ${s.studentId}` : ''} {s.department ? `• ${s.department}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Book</label>
                <select required value={form.bookId} onChange={e => setForm(f => ({ ...f, bookId: e.target.value }))} className="w-full p-2 border rounded">
                  <option value="">Select book</option>
                  {books.map(b => (
                    <option key={b.id} value={b.id}>{b.title} — {b.author} • {b.availableCopies}/{b.totalCopies} available</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Due Date (optional)</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full p-2 border rounded" />
              </div>

              <div className="flex justify-end space-x-2">
                <button type="button" onClick={closeAddModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Issue Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRecords;
