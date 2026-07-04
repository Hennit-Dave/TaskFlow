const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/activity — Recent activity log entries.
 * Frontend: dashboard.js loadRecentActivity()
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const entries = db.prepare(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(req.user.id, limit);
    res.json({ entries });
  } catch (err) {
    console.error('Activity error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
