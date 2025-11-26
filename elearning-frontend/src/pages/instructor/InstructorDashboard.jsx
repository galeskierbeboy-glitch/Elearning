import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Navbar from '../../components/Navbar';
import './InstructorDashboard.css';

export default function InstructorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    upcomingQuizzes: 0
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch instructor's courses
      const coursesRes = await api.get(`/courses?instructor_id=${user.id}`);
      const instructorCourses = coursesRes.data || [];
      
      setCourses(instructorCourses.slice(0, 5)); // Show first 5 courses

      // Fetch instructor summary (includes total students)
      let summary = { totalCourses: instructorCourses.length, totalStudents: 0, upcomingQuizzes: 0 };
      try {
        const sres = await api.get(`/courses/instructor/${user.id}/summary`);
        if (sres && sres.data) {
          summary.totalCourses = sres.data.totalCourses ?? summary.totalCourses;
          summary.totalStudents = sres.data.totalStudents ?? 0;
        }
      } catch (e) {
        console.warn('Could not fetch instructor summary:', e?.response?.data || e.message);
      }

      setStats(summary);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="instructor-dashboard-page">
        <Navbar />
        <div className="dashboard-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="instructor-dashboard-page">
      <Navbar />
      
      <div className="instructor-dashboard-container">
        <h1 className="dashboard-title">Welcome, {user?.name || user?.full_name}</h1>
        <p className="dashboard-subtitle">Manage your courses and track student progress</p>

        {/* STATS SECTION */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="stat-content">
              <h3>Total Courses</h3>
              <p className="stat-value">{stats.totalCourses}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-content">
              <h3>Total Students</h3>
              <p className="stat-value">{stats.totalStudents}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-clipboard"></i>
            </div>
            <div className="stat-content">
              <h3>Actions</h3>
              <Link to="/instructor/courses" className="stat-link">Manage Courses →</Link>
            </div>
          </div>
        </div>

        {/* RECENT COURSES */}
        {courses.length > 0 && (
          <div className="recent-courses-section">
            <h2 className="section-title">Your Recent Courses</h2>
            <div className="courses-list">
              {courses.map((course) => (
                <div key={course.course_id || course.id} className="course-preview">
                  <h3 className="course-name">{course.title}</h3>
                  <p className="course-desc">{course.description}</p>
                  <Link 
                    to={`/instructor/courses/${course.course_id || course.id}/manage`}
                    className="course-link"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION BUTTONS */}
        <div className="action-buttons">
          <Link to="/instructor/courses" className="action-btn primary">
            <i className="fas fa-th-list"></i> View All Courses
          </Link>
          <Link to="/instructor/courses/create" className="action-btn secondary">
            <i className="fas fa-plus"></i> Create New Course
          </Link>
        </div>
      </div>
    </div>
  );
}