import express from 'express';
import { auth, auditLogger } from '../../middleware/auth.js';
import { 
  getUserNotifications, 
  createNotification, 
  markAsRead 
} from '../../controllers/modules/notificationsController.js';

const router = express.Router();

// Get current user's notifications (no userId needed - use from auth)
router.get('/', auth, auditLogger, getUserNotifications);

// Create new notification
router.post('/', auth, auditLogger, createNotification);

// Mark notification as read
router.put('/:notificationId/read', auth, auditLogger, markAsRead);

export default router;
