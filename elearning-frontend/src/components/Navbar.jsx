import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
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

  const isActive = (path) => location.pathname === path;

  return (
    <div className="navbar">
      <div className="navbar-content">
        
        {/* LOGO */}
        <div className="navbar-header">
          <h2 className="navbar-title">SecureLearn</h2>
        </div>

        {/* NAV LINKS */}
        <nav className="nav-links">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
            <i className="fas fa-home nav-icon"></i>
            <span>Dashboard</span>
          </Link>

          {user && (
            <Link to="/account" className={`nav-link ${isActive('/account') ? 'active' : ''}`}>
              <i className="fas fa-user nav-icon"></i>
              <span>{user.name || user.full_name || 'My Account'}</span>
            </Link>
          )}

          {user?.role === 'student' && (
            <>
              <Link to="/Grades" className={`nav-link ${isActive('/grades') ? 'active' : ''}`}>
                <i className="fas fa-graduation-cap nav-icon"></i>
                <span>My Grades</span>
              </Link>
              <Link to="/enrolled-courses" className={`nav-link ${isActive('/enrolled-courses') ? 'active' : ''}`}>
                <i className="fas fa-book nav-icon"></i>
                <span>My Enrolled Courses</span>
              </Link>
            </>
          )}

          {user?.role === 'instructor' && (
            <>
              <Link to="/grades" className={`nav-link ${isActive('/grades') ? 'active' : ''}`}>
                <i className="fas fa-list-alt nav-icon"></i>
                <span>Course List</span>
              </Link>
              <Link to="/instructor/courses" className={`nav-link ${isActive('/instructor/courses') ? 'active' : ''}`}>
                <i className="fas fa-chalkboard-teacher nav-icon"></i>
                <span>Manage My Courses</span>
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <Link to="/security-dashboard" className={`nav-link ${isActive('/security-dashboard') ? 'active' : ''}`}>
              <i className="fas fa-shield-alt nav-icon"></i>
              <span>Security Dashboard</span>
            </Link>
          )}
        </nav>

        {/* LOGOUT */}
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