import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Briefcase, BriefcaseIcon, MapPin, ExternalLink, RefreshCw, BookOpen, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Posting = {
  id: string;
  title: string;
  company: string;
  location?: string;
  postedAt?: string;
  description?: string;
  tags?: string[];
  salary?: string;
  stipend?: string;
  applyUrl?: string;
};

const Placement: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Posting[]>([]);
  const [interns, setInterns] = useState<Posting[]>([]);
  const [loading, setLoading] = useState(false);

  // resume reviewer
  const [resumeText, setResumeText] = useState('');
  const [reviewResult, setReviewResult] = useState<any | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchPostings();
  }, []);

  const fetchPostings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/placement/postings');
      setJobs(res.data.jobs || []);
      setInterns(res.data.internships || []);
    } catch (err) {
      console.error('Fetch postings error', err);
      toast.error('Failed to load postings — showing demo data');
      // fallback demo
      setJobs([
        { id: 'demo-job-1', title: 'Frontend Engineer (React)', company: 'DemoCo', location: 'Remote', description: 'Demo job', applyUrl: '#' }
      ]);
      setInterns([
        { id: 'demo-intern-1', title: 'Frontend Intern', company: 'DemoStart', location: 'Remote', description: 'Demo internship', applyUrl: '#' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runReview = async () => {
    if (!resumeText || resumeText.trim().length === 0) return toast.error('Paste your resume or upload text to review');
    try {
      setReviewing(true);
      setReviewResult(null);
      const res = await axios.post('/api/placement/resume-review', { text: resumeText });
      setReviewResult(res.data);
    } catch (err:any) {
      console.error('Resume review error', err);
      toast.error(err.response?.data?.message || 'Failed to review resume');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Placement & Internships</h1>
          <p className="text-sm text-gray-600">Recent opportunities and resume reviewer</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={fetchPostings} className="px-3 py-2 bg-gray-100 rounded flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Recent Job Postings</h2>
            {loading ? <div>Loading...</div> : jobs.length === 0 ? (
              <div className="text-sm text-gray-500">No job postings available</div>
            ) : (
              <div className="space-y-3">
                {jobs.map(j => (
                  <div key={j.id} className="p-3 border rounded flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{j.title}</div>
                      <div className="text-xs text-gray-500">{j.company} • {j.location || '—'}</div>
                      {j.description && <div className="text-sm text-gray-700 mt-2">{j.description}</div>}
                      {j.tags && <div className="text-xs text-gray-500 mt-2">Tags: {j.tags.join(', ')}</div>}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {j.salary && <div className="text-sm text-gray-700">{j.salary}</div>}
                      <a href={j.applyUrl || '#'} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">Apply</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="font-semibold mb-3">Recent Internship Postings</h2>
            {loading ? <div>Loading...</div> : interns.length === 0 ? (
              <div className="text-sm text-gray-500">No internship postings available</div>
            ) : (
              <div className="space-y-3">
                {interns.map(i => (
                  <div key={i.id} className="p-3 border rounded flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">{i.title}</div>
                      <div className="text-xs text-gray-500">{i.company} • {i.location || '—'}</div>
                      {i.description && <div className="text-sm text-gray-700 mt-2">{i.description}</div>}
                      {i.tags && <div className="text-xs text-gray-500 mt-2">Tags: {i.tags.join(', ')}</div>}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {i.stipend && <div className="text-sm text-gray-700">{i.stipend}</div>}
                      <a href={i.applyUrl || '#'} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">Apply</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resume Reviewer */}
        <div className="bg-white p-4 rounded shadow space-y-3">
          <h2 className="font-semibold">Resume Reviewer (Demo)</h2>
          <p className="text-xs text-gray-500">Paste your resume text below and get quick suggestions on structure, skills and resources.</p>

          <textarea value={resumeText} onChange={e => setResumeText(e.target.value)} placeholder="Paste your resume text here..." className="w-full h-48 p-2 border rounded" />

          <div className="flex items-center space-x-2">
            <button onClick={runReview} disabled={reviewing} className="px-3 py-2 bg-blue-600 text-white rounded">
              {reviewing ? 'Reviewing...' : 'Run Review'}
            </button>
            <button onClick={() => { setResumeText(''); setReviewResult(null); }} className="px-3 py-2 bg-gray-100 rounded">Clear</button>
          </div>

          {reviewResult && (
            <div className="mt-3 border-t pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Score</div>
                  <div className="text-2xl font-bold">{reviewResult.score}/100</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Detected Area</div>
                  <div className="text-sm">{reviewResult.inferredArea}</div>
                </div>
              </div>

              {reviewResult.suggestions && reviewResult.suggestions.length > 0 && (
                <div>
                  <div className="text-sm font-medium">Suggestions</div>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {reviewResult.suggestions.map((s:string, idx:number) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              )}

              {reviewResult.recommendedResources && reviewResult.recommendedResources.length > 0 && (
                <div>
                  <div className="text-sm font-medium">Recommended Resources</div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {reviewResult.recommendedResources.map((r:any, idx:number) => (
                      <li key={idx}>
                        <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{r.skill} — Open resource</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reviewResult.actionItems && (
                <div>
                  <div className="text-sm font-medium">Action Items</div>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {reviewResult.actionItems.map((a:string, i:number) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Placement;
