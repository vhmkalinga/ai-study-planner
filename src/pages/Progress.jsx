import { useEffect, useState } from 'react';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import { progressAPI } from '../services/api';
import { addDaysKey, formatMinutes, fromDateKey, mondayKey, subjectColor } from '../lib/format';

const Card = ({ label, value, sub, tone = 'text-ink' }) => (
  <div className="bg-paper border border-line rounded-xl p-5">
    <div className="text-[10px] font-bold tracking-[0.11em] text-muted uppercase mb-2">{label}</div>
    <div className={`font-display text-3xl font-bold ${tone}`}>{value}</div>
    <div className="text-sm text-muted mt-1">{sub}</div>
  </div>
);

const Progress = () => {
  const { today, streak, settings, dataVersion } = useStudy();
  const [weekStart, setWeekStart] = useState(() => mondayKey(today));
  const [scope, setScope] = useState('week'); // subject breakdown: 'week' | 'all'
  const [data, setData] = useState({ key: null, weekly: null, subjects: [], summary: null });

  const weekEnd = addDaysKey(weekStart, 6);
  const requestKey = `${weekStart}|${scope}|${dataVersion}`;

  useEffect(() => {
    let active = true;
    Promise.all([
      progressAPI.getWeekly(weekStart),
      progressAPI.getSubjects(scope === 'week' ? { from: weekStart, to: weekEnd } : null),
      progressAPI.getSummary()
    ])
      .then(([w, s, sum]) => active && setData({ key: requestKey, weekly: w.data, subjects: s.data, summary: sum.data }))
      .catch((err) => console.error(err));
    return () => {
      active = false;
    };
  }, [weekStart, weekEnd, scope, requestKey]);

  const weekly = data.weekly || { days: [], totalMinutes: 0, sessionsCompleted: 0, sessionsPlanned: 0 };
  const weeklyGoal = settings.weeklyGoalHours || 10;
  const goalPercent = Math.round((weekly.totalMinutes / 60 / weeklyGoal) * 100);
  const isCurrentWeek = weekStart === mondayKey(today);
  const subjectTotal = data.subjects.reduce((sum, s) => sum + s.totalMinutes, 0);

  // Chart scale: at least 2h, rounded up to the next hour.
  const maxHours = Math.max(2, Math.ceil(Math.max(0, ...weekly.days.map((d) => d.totalMinutes)) / 60));
  const gridLines = Array.from({ length: maxHours + 1 }, (_, i) => maxHours - i).filter((h) => maxHours <= 6 || h % 2 === 0);

  const fmt = (key, opts) => fromDateKey(key).toLocaleDateString('en-US', opts);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Progress</h1>
          <p className="text-muted mt-1 text-sm">Track your study habits and achievements</p>
        </div>
        <div className="flex items-center gap-1 bg-paper border border-line rounded-lg p-1">
          <button onClick={() => setWeekStart(addDaysKey(weekStart, -7))} aria-label="Previous week" className="p-2 hover:bg-surface rounded-md rotate-180 border-0 bg-transparent">
            <Icon name="chevron" size={18} />
          </button>
          <div className="font-bold text-sm min-w-[170px] text-center">
            {isCurrentWeek ? 'This week' : `${fmt(weekStart, { month: 'short', day: 'numeric' })} – ${fmt(weekEnd, { month: 'short', day: 'numeric' })}`}
          </div>
          <button
            onClick={() => setWeekStart(addDaysKey(weekStart, 7))}
            disabled={isCurrentWeek}
            aria-label="Next week"
            className="p-2 hover:bg-surface rounded-md border-0 bg-transparent disabled:opacity-30"
          >
            <Icon name="chevron" size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Card label="Study time" value={formatMinutes(weekly.totalMinutes)} sub={isCurrentWeek ? 'this week' : 'that week'} />
        <Card label="Sessions" value={`${weekly.sessionsCompleted}/${weekly.sessionsPlanned}`} sub="completed / planned" />
        <Card label="Current streak" value={streak.currentStreak} sub={`days · best ${streak.longestStreak}`} tone="text-warning" />
        <Card label="Weekly goal" value={`${goalPercent}%`} sub={`of ${weeklyGoal}h goal`} tone="text-accent" />
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-6 max-lg:grid-cols-1">
        <div className="bg-paper border border-line rounded-xl p-6">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-display text-xl font-bold text-ink">Study time</h2>
            {data.summary && (
              <span className="text-xs text-muted">
                All time: <b className="text-ink">{formatMinutes(data.summary.totalMinutes)}</b> across {data.summary.sessionsCompleted} sessions
              </span>
            )}
          </div>
          <div className="h-56 relative pl-7">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {gridLines.map((h) => (
                <div key={h} className="w-full border-t border-dashed border-line h-0 relative">
                  <span className="absolute -top-2 left-0 text-[9px] text-muted">{h}h</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 left-7 flex items-end gap-3 justify-between">
              {weekly.days.map((day) => {
                const isToday = day.date === today;
                const pct = (day.totalMinutes / 60 / maxHours) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    <div
                      className={`w-full max-w-[40px] rounded-t-md relative ${isToday ? 'bg-primary' : 'bg-primary/25'}`}
                      style={{ height: day.totalMinutes > 0 ? `${pct}%` : '3px' }}
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                        {formatMinutes(day.totalMinutes)} · {day.sessions} done
                      </div>
                    </div>
                    <div className={`absolute -bottom-6 text-[10px] font-bold ${isToday ? 'text-ink' : 'text-muted'}`}>{day.dayName}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-6" />
        </div>

        <div className="bg-paper border border-line rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-display text-xl font-bold text-ink">By subject</h2>
            <div className="flex bg-surface rounded-lg p-0.5 text-xs font-bold">
              {[['week', 'Week'], ['all', 'All time']].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setScope(value)}
                  className={`px-2.5 py-1 rounded-md border-0 ${scope === value ? 'bg-paper text-ink shadow-sm' : 'bg-transparent text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {data.subjects.length === 0 ? (
              <div className="text-center py-8 text-muted text-sm">Complete a session to see your subject breakdown.</div>
            ) : (
              data.subjects.map((stat) => {
                const pct = subjectTotal ? Math.round((stat.totalMinutes / subjectTotal) * 100) : 0;
                return (
                  <div key={stat.subjectId} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subjectColor(stat.color) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-1 gap-2">
                        <span className="font-semibold text-sm truncate">{stat.name}</span>
                        <span className="text-sm font-bold whitespace-nowrap">
                          {formatMinutes(stat.totalMinutes)} <span className="text-muted font-normal">· {pct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: subjectColor(stat.color) }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
