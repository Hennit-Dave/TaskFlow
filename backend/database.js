const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'taskflow.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Core Schema (CREATE IF NOT EXISTS — safe for existing databases)
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    category TEXT DEFAULT 'other' CHECK(category IN ('work', 'personal', 'school', 'health', 'finance', 'other')),
    tags TEXT DEFAULT '',
    due_date DATE,
    completed INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Column Migrations (safe to run repeatedly — fails silently if column exists)
// ---------------------------------------------------------------------------
const migrations = [
  "ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT 'other'",
  "ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT ''",
  "ALTER TABLE tasks ADD COLUMN position REAL",
  "ALTER TABLE tasks ADD COLUMN board_column_id INTEGER",
  "ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
  "ALTER TABLE tasks ADD COLUMN completed_at DATETIME",
];
migrations.forEach(function(sql) {
  try { db.exec(sql); } catch (e) {}
});

// ---------------------------------------------------------------------------
// Future Feature: Team Collaboration
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'member' CHECK(role IN ('admin', 'member', 'viewer')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(team_id, user_id)
  );
`);

// ---------------------------------------------------------------------------
// Future Feature: Task Assignment
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS task_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_by INTEGER,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(task_id, user_id)
  );
`);

// ---------------------------------------------------------------------------
// Future Feature: Real-Time Notifications
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    data TEXT DEFAULT '{}',
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Future Feature: File Attachments
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS task_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Future Feature: Kanban Boards
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS board_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Future Feature: AI Suggestions
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    applied INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Performance Indexes
// ---------------------------------------------------------------------------
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, archived, completed);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date) WHERE due_date IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_tasks_user_category ON tasks(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
  CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_user_date ON activity_log(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_log(user_id, action, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
`);

// Indexes for future tables (safe to create even if tables are empty)
try {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_kanban ON tasks(board_column_id, position);
    CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);
    CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user ON ai_suggestions(user_id, type);
  `);
} catch (e) {
  // Tables may not exist yet (first run before schema creation)
  // These will be created on subsequent starts
}

module.exports = db;
