import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

type Book = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  category?: string;
  totalCopies: number;
  availableCopies: number;
  publisher?: string;
  publishedYear?: number;
  location?: string;
};

const BookManagement: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState<any>({
    title: '', author: '', isbn: '', category: '', totalCopies: 1, availableCopies: 1, publisher: '', publishedYear: '', location: ''
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/library/books', { params: { search } });
      setBooks(res.data.books || res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setForm({ title: '', author: '', isbn: '', category: '', totalCopies: 1, availableCopies: 1, publisher: '', publishedYear: '', location: '' });
  };

  const startEdit = (b: Book) => {
    setEditing(b);
    setForm({ ...b });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await axios.put(`/api/library/books/${editing.id}`, form);
        toast.success('Book updated');
      } else {
        await axios.post('/api/library/books', form);
        toast.success('Book created');
      }
      startCreate();
      fetchBooks();
    } catch (err:any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this book?')) return;
    try {
      await axios.delete(`/api/library/books/${id}`);
      toast.success('Book deleted');
      fetchBooks();
    } catch (err:any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Book Management</h1>
        <div className="flex items-center space-x-2">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title/author/ISBN" className="px-3 py-2 border rounded" />
          <button onClick={fetchBooks} className="px-3 py-2 bg-gray-100 rounded flex items-center"><Search className="h-4 w-4 mr-2" />Search</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-2">{editing ? 'Edit Book' : 'Add Book'}</h2>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input required value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="Title" className="p-2 border rounded" />
          <input required value={form.author} onChange={e=>setForm({...form, author: e.target.value})} placeholder="Author" className="p-2 border rounded" />
          <input value={form.isbn} onChange={e=>setForm({...form, isbn: e.target.value})} placeholder="ISBN" className="p-2 border rounded" />
          <input value={form.category} onChange={e=>setForm({...form, category: e.target.value})} placeholder="Category" className="p-2 border rounded" />
          <input type="number" min={0} value={form.totalCopies} onChange={e=>setForm({...form, totalCopies: Number(e.target.value)})} placeholder="Total copies" className="p-2 border rounded" />
          <input type="number" min={0} value={form.availableCopies} onChange={e=>setForm({...form, availableCopies: Number(e.target.value)})} placeholder="Available copies" className="p-2 border rounded" />
          <input value={form.publisher} onChange={e=>setForm({...form, publisher: e.target.value})} placeholder="Publisher" className="p-2 border rounded" />
          <input value={form.publishedYear} onChange={e=>setForm({...form, publishedYear: e.target.value})} placeholder="Published year" className="p-2 border rounded" />
          <input value={form.location} onChange={e=>setForm({...form, location: e.target.value})} placeholder="Shelf / Location" className="p-2 border rounded" />
          <div className="col-span-2 flex space-x-2">
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded flex items-center">
              <Plus className="h-4 w-4 mr-2" /> {editing ? 'Update' : 'Create'}
            </button>
            {editing && <button type="button" onClick={startCreate} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Books Catalog</h2>
        {loading ? <div>Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-gray-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Author</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">ISBN</th>
                  <th className="py-2">Available / Total</th>
                  <th className="py-2">Location</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id} className="border-t">
                    <td className="py-2">{b.title}</td>
                    <td className="py-2">{b.author}</td>
                    <td className="py-2">{b.category}</td>
                    <td className="py-2">{b.isbn || '—'}</td>
                    <td className="py-2">{b.availableCopies}/{b.totalCopies}</td>
                    <td className="py-2">{b.location || '—'}</td>
                    <td className="py-2">
                      <button onClick={()=>startEdit(b)} className="text-blue-600 mr-3"><Edit className="inline h-4 w-4 mr-1" />Edit</button>
                      <button onClick={()=>remove(b.id)} className="text-red-600"><Trash2 className="inline h-4 w-4 mr-1" />Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookManagement;
