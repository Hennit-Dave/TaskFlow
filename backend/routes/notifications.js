const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * All notification endpoints are placeholders for real-time notifications.
 *
 * Future implementation plan:
 *   GET    /api/notifications       — List unread notifications
 *   PUT    /api/notifications/:id   — Mark as read
 *   POST   /api/notifications/read-all — Mark all as read
 *
 * Notifications will be delivered via WebSocket (socket.io) and persisted
 * in the notifications table for history.
 */

router.get('/', authenticateToken, (req, res) => {
  res.json({ notifications: [], message: 'Notifications will be available in a future update.' });
});

module.exports = router;
