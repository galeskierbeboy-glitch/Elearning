import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import './Dashboard.css';
import api from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch courses and notifications
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [coursesResponse, notificationsResponse] = await Promise.all([
          api.get('/courses/enrolled'), // Get enrolled courses with progress
          api.get('/notifications')
        ]);

        // Sort courses by progress and last accessed
        const sortedCourses = coursesResponse.data.sort((a, b) => {
          if (activeTab === 'newest') {
            return new Date(b.last_accessed || b.enrolled_date) - new Date(a.last_accessed || a.enrolled_date);
          }
          // For 'all' tab, show in-progress courses first, then by last accessed
          const aProgress = a.progress || 0;
          const bProgress = b.progress || 0;
          if (aProgress === bProgress) {
            return new Date(b.last_accessed || b.enrolled_date) - new Date(a.last_accessed || a.enrolled_date);
          }
          return bProgress - aProgress;
        });

        setCourses(sortedCourses);
        setNotifications(notificationsResponse.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      <Navbar />
      <div className="dashboard-main">
        <header className="main-header">
          <div className="header-actions">
            {user?.role === 'student' && (
              <Link to="/courses" className="enroll-button">
                <i className="fas fa-plus"></i> Enroll in New Course
              </Link>
            )}
          </div>
        </header>

      <main className="dashboard-content">
        <section className="greeting-section">
          <div className="greeting-content">
            <h1>Good day!</h1>
            <p>It's good to see you again.</p>
          </div>
          <img 
            src="/assets/png/wave.png" 
            alt="Waving" 
            className="greeting-image"
          />
        </section>

        <div className="content-columns">
          <section className="courses-section">
            <h2>Courses</h2>
            
            <div className="course-tabs">
              <button 
                className={activeTab === 'all' ? 'tab-active' : 'tab'}
                onClick={() => setActiveTab('all')}
              >
                All Courses
              </button>
              <button 
                className={activeTab === 'newest' ? 'tab-active' : 'tab'}
                onClick={() => setActiveTab('newest')}
              >
                Newest
              </button>
            </div>

            <div className="course-list">
              {courses.length === 0 ? (
                <div className="empty-courses">
                  <img 
                    src="/assets/png/empty-courses.png" 
                    alt="No courses"
                    className="empty-state-image" 
                  />
                  <p>You haven't enrolled in any courses yet.</p>
                </div>
              ) : (
                courses.map(course => (
                  <Link 
                    key={`course-${course.id}`}
                    to={`/courses/${course.id}`}
                    className="course-card"
                  >
                    <div className="course-card-header">
                      <div className="course-image">
                        <img
                          src={course.thumbnail_url || "https://images.unsplash.com/photo-1519389950473-47ba0277781c"}
                          alt={course.title}
                          className="course-thumbnail"
                        />
                      </div>
                      <div className="course-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill" 
                            style={{ width: `${course.progress || 0}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{course.progress || 0}% Complete</span>
                      </div>
                    </div>
                    
                    <div className="course-info">
                      <span className="course-subject">{course.subject}</span>
                      <h3 className="course-title">{course.title}</h3>
                      <p className="instructor">
                        <i className="fas fa-chalkboard-teacher"></i>
                        {course.instructor_name}
                      </p>
                      <div className="course-stats">
                        <span className="lessons-count">
                          <i className="fas fa-book"></i>
                          {course.lessons_count || 0} Lessons
                        </span>
                        <span className="completed-lessons">
                          <i className="fas fa-check-circle"></i>
                          {course.completed_lessons || 0} Completed
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="notifications-section">
            <h2>Notifications</h2>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <p className="no-notifications">No new notifications</p>
              ) : (
                notifications.map(notification => (
                  <article 
                    key={`notification-${notification.id}`} 
                    className={`notification-item ${!notification.read_at ? 'unread' : ''}`}
                  >
                    <div className="notification-header">
                      <span className="sender-name">
                        {notification.sender_name || 'System'}
                      </span>
                      <span className="sender-role">
                        {notification.sender_role || notification.role}
                      </span>
                      <span className="notification-time">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="notification-title">{notification.message_title}</h3>
                    <p className="notification-body">{notification.message_body}</p>
                    {notification.course_name && (
                      <p key={`course-${notification.id}`} className="notification-course">
                        Course: {notification.course_name}
                      </p>
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