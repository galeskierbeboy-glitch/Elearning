import express from 'express';
const router = express.Router();

// Unauthenticated route to echo back Authorization header for debugging
router.get('/echo-token', (req, res) => {
  try {
    const authHeader = req.header('Authorization') || null;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : authHeader;
    const parts = token ? String(token).split('.') : [];
    res.json({
      receivedAuthorization: authHeader,
      tokenPreview: token ? `${String(token).slice(0,10)}...${String(token).slice(-10)}` : null,
      partsCount: parts.length,
      parts: parts.length > 0 ? parts.map((p,i) => ({ index: i, length: p.length })) : []
    });
  } catch (err) {
    console.error('echo-token error:', err);
    res.status(500).json({ message: 'Echo token failed' });
  }
});

export default router;
