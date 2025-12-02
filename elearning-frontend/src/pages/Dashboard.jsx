import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import api from '../services/api';

// REACT ICONS (Pinoy-approved!)
import { MdWavingHand } from 'react-icons/md';
import { FaPlus, FaBook, FaCheckCircle, FaChalkboardTeacher, FaBell, FaClipboardList, FaDownload } from 'react-icons/fa';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [coursesRes, notificationsRes] = await Promise.all([
          api.get('/courses/enrolled'),
          api.get('/notifications')
        ]);

        const sortedCourses = coursesRes.data.sort((a, b) => {
          if (activeTab === 'newest') {
            return new Date(b.enrolled_date) - new Date(a.enrolled_date);
          }
          return (b.progress || 0) - (a.progress || 0);
        });

        setCourses(sortedCourses);
        setNotifications(notificationsRes.data);
      } catch (err) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDashboardData();
  }, [user, activeTab]);

  const downloadProgressReport = () => {
    try {
      // Prepare CSV data
      const headers = ['Course Title', 'Instructor', 'Progress (%)', 'Lessons', 'Status'];
      const rows = courses.map(course => [
        course.title || 'N/A',
        course.instructor_name || 'N/A',
        course.progress || 0,
        course.lessons_count || 0,
        course.progress === 100 ? 'Completed' : 'In Progress'
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `student-progress-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download progress report:', err);
      alert('Failed to download progress report');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-main">
        <header className="main-header">
          {user?.role === 'student' && (
            <div className="header-buttons">
              <Link to="/courses" className="enroll-buttoks">
                <FaPlus /> Enroll in New Course
              </Link>
              <Link to="/quizzes" className="pending-quizzes-button">
                <FaClipboardList /> Pending Quizzes
              </Link>
              <button onClick={downloadProgressReport} className="download-progress-button">
                <FaDownload /> Download Progress
              </button>
            </div>
          )}
        </header>

        <main className="dashboard-content">
          <section className="greeting-section">
            <div className="greeting-content">
              <h1>Good day!</h1>
              <p>It's good to see you again.</p>
            </div>
            <MdWavingHand className="greeting-icon" />
          </section>

          <div className="content-columns">
            {/* COURSES */}
            <section className="courses-section">
              <h2>Courses</h2>
              <div className="course-tabs">
                <button className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`} onClick={() => setActiveTab('all')}>
                  All Courses
                </button>
                <button className={`tab ${activeTab === 'newest' ? 'tab-active' : ''}`} onClick={() => setActiveTab('newest')}>
                  Newest
                </button>
              </div>

              <div className="course-list">
                {courses.length === 0 ? (
                  <div className="empty-courses">
                    <p>No courses yet. Enroll now!</p>
                  </div>
                ) : (
                  courses.map(course => (
                    <Link key={course.id} to={`/courses/${course.id}`} className="course-card">
                      <div className="course-image">
                        <img
                          src={course.thumbnail_url || "https://images.unsplash.com/photo-1519389950473-47ba0277781c"}
                          alt={course.title}
                          className="course-thumbnail"
                        />
                      </div>
                      <div className="course-info">
                        <span className="course-subject">{course.subject}</span>
                        <h3 className="course-title">{course.title}</h3>
                        <p className="instructor">
                          <FaChalkboardTeacher /> {course.instructor_name}
                        </p>
                        <div className="course-stats">
                          <span className="lessons-count">
                            <FaBook /> {course.lessons_count || 0} Lessons
                          </span>
                        </div>
                        <div className="course-progress">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${course.progress || 0}%` }}></div>
                          </div>
                          <span className="progress-text">{course.progress || 0}% Complete</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            {/* NOTIFICATIONS */}
            <section className="notifications-section">
              <h2>Notifications <FaBell style={{ fontSize: '1.2rem', color: '#4A90E2' }} /></h2>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div className="no-notifications">
                    <p>No new notifications</p>
                    <small>You're all caught up! Mabuhay!</small>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <article key={notif.id} className={`notification-item ${!notif.read_at ? 'unread' : ''}`}>
                      <div className="notification-header">
                        <span className="sender-name">{notif.sender_name || 'System'}</span>
                        <span className="notification-time">
                          {new Date(notif.created_at).toLocaleDateString('en-PH')}
                        </span>
                      </div>
                      <h3 className="notification-title">{notif.message_title}</h3>
                      <p className="notification-body">{notif.message_body}</p>
                      {notif.course_name && (
                        <p className="notification-course">Course: {notif.course_name}</p>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}