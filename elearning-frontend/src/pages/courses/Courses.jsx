import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import './Courses.css';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const [coursesResponse, enrolledResponse] = await Promise.all([
          api.get('/courses'), // Get all courses
          api.get('/courses/enrolled') // Get user's enrolled courses to check enrollment status
        ]);

        // Mark courses that user is already enrolled in
        const enrolledCourseIds = enrolledResponse.data.map(course => course.id);
        const allCourses = coursesResponse.data.map(course => ({
          ...course,
          enrolled: enrolledCourseIds.includes(course.id)
        }));

        setCourses(allCourses);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError('Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/courses/${courseId}/enroll`);
      // Update the course status in the list
      setCourses(courses.map(course => 
        course.id === courseId 
          ? { ...course, enrolled: true }
          : course
      ));
    } catch (err) {
      console.error('Error enrolling in course:', err);
      alert('Failed to enroll in course. Please try again.');
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.instructor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Loading courses...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="courses-page">
      <Navbar />
      <div className="courses-main">
        <header className="courses-header">
          <h1>Course Catalog</h1>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search courses by title or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="course-count">
            <span>{filteredCourses.length} courses found</span>
          </div>
        </header>

        <div className="courses-grid">
          {filteredCourses.length === 0 ? (
            <div className="no-courses">
              <p>No courses found matching your criteria.</p>
            </div>
          ) : (
            filteredCourses.map(course => (
              <article key={course.id} className="course-card">
                <div className="course-image">
                  <img 
                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c'}
                    alt={course.title}
                    className="course-thumbnail"
                  />
                </div>

                <div className="course-content">
                  <h3 className="course-title">{course.title}</h3>
                  <p className="course-instructor">
                    <i className="fas fa-user-tie"></i> {course.instructor_name}
                  </p>
                  <p className="course-description">{course.description}</p>
                  
                  <div className="course-meta">
                    <span className="course-duration">
                      <i className="fas fa-clock"></i> {course.duration || 'Self-paced'}
                    </span>
                    <span className="course-level">
                      <i className="fas fa-layer-group"></i> {course.level || 'All Levels'}
                    </span>
                  </div>

                  <div className="course-stats">
                    <span className="enrolled-count">
                      <i className="fas fa-users"></i> {course.enrolled_count || 0} Students
                    </span>
                    <span className="lessons-count">
                      <i className="fas fa-book"></i> {course.lessons_count || 0} Lessons
                    </span>
                  </div>

                  {user?.role === 'student' ? (
                    <button 
                      onClick={() => handleEnroll(course.id)}
                      className={`enroll-button ${course.enrolled ? 'enrolled' : ''}`}
                      disabled={course.enrolled}
                    >
                      {course.enrolled ? 'Enrolled' : 'Enroll Now'}
                    </button>
                  ) : (
                    // Non-students don't get an enroll control; show status if enrolled
                    <div className="enroll-placeholder">
                      {course.enrolled ? <span className="enrolled-label">Enrolled</span> : null}
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
