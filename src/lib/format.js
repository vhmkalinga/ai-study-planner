// Shared date/format helpers.
// Dates are handled as local calendar days ("YYYY-MM-DD"). Never use
// toISOString() for this: it converts to UTC and gives the wrong day in
// timezones ahead of UTC (e.g. Sri Lanka before 05:30).

export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toDateKey(new Date());
}

export function addDaysKey(key, n) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function mondayKey(key = todayKey()) {
  const d = fromDateKey(key);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return toDateKey(d);
}

export function formatMinutes(minutes = 0) {
  const m = Math.round(minutes || 0);
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function formatTime12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const SUBJECT_COLORS = [
  { name: 'violet', hex: '#9179dc' },
  { name: 'blue', hex: '#69a3d9' },
  { name: 'orange', hex: '#e7a55f' },
  { name: 'pink', hex: '#dc8f9f' },
  { name: 'green', hex: '#4fbf7f' },
  { name: 'red', hex: '#e5745c' },
  { name: 'yellow', hex: '#d9b23a' },
  { name: 'teal', hex: '#2fb5a3' }
];

const COLOR_HEX = Object.fromEntries(SUBJECT_COLORS.map((c) => [c.name, c.hex]));

export function subjectColor(name) {
  return COLOR_HEX[name] || '#c4ccc6';
}
