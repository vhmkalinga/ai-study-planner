import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import ProgressRing from '../components/ProgressRing';
import SessionModal from '../components/SessionModal';
import { formatMinutes, formatTime12, subjectColor } from '../lib/format';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
  const { user } = useAuth();
  const { today, sessions, streak, weeklyProgress, settings, loading, toggleSession, deleteSession } = useStudy();
  const [modal, setModal] = useState(null); // null | { session? }

  const completed = sessions.filter((s) => s.done);
  const remaining = sessions.length - completed.length;
  const completion = sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0;
  const todayMinutes = completed.reduce((sum, s) => sum + s.duration, 0);

  const days = weeklyProgress.days || [];
  const weeklyGoal = settings.weeklyGoalHours || 10;
  const weeklyMinutes = weeklyProgress.totalMinutes || 0;
  const goalPercent = Math.min(100, Math.round((weeklyMinutes / 60 / weeklyGoal) * 100));
  const minutesToGoal = Math.max(0, weeklyGoal * 60 - weeklyMinutes);
  const maxMinutes = Math.max(120, ...days.map((d) => d.totalMinutes));

  const dateLabel = new Date()
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    .toUpperCase();

  const focusMessage =
    sessions.length === 0
      ? 'Nothing planned yet. Add a session, or let the AI Coach plan your day.'
      : completion === 100
        ? "Incredible! You've finished every session for today."
        : completion >= 50
          ? "You're more than halfway there. Keep it up!"
          : 'Finish one more session to stay on track with your weekly goal.';

  const handleDelete = (id) => {
    if (window.confirm('Delete this session?')) deleteSession(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end max-md:flex-col max-md:items-start max-md:gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase mb-2">{dateLabel}</p>
          <h1 className="font-display text-3xl font-bold text-ink tracking-tight">
            {greeting()}, {user?.name?.split(' ')[0]} <span className="text-warning text-2xl">✦</span>
          </h1>
          <p className="text-muted text-sm mt-2">
            {remaining > 0 ? (
              <>You have <b className="text-ink">{remaining} {remaining === 1 ? 'session' : 'sessions'}</b> left today. Let's make it count.</>
            ) : sessions.length > 0 ? (
              <>All of today's sessions are done. Great job!</>
            ) : (
              <>Your day is open. Plan something to study.</>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/ai-coach"
            className="border border-line bg-paper text-accent font-bold rounded-lg px-4 h-[42px] inline-flex items-center gap-2 text-[13px] hover:bg-accent-soft no-underline"
          >
            <Icon name="sparkle" size={16} /> AI plan
          </Link>
          <button
            onClick={() => setModal({})}
            className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-[42px] inline-flex items-center gap-2 text-[13px] shadow-[0_5px_10px_#1f694a22] border-0"
          >
            <Icon name="plus" size={18} /> Add session
          </button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-[1.66fr_1fr] gap-5 max-md:grid-cols-1">
        <div className="bg-paper border border-line rounded-xl p-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-[33px] h-[33px] rounded-[9px] bg-accent-soft text-accent grid place-items-center">
              <Icon name="calendar" size={17} />
            </span>
            <span>
              <p className="text-[11px] text-muted m-0 mb-1">Today's focus</p>
              <strong className="text-[13px]">{completed.length} of {sessions.length} sessions done</strong>
            </span>
          </div>
          <div className="flex items-center gap-5 pt-5 pb-1 max-sm:flex-col max-sm:items-start">
            <ProgressRing percentage={completion} />
            <div>
              <h2 className="font-display text-[19px] tracking-tight m-0">Keep the momentum going</h2>
              <p className="text-muted text-xs leading-relaxed mt-2 max-w-[275px]">{focusMessage}</p>
              <a href="#sessions" className="text-primary inline-flex items-center gap-[7px] text-xs font-bold mt-2 no-underline">
                View today's plan <Icon name="arrow" size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="bg-paper border border-line rounded-xl p-6">
          <div className="flex items-center gap-3">
            <span className="w-[33px] h-[33px] rounded-[9px] bg-warning-soft text-warning grid place-items-center">
              <Icon name="flame" size={17} />
            </span>
            <span>
              <p className="text-[11px] text-muted m-0 mb-1">Current streak</p>
              <strong className="text-[13px]">
                {streak.todayCompleted ? 'Studied today ✓' : streak.currentStreak > 0 ? 'Study today to keep it going' : 'Start a streak today'}
              </strong>
            </span>
          </div>
          <div className="font-display text-4xl leading-none mt-5 mb-4">
            {streak.currentStreak} <span className="font-sans text-[13px] font-semibold">day streak</span>
          </div>
          <div className="flex justify-between" aria-label="Days studied this week">
            {days.map((day) => {
              const studied = day.totalMinutes > 0;
              const isToday = day.date === today;
              return (
                <span
                  key={day.date}
                  title={`${day.dayName}: ${studied ? formatMinutes(day.totalMinutes) : 'no study'}`}
                  className={`w-[25px] h-[25px] grid place-items-center rounded-full text-[10px] font-bold ${
                    studied ? 'bg-streak text-white border border-streak' : 'text-muted border border-line'
                  } ${isToday && !studied ? 'border-streak text-streak' : ''}`}
                >
                  {studied ? '✓' : day.dayName[0]}
                </span>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-3.5">
            Your longest streak is <b className="text-ink">{streak.longestStreak} {streak.longestStreak === 1 ? 'day' : 'days'}</b>.
          </p>
        </div>
      </div>

      {/* Today's sessions */}
      <section className="mt-11 scroll-mt-6" id="sessions">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase mb-[7px]">Today's schedule</p>
            <h2 className="font-display text-[19px] tracking-tight m-0">Study sessions</h2>
          </div>
          <Link to="/planner" className="text-primary font-bold text-[11px] inline-flex items-center gap-1.5 no-underline">
            Open planner <Icon name="arrow" size={15} />
          </Link>
        </div>

        <div className="grid gap-[9px]">
          {loading ? (
            <div className="bg-paper border border-line rounded-xl p-8 text-center text-muted">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="bg-paper border border-line rounded-xl p-8 text-center text-muted">
              <p>No sessions planned for today.</p>
              <button
                onClick={() => setModal({})}
                className="mt-4 border border-line bg-surface text-ink font-bold rounded-lg px-4 py-2 hover:bg-primary-soft"
              >
                Plan a session
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <article
                key={session.id}
                className={`min-h-[71px] border border-line rounded-[9px] bg-paper flex items-center px-[17px] py-3 gap-3 transition-all hover:-translate-y-px hover:shadow-[0_5px_17px_#1f31220c] group ${session.done ? 'opacity-70' : ''}`}
              >
                <button
                  onClick={() => toggleSession(session)}
                  aria-label={session.done ? 'Mark as not done' : 'Mark as done'}
                  className={`w-[22px] h-[22px] p-0 rounded-full border-[1.5px] text-white shrink-0 flex items-center justify-center ${
                    session.done ? 'bg-primary border-primary' : 'bg-white border-[#cdd4ce] hover:border-primary'
                  }`}
                >
                  {session.done && <Icon name="check" size={13} />}
                </button>

                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subjectColor(session.subject_color) }} />

                <div className="flex-1 min-w-0">
                  <h3 className={`m-0 mb-[5px] text-[13px] font-bold truncate ${session.done ? 'text-muted line-through' : ''}`}>
                    {session.title}
                  </h3>
                  <p className="text-[11px] text-muted m-0">
                    {session.subject_name || 'No subject'}
                    <span className="sm:hidden"> · {session.duration} min</span>
                  </p>
                </div>

                <time className="text-xs font-bold w-[64px] text-right">{formatTime12(session.time)}</time>
                <span className="text-muted text-[11px] w-[56px] max-sm:hidden">{session.duration} min</span>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({ session })}
                    aria-label="Edit session"
                    className="p-1.5 text-muted hover:text-primary hover:bg-primary-soft rounded-md border-0 bg-transparent"
                  >
                    <Icon name="edit" size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    aria-label="Delete session"
                    className="p-1.5 text-muted hover:text-danger hover:bg-danger/10 rounded-md border-0 bg-transparent max-sm:hidden"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Bottom cards */}
      <div className="grid grid-cols-[1.66fr_1fr] gap-5 mt-8 max-md:grid-cols-1">
        <div className="bg-paper border border-line rounded-xl p-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase mb-[7px]">This week</p>
              <h2 className="font-display text-[19px] tracking-tight m-0">Your progress</h2>
            </div>
            <Link to="/progress" className="text-primary text-[11px] font-bold no-underline">View details</Link>
          </div>

          <div className="h-[145px] relative mt-2 border-b border-line">
            <div className="absolute inset-[24px_8px_8px_0] flex items-end justify-between">
              {days.map((day) => {
                const isToday = day.date === today;
                const height = day.totalMinutes > 0 ? `${(day.totalMinutes / maxMinutes) * 100}%` : '3px';
                return (
                  <div key={day.date} className="h-full w-7 flex flex-col justify-end items-center gap-1.5">
                    <div
                      title={formatMinutes(day.totalMinutes)}
                      className={`w-5 min-h-[3px] rounded-t-[5px] rounded-b-[1px] relative ${isToday ? 'bg-primary' : 'bg-[#cfe3d6]'}`}
                      style={{ height }}
                    >
                      {isToday && day.totalMinutes > 0 && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#2c473a] text-white rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap">
                          {formatMinutes(day.totalMinutes)}
                        </span>
                      )}
                    </div>
                    <small className={`text-[9px] ${isToday ? 'text-ink font-bold' : 'text-muted'}`}>{day.dayName}</small>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3.5 flex justify-between text-[11px] text-muted">
            <span><b className="text-ink">{formatMinutes(todayMinutes)}</b> completed today</span>
            <span className="text-positive font-bold">✓ {weeklyProgress.sessionsCompleted || 0} sessions this week</span>
          </div>
        </div>

        <div className="bg-paper border border-line rounded-xl p-6">
          <span className="float-right w-[33px] h-[33px] rounded-[9px] bg-primary-soft text-primary grid place-items-center">
            <Icon name="target" size={17} />
          </span>
          <p className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase">Weekly goal</p>
          <h2 className="font-display text-[28px] m-0 mt-0.5 mb-5">{weeklyGoal} hours</h2>
          <div className="h-[7px] bg-[#e8efeb] rounded-[10px] overflow-hidden">
            <i className="block h-full rounded-[inherit] bg-primary transition-all duration-500" style={{ width: `${goalPercent}%` }} />
          </div>
          <p className="text-[11px] text-muted mt-3 mb-6">
            <b className="text-ink">{formatMinutes(weeklyMinutes)}</b> of {weeklyGoal}h completed
            {minutesToGoal > 0 ? ` · ${formatMinutes(minutesToGoal)} to go` : ' · goal reached 🎉'}
          </p>
          <Link to="/settings" className="text-primary inline-flex items-center gap-[7px] text-xs font-bold no-underline">
            Adjust goal <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>

      {modal && <SessionModal session={modal.session} onClose={() => setModal(null)} />}
    </div>
  );
};

export default Dashboard;
