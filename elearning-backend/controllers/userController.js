import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';

// Track failed login attempts in memory (cleared periodically)
const failedLoginAttempts = new Map(); // email -> [{timestamp, ip}]

// Clear old attempts every 30 minutes
setInterval(() => {
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  for (const [email, attempts] of failedLoginAttempts.entries()) {
    // Keep only recent attempts
    const recentAttempts = attempts.filter(a => a.timestamp > thirtyMinutesAgo);
    if (recentAttempts.length === 0) {
      failedLoginAttempts.delete(email);
    } else {
      failedLoginAttempts.set(email, recentAttempts);
    }
  }
}, 30 * 60 * 1000);

// Record a failed attempt and return true if threshold exceeded
const recordFailedAttempt = async (email, ip) => {
  const attempts = failedLoginAttempts.get(email) || [];
  const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
  
  // Keep only recent attempts and add new one
  const recentAttempts = [...attempts.filter(a => a.timestamp > thirtyMinutesAgo), { timestamp: Date.now(), ip }];
  failedLoginAttempts.set(email, recentAttempts);

  // Check if this is the 5th recent attempt
  if (recentAttempts.length === 5) {
    // Look up the targeted user to reference in the incident
    const [users] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      const description = `Multiple failed login attempts detected for user ${users[0].user_id} (${email}). 5 failures from IP ${ip} in last 30 minutes.`;
      await pool.query('INSERT INTO incidents (description, status) VALUES (?, ?)', [description, 'open']);
      
      // Also log to audit_logs (using null user_id since this is pre-auth)
      await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [null, `Failed login threshold exceeded: ${email}`]);
      
      console.warn('Security incident created: Multiple failed login attempts', { email, ip });
      return true;
    }
  }
  
  return false;
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'student', inviteCode } = req.body;

    // Prevent users from self-assigning elevated roles without a valid invite code
    const elevatedRoles = ['admin', 'security_analyst'];
    if (elevatedRoles.includes(role)) {
      const adminCode = process.env.ADMIN_INVITE_CODE;
      const securityCode = process.env.SECURITY_INVITE_CODE;
      const validForAdmin = role === 'admin' && adminCode && inviteCode === adminCode;
      const validForSecurity = role === 'security_analyst' && securityCode && inviteCode === securityCode;
      // Also accept one-time tokens generated via admin approval stored in invite_requests
      let consumedInviteRequestId = null;
      if (!validForAdmin && !validForSecurity) {
        if (!inviteCode) {
          return res.status(403).json({ message: 'Invalid or missing invite code for requested role' });
        }

        // Try to find matching approved invite_request with this token
        const [matches] = await pool.query(
          'SELECT * FROM invite_requests WHERE token = ? AND status = ? AND token_expires > ? LIMIT 1',
          [inviteCode, 'approved', new Date()]
        );

        if (!matches || matches.length === 0) {
          return res.status(403).json({ message: 'Invalid or expired invite token for requested role' });
        }

        // Ensure invite role matches requested role
        if (matches[0].role !== role) {
          return res.status(403).json({ message: 'Invite token role does not match requested role' });
        }

        consumedInviteRequestId = matches[0].request_id;
      }
    }

    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    // Generate a 6-digit backup code for the new user and store timestamp
    try {
      const backupCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
      const now = new Date();
      await pool.query('UPDATE users SET backup_code = ?, code_generation_timestamp = ? WHERE user_id = ?', [backupCode, now, result.insertId]);
      // Audit the generation
      await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [result.insertId, `Generated backup code at registration`]);
    } catch (e) {
      console.error('Failed to generate backup code on registration:', e);
    }

    // If registration consumed a one-time invite request, mark it consumed
    if (typeof consumedInviteRequestId === 'number') {
      await pool.query(
        'UPDATE invite_requests SET token = NULL, token_expires = ?, processed_by = ?, processed_at = ?, status = ? WHERE request_id = ?',
        [new Date(), null, new Date(), 'approved', consumedInviteRequestId]
      );
      // Audit
      await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [result.insertId, `Consumed invite token on registration request_id=${consumedInviteRequestId} role=${role}`]);
    }

    // Create token
    const token = jwt.sign(
      { 
        id: result.insertId,  // we use 'id' consistently in the token
        email, 
        role,
        name: name // include name in token for convenience
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Check if user exists
    const [users] = await pool.query(
      'SELECT user_id, full_name, email, password_hash, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      // Don't record failed attempts for non-existent users
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Record the failed attempt and check if we hit the threshold
      const thresholdExceeded = await recordFailedAttempt(email, ip);
      
      // Use same message but log the attempt
      console.warn('Failed login attempt', { email, ip, thresholdExceeded });
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Clear failed attempts on successful login
    failedLoginAttempts.delete(email);

    // Create token
    const token = jwt.sign(
      { 
        id: user.user_id,  // we use 'id' consistently in the token
        email: user.email, 
        role: user.role,
        name: user.full_name // include name in token for convenience
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    // Make sure we have user_id from token
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [users] = await pool.query(
      'SELECT user_id, full_name, email, role, created_at, backup_code, code_generation_timestamp FROM users WHERE user_id = ?',
      [req.user.id]
    );

    // Emergency role fix for empty roles
    if (users[0] && !users[0].role) {
      console.log('Fixing empty role for user', users[0].user_id);
      await pool.query(
        'UPDATE users SET role = ? WHERE user_id = ?',
        ['security_analyst', users[0].user_id]
      );
      users[0].role = 'security_analyst';
    }

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Debug log
    console.log('getProfile: returning user', { user_id: users[0].user_id, role: users[0].role });

    res.json({
      id: users[0].user_id,
      name: users[0].full_name,
      email: users[0].email,
      role: users[0].role,
      created_at: users[0].created_at,
      backup_code: users[0].backup_code,
      code_generation_timestamp: users[0].code_generation_timestamp
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Only allow known roles
    const allowedRoles = ['student', 'instructor', 'admin', 'security_analyst'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE user_id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Read back the updated user
    const [rows] = await pool.query('SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?', [id]);
    const updatedUser = rows[0];

    // Audit log the manual role change
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [req.user && req.user.id ? req.user.id : null, `Admin set role for user_id=${id} to ${role}`]);

    // Sign a JWT for the updated user so caller can hand it to the user if needed
    const newToken = jwt.sign(
      {
        id: updatedUser.user_id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ message: 'Role updated', user: updatedUser, token: newToken });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const requestInvite = async (req, res) => {
  try {
    const { name, email, role, message } = req.body;

    // If user is authenticated, use their id; otherwise null
    const userId = req.user && req.user.id ? req.user.id : null;

    // Insert into invite_requests table
    const [result] = await pool.query(
      'INSERT INTO invite_requests (name, email, role, message, requested_by) VALUES (?, ?, ?, ?, ?)',
      [name, email, role, message || null, userId]
    );

    // Also log into audit_logs for traceability
    const action = `Invite request created id=${result.insertId} name=${name} email=${email} role=${role}`;
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, action]);

    res.status(201).json({ message: 'Invite request submitted', id: result.insertId });
  } catch (error) {
    console.error('Invite request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list invite requests
export const listInviteRequests = async (req, res) => {
  try {
    // Check if the user has admin role
    if (!req.user || req.user.role !== 'admin') {
      console.warn('Non-admin attempt to list invite requests:', req.user);
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

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

    // Debug log
    console.log('Fetching invite requests for admin:', req.user.id);

    const [rows] = await pool.query('SELECT * FROM invite_requests ORDER BY created_at DESC');
    res.json(rows || []);
  } catch (error) {
    console.error('List invite requests error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// Admin: approve request -> generate one-time token and mark approved
export const approveInviteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user && req.user.id ? req.user.id : null;

    // First check if the request exists and is in pending state
    const [requests] = await pool.query(
      'SELECT * FROM invite_requests WHERE request_id = ?',
      [id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (requests[0].status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Generate a token and expiration
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    const [result] = await pool.query(
      'UPDATE invite_requests SET status = ?, token = ?, token_expires = ?, processed_by = ?, processed_at = ? WHERE request_id = ?',
      ['approved', token, expires, adminId, new Date(), id]
    );

    if (result.affectedRows === 0) {
      console.error('Update failed for request_id:', id);
      return res.status(500).json({ message: 'Failed to update request status' });
    }

    // Log the approval
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', 
      [adminId, `Approved invite request id=${id}`]
    );

    res.json({ message: 'Approved', token, expires });
  } catch (error) {
    console.error('Approve invite error:', error);
    // Send more detailed error message
    res.status(500).json({ 
      message: 'Server error while approving invite request',
      details: error.message 
    });
  }
};

// Admin: reject request
export const rejectInviteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user && req.user.id ? req.user.id : null;

    const [result] = await pool.query('UPDATE invite_requests SET status = ?, processed_by = ?, processed_at = ? WHERE request_id = ?', ['rejected', adminId, new Date(), id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found' });

    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [adminId, `Rejected invite request id=${id}`]);

    res.json({ message: 'Rejected' });
  } catch (error) {
    console.error('Reject invite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Authenticated user: apply an invite token to upgrade role
export const applyInviteToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user && req.user.id ? req.user.id : null;

    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    if (!token) return res.status(400).json({ message: 'Token is required' });

    // Find approved invite request with matching token and not expired
    const [rows] = await pool.query(
      'SELECT * FROM invite_requests WHERE token = ? AND status = ? AND token_expires > ? LIMIT 1',
      [token, 'approved', new Date()]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const invite = rows[0];

    // Update user's role to the requested role from the invite
    const allowedRoles = ['student', 'instructor', 'admin', 'security_analyst'];
    const newRole = invite.role;
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role in invite' });
    }

    const [updateResult] = await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [newRole, userId]);
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Consume the token so it can't be reused: null it and set expires to now
    await pool.query('UPDATE invite_requests SET token = NULL, token_expires = ?, processed_at = ? WHERE request_id = ?', [new Date(), new Date(), invite.request_id]);

    // Audit log
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, `Applied invite token request_id=${invite.request_id} role=${newRole}`]);

    // Return updated user record for immediate frontend sync
    const [updatedUsers] = await pool.query('SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?', [userId]);
    const updatedUser = updatedUsers[0] || null;

  // Debug log updated user and token
  console.log('applyInviteToken: updated user', updatedUser);

  // Create new JWT reflecting updated role
    const newToken = jwt.sign(
      {
        id: updatedUser.user_id,
        email: updatedUser.email,
        role: updatedUser.role,
        name: updatedUser.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('applyInviteToken: returning token for user', updatedUser.user_id);
    res.json({ message: 'Role updated', role: newRole, user: updatedUser, token: newToken });
  } catch (error) {
    console.error('Apply invite token error:', error);
    res.status(500).json({ message: 'Server error applying token', details: error.message });
  }
};

// View another user's public profile. If an authenticated user attempts to view
// someone else's full profile without being an admin, record an incident and
// return 403. This helps detect and track attempted access to other accounts.
export const viewUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Ensure caller is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Validate id parameter
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Debug log
    console.log('viewUserById: Processing request', { 
      requestedId: numericId,
      requestingUserId: req.user.id,
      requestingUserRole: req.user.role 
    });

    // If caller is owner or admin, return the profile
    if (req.user.id === numericId || req.user.role === 'admin') {
      const [rows] = await pool.query('SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?', [numericId]);
      if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
      const u = rows[0];
      return res.json({ id: u.user_id, name: u.full_name, email: u.email, role: u.role, created_at: u.created_at });
    }

    // Unauthorized attempt: log an incident and audit entry for investigation
    console.warn('Unauthorized profile access attempt by', req.user.id, 'for user', numericId);

    // Create incident record
    const [ins] = await pool.query('INSERT INTO incidents (reported_by, description) VALUES (?, ?)', [req.user.id, `Unauthorized profile access attempt: target_user_id=${numericId} by_user_id=${req.user.id}`]);

    // Write to audit logs as well
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [req.user.id, `Unauthorized access attempt recorded incident_id=${ins.insertId} target_user_id=${numericId}`]);

    return res.status(403).json({ message: 'Access denied. This attempt has been recorded and will be investigated.' });
  } catch (error) {
    console.error('viewUserById error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: delete a user (used as a ban/delete action)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Ensure caller is authenticated and an admin
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin role required' });
    }

    // Prevent deleting yourself
    if (numericId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    // Fetch target user
    const [rows] = await pool.query('SELECT user_id, role FROM users WHERE user_id = ?', [numericId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const target = rows[0];
    // Prevent deleting admins
    if (target.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete an admin' });
    }

    // Prevent deleting if user is an instructor owning courses (instructor_id is NOT NULL)
    const [ownedCourses] = await pool.query('SELECT COUNT(*) AS c FROM courses WHERE instructor_id = ?', [numericId]);
    if (ownedCourses && ownedCourses[0] && ownedCourses[0].c > 0) {
      return res.status(400).json({ message: 'Cannot delete user: user is assigned as course instructor. Reassign or remove courses first.' });
    }

    // Nullify references in tables where it's safe to do so to avoid FK constraint errors
    try {
      await pool.query('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?', [numericId]);
      await pool.query('UPDATE invite_requests SET requested_by = NULL WHERE requested_by = ?', [numericId]);
      await pool.query('UPDATE invite_requests SET processed_by = NULL WHERE processed_by = ?', [numericId]);
      await pool.query('UPDATE incidents SET reported_by = NULL WHERE reported_by = ?', [numericId]);
    } catch (updErr) {
      console.error('Error nullifying references for delete:', updErr);
      // continue — deletion may still fail if other unhandled FKs exist
    }

    // Delete the user
    const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [numericId]);
    if (result.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to delete user' });
    }

    // Audit log the deletion
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [req.user.id, `Deleted user_id=${numericId} role=${target.role}`]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
};

// Authenticated user: change their password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

    const [rows] = await pool.query('SELECT password_hash, email, full_name, role FROM users WHERE user_id = ?', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const userRow = rows[0];
    const isMatch = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [newHash, userId]);

    // Audit log
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, 'Changed password']);

    // Return a fresh token reflecting current role
    const newToken = jwt.sign({ id: userId, email: userRow.email, role: userRow.role, name: userRow.full_name }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ message: 'Password changed', token: newToken });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error while changing password', details: error.message });
  }
};

// Authenticated user: generate or refresh their 6-digit backup code
export const generateBackupCode = async (req, res) => {
  try {
    const userId = req.user && req.user.id ? req.user.id : null;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const backupCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const now = new Date();

    await pool.query('UPDATE users SET backup_code = ?, code_generation_timestamp = ? WHERE user_id = ?', [backupCode, now, userId]);
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, 'Regenerated backup code']);

    res.json({ backup_code: backupCode, code_generation_timestamp: now });
  } catch (error) {
    console.error('generateBackupCode error:', error);
    res.status(500).json({ message: 'Server error generating backup code' });
  }
};

// Forgot-password: Step 1 - locate account by email
export const forgotStart = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ? LIMIT 1', [email]);
    const found = rows && rows.length > 0;

    // Always return 200 to avoid leaking too much, but include a found flag so frontend can progress
    return res.json({ found });
  } catch (error) {
    console.error('forgotStart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot-password: Step 2 - verify backup code and issue a short-lived reset token
export const forgotVerify = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'email and code are required' });

    const [rows] = await pool.query('SELECT user_id, backup_code, code_generation_timestamp FROM users WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'Invalid email or code' });
    const user = rows[0];

    if (!user.backup_code || user.backup_code !== code) {
      return res.status(400).json({ message: 'Invalid email or code' });
    }

    // Check code age (valid for 24 hours)
    const genTs = user.code_generation_timestamp ? new Date(user.code_generation_timestamp).getTime() : 0;
    if (!genTs || (Date.now() - genTs) > 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Backup code expired. Please generate a new code.' });
    }

    // Issue a short-lived reset token
    const resetToken = jwt.sign({ id: user.user_id, purpose: 'pwd_reset' }, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Audit
    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [user.user_id, 'Completed backup code verification for password reset']);

    res.json({ resetToken });
  } catch (error) {
    console.error('forgotVerify error:', error);
    res.status(500).json({ message: 'Server error verifying code' });
  }
};

// Forgot-password: Step 3 - reset password using the reset token
export const forgotReset = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ message: 'resetToken and newPassword required' });
    if (typeof newPassword !== 'string' || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (!payload || payload.purpose !== 'pwd_reset' || !payload.id) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const userId = payload.id;

    // Hash new password and update
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ?, backup_code = NULL, code_generation_timestamp = NULL WHERE user_id = ?', [newHash, userId]);

    await pool.query('INSERT INTO audit_logs (user_id, action) VALUES (?, ?)', [userId, 'Password reset via backup code flow']);

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('forgotReset error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};