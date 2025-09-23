import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { User, BarChart2, Plus, FilePlus, RefreshCw } from 'lucide-react';

type StudentSummary = {
  student: { id: string; firstName: string; lastName: string; studentId?: string; department?: string };
  averagePercent: number;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  assignmentsCount: number;
};

type ProgressEntry = {
  id: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  notes?: string;
  createdAt: string;
  teacher?: { firstName?: string; lastName?: string };
};

type Assignment = {
  id: string;
  title: string;
  submittedAt: string;
  marks?: number;
  maxMarks?: number;
  remarks?: string;
  teacher?: { firstName?: string; lastName?: string };
};

const FacultyStudentProgress: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [progressForm, setProgressForm] = useState({ subject: '', marksObtained: '', totalMarks: '', assignmentsSubmitted: '0', assignmentsTotal: '0', notes: '' });
  const [assignmentForm, setAssignmentForm] = useState({ title: '', submittedAt: '', marks: '', maxMarks: '', remarks: '' });

  useEffect(() => {
    if (!user) return;
    fetchSummaries();
  }, [user]);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/faculty/progress/students');
      setSummaries(res.data.students || []);
    } catch (err) {
      console.error('Fetch summaries error', err);
      toast.error('Failed to load student summaries');
    } finally {
      setLoading(false);
    }
  };

  const selectStudent = async (id: string) => {
    setSelectedStudentId(id);
    setDetailLoading(true);
    try {
      const res = await axios.get(`/api/faculty/progress/student/${id}`);
      setProgressEntries(res.data.data.progress || []);
      setAssignments(res.data.data.assignments || []);
    } catch (err) {
      console.error('Fetch student detail error', err);
      toast.error('Failed to load student details');
    } finally {
      setDetailLoading(false);
    }
  };

  const submitProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return toast.error('Select a student first');
    try {
      const payload = {
        subject: progressForm.subject,
        marksObtained: Number(progressForm.marksObtained),
        totalMarks: Number(progressForm.totalMarks),
        assignmentsSubmitted: Number(progressForm.assignmentsSubmitted || 0),
        assignmentsTotal: Number(progressForm.assignmentsTotal || 0),
        notes: progressForm.notes
      };
      await axios.post(`/api/faculty/progress/student/${selectedStudentId}`, payload);
      toast.success('Progress entry added');
      // refresh detail and summaries
      selectStudent(selectedStudentId);
      fetchSummaries();
      setProgressForm({ subject: '', marksObtained: '', totalMarks: '', assignmentsSubmitted: '0', assignmentsTotal: '0', notes: '' });
    } catch (err:any) {
      console.error('Add progress error', err);
      toast.error(err.response?.data?.message || 'Failed to add progress');
    }
  };

  const submitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return toast.error('Select a student first');
    try {
      const payload = {
        title: assignmentForm.title,
        submittedAt: assignmentForm.submittedAt || undefined,
        marks: assignmentForm.marks ? Number(assignmentForm.marks) : undefined,
        maxMarks: assignmentForm.maxMarks ? Number(assignmentForm.maxMarks) : undefined,
        remarks: assignmentForm.remarks || undefined
      };
      await axios.post(`/api/faculty/progress/student/${selectedStudentId}/assignment`, payload);
      toast.success('Assignment entry added');
      selectStudent(selectedStudentId);
      setAssignmentForm({ title: '', submittedAt: '', marks: '', maxMarks: '', remarks: '' });
      fetchSummaries();
    } catch (err:any) {
      console.error('Add assignment error', err);
      toast.error(err.response?.data?.message || 'Failed to add assignment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-3 rounded shadow">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Student Progress</h1>
            <p className="text-sm text-gray-500">View & record progress for students</p>
          </div>
        </div>

        <div>
          <button onClick={fetchSummaries} className="px-3 py-2 bg-gray-100 rounded flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Students list / cards */}
        <div className="lg:col-span-1 bg-white p-4 rounded shadow max-h-[70vh] overflow-auto">
          <h3 className="font-semibold mb-3">Students</h3>
          {loading ? <div>Loading...</div> : summaries.length === 0 ? <div className="text-sm text-gray-500">No students</div> : (
            <div className="space-y-2">
              {summaries.map(s => (
                <div key={s.student.id} className={`p-3 border rounded cursor-pointer ${selectedStudentId === s.student.id ? 'ring-2 ring-indigo-300' : ''}`} onClick={() => selectStudent(s.student.id)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.student.firstName} {s.student.lastName}</div>
                      <div className="text-xs text-gray-500">{s.student.studentId || ''} • {s.student.department || ''}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{s.averagePercent}%</div>
                      <div className="text-xs text-gray-500">{s.assignmentsCount} assignments</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details & forms */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Student Detail</h3>
            {!selectedStudentId ? (
              <div className="text-sm text-gray-500">Select a student to view progress and assignments</div>
            ) : detailLoading ? (
              <div>Loading student details...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium mb-2">Progress Entries</h4>
                    {progressEntries.length === 0 ? <div className="text-sm text-gray-500">No entries</div> : (
                      <div className="overflow-auto max-h-48">
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-xs text-gray-500">
                            <tr>
                              <th className="py-1">Subject</th>
                              <th className="py-1">Marks</th>
                              <th className="py-1">Assignments</th>
                              <th className="py-1">By</th>
                              <th className="py-1">When</th>
                            </tr>
                          </thead>
                          <tbody>
                            {progressEntries.map(p => (
                              <tr key={p.id} className="border-t">
                                <td className="py-1">{p.subject}</td>
                                <td className="py-1">{p.marksObtained}/{p.totalMarks} ({Math.round((p.marksObtained/p.totalMarks)*100)}%)</td>
                                <td className="py-1">{p.assignmentsSubmitted}/{p.assignmentsTotal}</td>
                                <td className="py-1">{p.teacher?.firstName} {p.teacher?.lastName}</td>
                                <td className="py-1">{new Date(p.createdAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Assignments</h4>
                    {assignments.length === 0 ? <div className="text-sm text-gray-500">No assignments</div> : (
                      <div className="overflow-auto max-h-48">
                        <table className="min-w-full text-sm">
                          <thead className="text-left text-xs text-gray-500">
                            <tr><th className="py-1">Title</th><th className="py-1">Marks</th><th className="py-1">By</th><th className="py-1">When</th></tr>
                          </thead>
                          <tbody>
                            {assignments.map(a => (
                              <tr key={a.id} className="border-t">
                                <td className="py-1">{a.title}</td>
                                <td className="py-1">{a.marks ?? '-'} / {a.maxMarks ?? '-'}</td>
                                <td className="py-1">{a.teacher?.firstName} {a.teacher?.lastName}</td>
                                <td className="py-1">{new Date(a.submittedAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <form onSubmit={submitProgress} className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Add Progress Entry</div>
                      <Plus className="h-4 w-4 text-gray-600" />
                    </div>
                    <input required value={progressForm.subject} onChange={e=>setProgressForm(f=>({...f, subject: e.target.value}))} placeholder="Subject" className="w-full p-2 border rounded mb-2" />
                    <div className="flex space-x-2 mb-2">
                      <input required value={progressForm.marksObtained} onChange={e=>setProgressForm(f=>({...f, marksObtained: e.target.value}))} placeholder="Marks Obtained" className="flex-1 p-2 border rounded" />
                      <input required value={progressForm.totalMarks} onChange={e=>setProgressForm(f=>({...f, totalMarks: e.target.value}))} placeholder="Total Marks" className="flex-1 p-2 border rounded" />
                    </div>
                    <div className="flex space-x-2 mb-2">
                      <input value={progressForm.assignmentsSubmitted} onChange={e=>setProgressForm(f=>({...f, assignmentsSubmitted: e.target.value}))} placeholder="Assignments Submitted" className="flex-1 p-2 border rounded" />
                      <input value={progressForm.assignmentsTotal} onChange={e=>setProgressForm(f=>({...f, assignmentsTotal: e.target.value}))} placeholder="Assignments Total" className="flex-1 p-2 border rounded" />
                    </div>
                    <input value={progressForm.notes} onChange={e=>setProgressForm(f=>({...f, notes: e.target.value}))} placeholder="Notes (optional)" className="w-full p-2 border rounded mb-2" />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded">Add Progress</button>
                  </form>

                  <form onSubmit={submitAssignment} className="bg-gray-50 p-3 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Add Assignment</div>
                      <FilePlus className="h-4 w-4 text-gray-600" />
                    </div>
                    <input required value={assignmentForm.title} onChange={e=>setAssignmentForm(f=>({...f, title: e.target.value}))} placeholder="Title" className="w-full p-2 border rounded mb-2" />
                    <div className="flex space-x-2 mb-2">
                      <input type="datetime-local" value={assignmentForm.submittedAt} onChange={e=>setAssignmentForm(f=>({...f, submittedAt: e.target.value}))} className="flex-1 p-2 border rounded" />
                      <input value={assignmentForm.marks} onChange={e=>setAssignmentForm(f=>({...f, marks: e.target.value}))} placeholder="Marks" className="flex-1 p-2 border rounded" />
                    </div>
                    <div className="flex space-x-2 mb-2">
                      <input value={assignmentForm.maxMarks} onChange={e=>setAssignmentForm(f=>({...f, maxMarks: e.target.value}))} placeholder="Max Marks" className="flex-1 p-2 border rounded" />
                      <input value={assignmentForm.remarks} onChange={e=>setAssignmentForm(f=>({...f, remarks: e.target.value}))} placeholder="Remarks" className="flex-1 p-2 border rounded" />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">Add Assignment</button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyStudentProgress;
