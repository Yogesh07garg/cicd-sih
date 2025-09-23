import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  department?: string;
  studentId?: string;
  employeeId?: string;
};

const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT',
    department: '',
    studentId: '',
    employeeId: ''
  });

  // filters & search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'inactive'
  const searchDebounce = useRef<number | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch users with filters
  const fetchUsers = async (opts?: { page?: number }) => {
    try {
      setLoading(true);
      // build query params
      const params: any = { limit: 50 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.status = statusFilter; // server will interpret
      if (opts?.page) params.page = opts.page;

      const res = await axios.get('/api/admin/users', { params });
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // debounce search input
  useEffect(() => {
    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }
    searchDebounce.current = window.setTimeout(() => {
      fetchUsers();
    }, 450);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, deptFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      toast.error('Please fill required fields');
      return;
    }

    try {
      setCreating(true);
      const payload = { ...form };

      // Only send relevant fields for chosen role
      if (payload.role !== 'STUDENT') payload.studentId = undefined;
      if (payload.role !== 'FACULTY') payload.employeeId = undefined;
      if (!payload.department) payload.department = undefined;

      await axios.post('/api/admin/users', payload);
      toast.success('User created');
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'STUDENT', department: '', studentId: '', employeeId: '' });
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        {/* Quick filters compact area */}
        <div className="flex items-center space-x-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, ID..."
            className="px-3 py-2 border rounded-md w-64 text-sm"
          />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="FACULTY">Faculty</option>
            <option value="STUDENT">Student</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="LIBRARIAN">Librarian</option>
            <option value="WARDEN">Warden</option>
          </select>
          <input value={deptFilter} onChange={e => setDeptFilter(e.target.value)} placeholder="Department" className="px-3 py-2 border rounded-md w-40 text-sm" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-md text-sm">
            <option value="">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={() => { setSearch(''); setRoleFilter(''); setDeptFilter(''); setStatusFilter(''); fetchUsers(); }} className="px-3 py-2 bg-gray-100 rounded-md text-sm">Reset</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Create User</h2>
          <form onSubmit={handleCreate} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="First name" className="w-full p-2 border rounded" />
              <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" className="w-full p-2 border rounded" />
            </div>

            <input required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full p-2 border rounded" />
            <input required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" className="w-full p-2 border rounded" />

            <div className="grid grid-cols-2 gap-2">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full p-2 border rounded">
                <option value="ADMIN">Admin</option>
                <option value="FACULTY">Faculty</option>
                <option value="STUDENT">Student</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="LIBRARIAN">Librarian</option>
                <option value="WARDEN">Warden</option>
              </select>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Department (optional)" className="w-full p-2 border rounded" />
            </div>

            {/* Role-specific fields */}
            {form.role === 'STUDENT' && (
              <input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="Student ID (optional)" className="w-full p-2 border rounded" />
            )}
            {form.role === 'FACULTY' && (
              <input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} placeholder="Employee ID (optional)" className="w-full p-2 border rounded" />
            )}

            <button type="submit" disabled={creating} className="w-full bg-primary-600 text-white py-2 rounded disabled:opacity-50">
              {creating ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-4">Users List</h2>

          {loading ? (
            <div className="text-center py-12">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              {/* Responsive table: on small screens show stacked rows */}
              <table className="min-w-full text-left divide-y divide-gray-200">
                <thead className="bg-gray-50 hidden sm:table-header-group">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Dept</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="border-t sm:table-row block sm:table-row">
                      <td className="p-2 align-top block sm:table-cell">
                        <div className="font-medium">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{u.email}</div>
                      </td>
                      <td className="p-2 block sm:table-cell">
                        <div className="hidden sm:block">{u.email}</div>
                      </td>
                      <td className="p-2 block sm:table-cell">{u.role}</td>
                      <td className="p-2 block sm:table-cell">{u.department || '-'}</td>
                      <td className="p-2 block sm:table-cell">{u.isActive ? <span className="text-green-600">Active</span> : <span className="text-red-600">Inactive</span>}</td>
                      <td className="p-2 block sm:table-cell">
                        <div className="flex items-center space-x-3">
                          <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:underline text-sm">Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
