import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Examinations: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', type: 'MIDTERM', academicYear: '', course: '' });
  const [sessionForm, setSessionForm] = useState({ examId: '', subject: '', venue: '', hallCapacity: '', date: '', startTime: '', endTime: '', invigilatorId: '' });

  useEffect(() => {
    fetchExams();
    fetchSessions();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await axios.get('/api/exams');
      setExams(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/exams/sessions');
      setSessions(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const createExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/exams', form);
      toast.success('Exam created');
      setForm({ title: '', type: 'MIDTERM', academicYear: '', course: '' });
      fetchExams();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create exam');
    }
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Normalize payload: hallCapacity as integer, dates to ISO
      const payload: any = {
        examId: sessionForm.examId,
        subject: sessionForm.subject,
        venue: sessionForm.venue,
        hallCapacity: sessionForm.hallCapacity ? parseInt(sessionForm.hallCapacity, 10) : undefined,
        date: sessionForm.date ? new Date(sessionForm.date).toISOString() : undefined,
        startTime: sessionForm.startTime ? new Date(sessionForm.startTime).toISOString() : undefined,
        endTime: sessionForm.endTime ? new Date(sessionForm.endTime).toISOString() : undefined,
        invigilatorId: sessionForm.invigilatorId || undefined
      };

      await axios.post('/api/exams/sessions', payload);
      toast.success('Session scheduled');
      setSessionForm({ examId: '', subject: '', venue: '', hallCapacity: '', date: '', startTime: '', endTime: '', invigilatorId: '' });
      fetchSessions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to schedule session');
    }
  };

  const generateHallTicket = async (sessionId: string) => {
    const studentId = prompt('Student ID to generate hall ticket for:');
    if (!studentId) return;
    try {
      const res = await axios.post(`/api/exams/sessions/${sessionId}/hallticket`, { studentId });
      // open QR image in new tab
      const win = window.open();
      if (win) {
        win.document.write(`<img src="${res.data.qr}" alt="QR Hall Ticket" />`);
        win.document.close();
      }
      toast.success('Hall ticket generated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate hall ticket');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Examinations</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Create Exam</h2>
          <form onSubmit={createExam} className="space-y-2">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Exam title" className="w-full p-2 border rounded" />
            <select value={form.type} onChange={e=>setForm({...form, type: e.target.value})} className="w-full p-2 border rounded">
              <option value="MIDTERM">Midterm</option>
              <option value="FINAL">Final</option>
              <option value="PRACTICAL">Practical</option>
              <option value="INTERNAL">Internal</option>
            </select>
            <input value={form.academicYear} onChange={e=>setForm({...form, academicYear: e.target.value})} placeholder="Academic year" className="w-full p-2 border rounded" />
            <input value={form.course} onChange={e=>setForm({...form, course: e.target.value})} placeholder="Course" className="w-full p-2 border rounded" />
            <button className="w-full bg-primary-600 text-white py-2 rounded">Create Exam</button>
          </form>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Schedule Session</h2>
          <form onSubmit={createSession} className="space-y-2">
            <select value={sessionForm.examId} onChange={e=>setSessionForm({...sessionForm, examId: e.target.value})} className="w-full p-2 border rounded">
              <option value="">Select exam</option>
              {exams.map(x => <option key={x.id} value={x.id}>{x.title} • {x.course}</option>)}
            </select>
            <input value={sessionForm.subject} onChange={e=>setSessionForm({...sessionForm, subject: e.target.value})} placeholder="Subject" className="w-full p-2 border rounded" />
            <input value={sessionForm.venue} onChange={e=>setSessionForm({...sessionForm, venue: e.target.value})} placeholder="Venue / Hall" className="w-full p-2 border rounded" />
            <input value={sessionForm.hallCapacity} onChange={e=>setSessionForm({...sessionForm, hallCapacity: e.target.value})} placeholder="Hall capacity" className="w-full p-2 border rounded" />
            <input type="date" value={sessionForm.date} onChange={e=>setSessionForm({...sessionForm, date: e.target.value})} className="w-full p-2 border rounded" />
            <input type="datetime-local" value={sessionForm.startTime} onChange={e=>setSessionForm({...sessionForm, startTime: e.target.value})} className="w-full p-2 border rounded" />
            <input type="datetime-local" value={sessionForm.endTime} onChange={e=>setSessionForm({...sessionForm, endTime: e.target.value})} className="w-full p-2 border rounded" />
            <input value={sessionForm.invigilatorId} onChange={e=>setSessionForm({...sessionForm, invigilatorId: e.target.value})} placeholder="Invigilator (user id)" className="w-full p-2 border rounded" />
            <button className="w-full bg-primary-600 text-white py-2 rounded">Schedule</button>
          </form>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">Upcoming Sessions</h2>
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{s.subject} • {new Date(s.date).toLocaleDateString()}</div>
                <div className="text-xs text-gray-500">{s.venue} • {s.hallCapacity || '—'} seats</div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => generateHallTicket(s.id)} className="text-blue-600 text-sm">Generate Hall Ticket</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Examinations;
