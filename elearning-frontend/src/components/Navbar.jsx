import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If we have a logged-in user but no role (empty string/null), try refreshing the profile
    if (user && (user.role === undefined || user.role === null || user.role === '')) {
      if (refreshProfile) {
        refreshProfile().catch((err) => console.error('Navbar refreshProfile failed', err));
      }
    }
  }, [user, refreshProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="navbar">
      <div className="navbar-content">
        <div className="navbar-header">
          <h2 className="navbar-title">E-Learning</h2>
        </div>
        
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            <i className="fas fa-home nav-icon"></i>
            <span>Dashboard</span>
          </Link>
          {user && (
            <Link to="/account" className="nav-link">
              <i className="fas fa-user nav-icon"></i>
              <span>{user.name || user.full_name || 'My Account'}</span>
            </Link>
          )}
          {user?.role === 'instructor' && (
            <Link to="/grades" className="nav-link">
              <i className="fas fa-graduation-cap nav-icon"></i>
              <span>Course List</span>
            </Link>
          )}
          {user?.role === 'student' && (
            <Link to="/grades" className="nav-link">
              <i className="fas fa-graduation-cap nav-icon"></i>
              <span>My Grades</span>
            </Link>
          )}
          
          {/* Student links */}
          {user?.role === 'student' && (
            <Link to="/enrolled-courses" className="nav-link">
              <i className="fas fa-book nav-icon"></i>
              <span>My Enrolled Courses</span>
            </Link>
          )}
          
          {/* Instructor links */}
          {user?.role === 'instructor' && (
            <Link to="/instructor/courses" className="nav-link">
              <i className="fas fa-chalkboard-teacher nav-icon"></i>
              <span>Manage My Courses</span>
            </Link>
          )}
          
          {/* Security Analyst links */}

          {/* Admin links */}
          {user?.role === 'admin' && (
            <React.Fragment key="admin_links">
              <Link to="/security-dashboard" className="nav-link">
                <i className="fas fa-shield-alt nav-icon"></i>
                <span>Security</span>
              </Link>
            </React.Fragment>
          )}
        </div>

        <div className="navbar-footer">
          <button onClick={handleLogout} className="logout-button">
            <i className="fas fa-sign-out-alt nav-icon"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;