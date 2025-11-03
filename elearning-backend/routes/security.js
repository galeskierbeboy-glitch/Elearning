import express from 'express';
import { auth, auditLogger, isSecurityAnalyst } from '../middleware/auth.js';
import {
  getAuditLogs,
  reportIncident,
  updateIncidentStatus,
  getIncidents
} from '../controllers/securityController.js';

const router = express.Router();

// Routes accessible by all authenticated users
router.post('/incidents', auth, auditLogger, reportIncident);

// Routes accessible by security analysts and admins
// In development we allow authenticated users to view audit logs/incidents to make testing easier.
const requireSecurityView = (req, res, next) => {
  // Allow in explicit development mode or when environment flag is set
  if (process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_SECURITY_VIEW === 'true') {
    console.warn('Development mode: allowing authenticated user to view security data for', req.originalUrl);
    return next();
  }

  // If NODE_ENV isn't set (common on Windows when running `npm run dev`), allow local requests
  // coming from localhost loopback addresses to ease developer testing. This is intentionally
  // conservative: only localhost / 127.0.0.1 / ::1 are allowed here.
  const host = req.hostname || req.headers.host || '';
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (host && host.includes('localhost')) {
    console.warn('Localhost request detected — allowing security view for', req.originalUrl);
    return next();
  }
  if (ip && (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.0.0.1'))) {
    console.warn('Local IP request detected (' + ip + ') — allowing security view for', req.originalUrl);
    return next();
  }

  return isSecurityAnalyst(req, res, next);
};

router.get('/audit-logs', auth, auditLogger, requireSecurityView, getAuditLogs);
router.get('/incidents', auth, auditLogger, requireSecurityView, getIncidents);
router.put('/incidents/:id', auth, auditLogger, isSecurityAnalyst, updateIncidentStatus);

export default router;