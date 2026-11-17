import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { seedDefaultSubjects } from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { cleanString } from '../lib/validate.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Never send the stored Gemini key (or password hash) back to the browser.
const PUBLIC_USER_FIELDS = 'id, name, email, field_of_study, weekly_goal_hours, created_at';

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

router.post('/register', (req, res) => {
  const name = cleanString(req.body.name, 80);
  const email = cleanString(req.body.email, 160).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const fieldOfStudy = cleanString(req.body.fieldOfStudy, 120);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newUserId = db.transaction(() => {
      const result = db
        .prepare('INSERT INTO users (name, email, password, field_of_study) VALUES (?, ?, ?, ?)')
        .run(name, email, hash, fieldOfStudy);
      seedDefaultSubjects(result.lastInsertRowid);
      return result.lastInsertRowid;
    })();

    const user = db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(newUserId);
    res.status(201).json({ token: signToken(newUserId), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', (req, res) => {
  const email = cleanString(req.body.email, 160).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const row = db.prepare('SELECT id, password FROM users WHERE email = ?').get(email);
    if (!row || !bcrypt.compareSync(password, row.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(row.id);
    res.json({ token: signToken(row.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare(`SELECT ${PUBLIC_USER_FIELDS} FROM users WHERE id = ?`).get(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
