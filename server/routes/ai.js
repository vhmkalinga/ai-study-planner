import express from 'express';
import { GoogleGenAI } from '@google/genai';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';
import { addDays, cleanString, isTime, resolveDate } from '../lib/validate.js';

const router = express.Router();
router.use(authMiddleware);

// gemini-2.0-flash was shut down on 2026-06-01. Override with GEMINI_MODEL in server/.env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

class AIError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getClient(userId) {
  const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(userId);
  const apiKey = user?.gemini_api_key || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AIError(400, 'No Gemini API key configured. Add one in Settings → AI Configuration.');
  }
  return new GoogleGenAI({ apiKey });
}

async function askJSON(userId, prompt) {
  const ai = getClient(userId);
  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.7 }
    });
  } catch (err) {
    const msg = String(err?.message || err);
    console.error('[ai] Gemini request failed:', msg.slice(0, 300));
    if (/api key|API_KEY|permission|401|403/i.test(msg)) {
      throw new AIError(400, 'Gemini rejected the API key. Check it in Settings → AI Configuration.');
    }
    if (/429|quota|rate/i.test(msg)) {
      throw new AIError(429, 'Gemini rate limit reached. Please wait a minute and try again.');
    }
    if (/404|not found/i.test(msg)) {
      throw new AIError(502, `Gemini model "${MODEL}" is not available. Set GEMINI_MODEL in server/.env.`);
    }
    throw new AIError(502, 'The AI service is unavailable right now. Please try again.');
  }

  const text = (response.text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    throw new AIError(502, 'The AI returned an unexpected response. Please try again.');
  }
}

function handle(fn) {
  return async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      if (err instanceof AIError) return res.status(err.status).json({ error: err.message });
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// POST /api/ai/generate-plan
// { subjectIds: number[], availableHoursPerDay, daysCount, goals, startDate: 'YYYY-MM-DD' }
// → { sessions: [{ title, subjectId, subject, date, time, duration }] }
router.post('/generate-plan', handle(async (req) => {
  const ids = Array.isArray(req.body.subjectIds) ? req.body.subjectIds.map(Number) : [];
  const subjects = ids.length
    ? db.prepare(`SELECT id, name FROM subjects WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`)
        .all(req.userId, ...ids)
    : [];
  if (subjects.length === 0) throw new AIError(400, 'Select at least one subject');

  const hours = Math.min(12, Math.max(0.5, Number(req.body.availableHoursPerDay) || 2));
  const daysCount = clampInt(req.body.daysCount, 1, 14, 3);
  const startDate = resolveDate(req.body.startDate);
  const goals = cleanString(req.body.goals, 500);
  const user = db.prepare('SELECT field_of_study FROM users WHERE id = ?').get(req.userId);

  const dayList = Array.from({ length: daysCount }, (_, i) => {
    const date = addDays(startDate, i);
    const weekday = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    return `dayIndex ${i} = ${weekday} ${date}`;
  }).join('\n');

  const data = await askJSON(req.userId, `
You are an expert study coach. Build a realistic study schedule.

Student's field of study: ${user?.field_of_study || 'not specified'}
Subjects (use these names exactly): ${subjects.map((s) => s.name).join(', ')}
Available study time per day: ${hours} hours
Days to plan:
${dayList}
Goals: ${goals || 'balanced progress across all subjects'}

Rules:
- Total minutes per day must not exceed ${Math.round(hours * 60)}.
- Sessions are 25–120 minutes, start between 06:00 and 22:00, and never overlap on the same day.
- Interleave subjects; give each session a specific, actionable title (e.g. "Practice gradient descent problems").

Return JSON: {"sessions":[{"title":string,"subject":string,"dayIndex":integer,"time":"HH:MM","duration":integer}]}
`);

  const raw = Array.isArray(data) ? data : Array.isArray(data?.sessions) ? data.sessions : [];
  const byName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

  const sessions = raw
    .map((s) => {
      const subject = byName.get(String(s.subject || '').toLowerCase());
      const dayIndex = clampInt(s.dayIndex ?? s.day, 0, daysCount - 1, 0);
      return {
        title: cleanString(s.title, 120),
        subjectId: subject?.id ?? null,
        subject: subject?.name ?? cleanString(s.subject, 60),
        date: addDays(startDate, dayIndex),
        time: isTime(s.time) ? s.time : '09:00',
        duration: clampInt(s.duration, 15, 180, 60)
      };
    })
    .filter((s) => s.title)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  if (sessions.length === 0) throw new AIError(502, 'The AI did not return any sessions. Please try again.');
  return { sessions };
}));

// POST /api/ai/suggestions { today } → { suggestions: [{ title, subject, subjectId, duration, reason }] }
router.post('/suggestions', handle(async (req) => {
  const today = resolveDate(req.body.today);
  const recent = db.prepare(`
    SELECT s.title, s.done, s.date, sub.name AS subject
    FROM sessions s LEFT JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.user_id = ? AND s.date BETWEEN ? AND ?
    ORDER BY s.date DESC LIMIT 25
  `).all(req.userId, addDays(today, -14), today);
  const subjects = db.prepare('SELECT id, name FROM subjects WHERE user_id = ?').all(req.userId);
  const user = db.prepare('SELECT field_of_study FROM users WHERE id = ?').get(req.userId);

  const history = recent.length
    ? recent.map((s) => `- ${s.date} [${s.done ? 'done' : 'not done'}] ${s.subject || 'No subject'}: ${s.title}`).join('\n')
    : '- (no sessions yet)';

  const data = await askJSON(req.userId, `
You are a study coach. Suggest 3-4 study sessions the student should do next.

Field of study: ${user?.field_of_study || 'not specified'}
Their subjects: ${subjects.map((s) => s.name).join(', ') || 'none yet'}
Last 14 days of sessions:
${history}

Favour subjects that were neglected, revisit topics marked "not done", and build on recent work.
Use the subject names exactly as listed.
Return JSON: {"suggestions":[{"title":string,"subject":string,"duration":integer,"reason":string}]}
`);

  const byName = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));
  const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
    .map((s) => {
      const subject = byName.get(String(s.subject || '').toLowerCase());
      return {
        title: cleanString(s.title, 120),
        subject: subject?.name ?? cleanString(s.subject, 60),
        subjectId: subject?.id ?? null,
        duration: clampInt(s.duration, 15, 180, 45),
        reason: cleanString(s.reason, 300)
      };
    })
    .filter((s) => s.title)
    .slice(0, 5);

  return { suggestions };
}));

// POST /api/ai/tips { subject, topic } → { tips: string[] }
router.post('/tips', handle(async (req) => {
  const subject = cleanString(req.body.subject, 80);
  const topic = cleanString(req.body.topic, 160);
  if (!subject && !topic) throw new AIError(400, 'Enter a subject or topic');

  const data = await askJSON(req.userId, `
Give 4-5 concrete, actionable study tips for a student learning:
Subject: ${subject || 'general'}
Topic: ${topic || 'general study'}
Each tip is one or two sentences and specific to this topic (not generic advice).
Return JSON: {"tips":[string]}
`);

  const tips = (Array.isArray(data?.tips) ? data.tips : [])
    .map((t) => cleanString(String(t), 400))
    .filter(Boolean)
    .slice(0, 6);
  return { tips };
}));

export default router;
