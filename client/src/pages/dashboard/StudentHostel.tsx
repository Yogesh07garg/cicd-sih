import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';

const StudentHostel: React.FC = () => {
  const [allocation, setAllocation] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllocation();
  }, []);

  const fetchAllocation = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/hostel/allocations/me');
      setAllocation(res.data.data || null);
    } catch (err) {
      console.error('Fetch allocation error', err);
      toast.error('Failed to load hostel allocation');
      setAllocation(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Hostel Allocation</h1>
          <p className="text-sm text-gray-600">Details of the room assigned to you</p>
        </div>
        <div>
          <button onClick={fetchAllocation} className="px-3 py-2 bg-gray-100 rounded flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {loading ? (
          <div>Loading...</div>
        ) : !allocation ? (
          <div className="text-sm text-gray-500">No hostel allocation found.</div>
        ) : (
          <div className="space-y-3">
            <div className="font-medium text-lg">
              {allocation.room?.block?.name || allocation.room?.blockId || '—'} • Room {allocation.room?.roomNumber || '—'}
            </div>
            <div className="text-sm text-gray-600">Bed: {allocation.bedNumber ?? '—'} • Status: {allocation.status}</div>
            <div className="text-xs text-gray-500">Allocated at: {new Date(allocation.allocatedAt).toLocaleString()}</div>

            {allocation.room && (
              <div className="mt-3">
                <h4 className="text-sm font-medium">Room Details</h4>
                <div className="text-xs text-gray-500">Capacity: {allocation.room.capacity} • Occupied: {allocation.room.occupied}</div>
                <div className="text-xs text-gray-500 mt-1">Type: {allocation.room.roomType}</div>
                {allocation.room.facilities && (
                  <div className="text-xs text-gray-500 mt-1">Facilities: {allocation.room.facilities}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHostel;
