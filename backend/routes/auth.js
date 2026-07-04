const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authenticateToken, logActivity } = require('../middleware/auth');
const { sendLoginEmail, sendRegisterEmail, sendLogoutEmail } = require('../services/email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-jwt-secret-change-in-production';

/**
 * POST /api/auth/register — Create a new user account.
 * Frontend: auth.js
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (name.trim().length < 1 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)').run(name.trim(), email, hashedPassword);

    const token = jwt.sign(
      { id: result.lastInsertRowid, name: name.trim(), email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newUser = { id: result.lastInsertRowid, name: name.trim(), email };

    sendRegisterEmail(newUser);

    res.status(201).json({
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/**
 * POST /api/auth/login — Authenticate an existing user.
 * Frontend: auth.js
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logActivity(user.id, 'login', 'User logged in');

    sendLoginEmail(user);

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

/**
 * GET /api/auth/me — Return the authenticated user's profile.
 * Frontend: session verification on dashboard load.
 */
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/auth/logout — Log out and send notification email.
 * Frontend: dashboard.js logout button
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.user.id);
    if (user) {
      logActivity(user.id, 'logout', 'User logged out');
      sendLogoutEmail(user);
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
