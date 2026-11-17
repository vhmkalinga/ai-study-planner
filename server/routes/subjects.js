import express from 'express';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { cleanString, COLORS } from '../lib/validate.js';

const router = express.Router();
router.use(authMiddleware);

const SELECT_WITH_TOTALS = `
  SELECT sub.*, COALESCE(SUM(s.duration), 0) AS totalMinutes
  FROM subjects sub
  LEFT JOIN sessions s ON s.subject_id = sub.id AND s.done = 1
`;

function validate(body) {
  const name = cleanString(body.name, 60);
  if (!name) return { error: 'Subject name is required' };
  const color = COLORS.includes(body.color) ? body.color : 'violet';
  return { name, color };
}

router.get('/', (req, res) => {
  const subjects = db
    .prepare(`${SELECT_WITH_TOTALS} WHERE sub.user_id = ? GROUP BY sub.id ORDER BY sub.name COLLATE NOCASE ASC`)
    .all(req.userId);
  res.json(subjects);
});

router.post('/', (req, res) => {
  const { name, color, error } = validate(req.body);
  if (error) return res.status(400).json({ error });

  const result = db.prepare('INSERT INTO subjects (user_id, name, color) VALUES (?, ?, ?)').run(req.userId, name, color);
  res.status(201).json(db.prepare('SELECT *, 0 AS totalMinutes FROM subjects WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, color, error } = validate(req.body);
  if (error) return res.status(400).json({ error });

  const result = db
    .prepare('UPDATE subjects SET name = ?, color = ? WHERE id = ? AND user_id = ?')
    .run(name, color, req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Subject not found' });

  res.json(db.prepare(`${SELECT_WITH_TOTALS} WHERE sub.id = ? AND sub.user_id = ? GROUP BY sub.id`).get(req.params.id, req.userId));
});

router.delete('/:id', (req, res) => {
  // Sessions keep their data; foreign_keys=ON makes their subject_id become NULL.
  const result = db.prepare('DELETE FROM subjects WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'Subject not found' });
  res.json({ success: true });
});

export default router;
