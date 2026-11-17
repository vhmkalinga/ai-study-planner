import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage, progressAPI, sessionsAPI, settingsAPI, subjectsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { todayKey } from '../lib/format';

const StudyContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useStudy = () => useContext(StudyContext);

const sortSessions = (list) =>
  [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

export const StudyProvider = ({ children }) => {
  const { user, patchUser } = useAuth();
  const [today, setToday] = useState(todayKey);
  const [sessions, setSessions] = useState([]); // today's sessions
  const [subjects, setSubjects] = useState([]);
  const [settings, setSettings] = useState({ weeklyGoalHours: 10 });
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, todayCompleted: false });
  const [weeklyProgress, setWeeklyProgress] = useState({ days: [], totalMinutes: 0, sessionsCompleted: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  // Bumped after every session change so pages with their own data (Planner, Progress) refetch.
  const [dataVersion, setDataVersion] = useState(0);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Roll over to the new day if the tab stays open past midnight.
  useEffect(() => {
    const id = setInterval(() => {
      const now = todayKey();
      setToday((prev) => (prev === now ? prev : now));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  const refreshStats = useCallback(() => {
    const day = todayKey();
    return Promise.all([
      progressAPI.getStreak(day).then((r) => setStreak(r.data)),
      progressAPI.getWeekly(day).then((r) => setWeeklyProgress(r.data)),
      subjectsAPI.getAll().then((r) => setSubjects(r.data))
    ]).catch((err) => console.error(err));
  }, []);

  const fetchToday = useCallback(
    () => sessionsAPI.getByDate(todayKey()).then((r) => setSessions(sortSessions(r.data))),
    []
  );

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      fetchToday(),
      refreshStats(),
      settingsAPI.get().then((r) => active && setSettings(r.data))
    ])
      .catch((err) => console.error(err))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user, today, fetchToday, refreshStats]);

  const afterSessionChange = useCallback(() => {
    setDataVersion((v) => v + 1);
    refreshStats();
  }, [refreshStats]);

  const addSession = useCallback(async (data) => {
    try {
      const { data: created } = await sessionsAPI.create(data);
      if (created.date === todayKey()) setSessions((prev) => sortSessions([...prev, created]));
      showToast('Session added', 'success');
      afterSessionChange();
      return created;
    } catch (err) {
      showToast(errorMessage(err, 'Could not add session'), 'error');
      return null;
    }
  }, [afterSessionChange, showToast]);

  const addSessions = useCallback(async (list) => {
    try {
      const { data: created } = await sessionsAPI.createMany(list);
      const day = todayKey();
      setSessions((prev) => sortSessions([...prev, ...created.filter((s) => s.date === day)]));
      showToast(`${created.length} sessions added to your planner`, 'success');
      afterSessionChange();
      return created;
    } catch (err) {
      showToast(errorMessage(err, 'Could not add sessions'), 'error');
      return null;
    }
  }, [afterSessionChange, showToast]);

  const updateSession = useCallback(async (id, data, { silent = false } = {}) => {
    try {
      const { data: updated } = await sessionsAPI.update(id, data);
      const day = todayKey();
      setSessions((prev) => {
        const rest = prev.filter((s) => s.id !== id);
        return updated.date === day ? sortSessions([...rest, updated]) : rest;
      });
      if (!silent) showToast('Session updated', 'success');
      afterSessionChange();
      return updated;
    } catch (err) {
      showToast(errorMessage(err, 'Could not update session'), 'error');
      return null;
    }
  }, [afterSessionChange, showToast]);

  const toggleSession = useCallback((session) => {
    return updateSession(session.id, { done: !session.done }, { silent: true }).then((updated) => {
      if (updated?.done) showToast('Nice work! Session completed ✓', 'success');
      return updated;
    });
  }, [updateSession, showToast]);

  const deleteSession = useCallback(async (id) => {
    try {
      await sessionsAPI.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      showToast('Session deleted');
      afterSessionChange();
      return true;
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete session'), 'error');
      return false;
    }
  }, [afterSessionChange, showToast]);

  const addSubject = useCallback(async (data) => {
    try {
      const { data: created } = await subjectsAPI.create(data);
      setSubjects((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Subject added', 'success');
      return created;
    } catch (err) {
      showToast(errorMessage(err, 'Could not add subject'), 'error');
      return null;
    }
  }, [showToast]);

  const updateSubject = useCallback(async (id, data) => {
    try {
      const { data: updated } = await subjectsAPI.update(id, data);
      setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name)));
      // Session cards show the subject name/colour, so refresh them too.
      fetchToday();
      setDataVersion((v) => v + 1);
      showToast('Subject updated', 'success');
      return updated;
    } catch (err) {
      showToast(errorMessage(err, 'Could not update subject'), 'error');
      return null;
    }
  }, [fetchToday, showToast]);

  const deleteSubject = useCallback(async (id) => {
    try {
      await subjectsAPI.delete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      fetchToday();
      setDataVersion((v) => v + 1);
      showToast('Subject deleted');
      return true;
    } catch (err) {
      showToast(errorMessage(err, 'Could not delete subject'), 'error');
      return false;
    }
  }, [fetchToday, showToast]);

  const updateSettings = useCallback(async (data, message = 'Settings saved') => {
    try {
      const { data: saved } = await settingsAPI.update(data);
      setSettings(saved);
      patchUser({ name: saved.name, field_of_study: saved.fieldOfStudy });
      showToast(message, 'success');
      return saved;
    } catch (err) {
      showToast(errorMessage(err, 'Could not save settings'), 'error');
      return null;
    }
  }, [patchUser, showToast]);

  const value = useMemo(() => ({
    today, sessions, subjects, settings, streak, weeklyProgress, loading, toast, dataVersion,
    addSession, addSessions, updateSession, toggleSession, deleteSession,
    addSubject, updateSubject, deleteSubject,
    updateSettings, refreshStats, showToast
  }), [
    today, sessions, subjects, settings, streak, weeklyProgress, loading, toast, dataVersion,
    addSession, addSessions, updateSession, toggleSession, deleteSession,
    addSubject, updateSubject, deleteSubject,
    updateSettings, refreshStats, showToast
  ]);

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};
