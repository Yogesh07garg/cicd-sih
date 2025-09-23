import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Scholarships: React.FC = () => {
  const [criteria, setCriteria] = useState({ minAverageMarks: 75, department: '', limit: 50 });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [amount, setAmount] = useState<number>(10000);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const findEligible = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/scholarships/eligible', criteria);
      setCandidates(res.data.data || []);
      setSelected({});
      toast.success(`Found ${ (res.data.data || []).length } candidates`);
    } catch (err) {
      console.error('Find eligible error', err);
      toast.error('Failed to find eligible students');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }));

  const generate = async () => {
    const ids = Object.keys(selected).filter(k => selected[k]);
    if (ids.length === 0) return toast.error('Select at least one student');
    try {
      setGenerating(true);
      const res = await axios.post('/api/scholarships/generate', { studentIds: ids, amount, type: 'SCHOLARSHIP', reason: 'Merit-based' });
      toast.success(res.data.message || 'Scholarships generated');
      setCandidates([]);
      setSelected({});
    } catch (err) {
      console.error('Generate scholarship error', err);
      toast.error('Failed to generate scholarships');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scholarships</h1>
        <div>
          <button onClick={findEligible} className="px-3 py-2 bg-blue-600 text-white rounded">Find Eligible</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm">Min average marks</label>
          <input type="number" value={criteria.minAverageMarks} onChange={e=>setCriteria({...criteria, minAverageMarks: Number(e.target.value)})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="text-sm">Department (optional)</label>
          <input value={criteria.department} onChange={e=>setCriteria({...criteria, department: e.target.value})} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="text-sm">Result limit</label>
          <input type="number" value={criteria.limit} onChange={e=>setCriteria({...criteria, limit: Number(e.target.value)})} className="w-full p-2 border rounded" />
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Candidates</h2>
        {loading ? <div>Loading...</div> : candidates.length === 0 ? <div className="text-sm text-gray-500">No candidates found</div> : (
          <div className="space-y-2">
            {candidates.map(c => (
              <div key={c.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">Dept: {c.department || '—'} • Avg: {Math.round(c.avg || 0)}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" checked={!!selected[c.id]} onChange={()=>toggleSelect(c.id)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded shadow flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-sm">Scholarship amount (₹)</label>
          <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} className="p-2 border rounded w-36" />
        </div>
        <div>
          <button disabled={generating} onClick={generate} className="px-4 py-2 bg-green-600 text-white rounded">{generating ? 'Generating...' : 'Generate Scholarships'}</button>
        </div>
      </div>
    </div>
  );
};

export default Scholarships;
