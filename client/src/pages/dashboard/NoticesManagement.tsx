import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

type Notice = {
  id: string;
  title: string;
  content: string;
  priority: string;
  targetAudience: string;
  targetValue?: string;
  isPublished: boolean;
  pinned?: boolean;
  expiresAt?: string;
  author?: { firstName: string; lastName: string; role: string };
  createdAt: string;
};

const NoticesManagement: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    priority: '',
    audience: ''
  });

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    targetAudience: 'ALL',
    targetValue: '',
    isPublished: false,
    expiresAt: ''
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (filters.search) params.search = filters.search;
      if (filters.priority) params.category = filters.priority;
      if (filters.audience) params.pinned = filters.audience === 'pinned' ? 'true' : undefined;

      const res = await axios.get('/api/notices/admin', { params });
      setNotices(res.data.notices || res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => setForm({ title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL', targetValue: '', isPublished: false, expiresAt: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await axios.post('/api/notices', form);
      toast.success('Notice created');
      resetForm();
      fetchNotices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (n: Notice) => {
    setEditing(n);
    setForm({
      title: n.title,
      content: n.content,
      priority: n.priority,
      targetAudience: n.targetAudience,
      targetValue: n.targetValue || '',
      isPublished: n.isPublished,
      expiresAt: n.expiresAt ? new Date(n.expiresAt).toISOString().split('T')[0] : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await axios.put(`/api/notices/${editing.id}`, form);
      toast.success('Notice updated');
      setEditing(null);
      resetForm();
      fetchNotices();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notice?')) return;
    try {
      await axios.delete(`/api/notices/${id}`);
      toast.success('Notice deleted');
      fetchNotices();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  const togglePin = async (id: string) => {
    try {
      await axios.post(`/api/notices/${id}/pin`);
      toast.success('Pinned status toggled');
      fetchNotices();
    } catch (err) {
      console.error(err);
      toast.error('Pin toggle failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notice Board Management</h1>

        <div className="flex items-center space-x-2">
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} placeholder="Search" className="px-3 py-2 border rounded-md" />
          <select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))} className="px-3 py-2 border rounded-md">
            <option value="">All priorities</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <button onClick={fetchNotices} className="px-3 py-2 bg-gray-100 rounded-md">Apply</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">{editing ? 'Edit Notice' : 'Create Notice'}</h2>
          <form onSubmit={editing ? handleUpdate : handleCreate} className="space-y-2">
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full p-2 border rounded" />
            <textarea required value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Content" className="w-full p-2 border rounded h-28" />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full p-2 border rounded">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <select value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} className="w-full p-2 border rounded">
              <option value="ALL">All</option>
              <option value="STUDENTS">Students</option>
              <option value="FACULTY">Faculty</option>
              <option value="DEPARTMENT">Department</option>
            </select>
            {form.targetAudience === 'DEPARTMENT' && (
              <input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })} placeholder="Department name" className="w-full p-2 border rounded" />
            )}
            <input value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} type="date" className="w-full p-2 border rounded" />
            <label className="flex items-center space-x-2">
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} />
              <span>Publish now</span>
            </label>
            <div className="flex space-x-2">
              <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded">{editing ? 'Update' : 'Create'}</button>
              {editing && <button type="button" onClick={() => { setEditing(null); resetForm(); }} className="flex-1 bg-gray-200 py-2 rounded">Cancel</button>}
            </div>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-4">Notices List</h2>
          {loading ? <div>Loading...</div> : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {notices.map(n => (
                <div key={n.id} className="p-4 border rounded flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{n.title} {n.pinned && <span className="text-xs bg-yellow-100 px-2 rounded ml-2">Pinned</span>}</h3>
                      <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{n.content.substring(0, 150)}{n.content.length > 150 ? '...' : ''}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {n.priority} • {n.targetAudience} {n.targetValue ? `• ${n.targetValue}` : ''}
                      {n.isPublished ? ' • Published' : ' • Draft'}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    <button onClick={() => handleEdit(n)} className="text-blue-600 text-sm">Edit</button>
                    <button onClick={() => togglePin(n.id)} className="text-yellow-700 text-sm">{n.pinned ? 'Unpin' : 'Pin'}</button>
                    <button onClick={() => handleDelete(n.id)} className="text-red-600 text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticesManagement;
