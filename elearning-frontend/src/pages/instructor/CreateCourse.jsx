import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../../services/api';
import Navbar from '../../components/Navbar';

export default function CreateCourse() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setLoading(true);
    try {
      const resp = await courseService.createCourse({ title: title.trim(), description: description.trim() });
      const created = resp.data;
      // Prefer course_id but fallback to id
      const id = created?.course_id ?? created?.id ?? created?.courseId;
      // Navigate to the manage page for the newly created course if available, otherwise back to list
      if (id) {
        navigate(`/instructor/courses/${id}/manage`);
      } else {
        navigate('/instructor/courses');
      }
    } catch (err) {
      console.error('CreateCourse error:', err);
      setError(err?.response?.data?.message || 'Failed to create course');
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Create Course</h1>
        <form onSubmit={handleSubmit} className="max-w-lg">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Course title"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Short description"
              rows={4}
            />
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create Course'}
            </button>
            <button
              type="button"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
              onClick={() => navigate('/instructor/courses')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
