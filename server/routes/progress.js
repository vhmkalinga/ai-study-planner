import express from 'express';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { addDays, isDateKey, mondayOf, resolveDate } from '../lib/validate.js';

const router = express.Router();
router.use(authMiddleware);

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// GET /api/progress/weekly?date=YYYY-MM-DD → Mon–Sun week containing that date
router.get('/weekly', (req, res) => {
  const monday = mondayOf(resolveDate(req.query.date));
  const days = DAY_NAMES.map((dayName, i) => ({ date: addDays(monday, i), dayName, totalMinutes: 0, sessions: 0 }));
  const startDate = days[0].date;
  const endDate = days[6].date;

  const rows = db.prepare(`
    SELECT date, SUM(duration) AS minutes, COUNT(*) AS count
    FROM sessions
    WHERE user_id = ? AND done = 1 AND date BETWEEN ? AND ?
    GROUP BY date
  `).all(req.userId, startDate, endDate);

  let totalMinutes = 0;
  let sessionsCompleted = 0;
  for (const row of rows) {
    const day = days.find((d) => d.date === row.date);
    if (day) {
      day.totalMinutes = row.minutes;
      day.sessions = row.count;
      totalMinutes += row.minutes;
      sessionsCompleted += row.count;
    }
  }

  const planned = db.prepare(`
    SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND date BETWEEN ? AND ?
  `).get(req.userId, startDate, endDate).count;

  res.json({ startDate, endDate, days, totalMinutes, sessionsCompleted, sessionsPlanned: planned });
});

// GET /api/progress/streak?today=YYYY-MM-DD (client's local date)
router.get('/streak', (req, res) => {
  const today = resolveDate(req.query.today);
  const dates = db.prepare(`
    SELECT DISTINCT date FROM sessions
    WHERE user_id = ? AND done = 1 AND date <= ?
    ORDER BY date DESC
  `).all(req.userId, today).map((r) => r.date);

  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < dates.length; i++) {
    run = i > 0 && addDays(dates[i], 1) === dates[i - 1] ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const todayCompleted = dates[0] === today;
  // A streak stays alive through today even if today's session isn't done yet.
  let expected = todayCompleted ? today : addDays(today, -1);
  let currentStreak = 0;
  for (const date of dates) {
    if (date === today && !todayCompleted) continue;
    if (date !== expected) break;
    currentStreak++;
    expected = addDays(expected, -1);
  }

  res.json({ currentStreak, longestStreak, todayCompleted });
});

// GET /api/progress/subjects[?from=&to=] → completed minutes per subject
router.get('/subjects', (req, res) => {
  const { from, to } = req.query;
  const ranged = isDateKey(from) && isDateKey(to);
  const subjects = db.prepare(`
    SELECT sub.id AS subjectId, sub.name, sub.color, SUM(s.duration) AS totalMinutes, COUNT(s.id) AS sessions
    FROM subjects sub
    JOIN sessions s ON s.subject_id = sub.id AND s.done = 1 ${ranged ? 'AND s.date BETWEEN ? AND ?' : ''}
    WHERE sub.user_id = ?
    GROUP BY sub.id
    ORDER BY totalMinutes DESC
  `).all(...(ranged ? [from, to, req.userId] : [req.userId]));
  res.json(subjects);
});

// GET /api/progress/summary → all-time totals
router.get('/summary', (req, res) => {
  const row = db.prepare(`
    SELECT COALESCE(SUM(duration), 0) AS totalMinutes, COUNT(*) AS sessionsCompleted
    FROM sessions WHERE user_id = ? AND done = 1
  `).get(req.userId);
  res.json(row);
});

export default router;
