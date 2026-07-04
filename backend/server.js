const express = require('express');
const path = require('path');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.url);
  next();
});

// ---------------------------------------------------------------------------
// WebSocket (Socket.IO) — future real-time notifications
// ---------------------------------------------------------------------------
const server = http.createServer(app);
let io = null;

try {
  const { Server } = require('socket.io');
  io = new Server(server, { cors: { origin: '*' } });

  io.use((socket, next) => {
    // Future: authenticate socket connections via JWT
    // const token = socket.handshake.auth.token;
    // jwt.verify(token, JWT_SECRET, (err, user) => { ... });
    next();
  });

  io.on('connection', (socket) => {
    console.log('[WS] Client connected:', socket.id);

    // Future: join user-specific room for targeted notifications
    // socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      console.log('[WS] Client disconnected:', socket.id);
    });
  });

  console.log('[WS] Socket.IO initialized');
} catch (e) {
  console.log('[WS] Socket.IO not available — real-time features disabled');
  console.log('     Install with: npm install socket.io');
}

// Make io accessible to route files (used by notificationService)
app.set('io', io);

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

// Auth (no auth required for register/login)
app.use('/api/auth', require('./routes/auth'));

// Protected resource routes
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api', require('./routes/subtasks'));           // /api/tasks/:id/subtasks, /api/subtasks/:id
app.use('/api/activity', require('./routes/activity'));

// Future feature placeholders
app.use('/api/teams', require('./routes/teams'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/kanban', require('./routes/kanban'));
app.use('/api/ai', require('./routes/ai'));

// 404 catch-all for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------------------------------------------------------------------------
// Static Frontend Assets
// ---------------------------------------------------------------------------
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/html', express.static(path.join(__dirname, '..', 'html')));

app.get('/', (req, res) => {
  res.redirect('/html/index.html');
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`TaskFlow server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/html/index.html to get started.`);

  // Start task reminder email scheduler
  try {
    const { startReminderScheduler } = require('./services/reminder');
    startReminderScheduler();
  } catch (e) {
    console.log('[REMINDER] Scheduler not available:', e.message);
  }
});
