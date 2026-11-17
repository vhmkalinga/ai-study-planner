import express from 'express';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { cleanString, isDateKey, isTime } from '../lib/validate.js';

const router = express.Router();
router.use(authMiddleware);

const SELECT_SESSION = `
  SELECT s.*, sub.name AS subject_name, sub.color AS subject_color
  FROM sessions s
  LEFT JOIN subjects sub ON s.subject_id = sub.id
`;

function ownsSubject(userId, subjectId) {
  return !!db.prepare('SELECT 1 FROM subjects WHERE id = ? AND user_id = ?').get(subjectId, userId);
}

function parseSubjectId(value) {
  if (value === null || value === '' || value === undefined) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : NaN;
}

function parseDuration(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 5 && n <= 720 ? n : NaN;
}

// GET /api/sessions?date=YYYY-MM-DD  or  ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', (req, res) => {
  const { date, from, to } = req.query;
  let where = 'WHERE s.user_id = ?';
  const params = [req.userId];

  if (date !== undefined) {
    if (!isDateKey(date)) return res.status(400).json({ error: 'Invalid date' });
    where += ' AND s.date = ?';
    params.push(date);
  } else if (from !== undefined || to !== undefined) {
    if (!isDateKey(from) || !isDateKey(to)) return res.status(400).json({ error: 'Invalid date range' });
    where += ' AND s.date BETWEEN ? AND ?';
    params.push(from, to);
  }

  const sessions = db.prepare(`${SELECT_SESSION} ${where} ORDER BY s.date ASC, s.time ASC`).all(...params);
  res.json(sessions);
});

function validateSession(body, { partial }) {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('title')) {
    out.title = cleanString(body.title, 120);
    if (!out.title) return { error: 'Title is required' };
  }
  if (!partial || has('date')) {
    if (!isDateKey(body.date)) return { error: 'Date must be YYYY-MM-DD' };
    out.date = body.date;
  }
  if (!partial || has('time')) {
    if (!isTime(body.time)) return { error: 'Time must be HH:MM' };
    out.time = body.time;
  }
  if (!partial || has('duration')) {
    out.duration = parseDuration(body.duration);
    if (Number.isNaN(out.duration)) return { error: 'Duration must be 5–720 minutes' };
  }
  if (!partial || has('subjectId')) {
    out.subject_id = parseSubjectId(body.subjectId);
    if (Number.isNaN(out.subject_id)) return { error: 'Invalid subject' };
  }
  if (has('done')) {
    out.done = body.done ? 1 : 0;
  }
  return { data: out };
}

router.post('/', (req, res) => {
  const { data, error } = validateSession(req.body, { partial: false });
  if (error) return res.status(400).json({ error });
  if (data.subject_id && !ownsSubject(req.userId, data.subject_id)) {
    return res.status(400).json({ error: 'Subject not found' });
  }

  const result = db
    .prepare('INSERT INTO sessions (user_id, subject_id, title, date, time, duration, done) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.userId, data.subject_id, data.title, data.date, data.time, data.duration, data.done ?? 0);

  res.status(201).json(db.prepare(`${SELECT_SESSION} WHERE s.id = ?`).get(result.lastInsertRowid));
});

// Bulk create, used when adding a whole AI-generated plan at once.
router.post('/bulk', (req, res) => {
  const items = Array.isArray(req.body.sessions) ? req.body.sessions : null;
  if (!items || items.length === 0 || items.length > 60) {
    return res.status(400).json({ error: 'Provide 1–60 sessions' });
  }

  const rows = [];
  for (const item of items) {
    const { data, error } = validateSession(item, { partial: false });
    if (error) return res.status(400).json({ error });
    if (data.subject_id && !ownsSubject(req.userId, data.subject_id)) data.subject_id = null;
    rows.push(data);
  }

  const insert = db.prepare(
    'INSERT INTO sessions (user_id, subject_id, title, date, time, duration) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const ids = db.transaction(() =>
    rows.map((r) => insert.run(req.userId, r.subject_id, r.title, r.date, r.time, r.duration).lastInsertRowid)
  )();

  const created = db
    .prepare(`${SELECT_SESSION} WHERE s.id IN (${ids.map(() => '?').join(',')}) ORDER BY s.date, s.time`)
    .all(...ids);
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  const { data, error } = validateSession(req.body, { partial: true });
  if (error) return res.status(400).json({ error });
  if (data.subject_id && !ownsSubject(req.userId, data.subject_id)) {
    return res.status(400).json({ error: 'Subject not found' });
  }

  const keys = Object.keys(data);
  if (keys.length > 0) {
    db.prepare(`UPDATE sessions SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...keys.map((k) => data[k]), req.params.id, req.userId);
  }

  res.json(db.prepare(`${SELECT_SESSION} WHERE s.id = ?`).get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Session not found' });
  res.json({ success: true });
});

export default router;
