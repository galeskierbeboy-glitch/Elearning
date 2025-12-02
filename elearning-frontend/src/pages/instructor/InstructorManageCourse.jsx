import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import './InstructorManageCourse.css';

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

  const [courseId, setCourseId] = useState(id || sessionStorage.getItem('lastManagedCourseId'));

  useEffect(() => {
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
      const [courseRes, lessonsRes, quizzesRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/lessons?course_id=${courseId}`),
        api.get('/quizzes')
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);
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
        fd.append('file', lessonFile);

        res = await api.post('/lessons', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        setLessons(prev => [...prev, { 
          lesson_id: res.data.lesson_id || Date.now(), 
          title: lessonTitle, 
          course_id: Number(courseId), 
          file_path: res.data.file_path, 
          description: lessonDescription 
        }]);
      } else {
        const payload = { 
          title: lessonTitle, 
          course_id: Number(courseId), 
          content: lessonContent, 
          content_type: lessonContentType, 
          description: lessonDescription 
        };
        res = await api.post('/lessons', payload);
        setLessons(prev => [...prev, { 
          lesson_id: res.data.lesson_id || Date.now(), 
          ...payload 
        }]);
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
      const questions = JSON.parse(quizQuestionsJson || '[]');
      const payload = { title: quizTitle, course_id: Number(courseId), questions };
      const res = await api.post('/quizzes', payload);
      setQuizzes(prev => [...prev, { 
        quiz_id: res.data.quiz_id || Date.now(), 
        title: quizTitle, 
        course_id: Number(courseId) 
      }]);
      setQuizTitle('');
      setQuizQuestionsJson('');
    } catch (err) {
      console.error('Add quiz failed', err);
      setError('Failed to add quiz. Ensure questions JSON is valid.');
    }
  };

  if (loading) return <div className="loading-message">Loading management data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="manage-course-container">
      <Navbar />
      <div className="main-content">
        <h1 className="page-header">Manage Course: {course?.title || 'Course'}</h1>

        <div className="content-grid">
          <section className="section">
            <h2 className="section-header">Lessons</h2>
            <ul className="content-list">
              {lessons.map(l => (
                <li key={l.lesson_id} className="content-item">
                  <span>{l.title}</span>
                  <span className="content-type">{l.content_type}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddLesson} className="form-container">
              <h3 className="section-header">Add Lesson</h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Lesson Title</label>
                  <input 
                    type="text"
                    value={lessonTitle} 
                    onChange={e => setLessonTitle(e.target.value)} 
                    placeholder="Enter lesson title" 
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Content Type</label>
                  <select 
                    value={lessonContentType} 
                    onChange={e => setLessonContentType(e.target.value)} 
                    className="form-select"
                  >
                    <option value="text">Text</option>
                    <option value="pdf">PDF</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Content or Link</label>
                  <textarea 
                    value={lessonContent} 
                    onChange={e => setLessonContent(e.target.value)} 
                    placeholder="Enter lesson content or link" 
                    className="form-textarea"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea 
                    value={lessonDescription} 
                    onChange={e => setLessonDescription(e.target.value)} 
                    placeholder="Enter lesson description" 
                    className="form-textarea"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Upload File (PDF, DOCX, PPTX, XLSX, TXT, ZIP)</label>
                  <div className="file-input-wrapper">
                    <input 
                      id={`lesson-file-input`} 
                      type="file" 
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rtf" 
                      onChange={e => setLessonFile(e.target.files[0] || null)} 
                      className="file-input"
                      aria-label="Choose file"
                    />
                    <label htmlFor={`lesson-file-input`} className="file-input-label">
                      Choose file
                    </label>
                  </div>
                  {lessonFile && (
                    <div className="file-name">Selected: {lessonFile.name}</div>
                  )}
                </div>
              </div>

              <div className="button-group">
                <button type="submit" className="submit-button">
                  Add Lesson
                </button>
              </div>
            </form>
          </section>

          <section className="section">
            <h2 className="section-header">Quizzes</h2>
            <ul className="content-list">
              {quizzes.map(q => (
                <li key={q.quiz_id} className="content-item">
                  <span>{q.title}</span>
                  <span className="content-type">Quiz</span>
                </li>
              ))}
            </ul>

            <div className="button-group">
              <button
                onClick={() => navigate(`/instructor/courses/${courseId}/create-quiz`)}
                className="create-button"
              >
                Create Quiz
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
