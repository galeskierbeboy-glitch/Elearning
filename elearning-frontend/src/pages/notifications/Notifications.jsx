import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Notifications.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const response = await api.get('/notifications');
        setNotifications(response.data);
      } catch (err) {
        setError('Error loading notifications');
        console.error('Error fetching notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read_at: new Date().toISOString() }
          : notif
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  if (loading) return <div className="notifications-loading">Loading notifications...</div>;
  if (error) return <div className="notifications-error">{error}</div>;

  return (
    <div className="notifications-page">
      <h1>Notifications</h1>
      
      <div className="notifications-container">
        {notifications.length === 0 ? (
          <p className="no-notifications">No notifications yet</p>
        ) : (
          notifications.map(notification => (
            <article 
              key={notification.id}
              className={`notification-card ${!notification.read_at ? 'unread' : ''}`}
            >
              <div className="notification-header">
                <div className="notification-meta">
                  <span className="sender-info">
                    From: {notification.sender_name || 'System'} 
                    <span className="sender-role">({notification.sender_role})</span>
                  </span>
                  <span className="notification-date">
                    {new Date(notification.created_at).toLocaleDateString()} at{' '}
                    {new Date(notification.created_at).toLocaleTimeString()}
                  </span>
                </div>
                {!notification.read_at && (
                  <button 
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="mark-read-button"
                  >
                    Mark as Read
                  </button>
                )}
              </div>

              <h2 className="notification-title">{notification.message_title}</h2>
              <p className="notification-body">{notification.message_body}</p>
              
              {notification.course_name && (
                <div className="notification-course">
                  Related Course: {notification.course_name}
                </div>
              )}

              {notification.read_at && (
                <div className="read-status">
                  Read on: {new Date(notification.read_at).toLocaleString()}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
