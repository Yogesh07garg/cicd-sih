import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Download, Upload, Trash2, FileText } from 'lucide-react';

type Material = {
  id: string;
  title: string;
  description?: string;
  course?: string;
  subject?: string;
  storagePath: string;
  author: { id: string; firstName: string; lastName: string };
  createdAt: string;
};

const Academics: React.FC = () => {
  const { user } = useAuth();
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'ADMIN';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);

  // upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/academics/materials');
      const arr = res.data?.data?.materials ?? res.data?.data ?? res.data?.materials ?? [];
      setMaterials(arr);
    } catch (err) {
      console.error('Fetch materials error', err);
      toast.error('Failed to load study materials');
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    setFile(f || null);
  };

  // read file as data URL (development small-file support) and submit
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error('Title is required');
    if (!file) return toast.error('Select a file or provide a storage URL');

    try {
      setUploading(true);
      // convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const payload = { title, description, course, subject, storagePath: dataUrl, visibility: 'ALL' };
      const res = await axios.post('/api/academics/materials', payload);
      toast.success('Material uploaded');
      // prepend new material
      setMaterials(prev => [res.data.data, ...prev]);
      setTitle(''); setDescription(''); setCourse(''); setSubject(''); setFile(null);
    } catch (err: any) {
      console.error('Upload error', err);
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this material?')) return;
    try {
      await axios.delete(`/api/academics/materials/${id}`);
      toast.success('Deleted');
      setMaterials(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error('Delete error', err);
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Academics</h1>
        <div>
          <button onClick={fetchMaterials} className="px-3 py-2 bg-gray-100 rounded">Refresh</button>
        </div>
      </div>

      {isFaculty && (
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Upload Study Material</h2>
          <form onSubmit={handleUpload} className="space-y-2">
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="w-full p-2 border rounded" />
            <input value={course} onChange={e=>setCourse(e.target.value)} placeholder="Course (optional)" className="w-full p-2 border rounded" />
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject/Topic (optional)" className="w-full p-2 border rounded" />
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" className="w-full p-2 border rounded h-24" />
            <div>
              <label className="block text-sm mb-1">File (PDF / image / doc) — for dev this will be sent as data URL</label>
              <input type="file" accept="application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} />
            </div>
            <div className="flex space-x-2">
              <button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded">
                {uploading ? 'Uploading...' : <><Upload className="inline h-4 w-4 mr-2" /> Upload</>}
              </button>
              <button type="button" onClick={() => { setTitle(''); setDescription(''); setCourse(''); setSubject(''); setFile(null); }} className="px-4 py-2 bg-gray-200 rounded">Reset</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Study Materials</h2>
        {loading ? <div>Loading...</div> : materials.length === 0 ? <div className="text-sm text-gray-500">No materials available</div> : (
          <div className="space-y-3">
            {materials.map(m => (
              <div key={m.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-gray-500">{m.course ? `${m.course} • ` : ''}{m.subject ?? ''} • by {m.author?.firstName} {m.author?.lastName}</div>
                  {m.description && <div className="text-sm mt-1">{m.description}</div>}
                </div>
                <div className="flex items-center space-x-2">
                  <a href={m.storagePath} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center">
                    <Download className="h-4 w-4 mr-1" /> Download
                  </a>
                  {(isFaculty || user?.role === 'ADMIN') && (user?.id === m.author?.id || user?.role === 'ADMIN') && (
                    <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:underline text-sm flex items-center">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Academics;
