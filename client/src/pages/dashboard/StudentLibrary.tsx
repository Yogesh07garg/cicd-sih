import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { RefreshCw } from 'lucide-react';

const StudentLibrary: React.FC = () => {
  const { user } = useAuth();
  const [issuedBooks, setIssuedBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchIssued();
  }, []);

  const fetchIssued = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/library/issued/me?limit=100');
      setIssuedBooks(res.data.issues || []);
    } catch (err) {
      console.error('Fetch issued books error', err);
      toast.error('Failed to load your issued books');
      setIssuedBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const returnBook = async (issueId: string) => {
    if (!confirm('Mark this book as returned?')) return;
    try {
      await axios.post(`/api/library/return/${issueId}`);
      toast.success('Book returned');
      fetchIssued();
    } catch (err: any) {
      console.error('Return error', err);
      toast.error(err.response?.data?.message || 'Failed to return book');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Library</h1>
          <p className="text-sm text-gray-600">Books borrowed by you</p>
        </div>
        <div>
          <button onClick={fetchIssued} className="px-3 py-2 bg-gray-100 rounded flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        {loading ? (
          <div>Loading...</div>
        ) : issuedBooks.length === 0 ? (
          <div className="text-sm text-gray-500">You have no books issued.</div>
        ) : (
          <div className="space-y-3">
            {issuedBooks.map((issue: any) => (
              <div key={issue.id} className="p-3 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{issue.book?.title}</div>
                  <div className="text-xs text-gray-500">{issue.book?.author} • {issue.book?.isbn || '—'}</div>
                  <div className="text-xs text-gray-500 mt-1">Issued: {new Date(issue.issueDate).toLocaleDateString()} • Due: {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : '—'}</div>
                </div>
                <div className="flex items-center space-x-2">
                  {issue.status !== 'RETURNED' ? (
                    <button onClick={() => returnBook(issue.id)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Return</button>
                  ) : (
                    <span className="text-sm text-gray-500">Returned</span>
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

export default StudentLibrary;
