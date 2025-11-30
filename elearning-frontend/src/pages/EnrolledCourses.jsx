import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { courseService } from '../services/api';
import './EnrolledCourses.css';

const EnrolledCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const response = await courseService.getEnrollments();
      setCourses(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load enrolled courses. Please try again later.');
      setLoading(false);
    }
  };

  const handleUnenroll = async (courseId) => {
    try {
      await courseService.unenrollFromCourse(courseId);
      // Remove the course from the state
      setCourses(prev => prev.filter(course => (course.course_id ?? course.id) !== courseId));
    } catch (err) {
      setError('Failed to unenroll from the course. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="enrolled-courses-page">
        <Navbar />
        <div className="loading-message">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="enrolled-courses-page">
        <Navbar />
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="enrolled-courses-page">
      <Navbar />
      <div className="enrolled-courses-container">
        <h1 className="enrolled-courses-header">My Enrolled Courses</h1>
        {courses.length === 0 ? (
          <p>You are not enrolled in any courses yet.</p>
        ) : (
          <div className="enrolled-courses-grid">
            {courses.map((course) => {
              const cid = course.course_id ?? course.id;
              return (
                <div key={cid} className="enrolled-course-card">
                  <h2>{course.title}</h2>
                  <p>{course.description}</p>
                  <p className="instructor-name">
                    Instructor: {course.instructor_name}
                  </p>
                  <div className="enrolled-course-actions">
                  <button
                    onClick={() => navigate(`/courses/${cid}`)}
                    className="btn-enter"
                  >
                    Enter
                  </button>
                  <button
                    onClick={() => handleUnenroll(cid)}
                    className="btn-unenroll"
                  >
                    Unenroll
                  </button>
                </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrolledCourses;