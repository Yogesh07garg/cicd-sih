import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

type Material = {
  id: string;
  title: string;
  description?: string;
  course?: string;
  subject?: string;
  storagePath: string;
  author?: { firstName?: string; lastName?: string };
  createdAt?: string;
};

const DigitalLibrary: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/library/digital');
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load digital library');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Digital Library</h1>
        <div>
          <button onClick={fetchMaterials} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {loading ? <div>Loading...</div> : materials.length === 0 ? (
          <div className="text-sm text-gray-500">No digital materials available</div>
        ) : (
          <div className="space-y-3">
            {materials.map(m => (
              <div key={m.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500">{m.course || m.subject} • by {m.author?.firstName} {m.author?.lastName}</div>
                  {m.description && <div className="text-sm mt-1">{m.description}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <a href={m.storagePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">Open / Download</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalLibrary;
