// Small validation and date helpers shared by the routes.
// Dates are stored as local calendar days ("YYYY-MM-DD") chosen by the client,
// so the server never converts them through a timezone.

export const COLORS = ['violet', 'blue', 'orange', 'pink', 'green', 'red', 'yellow', 'teal'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDateKey(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function cleanString(value, max = 200) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

// Calendar arithmetic on "YYYY-MM-DD" strings, done in UTC so it never drifts.
export function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mondayOf(dateKey) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sun
  return addDays(dateKey, day === 0 ? -6 : 1 - day);
}

export function serverToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Use the client's "today" when it sends one, so streaks follow the user's timezone.
export function resolveDate(value) {
  return isDateKey(value) ? value : serverToday();
}
