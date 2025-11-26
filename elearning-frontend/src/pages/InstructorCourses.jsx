import React, { useState, useEffect } from 'react';
import SendNotification from './notifications/SendNotification';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

const InstructorCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);   // <-- ADDED

  // Get the current authenticated user from context
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) fetchInstructorCourses();
  }, [currentUser]);

  const fetchInstructorCourses = async () => {
    try {
      // Prefer backend filtering by instructor_id for efficiency
      const response = await api.get(`/courses?instructor_id=${currentUser.id}`);
      const normalized = (response.data || []).map(c => ({
        ...c,
        id: c.id ?? c.course_id,
        course_id: c.course_id ?? c.id
      }));
      setCourses(normalized);
      setLoading(false);
    } catch (err) {
      setError('Failed to load courses. Please try again later.');
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/courses/${courseId}`);
      // Remove the course from the state
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
      <div className="flex justify-center items-center min-h-[60vh]">
        <p className="text-lg">Loading courses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* ---- ADDED SECTION START ---- */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Courses</h1>
          <div className="space-x-4">
            <button
              onClick={() => setShowNotificationModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Send Notification
            </button>
          </div>
        </div>

        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-yow rounded-lg p-6 max-w-2xl w-full mx-4">
              <SendNotification onClose={() => setShowNotificationModal(false)} />
            </div>
          </div>
        )}
        {/* ---- ADDED SECTION END ---- */}

        {courses.length === 0 ? (
          <p className="text-gray-600">You haven't created any courses yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div 
                key={course.course_id ?? course.id} 
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-4">{course.description}</p>
                <p className="text-sm text-gray-500 mb-4">
                  Created: {formatDate(course.created_at)}
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleDeleteCourse(course.course_id ?? course.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Delete Course
                  </button>
                  <button
                    onClick={() => {
                      const cid = course.course_id ?? course.id;
                      // persist last managed course so InstructorManageCourse can recover if params are lost
                      try { sessionStorage.setItem('lastManagedCourseId', cid); } catch (e) {}
                      window.location.href = `/instructor/courses/${cid}/manage`;
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorCourses;