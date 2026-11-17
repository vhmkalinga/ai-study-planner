import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import SessionModal from '../components/SessionModal';
import { aiAPI, errorMessage } from '../services/api';
import { formatMinutes, formatTime12, fromDateKey, subjectColor } from '../lib/format';

const labelClass = 'text-xs font-bold tracking-wider text-muted uppercase block mb-1.5';
const inputClass =
  'w-full h-10 px-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink';

const Spinner = () => <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />;

const ErrorBox = ({ message }) =>
  message ? <div className="bg-danger/10 text-danger text-sm p-3 rounded-lg border border-danger/20">{message}</div> : null;

const Card = ({ icon, title, subtitle, children }) => (
  <section className="bg-paper border border-line rounded-xl p-6">
    <div className="flex items-start gap-3 mb-5">
      <span className="w-[33px] h-[33px] rounded-[9px] bg-accent-soft text-accent grid place-items-center shrink-0">
        <Icon name={icon} size={17} />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        <p className="text-sm text-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
    {children}
  </section>
);

// ---------------------------------------------------------------- Plan

const PlanGenerator = () => {
  const { today, subjects, addSessions } = useStudy();
  const [form, setForm] = useState({ subjectIds: [], availableHoursPerDay: 2, daysCount: 5, startDate: today, goals: '' });
  const [plan, setPlan] = useState(null); // null | [{...session, selected}]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggleSubject = (id) =>
    setForm((f) => ({
      ...f,
      subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter((x) => x !== id) : [...f.subjectIds, id]
    }));

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await aiAPI.generatePlan(form);
      setPlan(data.sessions.map((s) => ({ ...s, selected: true })));
    } catch (err) {
      setError(errorMessage(err, 'Could not generate a plan'));
    } finally {
      setBusy(false);
    }
  };

  const addSelected = async () => {
    const chosen = plan.filter((s) => s.selected);
    setBusy(true);
    const created = await addSessions(
      chosen.map(({ title, subjectId, date, time, duration }) => ({ title, subjectId, date, time, duration }))
    );
    setBusy(false);
    if (created) setPlan(null);
  };

  if (plan) {
    const selected = plan.filter((s) => s.selected);
    const byDate = plan.reduce((acc, s, i) => ((acc[s.date] ||= []).push({ ...s, index: i }), acc), {});
    return (
      <div className="space-y-4">
        <div className="bg-primary-soft text-primary p-4 rounded-lg font-medium text-sm">
          The AI suggested {plan.length} sessions. Untick any you don't want, then add them to your planner.
        </div>
        <div className="space-y-4">
          {Object.entries(byDate).map(([date, items]) => (
            <div key={date}>
              <div className="text-xs font-bold tracking-wider text-muted uppercase mb-2">
                {fromDateKey(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </div>
              <div className="border border-line rounded-lg divide-y divide-line overflow-hidden">
                {items.map((s) => (
                  <label key={s.index} className="p-3 flex items-center gap-3 bg-surface cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s.selected}
                      onChange={() =>
                        setPlan((p) => p.map((x, i) => (i === s.index ? { ...x, selected: !x.selected } : x)))
                      }
                      className="w-4 h-4 accent-[#1f694a]"
                    />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subjectColor(subjects.find((x) => x.id === s.subjectId)?.color) }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink text-sm">{s.title}</div>
                      <div className="text-xs text-muted">
                        {s.subject} · {formatTime12(s.time)} · {s.duration} min
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={addSelected}
            disabled={busy || selected.length === 0}
            className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-10 inline-flex items-center gap-2 border-0 disabled:opacity-50"
          >
            {busy ? <Spinner /> : <Icon name="plus" size={17} />}
            Add {selected.length} to planner ({formatMinutes(selected.reduce((m, s) => m + s.duration, 0))})
          </button>
          <button onClick={() => setPlan(null)} className="border border-line bg-paper text-ink font-semibold rounded-lg px-4 h-10 hover:bg-surface">
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={generate} className="space-y-4">
      <div>
        <span className={labelClass}>Subjects to include</span>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">
            Add a subject first on the <Link to="/subjects" className="text-primary font-semibold">Subjects</Link> page.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const on = form.subjectIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSubject(s.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors inline-flex items-center gap-2 ${
                    on ? 'bg-primary text-white border-primary' : 'bg-surface text-ink border-line hover:border-primary/50'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: on ? '#fff' : subjectColor(s.color) }} />
                  {s.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
        <div>
          <label htmlFor="ai-start" className={labelClass}>Start date</label>
          <input id="ai-start" type="date" min={today} required className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ai-days" className={labelClass}>Days to plan</label>
          <select id="ai-days" className={inputClass} value={form.daysCount} onChange={(e) => setForm({ ...form, daysCount: Number(e.target.value) })}>
            {[1, 3, 5, 7, 14].map((n) => (
              <option key={n} value={n}>{n === 7 ? '1 week' : n === 14 ? '2 weeks' : `${n} day${n > 1 ? 's' : ''}`}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ai-hours" className={labelClass}>Hours per day</label>
          <input
            id="ai-hours"
            type="number"
            min={0.5}
            max={12}
            step={0.5}
            required
            className={inputClass}
            value={form.availableHoursPerDay}
            onChange={(e) => setForm({ ...form, availableHoursPerDay: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <label htmlFor="ai-goals" className={labelClass}>Goals (optional)</label>
        <textarea
          id="ai-goals"
          maxLength={500}
          className="w-full h-24 p-3 bg-sidebar-bg border border-line rounded-md outline-none resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="e.g. Final exam in Linear Algebra next Friday; I'm weak on eigenvalues."
          value={form.goals}
          onChange={(e) => setForm({ ...form, goals: e.target.value })}
        />
      </div>

      <ErrorBox message={error} />

      <button
        type="submit"
        disabled={busy || form.subjectIds.length === 0}
        className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-10 inline-flex items-center gap-2 shadow-sm border-0 disabled:opacity-50"
      >
        {busy ? <Spinner /> : <Icon name="sparkle" size={18} />}
        {busy ? 'Generating…' : 'Generate study plan'}
      </button>
    </form>
  );
};

// ---------------------------------------------------------------- Suggestions

const Suggestions = () => {
  const { today } = useStudy();
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(null);

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await aiAPI.getSuggestions({ today });
      setItems(data.suggestions);
    } catch (err) {
      setError(errorMessage(err, 'Could not get suggestions'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {items && items.length === 0 && <p className="text-sm text-muted">No suggestions this time. Try again.</p>}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((s, i) => (
            <li key={i} className="border border-line rounded-lg p-4 bg-surface flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink text-sm">{s.title}</div>
                <div className="text-xs text-muted mt-0.5">{s.subject} · {s.duration} min</div>
                {s.reason && <p className="text-sm text-ink/80 mt-2">{s.reason}</p>}
              </div>
              <button
                onClick={() => setDraft({ title: s.title, subject_id: s.subjectId, duration: s.duration, date: today, time: '18:00' })}
                className="border border-line bg-paper text-primary font-bold rounded-md px-3 h-8 text-xs hover:bg-primary-soft shrink-0"
              >
                Schedule
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorBox message={error} />
      <button
        onClick={load}
        disabled={busy}
        className="bg-accent text-white font-bold rounded-lg px-4 h-10 inline-flex items-center gap-2 border-0 hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? <Spinner /> : <Icon name="bulb" size={17} />}
        {busy ? 'Thinking…' : items ? 'Refresh suggestions' : 'What should I study next?'}
      </button>
      {draft && <SessionModal session={draft} onClose={() => setDraft(null)} />}
    </div>
  );
};

// ---------------------------------------------------------------- Tips

const Tips = () => {
  const { subjects } = useStudy();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [tips, setTips] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { data } = await aiAPI.getTips({ subject, topic });
      setTips(data.tips);
    } catch (err) {
      setError(errorMessage(err, 'Could not get tips'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-[1fr_1.5fr] gap-4 max-sm:grid-cols-1">
        <div>
          <label htmlFor="tip-subject" className={labelClass}>Subject</label>
          <input id="tip-subject" list="tip-subjects" className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" />
          <datalist id="tip-subjects">
            {subjects.map((s) => <option key={s.id} value={s.name} />)}
          </datalist>
        </div>
        <div>
          <label htmlFor="tip-topic" className={labelClass}>Topic</label>
          <input id="tip-topic" required className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Eigenvalues and eigenvectors" />
        </div>
      </div>
      <ErrorBox message={error} />
      <button
        type="submit"
        disabled={busy || !topic.trim()}
        className="bg-accent text-white font-bold rounded-lg px-4 h-10 inline-flex items-center gap-2 border-0 hover:bg-accent/90 disabled:opacity-50"
      >
        {busy ? <Spinner /> : <Icon name="sparkle" size={17} />}
        {busy ? 'Thinking…' : 'Get tips'}
      </button>
      {tips && (
        <ol className="space-y-2 list-decimal pl-5 marker:text-accent marker:font-bold">
          {tips.map((t, i) => <li key={i} className="text-sm text-ink leading-relaxed pl-1">{t}</li>)}
        </ol>
      )}
    </form>
  );
};

// ---------------------------------------------------------------- Page

const AICoach = () => {
  const { settings, loading } = useStudy();
  const aiReady = settings.hasGeminiKey || settings.serverHasGeminiKey;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">AI Coach</h1>
        <p className="text-muted mt-1 text-sm">Let Gemini plan your week, suggest what to study next, and share study tips.</p>
      </div>

      {!loading && !aiReady && (
        <div className="bg-warning-soft border border-warning/30 rounded-xl p-4 flex items-center gap-3 max-sm:flex-col max-sm:items-start">
          <Icon name="lock" className="text-warning shrink-0" size={20} />
          <p className="text-sm text-ink flex-1">AI features need a Gemini API key. It's free and takes a minute to set up.</p>
          <Link to="/settings" className="bg-warning text-white font-bold rounded-lg px-4 h-9 inline-flex items-center no-underline text-sm">
            Add API key
          </Link>
        </div>
      )}

      <Card icon="calendar" title="Generate a study plan" subtitle="Pick subjects and how much time you have. Review the plan before adding it.">
        <PlanGenerator />
      </Card>

      <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <Card icon="bulb" title="What next?" subtitle="Suggestions based on your last two weeks.">
          <Suggestions />
        </Card>
        <Card icon="book" title="Study tips" subtitle="Specific techniques for any topic.">
          <Tips />
        </Card>
      </div>
    </div>
  );
};

export default AICoach;
