const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * All Kanban endpoints are placeholders for drag-and-drop board support.
 *
 * Future implementation plan:
 *   GET    /api/kanban/boards         — List boards for a team/user
 *   POST   /api/kanban/boards         — Create a new board
 *   GET    /api/kanban/boards/:id     — Get board with columns and tasks
 *   PUT    /api/kanban/columns/:id    — Update column (name, position)
 *   POST   /api/kanban/columns        — Add a column to a board
 *   DELETE /api/kanban/columns/:id    — Remove a column
 *   PUT    /api/kanban/tasks/:id/position — Move a task between columns
 *
 * Drag-and-drop on the frontend will use a library (e.g., SortableJS).
 * Positions use a floating-point ordering system to avoid re-indexing
 * on every move.
 */

router.get('/boards', authenticateToken, (req, res) => {
  res.json({ boards: [], message: 'Kanban boards will be available in a future update.' });
});

module.exports = router;
