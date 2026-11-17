import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useStudy } from '../context/StudyContext';
import { todayKey } from '../lib/format';

const DURATIONS = [
  [15, '15 min'], [25, '25 min (Pomodoro)'], [30, '30 min'], [45, '45 min'], [60, '1 hr'],
  [75, '1 hr 15 min'], [90, '1 hr 30 min'], [120, '2 hr'], [150, '2 hr 30 min'], [180, '3 hr']
];

const inputClass =
  'w-full mt-1.5 h-10 px-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink';
const labelClass = 'text-xs font-bold tracking-wider text-muted uppercase';

/**
 * Add/edit a study session. Mount it only while open
 * ({open && <SessionModal …/>}) so the form starts fresh each time.
 */
const SessionModal = ({ onClose, session, initialDate, onSaved }) => {
  const { subjects, addSession, updateSession, deleteSession } = useStudy();
  const isEdit = !!session?.id;

  const [form, setForm] = useState(() => ({
    title: session?.title || '',
    subjectId: session?.subject_id ?? subjects[0]?.id ?? '',
    date: session?.date || initialDate || todayKey(),
    time: session?.time || '09:00',
    duration: session?.duration || 60
  }));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      subjectId: form.subjectId === '' ? null : Number(form.subjectId),
      duration: Number(form.duration)
    };
    const result = isEdit ? await updateSession(session.id, payload) : await addSession(payload);
    setSaving(false);
    if (result) {
      onSaved?.(result);
      onClose();
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this session?')) return;
    setSaving(true);
    const ok = await deleteSession(session.id);
    setSaving(false);
    if (ok) {
      onSaved?.(null);
      onClose();
    }
  };

  // Keep a non-standard duration (e.g. from the AI) selectable when editing.
  const durations = DURATIONS.some(([v]) => v === Number(form.duration))
    ? DURATIONS
    : [...DURATIONS, [Number(form.duration), `${form.duration} min`]].sort((a, b) => a[0] - b[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="session-modal-title">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-paper rounded-xl shadow-xl w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <p className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase mb-1">Plan your day</p>
            <h2 id="session-modal-title" className="font-display text-xl font-bold">
              {isEdit ? 'Edit session' : 'Add a study session'}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink border-0 bg-transparent">
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div>
            <label htmlFor="sm-title" className={labelClass}>What will you study?</label>
            <input
              id="sm-title"
              type="text"
              required
              maxLength={120}
              autoFocus
              className={inputClass}
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Review React hooks"
            />
          </div>

          <div>
            <label htmlFor="sm-subject" className={labelClass}>Subject</label>
            <select id="sm-subject" className={inputClass} value={form.subjectId} onChange={set('subjectId')}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sm-date" className={labelClass}>Date</label>
              <input id="sm-date" type="date" required className={inputClass} value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label htmlFor="sm-time" className={labelClass}>Time</label>
              <input id="sm-time" type="time" required className={inputClass} value={form.time} onChange={set('time')} />
            </div>
          </div>

          <div>
            <label htmlFor="sm-duration" className={labelClass}>Duration</label>
            <select id="sm-duration" className={inputClass} value={form.duration} onChange={set('duration')}>
              {durations.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-1">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="h-[42px] px-4 rounded-lg border border-danger/30 bg-danger/5 text-danger font-bold text-[13px] inline-flex items-center gap-2 hover:bg-danger/10 disabled:opacity-60"
              >
                <Icon name="trash" size={16} /> Delete
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg h-[42px] inline-flex items-center justify-center gap-2 text-[13px] shadow-[0_5px_10px_#1f694a22] disabled:opacity-60 border-0"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to my plan'}
              {!saving && <Icon name="arrow" size={17} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SessionModal;
