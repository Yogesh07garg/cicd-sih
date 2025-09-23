import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const HostelManagement: React.FC = () => {
  // Hardcoded rooms (display-only / fallback)
  const HARDCODED_ROOMS = [
    {
      id: 'room-a-101',
      block: { name: 'A Block' },
      blockId: 'A',
      roomNumber: '101',
      capacity: 4,
      occupied: 2,
      roomType: 'DOUBLE',
      allocations: [
        { id: 'alloc-1', studentId: 'stu-1001', bedNumber: 1, allocatedAt: new Date().toISOString(), status: 'ACTIVE', student: { firstName: 'Rohit', lastName: 'Sharma', studentId: 'S1001', department: 'CS' } },
        { id: 'alloc-2', studentId: 'stu-1002', bedNumber: 2, allocatedAt: new Date().toISOString(), status: 'ACTIVE', student: { firstName: 'Anita', lastName: 'Verma', studentId: 'S1002', department: 'IT' } }
      ]
    },
    {
      id: 'room-b-202',
      block: { name: 'B Block' },
      blockId: 'B',
      roomNumber: '202',
      capacity: 3,
      occupied: 1,
      roomType: 'TRIPLE',
      allocations: [
        { id: 'alloc-3', studentId: 'stu-1003', bedNumber: 1, allocatedAt: new Date().toISOString(), status: 'ACTIVE', student: { firstName: 'Kavya', lastName: 'K', studentId: 'S1003', department: 'ECE' } }
      ]
    },
    {
      id: 'room-c-303',
      block: { name: 'C Block' },
      blockId: 'C',
      roomNumber: '303',
      capacity: 2,
      occupied: 0,
      roomType: 'SINGLE',
      allocations: []
    }
  ];

  const [rooms, setRooms] = useState<any[]>([]);
  const [allocForm, setAllocForm] = useState({ studentId: '', roomId: '', bedNumber: '' });
  const [complaints, setComplaints] = useState<any[]>([]);
  const [visitor, setVisitor] = useState({ studentId: '', visitorName: '', relation: '' });

  // New: selected room for detail view
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    // show hardcoded rooms immediately for UI
    setRooms(HARDCODED_ROOMS);
    fetchRooms();
    fetchComplaints();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/hostel/rooms');
      const rooms = res.data.data || res.data || [];
      // if server returned rooms use them, otherwise keep the hardcoded fallback
      const finalRooms = (Array.isArray(rooms) && rooms.length > 0) ? rooms : HARDCODED_ROOMS;
      setRooms(finalRooms);
      // if nothing selected, select first room
      if (!selectedRoomId && Array.isArray(finalRooms) && finalRooms.length > 0) {
        setSelectedRoomId(finalRooms[0].id);
      }
    } catch (err) {
      console.error(err);
      // fallback to hardcoded on error
      setRooms(HARDCODED_ROOMS);
      if (!selectedRoomId && HARDCODED_ROOMS.length > 0) setSelectedRoomId(HARDCODED_ROOMS[0].id);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('/api/hostel/complaints');
      setComplaints(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const allocate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/hostel/allocate', { ...allocForm, bedNumber: allocForm.bedNumber || null });
      toast.success('Allocated');
      setAllocForm({ studentId: '', roomId: '', bedNumber: '' });
      fetchRooms();
    } catch (err) {
      console.error(err);
      toast.error('Allocation failed');
    }
  };

  const fileComplaint = async () => {
    const description = prompt('Describe the issue:');
    if (!description) return;
    try {
      await axios.post('/api/hostel/complaints', { roomId: null, description });
      toast.success('Complaint filed');
      fetchComplaints();
    } catch (err) {
      console.error(err);
      toast.error('Failed to file complaint');
    }
  };

  const addVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/hostel/visitor', visitor);
      toast.success('Visitor logged');
      setVisitor({ studentId: '', visitorName: '', relation: '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to add visitor');
    }
  };

  // Helpers for room seat display
  const renderSeats = (room: any) => {
    const capacity = room.capacity || 0;
    const occupied = room.occupied || 0;
    const seats = [];
    for (let i = 0; i < capacity; i++) {
      const isOccupied = i < occupied;
      seats.push(
        <div key={i} title={isOccupied ? 'Occupied' : 'Free'} style={{
          width: 12, height: 12, borderRadius: 3, margin: 2,
          background: isOccupied ? '#2563eb' : '#e5e7eb',
          display: 'inline-block'
        }} />
      );
    }
    return <div className="flex flex-wrap" style={{ maxWidth: 140 }}>{seats}</div>;
  };

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) || null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hostel Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Allocate Room</h2>
          <form onSubmit={allocate} className="space-y-2">
            <input value={allocForm.studentId} onChange={e=>setAllocForm({...allocForm, studentId: e.target.value})} placeholder="Student ID" className="w-full p-2 border rounded" />
            <select value={allocForm.roomId} onChange={e=>setAllocForm({...allocForm, roomId: e.target.value})} className="w-full p-2 border rounded">
              <option value="">Select room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.block?.name || r.blockId} • {r.roomNumber} • {Math.max(0, (r.capacity || 0) - (r.occupied || 0))} available</option>)}
            </select>
            <input value={allocForm.bedNumber} onChange={e=>setAllocForm({...allocForm, bedNumber: e.target.value})} placeholder="Bed number (optional)" className="w-full p-2 border rounded" />
            <button className="w-full bg-primary-600 text-white py-2 rounded">Allocate</button>
          </form>
        </div>

        {/* Rooms Overview with seat chart and selectable details */}
        <div className="lg:col-span-2 bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Rooms Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rooms.map(r => (
              <div
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className={`p-3 border rounded cursor-pointer flex justify-between items-center ${selectedRoomId === r.id ? 'ring-2 ring-primary-300' : ''}`}
              >
                <div>
                  <div className="font-medium">{r.block?.name || r.blockId} • Room {r.roomNumber}</div>
                  <div className="text-xs text-gray-500">Type: {r.roomType || '—'} • {r.occupied}/{r.capacity} occupied</div>
                  <div className="mt-2">
                    {renderSeats(r)}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div className="text-xs text-gray-500">Available</div>
                  <div className="font-medium">{Math.max(0, (r.capacity || 0) - (r.occupied || 0))}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Selected room allocation table */}
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Room Allocations</h3>
            {!selectedRoom ? (
              <div className="text-sm text-gray-500">Select a room to view allocations</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-sm">Bed</th>
                      <th className="px-3 py-2 text-sm">Student</th>
                      <th className="px-3 py-2 text-sm">Student ID</th>
                      <th className="px-3 py-2 text-sm">Department</th>
                      <th className="px-3 py-2 text-sm">Allocated At</th>
                      <th className="px-3 py-2 text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(selectedRoom.allocations && selectedRoom.allocations.length > 0) ? selectedRoom.allocations.map((a:any, idx:number) => (
                      <tr key={a.id || idx}>
                        <td className="px-3 py-2 text-sm">{a.bedNumber ?? (idx+1)}</td>
                        <td className="px-3 py-2 text-sm">{a.student ? `${a.student.firstName} ${a.student.lastName}` : a.studentId}</td>
                        <td className="px-3 py-2 text-sm">{a.student?.studentId || a.studentId}</td>
                        <td className="px-3 py-2 text-sm">{a.student?.department || '-'}</td>
                        <td className="px-3 py-2 text-sm">{a.allocatedAt ? new Date(a.allocatedAt).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 text-sm">{a.status || 'ACTIVE'}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="p-4 text-sm text-gray-500">No allocations for this room</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Hostel Complaints</h2>
          <button onClick={fileComplaint} className="mb-3 px-3 py-2 bg-gray-100 rounded">File Complaint</button>
          <div className="space-y-2 max-h-[40vh] overflow-auto">
            {complaints.map(c => (
              <div key={c.id} className="p-3 border rounded">
                <div className="font-medium">{c.student?.firstName} {c.student?.lastName}</div>
                <div className="text-xs text-gray-600">{c.description}</div>
                <div className="text-xs text-gray-500 mt-1">{c.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-semibold mb-2">Visitor Log</h2>
          <form onSubmit={addVisitor} className="space-y-2">
            <input value={visitor.studentId} onChange={e=>setVisitor({...visitor, studentId: e.target.value})} placeholder="Student ID" className="w-full p-2 border rounded" />
            <input value={visitor.visitorName} onChange={e=>setVisitor({...visitor, visitorName: e.target.value})} placeholder="Visitor name" className="w-full p-2 border rounded" />
            <input value={visitor.relation} onChange={e=>setVisitor({...visitor, relation: e.target.value})} placeholder="Relation" className="w-full p-2 border rounded" />
            <button className="w-full bg-primary-600 text-white py-2 rounded">Add Visitor</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostelManagement;
