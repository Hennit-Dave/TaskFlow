const express = require('express');
const db = require('../database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/tasks/:id/subtasks — List subtasks for a task.
 * Frontend: dashboard.js toggleSubtasks() / loadSubtasks()
 */
router.get('/tasks/:id/subtasks', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid task ID.' });
    const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const subtasks = db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY created_at ASC').all(id);
    res.json({ subtasks });
  } catch (err) {
    console.error('Get subtasks error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/tasks/:id/subtasks — Add a subtask.
 * Frontend: dashboard.js addSubtask()
 */
router.post('/tasks/:id/subtasks', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid task ID.' });
    const task = db.prepare('SELECT id, title FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!task) return res.status(404).json({ error: 'Task not found.' });
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Subtask title is required.' });
    const result = db.prepare('INSERT INTO subtasks (task_id, title) VALUES (?, ?)').run(id, title.trim());
    const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
    logActivity(req.user.id, 'subtask_created', `${task.title} → ${subtask.title}`);
    res.status(201).json({ subtask });
  } catch (err) {
    console.error('Create subtask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /api/subtasks/:id — Toggle subtask completion.
 * Frontend: dashboard.js toggleSubtask()
 */
router.put('/subtasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid subtask ID.' });

    const subtask = db.prepare(`
      SELECT s.*, t.title as task_title FROM subtasks s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.id = ? AND t.user_id = ?
    `).get(id, req.user.id);
    if (!subtask) return res.status(404).json({ error: 'Subtask not found.' });

    const { completed } = req.body;
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: '"completed" must be a boolean value.' });
    }

    db.prepare('UPDATE subtasks SET completed = ? WHERE id = ?').run(completed ? 1 : 0, id);
    const updated = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
    logActivity(req.user.id, completed ? 'subtask_completed' : 'subtask_uncompleted', `${subtask.task_title} → ${updated.title}`);
    res.json({ subtask: updated });
  } catch (err) {
    console.error('Update subtask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /api/subtasks/:id — Delete a subtask.
 * Frontend: dashboard.js deleteSubtask()
 */
router.delete('/subtasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid subtask ID.' });

    const subtask = db.prepare(`
      SELECT s.*, t.title as task_title FROM subtasks s
      JOIN tasks t ON s.task_id = t.id
      WHERE s.id = ? AND t.user_id = ?
    `).get(id, req.user.id);
    if (!subtask) return res.status(404).json({ error: 'Subtask not found.' });
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
    logActivity(req.user.id, 'subtask_deleted', `${subtask.task_title} → ${subtask.title}`);
    res.json({ message: 'Subtask deleted.' });
  } catch (err) {
    console.error('Delete subtask error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
