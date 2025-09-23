import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

type Admission = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  status: string;
  appliedAt: string;
  reviewNotes?: string;
};

const AdmissionsManagement: React.FC = () => {
  const [apps, setApps] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Admission | null>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admissions/applications?limit=50');
      setApps(res.data.applications || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const notes = prompt(`Add optional notes for ${status}`) || '';
      await axios.put(`/api/admissions/applications/${id}/status`, { status, reviewNotes: notes });
      toast.success('Application updated');
      fetchApps();
      if (selected?.id === id) setSelected({ ...selected, status, reviewNotes: notes });
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admissions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-4">Applications</h2>
          {loading ? <p>Loading...</p> : (
            <div className="overflow-y-auto max-h-[60vh]">
              <ul>
                {apps.map(a => (
                  <li key={a.id} className="p-3 border-b flex justify-between items-center">
                    <div>
                      <div className="font-medium">{a.firstName} {a.lastName}</div>
                      <div className="text-sm text-gray-500">{a.email} • {a.phone || '-'}</div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm">{a.status}</div>
                      <div className="flex space-x-2">
                        <button onClick={() => setSelected(a)} className="text-sm text-blue-600 hover:underline">View</button>
                        <button onClick={() => updateStatus(a.id, 'APPROVED')} className="text-sm text-green-600">Approve</button>
                        <button onClick={() => updateStatus(a.id, 'REJECTED')} className="text-sm text-red-600">Reject</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Details</h2>
          {selected ? (
            <div className="space-y-2">
              <p className="font-medium">{selected.firstName} {selected.lastName}</p>
              <p className="text-sm text-gray-600">{selected.email} • {selected.phone}</p>
              <p className="text-sm">Department: {selected.department || '-'}</p>
              <p className="text-sm">Applied: {new Date(selected.appliedAt).toLocaleString()}</p>
              <p className="text-sm">Status: {selected.status}</p>
              <p className="text-sm">Notes: {selected.reviewNotes || '-'}</p>
            </div>
          ) : (
            <p className="text-gray-500">Select an application to view details</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionsManagement;
