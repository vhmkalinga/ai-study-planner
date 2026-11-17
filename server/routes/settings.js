import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { cleanString } from '../lib/validate.js';

const router = express.Router();
router.use(authMiddleware);

function maskKey(key) {
  if (!key) return '';
  return key.length > 4 ? '•'.repeat(Math.min(key.length - 4, 20)) + key.slice(-4) : '••••';
}

function readSettings(userId) {
  const user = db
    .prepare('SELECT name, email, field_of_study, weekly_goal_hours, gemini_api_key FROM users WHERE id = ?')
    .get(userId);
  if (!user) return null;
  return {
    name: user.name,
    email: user.email,
    fieldOfStudy: user.field_of_study || '',
    weeklyGoalHours: user.weekly_goal_hours,
    hasGeminiKey: !!user.gemini_api_key,
    geminiApiKeyMasked: maskKey(user.gemini_api_key),
    serverHasGeminiKey: !!process.env.GEMINI_API_KEY
  };
}

router.get('/', (req, res) => {
  const settings = readSettings(req.userId);
  if (!settings) return res.status(404).json({ error: 'User not found' });
  res.json(settings);
});

router.put('/', (req, res) => {
  const { name, fieldOfStudy, weeklyGoalHours, geminiApiKey } = req.body;
  const updates = [];
  const params = [];

  if (name !== undefined) {
    const clean = cleanString(name, 80);
    if (!clean) return res.status(400).json({ error: 'Name cannot be empty' });
    updates.push('name = ?');
    params.push(clean);
  }
  if (fieldOfStudy !== undefined) {
    updates.push('field_of_study = ?');
    params.push(cleanString(fieldOfStudy, 120));
  }
  if (weeklyGoalHours !== undefined) {
    const n = Number(weeklyGoalHours);
    if (!Number.isFinite(n) || n < 1 || n > 100) {
      return res.status(400).json({ error: 'Weekly goal must be between 1 and 100 hours' });
    }
    updates.push('weekly_goal_hours = ?');
    params.push(Math.round(n * 2) / 2);
  }
  // Send a new key to replace it, or an empty string to remove it.
  if (geminiApiKey !== undefined) {
    updates.push('gemini_api_key = ?');
    params.push(cleanString(geminiApiKey, 200));
  }

  if (updates.length > 0) {
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params, req.userId);
  }
  res.json(readSettings(req.userId));
});

// GET /api/settings/export → download all of the user's data as JSON
router.get('/export', (req, res) => {
  const user = db
    .prepare('SELECT name, email, field_of_study, weekly_goal_hours, created_at FROM users WHERE id = ?')
    .get(req.userId);
  const subjects = db.prepare('SELECT id, name, color, created_at FROM subjects WHERE user_id = ? ORDER BY id').all(req.userId);
  const sessions = db.prepare(`
    SELECT s.id, s.title, sub.name AS subject, s.date, s.time, s.duration, s.done, s.created_at
    FROM sessions s LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? ORDER BY s.date, s.time
  `).all(req.userId);

  res.setHeader('Content-Disposition', 'attachment; filename="studyflow-export.json"');
  res.json({ exportedAt: new Date().toISOString(), user, subjects, sessions });
});

// DELETE /api/settings/account  { password } → permanently delete the account
router.delete('/account', (req, res) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const row = db.prepare('SELECT password FROM users WHERE id = ?').get(req.userId);
  if (!row || !bcrypt.compareSync(password, row.password)) {
    return res.status(403).json({ error: 'Incorrect password' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.userId); // cascades to subjects and sessions
  res.json({ success: true });
});

export default router;
