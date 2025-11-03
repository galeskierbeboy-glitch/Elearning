import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Select from 'react-select';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './SendNotification.css';

export default function SendNotification({ onClose }) {
  const { user } = useAuth();
  
  // State management
  const [userId, setUserId] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Check if user is authorized (admin, security_analyst, or instructor)
  const isAuthorized = ['admin', 'security_analyst', 'instructor'].includes(user?.role);

  // Show unauthorized message if not authorized
  useEffect(() => {
    if (!isAuthorized) {
      setError('You are not authorized to send notifications.');
    } else {
      setError(null);
    }
  }, [isAuthorized]);

  // Memoize styles to prevent unnecessary re-renders
  const selectStyles = useMemo(() => ({
    control: (base) => ({
      ...base,
      minHeight: '38px',
      background: '#fff',
      borderColor: '#C9D6DF',
      '&:hover': {
        borderColor: '#52616B'
      }
    }),
    option: (base, state) => ({
      ...base,
      background: state.isFocused ? '#F0F5F9' : '#fff',
      color: '#1E2022'
    })
  }), []);

  // Function to search for a user by ID
  const searchUser = useCallback(async () => {
    if (!userId.trim()) {
      setError('Please enter a user ID');
      return;
    }

    setSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      // Use the search endpoint which returns a list and is permitted for
      // security_analyst/admin roles. We added server-side support to match
      // numeric IDs as well as name/email substrings.
      const response = await api.get(`/users`, { params: { search: userId.trim() } });
      const users = response.data || [];

      if (users.length > 0) {
        // Prefer exact match on numeric ID if present, otherwise take first
        let match = null;
        const numericId = Number(userId.trim());
        if (!Number.isNaN(numericId)) {
          match = users.find(u => Number(u.id) === numericId) || null;
        }
        if (!match) match = users[0];

        setFoundUser({
          id: match.id,
          name: match.fullname ?? match.name,
          email: match.email,
          role: match.role
        });
        setError(null);
      } else {
        setError('User not found');
      }
    } catch (err) {
      console.error('Error searching for user:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to view user details');
      } else {
        setError('Error searching for user. Please try again.');
      }
    } finally {
      setSearching(false);
    }
  }, [userId]);

  // Fetch available courses on mount
  const fetchCourses = useCallback(async () => {
    try {
      const response = await api.get('/courses');
      const coursesData = response.data || [];
      const courseOptions = coursesData.map(course => ({
        value: course.course_id ?? course.id ?? course._id,
        label: course.title || course.name
      }));
      setCourses(courseOptions);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchCourses();
    }
  }, [isAuthorized, fetchCourses]);

  // Verify authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access this feature');
      return;
    }

    if (!user) {
      setError('Loading user data...');
      return;
    }

    if (!['admin', 'security_analyst', 'instructor'].includes(user.role)) {
      setError('You are not authorized to send notifications');
      return;
    }
  }, [user]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!isAuthorized) {
      setError('You are not authorized to send notifications');
      return;
    }

    if (!foundUser) {
      setError('Please search for and select a valid user first');
      return;
    }

    // Validate required fields
    const validationErrors = [];
    if (!messageTitle.trim()) validationErrors.push('Please enter a message title');
    if (!messageBody.trim()) validationErrors.push('Please enter a message body');

    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        receiver_id: foundUser.id,
        message_title: messageTitle.trim(),
        message_body: messageBody.trim(),
        related_course_id: selectedCourse?.value || null
      };

      console.log('Sending notification:', payload);

      const response = await api.post('/notifications', payload);
      console.log('Notification sent successfully:', response.data);
      setSuccess(true);
      
      // Reset form
      setMessageTitle('');
      setMessageBody('');
      setUserId('');
      setFoundUser(null);
      setSelectedCourse(null);

      // Show success message briefly before closing
      const timer = setTimeout(() => {
        setSuccess(false);
        onClose?.();
      }, 1500);

      // Cleanup timer if component unmounts
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error sending notification:', err.response || err);
      setError(err.response?.data?.message || 'Error sending notification. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [foundUser, messageTitle, messageBody, selectedCourse, onClose, isAuthorized]);

  // Memoize input handlers
  const handleTitleChange = useCallback((e) => {
    setMessageTitle(e.target.value);
  }, []);

  const handleBodyChange = useCallback((e) => {
    setMessageBody(e.target.value);
  }, []);

  // Render component
  return (
    <div className="send-notification-container">
      <h1>Send Notification</h1>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Notification sent successfully!</div>}
      
      <form onSubmit={handleSubmit} className="notification-form">
        <div className="form-group">
          <label htmlFor="user-id">User ID *</label>
          <div className="search-container">
            <input
              id="user-id"
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user_id (e.g. 42)"
              disabled={!isAuthorized || searching}
              className="user-id-input"
            />
            <button
              type="button"
              onClick={searchUser}
              disabled={!isAuthorized || searching || !userId.trim()}
              className="search-button"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {foundUser && (
            <div className="user-found-message">
              Found: {foundUser.name} ({foundUser.email})
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="message-title">Message Title *</label>
          <input
            id="message-title"
            type="text"
            value={messageTitle}
            onChange={handleTitleChange}
            required
            placeholder="Enter message title"
            disabled={!isAuthorized || !foundUser || loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="message-body">Message Body *</label>
          <textarea
            id="message-body"
            value={messageBody}
            onChange={handleBodyChange}
            required
            placeholder="Enter message content"
            rows={4}
            disabled={!isAuthorized || !foundUser || loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="course-select">Related Course (Optional)</label>
          <Select
            inputId="course-select"
            options={courses}
            value={selectedCourse}
            onChange={setSelectedCourse}
            isSearchable
            placeholder="Select related course..."
            className="course-select"
            isClearable
            styles={selectStyles}
            isDisabled={!isAuthorized || !foundUser || loading}
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={!isAuthorized || !foundUser || loading}
        >
          {loading ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  );
}