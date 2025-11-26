import express from 'express';
import jwt from 'jsonwebtoken';
import { register, login, getProfile } from '../controllers/userController.js';
import { viewUserById } from '../controllers/userController.js';
import { auth, auditLogger, isAdmin, checkRole } from '../middleware/auth.js';
import { pool } from '../config/db.js';

const router = express.Router();

// Auth routes with audit logging
router.post('/register', auditLogger, register);
router.post('/login', auditLogger, login);
router.get('/profile', auth, auditLogger, getProfile);

// Regenerate backup code for authenticated user
router.post('/generate-backup', auth, auditLogger, async (req, res) => {
  try {
    const { generateBackupCode } = await import('../controllers/userController.js');
    return generateBackupCode(req, res);
  } catch (error) {
    console.error('Generate backup route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot-password flow endpoints (public)
router.post('/forgot/start', auditLogger, async (req, res) => {
  try {
    const { forgotStart } = await import('../controllers/userController.js');
    return forgotStart(req, res);
  } catch (error) {
    console.error('Forgot start route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot/verify', auditLogger, async (req, res) => {
  try {
    const { forgotVerify } = await import('../controllers/userController.js');
    return forgotVerify(req, res);
  } catch (error) {
    console.error('Forgot verify route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot/reset', auditLogger, async (req, res) => {
  try {
    const { forgotReset } = await import('../controllers/userController.js');
    return forgotReset(req, res);
  } catch (error) {
    console.error('Forgot reset route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// View a user's profile by id. If not owner/admin, this will record an incident.
// Constrain :id to digits only so that named routes like '/all' and
// '/invite-requests' are not accidentally matched and cause 400 responses.
router.get('/:id(\\d+)', auth, auditLogger, viewUserById);

// Admin routes
router.get('/all', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    // Create users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('student', 'instructor', 'admin', 'security_analyst') DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create invite_requests table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invite_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        message TEXT,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        token VARCHAR(255),
        token_expires TIMESTAMP NULL,
        requested_by INT,
        processed_by INT,
        processed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users(user_id) ON DELETE SET NULL,
        FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL
      )
    `);

    // Get users
    const [users] = await pool.query(
      'SELECT user_id, full_name, email, role, created_at FROM users'
    );
    res.json(users);
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ message: 'Error fetching users', details: error.message });
  }
});

// GET /api/users - return basic user list for notifications UI
// Accessible to security_analyst and admin roles
router.get('/', auth, auditLogger, async (req, res) => {
  try {
    // Debug log the user role
    console.log('GET /api/users requested by:', {
      userId: req.user?.id,
      role: req.user?.role,
      token: req.header('Authorization')?.substring(0, 20) + '...'
    });

    // Role check moved here to provide better error messages
    if (!req.user || !req.user.role) {
      console.error('Missing user or role:', req.user);
      return res.status(401).json({ 
        message: 'Authentication required. No role found in token.',
        user: process.env.NODE_ENV === 'development' ? req.user : undefined
      });
    }

    const { search } = req.query;

    // Allow admins and security analysts to search all users
    if (['security_analyst', 'admin'].includes(req.user.role)) {
      let query = 'SELECT user_id, full_name, email, role FROM users';
      const params = [];
      if (search) {
        const isNumeric = /^\d+$/.test(search);
        if (isNumeric) {
          query += ' WHERE user_id = ? OR full_name LIKE ? OR email LIKE ?';
          params.push(Number(search), `%${search}%`, `%${search}%`);
        } else {
          query += ' WHERE full_name LIKE ? OR email LIKE ?';
          const searchTerm = `%${search}%`;
          params.push(searchTerm, searchTerm);
        }
      }

      query += ' ORDER BY full_name ASC';
      const [rows] = await pool.query(query, params);

      if (!rows || rows.length === 0) return res.json([]);

      const users = rows.map(u => ({
        id: u.user_id,
        fullname: u.full_name,
        email: u.email,
        role: u.role
      }));

      console.log('GET /api/users success:', {
        userId: req.user.id,
        role: req.user.role,
        resultsCount: users.length
      });

      return res.json(users);
    }

    // Allow instructors to search only students enrolled in their courses
    if (req.user.role === 'instructor') {
      // Try to return students who are enrolled in any course taught by this instructor.
      // We support both legacy `enrollments` and newer `course_enrollments` tables by
      // joining both and checking for matching courses taught by the instructor.
      let query = `
        SELECT DISTINCT u.user_id, u.full_name, u.email, u.role
        FROM users u
        LEFT JOIN course_enrollments ce ON ce.user_id = u.user_id
        LEFT JOIN courses c1 ON c1.course_id = ce.course_id
    LEFT JOIN enrollments en ON en.student_id = u.user_id
    LEFT JOIN courses c2 ON c2.course_id = en.course_id
        WHERE (c1.instructor_id = ? OR c2.instructor_id = ?)
          AND u.role = 'student'
      `;
      const params = [req.user.id, req.user.id];

      if (search) {
        const isNumeric = /^\d+$/.test(search);
        if (isNumeric) {
          query += ' AND (u.user_id = ? OR u.full_name LIKE ? OR u.email LIKE ?)';
          params.push(Number(search), `%${search}%`, `%${search}%`);
        } else {
          query += ' AND (u.full_name LIKE ? OR u.email LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }
      }

      query += ' ORDER BY u.full_name ASC';
      const [rows] = await pool.query(query, params);

      if (!rows || rows.length === 0) return res.json([]);

      const users = rows.map(u => ({
        id: u.user_id,
        fullname: u.full_name,
        email: u.email,
        role: u.role
      }));

      console.log('GET /api/users (instructor) success:', {
        userId: req.user.id,
        role: req.user.role,
        resultsCount: users.length
      });

      return res.json(users);
    }

    // Default: deny access
    return res.status(403).json({
      message: 'Access denied. Insufficient permissions.',
      required: ['security_analyst', 'admin', 'instructor'],
      current: req.user.role
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DEV helper: return users list when request originates from localhost
// This is for local development only and requires auth but bypasses role checks.
router.get('/dev', auth, async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '';
    console.log('DEV /api/users/dev request:', {
      ip,
      hostname: req.hostname,
      userId: req.user?.id,
      userRole: req.user?.role,
      headers: req.headers
    });

    // Must be authenticated but role check is bypassed
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required for dev endpoint',
        details: 'Token required but role check bypassed'
      });
    }

    // Accept common localhost forms
    const isLocal = ip === '::1' || ip === '127.0.0.1' || 
                   ip.includes('::ffff:127.0.0.1') || 
                   req.hostname === 'localhost';

    if (!isLocal) {
      return res.status(403).json({ 
        message: 'Dev endpoint only available from localhost',
        ip,
        hostname: req.hostname
      });
    }

    // Log the successful request
    console.log('DEV endpoint accessed by:', {
      userId: req.user.id,
      role: req.user.role,
      ip,
      hostname: req.hostname
    });

    const [rows] = await pool.query(`
      SELECT user_id, full_name, email, role, created_at 
      FROM users 
      ORDER BY full_name ASC
    `);

    const users = (rows || []).map(u => ({ 
      id: u.user_id,
      fullname: u.full_name,
      email: u.email,
      role: u.role,
      created_at: u.created_at
    }));

    return res.json(users);
  } catch (error) {
    console.error('Dev users fetch error:', error);
    res.status(500).json({ 
      message: 'Error fetching users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin endpoint to update user role
router.put('/:id/role', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    // Delegate to controller logic
    const { id } = req.params;
    const { role } = req.body;
    // call controller function
    const { updateUserRole } = await import('../controllers/userController.js');
    // call and return
    return updateUserRole(req, res);
  } catch (error) {
    console.error('Role update route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: delete a user (ban/delete)
router.delete('/:id', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    const { deleteUser } = await import('../controllers/userController.js');
    return deleteUser(req, res);
  } catch (error) {
    console.error('Delete user route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Endpoint for non-admins to request an invite code
router.post('/invite-request', async (req, res) => {
  try {
    const { requestInvite } = await import('../controllers/userController.js');
    return requestInvite(req, res);
  } catch (error) {
    console.error('Invite request route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authenticated user: apply an invite token to upgrade role
router.post('/apply-invite', auth, auditLogger, async (req, res) => {
  try {
    const { applyInviteToken } = await import('../controllers/userController.js');
    return applyInviteToken(req, res);
  } catch (error) {
    console.error('Apply invite route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Authenticated user: change own password
router.post('/change-password', auth, auditLogger, async (req, res) => {
  try {
    const { changePassword } = await import('../controllers/userController.js');
    return changePassword(req, res);
  } catch (error) {
    console.error('Change password route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DEBUG: return raw DB row for the current authenticated user (useful to verify role)
// Protected by auth middleware - only returns your own row
router.get('/debug/me', auth, async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    const [rows] = await pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
    res.json(rows[0] || null);
  } catch (error) {
    console.error('Debug me route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DEBUG: find invite requests by email (query param ?email=) - protected by auth
router.get('/debug/invites', auth, async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: 'email query param required' });
    const [rows] = await pool.query('SELECT * FROM invite_requests WHERE email = ? ORDER BY created_at DESC', [email]);
    res.json(rows);
  } catch (error) {
    console.error('Debug invites route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TEMP DEBUG: set the authenticated user's role. This is a temporary helper for
// development/testing only. It updates the DB and returns the updated user and a
// freshly-signed JWT. Remove this endpoint before shipping to production.
router.post('/debug/set-role', auth, async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    const { role } = req.body;
    const allowedRoles = ['student', 'instructor', 'admin', 'security_analyst'];
    if (!allowedRoles.includes(role)) return res.status(400).json({ message: 'Invalid role' });

    console.warn('DEBUG: setting role for user', userId, 'to', role);

    const [result] = await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

    // read back updated user
    const [rows] = await pool.query('SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?', [userId]);
    const updated = rows[0];

    // sign a new token reflecting updated role
    const newToken = jwt.sign({ id: updated.user_id, email: updated.email, role: updated.role, name: updated.full_name }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ message: 'Role updated (debug)', user: updated, token: newToken });
  } catch (error) {
    console.error('Debug set-role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list invite requests
router.get('/invite-requests', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    const { listInviteRequests } = await import('../controllers/userController.js');
    return listInviteRequests(req, res);
  } catch (error) {
    console.error('List invite requests route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: approve invite request (generate token)
router.put('/invite-requests/:id/approve', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    const { approveInviteRequest } = await import('../controllers/userController.js');
    return approveInviteRequest(req, res);
  } catch (error) {
    console.error('Approve invite route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: reject invite request
router.put('/invite-requests/:id/reject', auth, auditLogger, isAdmin, async (req, res) => {
  try {
    const { rejectInviteRequest } = await import('../controllers/userController.js');
    return rejectInviteRequest(req, res);
  } catch (error) {
    console.error('Reject invite route error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
