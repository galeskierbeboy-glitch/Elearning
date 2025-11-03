import { pool } from '../config/db.js';

// Get notifications for a specific user
export const getUserNotifications = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { userId } = req.params;
    const [rows] = await conn.query(`
      SELECT 
        n.*,
        u.full_name as sender_name,
        u.role as sender_role,
        c.title as course_name
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.user_id
      LEFT JOIN courses c ON n.related_course_id = c.course_id
      WHERE n.receiver_id = ?
      ORDER BY n.created_at DESC
    `, [userId]);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      message: 'Error fetching notifications',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    conn.release();
  }
};

// Create a new notification
export const createNotification = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { receiver_id, message_title, message_body, related_course_id } = req.body;
    const sender_id = req.user.id;
    const sender_role = req.user.role;

    // Validate sender permissions
    if (!['admin', 'security_analyst', 'instructor'].includes(sender_role)) {
      return res.status(403).json({ 
        message: 'Only admin, security analyst, or instructors can send notifications' 
      });
    }

    // If sender is instructor, they can only send notifications about their courses
    if (sender_role === 'instructor' && related_course_id) {
      const [courseCheck] = await conn.query(
        'SELECT course_id FROM courses WHERE course_id = ? AND instructor_id = ?',
        [related_course_id, sender_id]
      );
      
      if (courseCheck.length === 0) {
        return res.status(403).json({ 
          message: 'Instructors can only send notifications about their own courses' 
        });
      }
    }

    // Create the notification
    const [result] = await conn.query(`
      INSERT INTO notifications (
        sender_id, 
        receiver_id, 
        role, 
        message_title, 
        message_body, 
        related_course_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [sender_id, receiver_id, sender_role, message_title, message_body, related_course_id]);

    res.status(201).json({ 
      message: 'Notification created successfully',
      notification_id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ 
      message: 'Error creating notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    conn.release();
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const [result] = await conn.query(`
      UPDATE notifications 
      SET read_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND receiver_id = ?
    `, [notificationId, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      message: 'Error updating notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  } finally {
    conn.release();
  }
};