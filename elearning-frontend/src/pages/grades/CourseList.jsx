import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';


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
        // If user is an instructor, request courses filtered by instructor_id
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

  // Only instructors may view this page. Redirect others to dashboard.
  useEffect(() => {
    if (user && user.role && user.role !== 'instructor') {
      // non-instructors should not access this page
      // navigate away to dashboard
      navigate('/dashboard');
    }
  }, [user, navigate]);

  if (loading) return <div>Loading courses…</div>;
  if (error) return <div>{error}</div>;

  if (!courses || courses.length === 0) return <div>No courses found.</div>;

  return (
    <div>
      <h2>COURSE LIST</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {courses.map(course => (
          <div key={course.course_id || course.id} style={{ width: '22%', boxSizing: 'border-box' }}>
            <h3>{course.title || course.name || 'Untitled Course'}</h3>
            <button onClick={() => navigate(`/grade-manage/${course.course_id || course.id}`)}>MANAGE</button>
          </div>
        ))}
      </div>
    </div>
  );
}
