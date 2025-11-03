import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';

// Instructor: manage a specific course - add lessons and quizzes
// Route: /instructor/courses/:id/manage

export default function InstructorManageCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lesson form
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonContentType, setLessonContentType] = useState('text');
  const [lessonFile, setLessonFile] = useState(null);
  const [lessonDescription, setLessonDescription] = useState('');

  // Quiz form
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestionsJson, setQuizQuestionsJson] = useState('');

  // Determine a stable courseId to use for fetching. Fall back to sessionStorage
  // if the route param is missing (can happen when navigating back/forward).
  const [courseId, setCourseId] = useState(id || sessionStorage.getItem('lastManagedCourseId'));

  useEffect(() => {
    // If route param changes, prefer that
    if (id) {
      setCourseId(id);
      sessionStorage.setItem('lastManagedCourseId', id);
    }
  }, [id]);

  useEffect(() => {
    if (!courseId) {
      console.warn('InstructorManageCourse: missing courseId — skipping fetch.');
      setError('No course selected. Please open Manage from the courses list.');
      setLoading(false);
      return;
    }
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Use courseId (from params or sessionStorage). Request only lessons for this course.
      const [courseRes, lessonsRes, quizzesRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/lessons?course_id=${courseId}`),
        api.get('/quizzes')
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);
      // quizzes endpoint does not currently accept course_id; filter client-side
      setQuizzes((quizzesRes.data || []).filter(q => String(q.course_id) === String(courseId)));
    } catch (err) {
      console.error('Failed to fetch manage data', err);
      setError('Failed to load course management data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (lessonFile) {
  const fd = new FormData();
  fd.append('title', lessonTitle);
  fd.append('course_id', Number(courseId));
        fd.append('content_type', lessonContentType);
        fd.append('description', lessonDescription);
        // For file uploads, place file in 'file' field
        fd.append('file', lessonFile);

    res = await api.post('/lessons', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    // Build lesson entry from response
  setLessons(prev => [...prev, { lesson_id: res.data.lesson_id || Date.now(), title: lessonTitle, course_id: Number(courseId), file_path: res.data.file_path, description: lessonDescription }]);
    } else {
    // include description in payload for non-file lessons so backend stores it
    const payload = { title: lessonTitle, course_id: Number(courseId), content: lessonContent, content_type: lessonContentType, description: lessonDescription };
    res = await api.post('/lessons', payload);
    // Optimistically add
  setLessons(prev => [...prev, { lesson_id: res.data.lesson_id || Date.now(), ...payload }]);
      }
        setLessonTitle('');
      setLessonContent('');
      setLessonContentType('text');
      setLessonFile(null);
      setLessonDescription('');
    } catch (err) {
      console.error('Add lesson failed', err);
      setError('Failed to add lesson');
    }
  };

  const handleAddQuiz = async (e) => {
    e.preventDefault();
    try {
      // Expect quizQuestionsJson to be an array of question objects
      const questions = JSON.parse(quizQuestionsJson || '[]');
  const payload = { title: quizTitle, course_id: Number(courseId), questions };
  const res = await api.post('/quizzes', payload);
  setQuizzes(prev => [...prev, { quiz_id: res.data.quiz_id || Date.now(), title: quizTitle, course_id: Number(courseId) }]);
      setQuizTitle('');
      setQuizQuestionsJson('');
    } catch (err) {
      console.error('Add quiz failed', err);
      setError('Failed to add quiz. Ensure questions JSON is valid.');
    }
  };

  if (loading) return <div>Loading management data...</div>;
  if (error) return <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>;

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Manage Course: {course?.title || 'Course'}</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Lessons</h2>
        <ul className="mb-4">
          {lessons.map(l => (
            <li key={l.lesson_id} className="mb-2">{l.title} ({l.content_type})</li>
          ))}
        </ul>

        <form onSubmit={handleAddLesson} className="mb-4">
          <h3 className="font-medium mb-2">Add Lesson</h3>
          <input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} placeholder="Lesson title" className="border p-2 mb-2 w-full" />
          <select value={lessonContentType} onChange={e => setLessonContentType(e.target.value)} className="border p-2 mb-2">
            <option value="text">Text</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
          </select>
          <textarea value={lessonContent} onChange={e => setLessonContent(e.target.value)} placeholder="Lesson content or link" className="border p-2 mb-2 w-full h-24" />
          <textarea value={lessonDescription} onChange={e => setLessonDescription(e.target.value)} placeholder="Short lesson description (optional)" className="border p-2 mb-2 w-full h-20" />
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Upload File (PDF or video)</label>
            <input type="file" accept=".pdf,video/*" onChange={e => setLessonFile(e.target.files[0] || null)} />
            {lessonFile && <div className="text-sm text-gray-600 mt-1">Selected: {lessonFile.name}</div>}
          </div>
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Add Lesson</button>
        </form>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Quizzes</h2>
        <ul className="mb-4">
          {quizzes.map(q => (
            <li key={q.quiz_id} className="mb-2">{q.title}</li>
          ))}
        </ul>

        <button
          onClick={() => navigate(`/instructor/courses/${courseId}/create-quiz`)}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Create Quiz
        </button>
      </section>
        </div>
      </div>
  );
}
