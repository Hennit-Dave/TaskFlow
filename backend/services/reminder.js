const db = require('../database');
const { sendTaskReminderEmail } = require('./email');

const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let intervalHandle = null;

function getUsersWithPendingTasks() {
  const today = new Date().toISOString().split('T')[0];
  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const users = db.prepare('SELECT id, name, email FROM users').all();
  const result = [];

  for (const user of users) {
    const tasks = db.prepare(
      `SELECT id, title, due_date, priority FROM tasks
       WHERE user_id = ? AND completed = 0 AND archived = 0
       AND due_date IS NOT NULL AND due_date <= ? AND due_date >= ?
       ORDER BY due_date ASC`
    ).all(user.id, weekLater, today);

    const overdue = db.prepare(
      `SELECT id, title, due_date, priority FROM tasks
       WHERE user_id = ? AND completed = 0 AND archived = 0
       AND due_date IS NOT NULL AND due_date < ?
       ORDER BY due_date ASC`
    ).all(user.id, today);

    const allTasks = [...tasks, ...overdue];
    if (allTasks.length > 0) {
      result.push({ user, tasks: allTasks });
    }
  }

  return result;
}

async function checkAndSendReminders() {
  try {
    const entries = getUsersWithPendingTasks();
    for (const { user, tasks } of entries) {
      await sendTaskReminderEmail(user, tasks);
    }
    if (entries.length > 0) {
      console.log('[REMINDER] Sent reminders to', entries.length, 'user(s)');
    }
  } catch (err) {
    console.error('[REMINDER] Error:', err.message);
  }
}

function startReminderScheduler() {
  if (intervalHandle) return;
  console.log('[REMINDER] Scheduler started (checking every 60 min)');
  checkAndSendReminders();
  intervalHandle = setInterval(checkAndSendReminders, CHECK_INTERVAL_MS);
}

function stopReminderScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

module.exports = { startReminderScheduler, stopReminderScheduler };
