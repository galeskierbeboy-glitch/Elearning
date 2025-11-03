import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// Audit logging middleware
export const auditLogger = async (req, res, next) => {
  try {
    if (req.user?.id) {
      const action = `${req.method} ${req.originalUrl}`;
      await pool.query(
        'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
        [req.user.id, action]
      );
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
  next();
};

export const auth = async (req, res, next) => {
  try {
    // Check both Authorization header and query parameter for token
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '')
      : authHeader;
    
    if (!token) {
      console.log('No token found in request:', {
        headers: req.headers,
        url: req.url,
        method: req.method
      });
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified (raw):', verified);
      
      // Ensure token contains an id (may be 'id' or 'user_id')
      const tokenId = verified.id ?? verified.user_id;
      if (!tokenId) {
        return res.status(401).json({ message: 'Invalid token format' });
      }

      // Verify user still exists and get current role
      const [user] = await pool.query(
        'SELECT user_id, role FROM users WHERE user_id = ?',
        [tokenId]
      );

      if (!user[0]) {
        return res.status(401).json({ message: 'User no longer exists' });
      }
      // If role is empty or null in the database, fix it to a safe default
      // so that downstream role checks behave predictably. We choose
      // 'security_analyst' as the default for legacy analyst accounts.
      if (!user[0].role) {
        console.warn('Auth: found empty role for user', tokenId, '- setting default role to security_analyst');
        try {
          await pool.query('UPDATE users SET role = ? WHERE user_id = ?', ['security_analyst', tokenId]);
          user[0].role = 'security_analyst';
        } catch (updErr) {
          console.error('Failed to set default role for user', tokenId, updErr);
        }
      }

      console.log('Auth: DB role for user', tokenId, 'is', user[0].role);

  // Normalize user id fields for downstream code and ensure role is current
      verified.id = Number(tokenId);
      verified.user_id = Number(tokenId);
      verified.role = user[0].role; // Always use current role from DB
      req.user = verified;
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ 
        message: 'Token verification failed', 
        error: process.env.NODE_ENV === 'development' ? jwtError.message : undefined 
      });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

export const isInstructor = (req, res, next) => {
  console.log('Checking instructor role:', {
    user: req.user,
    url: req.url,
    method: req.method
  });

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'instructor') {
    return res.status(403).json({ 
      message: 'Access denied. Instructor role required.',
      currentRole: req.user.role 
    });
  }

  next();
};

export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn('Authorization failed: role mismatch', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        url: req.originalUrl,
        method: req.method
      });
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

export const isAdmin = checkRole('admin');
export const isInstructorOrAdmin = (req, res, next) => {
  console.log('Checking instructor/admin role:', {
    user: req.user,
    url: req.url,
    method: req.method,
    body: req.body
  });

  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (!['instructor', 'admin'].includes(req.user.role)) {
    const error = {
      message: 'Access denied. Must be an instructor or admin.',
      required: ['instructor', 'admin'],
      current: req.user.role,
      context: {
        userId: req.user.id,
        userRole: req.user.role,
        url: req.originalUrl,
        method: req.method,
        headers: req.headers
      }
    };
    console.warn('Authorization failed: not instructor/admin', error);
    return res.status(403).json(error);
  }

  next();
};
export const isSecurityAnalyst = checkRole('security_analyst', 'admin');
export const isStudent = checkRole('student');