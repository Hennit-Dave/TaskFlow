const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-jwt-secret-change-in-production';

/**
 * Middleware that verifies the JWT from the Authorization header.
 * On success sets req.user = { id, name, email } from the token payload.
 * Frontend must send: Authorization: Bearer <token>
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Insert a row into the activity_log table.
 * Called inside endpoints after a meaningful user action.
 */
function logActivity(userId, action, details) {
  db.prepare('INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)').run(userId, action, details);
}

module.exports = { authenticateToken, logActivity };
