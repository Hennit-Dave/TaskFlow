const express = require('express');
const db = require('../database');
const { authenticateToken, logActivity } = require('../middleware/auth');

const router = express.Router();

// NOTE: Specific routes (stats, analytics, calendar) MUST be defined
// BEFORE the parameterized /:id routes so Express matches them first.

/**
 * GET /api/tasks/stats — Aggregate task counts.
 * Frontend: dashboard.js loadStats()
 */
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ?').get(req.user.id).c;
    const completed = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND completed = 1 AND archived = 0').get(req.user.id).c;
    const pending = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND completed = 0 AND archived = 0').get(req.user.id).c;
    const archived = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND archived = 1').get(req.user.id).c;
    res.json({ total, completed, pending, archived });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/tasks/analytics — Computed analytics (weekly/monthly completion, rate, streak).
 * Frontend: dashboard.js loadAnalytics()
 */
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const weekStart = monday.toISOString().split('T')[0];

    const monthStart = today.slice(0, 7) + '-01';

    const weekCompleted = db.prepare(
      "SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND completed = 1 AND archived = 0 AND completed_at IS NOT NULL AND date(completed_at) >= ?"
    ).get(userId, weekStart).c;

    const monthCompleted = db.prepare(
      "SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND completed = 1 AND archived = 0 AND completed_at IS NOT NULL AND date(completed_at) >= ?"
    ).get(userId, monthStart).c;

    const total = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND archived = 0').get(userId).c;
    const completed = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE user_id = ? AND completed = 1 AND archived = 0').get(userId).c;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    const topCat = db.prepare(
      "SELECT COALESCE(category, 'other') as category, COUNT(*) as c FROM tasks WHERE user_id = ? AND archived = 0 AND completed = 1 GROUP BY category ORDER BY c DESC LIMIT 1"
    ).get(userId);

    const completionDates = db.prepare(
      "SELECT DISTINCT date(completed_at) as d FROM tasks WHERE user_id = ? AND completed = 1 AND archived = 0 AND completed_at IS NOT NULL ORDER BY d DESC"
    ).all(userId);

    let streak = 0;
    const checkDate = new Date(today);
    for (const row of completionDates) {
      const expected = checkDate.toISOString().split('T')[0];
      if (row.d === expected) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({
      weekCompleted,
      monthCompleted,
      completionRate,
      topCategory: topCat ? topCat.category : null,
      streak
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/tasks/calendar — Tasks with due dates in a given month + overdue list.
 * Frontend: calendar view loadCalendarData()
 */
router.get('/calendar', authenticateToken, (req, res) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year);
    const m = parseInt(month);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return res.status(400).json({ error: 'Invalid year or month.' });
    }
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const tasks = db.prepare(
      "SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND due_date >= ? AND due_date <= ? ORDER BY due_date ASC"
    ).all(req.user.id, start, end);

    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = db.prepare(
      "SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND due_date < ? AND completed = 0 AND archived = 0 ORDER BY due_date ASC"
    ).all(req.user.id, today);

    res.json({ tasks, overdue: overdueTasks });
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * GET /api/tasks — List tasks with filtering, searching, sorting, pagination.
 * Frontend: dashboard.js loadTasks()
 */
router.get('/', authenticateToken, (req, res) => {
  try {
    const { filter, sort, search, category, priority, dueDate } = req.query;
    let page = parseInt(req.query.page) || 1;
    let limit = Math.min(parseInt(req.query.limit) || 20, 100);
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;

    let whereClauses = ['user_id = ?'];
    const params = [req.user.id];

    if (filter === 'archived') {
      whereClauses.push('archived = 1');
    } else {
      whereClauses.push('archived = 0');
      if (filter === 'completed') {
        whereClauses.push('completed = 1');
      } else if (filter === 'pending') {
        whereClauses.push('completed = 0');
      }
    }

    if (category) {
      whereClauses.push('category = ?');
      params.push(category);
    }

    if (priority) {
      whereClauses.push('priority = ?');
      params.push(priority);
    }

    if (dueDate) {
      const today = new Date().toISOString().split('T')[0];
      const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      if (dueDate === 'overdue') {
        whereClauses.push('due_date IS NOT NULL AND due_date < ? AND completed = 0');
        params.push(today);
      } else if (dueDate === 'today') {
        whereClauses.push('due_date = ?');
        params.push(today);
      } else if (dueDate === 'week') {
        whereClauses.push('due_date IS NOT NULL AND due_date <= ?');
        params.push(weekLater);
      } else if (dueDate === 'nodate') {
        whereClauses.push('due_date IS NULL');
      }
    }

    if (search) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR tags LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSQL = whereClauses.join(' AND ');

    const countQuery = `SELECT COUNT(*) as c FROM tasks WHERE ${whereSQL}`;
    const total = db.prepare(countQuery).get(...params).c;
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    let orderSQL;
    if (sort === 'oldest') {
      orderSQL = 'created_at ASC';
    } else if (sort === 'priority') {
      orderSQL = "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, created_at DESC";
    } else {
      orderSQL = 'created_at DESC';
    }

    const offset = (page - 1) * limit;
    const dataQuery = `SELECT * FROM tasks WHERE ${whereSQL} ORDER BY ${orderSQL} LIMIT ? OFFSET ?`;
    const tasks = db.prepare(dataQuery).all(...params, limit, offset);

    res.json({ tasks, page, totalPages, total });
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * POST /api/tasks — Create a new task.
 * Frontend: dashboard.js main form + calendar add form
 */
router.post('/', authenticateToken, (req, res) => {
  try {
    const { title, description, priority, category, tags, due_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }
    if (title.trim().length > 500) {
      return res.status(400).json({ error: 'Task title must be under 500 characters.' });
    }
    if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format.' });
    }

    const result = db.prepare(
      'INSERT INTO tasks (user_id, title, description, priority, category, tags, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user.id, title.trim(), description || '', priority || 'medium', category || 'other', tags || '', due_date || null);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    logActivity(req.user.id, 'task_created', task.title);
    res.status(201).json({ task });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * PUT /api/tasks/:id — Update a task (partial).
 * Frontend: dashboard.js edit modal, completion toggle, archive/restore
 */
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid task ID.' });

    const { title, description, priority, category, tags, due_date, completed, archived } = req.body;

    if (due_date !== undefined && due_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
      return res.status(400).json({ error: 'Due date must be in YYYY-MM-DD format.' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ error: 'Task title cannot be empty.' });
    }

    const completedVal = completed !== undefined ? (completed ? 1 : 0) : null;

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        category = COALESCE(?, category),
        tags = COALESCE(?, tags),
        due_date = COALESCE(?, due_date),
        completed = COALESCE(?, completed),
        archived = COALESCE(?, archived),
        completed_at = CASE WHEN ? IS NOT NULL AND ? = 1 THEN CURRENT_TIMESTAMP WHEN ? IS NOT NULL AND ? = 0 THEN NULL ELSE completed_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(
      title || null,
      description !== undefined ? description : null,
      priority || null,
      category || null,
      tags !== undefined ? tags : null,
      due_date !== undefined ? due_date : null,
      completedVal,
      archived !== undefined ? (archived ? 1 : 0) : null,
      completedVal, completedVal, completedVal, completedVal,
      id,
      req.user.id
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    const titleChanged = title !== undefined && title.trim() !== existing.title;
    const wasCompleted = completed !== undefined && completed && !existing.completed;
    const wasUncompleted = completed !== undefined && !completed && existing.completed;
    const wasArchived = archived !== undefined && archived && !existing.archived;
    const wasUnarchived = archived !== undefined && !archived && existing.archived;

    if (wasCompleted) logActivity(req.user.id, 'task_completed', task.title);
    else if (wasUncompleted) logActivity(req.user.id, 'task_uncompleted', task.title);
    else if (wasArchived) logActivity(req.user.id, 'task_archived', task.title);
    else if (wasUnarchived) logActivity(req.user.id, 'task_restored', task.title);
    else if (titleChanged || description !== undefined || priority !== undefined || category !== undefined || tags !== undefined || due_date !== undefined)
      logActivity(req.user.id, 'task_edited', task.title);

    res.json({ task });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

/**
 * DELETE /api/tasks/:id — Permanently delete a task + its subtasks.
 * Frontend: dashboard.js confirm modal, calendar delete
 */
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid task ID.' });

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    db.prepare('DELETE FROM subtasks WHERE task_id = ?').run(id);
    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, req.user.id);
    logActivity(req.user.id, 'task_deleted', existing.title);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
