import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import './CourseList.css';

export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '/courses';
        if (user && (user.role === 'instructor' || user.role === 'admin')) {
          const id = user.id || user.id === 0 ? user.id : undefined;
          if (id) url = `/courses?instructor_id=${id}`;
        }
        const res = await api.get(url);
        setCourses(res.data || []);
      } catch (err) {
        console.error('Failed to load courses', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (user && user.role && user.role !== 'instructor') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (loading) return <div className="loading-message">Loading courses…</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!courses || courses.length === 0) return <div className="no-courses-message">No courses found.</div>;

  return (
    <div className="course-list-container">
      <Navbar />
      <h2 className="course-list-header">COURSE LIST</h2>
      <div className="courses-grid">
        {courses.map(course => (
          <div key={course.course_id || course.id} className="course-card">
            <h3 className="course-title">
              {course.title || course.name || 'Untitled Course'}
            </h3>
            <button 
              className="manage-button"
              onClick={() => navigate(`/grade-manage/${course.course_id || course.id}`)}
            >
              MANAGE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
