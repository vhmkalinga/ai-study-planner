import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DB_PATH || path.join(__dirname, 'studyflow.db');
const db = new Database(dbPath);

// SQLite ignores foreign keys (and ON DELETE CASCADE / SET NULL) unless this is on.
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  field_of_study TEXT DEFAULT '',
  weekly_goal_hours REAL DEFAULT 10,
  gemini_api_key TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'violet',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject_id INTEGER,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);
`);

export function seedDefaultSubjects(userId) {
  const insert = db.prepare('INSERT INTO subjects (user_id, name, color) VALUES (?, ?, ?)');
  const defaultSubjects = [
    { name: 'Machine Learning', color: 'violet' },
    { name: 'Programming', color: 'blue' },
    { name: 'Data Science', color: 'orange' },
    { name: 'Mathematics', color: 'pink' }
  ];

  db.transaction((subjects) => {
    for (const subject of subjects) {
      insert.run(userId, subject.name, subject.color);
    }
  })(defaultSubjects);
}

export default db;
