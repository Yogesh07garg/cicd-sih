import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Bell, Clock, User, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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
  publishedAt?: string;
  recipients?: Array<{ readAt?: string }>;
};

const NoticesManagement: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isAdminOrFaculty = user?.role === 'ADMIN' || user?.role === 'FACULTY';

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    if (isStudent) {
      fetchStudentNotices();
    } else {
      fetchAdminNotices();
    }
  }, [isStudent]);

  // Student notices - read-only from regular notices endpoint
  const fetchStudentNotices = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/notices');
      const data = Array.isArray(res.data) ? res.data : res.data?.notices || [];
      setNotices(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  // Admin/Faculty notices - CRUD from admin endpoint
  const fetchAdminNotices = async () => {
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

  const markAsRead = async (id: string) => {
    try {
      await axios.post(`/api/notices/${id}/read`);
      toast.success('Marked as read');
      setNotices(prev => prev.map(n => n.id === id ? { 
        ...n, 
        recipients: [{ readAt: new Date().toISOString() }] 
      } : n));
    } catch (err) {
      console.error('Mark read error', err);
      toast.error('Failed to mark as read');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const resetForm = () => setForm({ title: '', content: '', priority: 'NORMAL', targetAudience: 'ALL', targetValue: '', isPublished: false, expiresAt: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await axios.post('/api/notices', form);
      toast.success('Notice created');
      resetForm();
      fetchAdminNotices();
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
      fetchAdminNotices();
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
      fetchAdminNotices();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '-';
    try { 
      return new Date(d).toLocaleString(); 
    } catch { 
      return d; 
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'NORMAL': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Student View - Read-only notices
  if (isStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-3 rounded-lg shadow-sm border">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notices</h1>
              <p className="text-sm text-gray-500">Latest announcements and notices</p>
            </div>
          </div>

          <button
            onClick={fetchStudentNotices}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">All Notices</h2>
            <div className="text-sm text-gray-500">
              {notices.length} notice{notices.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading notices...</p>
            </div>
          ) : notices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No notices available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => {
                const readAt = notice.recipients && notice.recipients.length > 0 ? notice.recipients[0].readAt : null;
                const isExpanded = expandedId === notice.id;
                
                return (
                  <div key={notice.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900">{notice.title}</h3>
                            {notice.priority && (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(notice.priority)}`}>
                                {notice.priority}
                              </span>
                            )}
                            {readAt && (
                              <span className="flex items-center text-xs text-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Read
                              </span>
                            )}
                          </div>

                          <div className="flex items-center text-sm text-gray-500 mb-3 space-x-4">
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {notice.author?.firstName ?? 'Unknown'} {notice.author?.lastName ?? ''}
                              {notice.author?.role && (
                                <span className="ml-1 text-xs">({notice.author.role})</span>
                              )}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(notice.publishedAt || notice.createdAt)}
                            </span>
                          </div>

                          <div className="text-sm text-gray-700">
                            {isExpanded ? (
                              <div className="prose max-w-none whitespace-pre-wrap">
                                {notice.content}
                              </div>
                            ) : (
                              <div className="line-clamp-2">
                                {notice.content.length > 150 
                                  ? `${notice.content.substring(0, 150)}...` 
                                  : notice.content
                                }
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="ml-4 flex-shrink-0 flex flex-col items-end space-y-2">
                          <button
                            onClick={() => toggleExpand(notice.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          >
                            {isExpanded ? 'Show Less' : 'Read More'}
                          </button>

                          {!readAt && (
                            <button
                              onClick={() => markAsRead(notice.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Bell className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Stay Updated</h3>
              <p className="text-sm text-blue-700 mt-1">
                Important notices will be highlighted with priority levels. Make sure to check regularly for updates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin/Faculty View - Full CRUD operations
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
          <button onClick={isAdminOrFaculty ? fetchAdminNotices : fetchStudentNotices} className="px-3 py-2 bg-gray-100 rounded-md">Apply</button>
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
              <button type="submit" disabled={creating} className="flex-1 bg-primary-600 text-white py-2 rounded">{editing ? 'Update' : 'Create'}</button>
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
                      <div className="text-xs text-gray-500">{formatDate(n.createdAt)}</div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{n.content.substring(0, 150)}{n.content.length > 150 ? '...' : ''}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      {n.priority} • {n.targetAudience} {n.targetValue ? `• ${n.targetValue}` : ''}
                      {n.isPublished ? ' • Published' : ' • Draft'}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col space-y-2">
                    <button onClick={() => handleEdit(n)} className="text-blue-600 text-sm">Edit</button>
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
