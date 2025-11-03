import express from 'express';
import { auth } from '../middleware/auth.js';
import { 
  getUserNotifications, 
  createNotification,
  markAsRead
} from '../controllers/notificationsController.js';

const router = express.Router();

// Get user's notifications
router.get('/:userId', auth, getUserNotifications);

// Create a new notification (restricted to admin, system analyst, instructor)
router.post('/', auth, createNotification);

// Mark notification as read
router.put('/:notificationId/read', auth, markAsRead);

export default router;