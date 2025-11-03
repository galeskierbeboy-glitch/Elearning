// Audit logging middleware
const auditLogger = async (req, res, next) => {
  const userId = req.user?.id; // Get user ID from JWT token
  if (userId) {
    try {
      const action = `${req.method} ${req.originalUrl}`;
      await pool.query(
        'INSERT INTO audit_logs (user_id, action) VALUES (?, ?)',
        [userId, action]
      );
    } catch (error) {
      console.error('Audit logging error:', error);
      // Continue processing even if logging fails
    }
  }
  next();
};

// Role-based access control middleware
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized - No token provided' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Forbidden - Insufficient permissions' 
      });
    }

    next();
  };
};

module.exports = {
  auditLogger,
  checkRole
};