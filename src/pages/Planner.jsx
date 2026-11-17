import { useEffect, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import SessionModal from '../components/SessionModal';
import { errorMessage, sessionsAPI } from '../services/api';
import { addDaysKey, formatMinutes, formatTime12, fromDateKey, mondayKey, subjectColor } from '../lib/format';

const Planner = () => {
  const { today, dataVersion, toggleSession, showToast } = useStudy();
  const [weekStart, setWeekStart] = useState(() => mondayKey(today));
  const [result, setResult] = useState({ key: null, sessions: [] });
  const [modal, setModal] = useState(null); // null | { session?, date? }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysKey(weekStart, i));
  const weekEnd = weekDays[6];
  const requestKey = `${weekStart}|${dataVersion}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let active = true;
    sessionsAPI
      .getRange(weekStart, weekEnd)
      .then((res) => active && setResult({ key: requestKey, sessions: res.data }))
      .catch((err) => {
        if (!active) return;
        showToast(errorMessage(err, 'Could not load planner'), 'error');
        setResult({ key: requestKey, sessions: [] });
      });
    return () => {
      active = false;
    };
  }, [weekStart, weekEnd, requestKey, showToast]);

  const byDate = {};
  for (const s of result.sessions) (byDate[s.date] ||= []).push(s);

  const weekMinutes = result.sessions.reduce((sum, s) => sum + s.duration, 0);
  const weekDone = result.sessions.filter((s) => s.done).length;

  const fmt = (key, opts) => fromDateKey(key).toLocaleDateString('en-US', opts);

  return (
    <div className="space-y-6 flex flex-col">
      <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Planner</h1>
          <p className="text-muted mt-1 text-sm">
            {result.sessions.length} sessions · {formatMinutes(weekMinutes)} planned · {weekDone} done this week
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setWeekStart(mondayKey(today))}
            disabled={weekStart === mondayKey(today)}
            className="h-10 px-3 rounded-lg border border-line bg-paper text-sm font-bold text-ink hover:bg-surface disabled:opacity-50"
          >
            This week
          </button>
          <div className="flex items-center gap-1 bg-paper border border-line rounded-lg p-1">
            <button onClick={() => setWeekStart(addDaysKey(weekStart, -7))} aria-label="Previous week" className="p-2 hover:bg-surface rounded-md rotate-180 border-0 bg-transparent">
              <Icon name="chevron" size={18} />
            </button>
            <div className="font-bold text-sm min-w-[170px] text-center">
              {fmt(weekStart, { month: 'short', day: 'numeric' })} – {fmt(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => setWeekStart(addDaysKey(weekStart, 7))} aria-label="Next week" className="p-2 hover:bg-surface rounded-md border-0 bg-transparent">
              <Icon name="chevron" size={18} />
            </button>
          </div>
          <button
            onClick={() => setModal({ date: weekStart <= today && today <= weekEnd ? today : weekStart })}
            className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-10 inline-flex items-center gap-2 text-[13px] border-0"
          >
            <Icon name="plus" size={17} /> Add
          </button>
        </div>
      </div>

      <div className={`bg-paper border border-line rounded-xl overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-7 min-w-[980px]">
          {weekDays.map((date) => {
            const isToday = date === today;
            const isPast = date < today;
            const daySessions = byDate[date] || [];
            const dayMinutes = daySessions.reduce((sum, s) => sum + s.duration, 0);

            return (
              <div key={date} className="border-r border-line last:border-r-0 flex flex-col">
                <div className={`p-3 border-b border-line text-center ${isToday ? 'bg-primary-soft' : ''}`}>
                  <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted'}`}>
                    {fmt(date, { weekday: 'short' })}
                  </div>
                  <div className={`text-2xl font-display font-bold mt-1 ${isToday ? 'text-primary' : isPast ? 'text-muted' : 'text-ink'}`}>
                    {fromDateKey(date).getDate()}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5 h-3">{dayMinutes ? formatMinutes(dayMinutes) : ''}</div>
                </div>

                <div className="p-2 flex flex-col gap-2 min-h-[360px] bg-surface flex-1">
                  {daySessions.map((session) => (
                    <div
                      key={session.id}
                      className={`bg-paper border border-line rounded-lg p-2 text-sm shadow-sm hover:border-primary/50 transition-colors ${session.done ? 'opacity-60' : ''}`}
                      style={{ borderLeft: `3px solid ${subjectColor(session.subject_color)}` }}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-semibold text-[11px] text-muted">{formatTime12(session.time)}</span>
                        <button
                          onClick={() => toggleSession(session)}
                          aria-label={session.done ? 'Mark as not done' : 'Mark as done'}
                          className={`w-[18px] h-[18px] rounded-full border-[1.5px] p-0 flex items-center justify-center text-white shrink-0 ${
                            session.done ? 'bg-primary border-primary' : 'bg-white border-[#cdd4ce] hover:border-primary'
                          }`}
                        >
                          {session.done && <Icon name="check" size={11} />}
                        </button>
                      </div>
                      <button
                        onClick={() => setModal({ session })}
                        className="text-left w-full border-0 bg-transparent p-0"
                      >
                        <div className={`font-semibold text-ink line-clamp-2 leading-tight text-[13px] ${session.done ? 'line-through' : ''}`}>
                          {session.title}
                        </div>
                        <div className="text-[11px] text-muted mt-1 truncate">
                          {session.subject_name || 'No subject'} · {session.duration}m
                        </div>
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setModal({ date })}
                    aria-label={`Add session on ${fmt(date, { weekday: 'long' })}`}
                    className="mt-auto flex items-center justify-center h-8 rounded-lg border border-dashed border-line text-muted hover:text-primary hover:border-primary hover:bg-primary-soft transition-colors bg-transparent"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && <SessionModal session={modal.session} initialDate={modal.date} onClose={() => setModal(null)} />}
    </div>
  );
};

export default Planner;
