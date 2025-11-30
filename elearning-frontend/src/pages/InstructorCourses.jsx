import React, { useState, useEffect } from 'react';
import SendNotification from './notifications/SendNotification';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import './InstructorCourses.css';

const InstructorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) fetchInstructorCourses();
  }, [currentUser]);

  const fetchInstructorCourses = async () => {
    try {
      const response = await api.get(`/courses?instructor_id=${currentUser.id}`);
      const normalized = (response.data || []).map(c => ({
        ...c,
        id: c.id ?? c.course_id,
        course_id: c.course_id ?? c.id
      }));
      setCourses(normalized);
    } catch (err) {
      setError('Failed to load courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/courses/${courseId}`);
      setCourses(courses.filter(course => (course.course_id ?? course.id) !== courseId));
    } catch (err) {
      setError('Failed to delete the course. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="instructor-courses-container">
        <div className="loading-message">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="instructor-courses-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="instructor-courses-container">
      <Navbar />
      
      <div className="header-section">
        <h1 className="page-title">My Courses</h1>
        <button
          onClick={() => setShowNotificationModal(true)}
          className="notification-button"
        >
          Send Notification
        </button>
      </div>

      {showNotificationModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SendNotification onClose={() => setShowNotificationModal(false)} />
          </div>
        </div>
      )}

      {courses.length === 0 ? (
        <p className="empty-message">You haven't created any courses yet.</p>
      ) : (
        <div className="courses-grid">
          {courses.map((course) => (
            <div 
              key={course.course_id ?? course.id} 
              className="course-card"
            >
              <h2 className="course-title">{course.title}</h2>
              <p className="course-description">{course.description}</p>
              <p className="course-date">
                Created: {formatDate(course.created_at)}
              </p>
              <div className="course-actions">
                <button
                  onClick={() => handleDeleteCourse(course.course_id ?? course.id)}
                  className="delete-button"
                >
                  Delete Course
                </button>
                <button
                  onClick={() => {
                    const cid = course.course_id ?? course.id;
                    try { 
                      sessionStorage.setItem('lastManagedCourseId', cid); 
                    } catch (e) {}
                    window.location.href = `/instructor/courses/${cid}/manage`;
                  }}
                  className="manage-button"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorCourses;
