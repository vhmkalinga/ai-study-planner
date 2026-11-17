import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import { errorMessage, settingsAPI, tokenStore } from '../services/api';

const inputClass =
  'w-full mt-1.5 h-10 px-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink';
const labelClass = 'text-xs font-bold tracking-wider text-muted uppercase';
const secondaryBtn =
  'border border-line bg-paper text-primary font-bold rounded-lg px-4 h-9 inline-flex items-center gap-2 hover:bg-primary-soft disabled:opacity-60';

const ProfileForm = ({ settings, onSave }) => {
  const [name, setName] = useState(settings.name || '');
  const [fieldOfStudy, setFieldOfStudy] = useState(settings.fieldOfStudy || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, fieldOfStudy }, 'Profile saved');
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div>
          <label htmlFor="st-name" className={labelClass}>Name</label>
          <input id="st-name" type="text" required maxLength={80} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="st-email" className={labelClass}>Email</label>
          <input id="st-email" type="email" disabled className={`${inputClass} bg-surface text-muted cursor-not-allowed`} value={settings.email || ''} />
        </div>
      </div>
      <div>
        <label htmlFor="st-field" className={labelClass}>Field of study</label>
        <input
          id="st-field"
          type="text"
          maxLength={120}
          className={inputClass}
          value={fieldOfStudy}
          placeholder="e.g. Computer Science"
          onChange={(e) => setFieldOfStudy(e.target.value)}
        />
        <p className="text-xs text-muted mt-1.5">The AI Coach uses this to tailor plans and suggestions.</p>
      </div>
      <button type="submit" disabled={saving} className={secondaryBtn}>{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
};

const GoalForm = ({ settings, onSave }) => {
  const [goal, setGoal] = useState(settings.weeklyGoalHours || 10);
  const valid = goal >= 1 && goal <= 100;

  const submit = (e) => {
    e.preventDefault();
    if (valid) onSave({ weeklyGoalHours: goal }, 'Weekly goal saved');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="st-goal" className={labelClass}>Weekly goal (hours)</label>
        <div className="flex items-center gap-3 mt-1.5">
          <button type="button" aria-label="Decrease" onClick={() => setGoal((g) => Math.max(1, g - 1))} className="w-10 h-10 rounded-md border border-line bg-sidebar-bg text-ink hover:bg-surface font-bold">−</button>
          <input
            id="st-goal"
            type="number"
            min={1}
            max={100}
            step={0.5}
            className="w-20 h-10 px-3 text-center bg-sidebar-bg border border-line rounded-md outline-none font-bold"
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
          <button type="button" aria-label="Increase" onClick={() => setGoal((g) => Math.min(100, g + 1))} className="w-10 h-10 rounded-md border border-line bg-sidebar-bg text-ink hover:bg-surface font-bold">+</button>
          <span className="text-sm text-muted">≈ {(goal / 7).toFixed(1)} h/day</span>
        </div>
        {!valid && <p className="text-xs text-danger mt-1.5">Choose between 1 and 100 hours.</p>}
      </div>
      <button type="submit" disabled={!valid} className={secondaryBtn}>Save goal</button>
    </form>
  );
};

const AIKeyForm = ({ settings, onSave }) => {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    if (await onSave({ geminiApiKey: key.trim() }, 'Gemini API key saved')) setKey('');
  };

  const remove = () => {
    if (window.confirm('Remove your saved Gemini API key?')) onSave({ geminiApiKey: '' }, 'API key removed');
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-sm">
        {settings.hasGeminiKey ? (
          <span className="inline-flex items-center gap-2 text-positive font-semibold">
            <Icon name="check" size={16} /> Your key is saved ({settings.geminiApiKeyMasked})
          </span>
        ) : settings.serverHasGeminiKey ? (
          <span className="text-muted">AI is enabled with the server's shared key. You can add your own below.</span>
        ) : (
          <span className="text-warning font-semibold">No API key yet. AI features are disabled until you add one.</span>
        )}
      </div>
      <div>
        <label htmlFor="st-key" className={labelClass}>{settings.hasGeminiKey ? 'Replace key' : 'Gemini API key'}</label>
        <div className="relative mt-1.5 max-w-md">
          <input
            id="st-key"
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            className="w-full h-10 pl-3 pr-10 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-ink"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="AIza…"
          />
          <button
            type="button"
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-ink border-0 bg-transparent"
            onClick={() => setShowKey((v) => !v)}
          >
            <Icon name={showKey ? 'eyeOff' : 'eye'} size={18} />
          </button>
        </div>
        <p className="text-xs text-muted mt-2">
          Get a free key at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Google AI Studio
          </a>
          . It is stored on your server and never sent back to the browser.
        </p>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={!key.trim()} className="bg-accent text-white font-bold rounded-lg px-4 h-9 inline-flex items-center hover:bg-accent/90 shadow-sm border-0 disabled:opacity-50">
          Save key
        </button>
        {settings.hasGeminiKey && (
          <button type="button" onClick={remove} className="border border-line bg-paper text-danger font-bold rounded-lg px-4 h-9 hover:bg-danger/5">
            Remove
          </button>
        )}
      </div>
    </form>
  );
};

const DangerZone = ({ showToast, logout }) => {
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const exportData = async () => {
    setExporting(true);
    try {
      const { data } = await settingsAPI.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studyflow-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export downloaded', 'success');
    } catch (err) {
      showToast(errorMessage(err, 'Export failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await settingsAPI.deleteAccount(password);
      tokenStore.clear();
      logout();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete account'));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button onClick={exportData} disabled={exporting} className="border border-line bg-surface text-ink font-bold rounded-lg px-4 h-10 flex items-center justify-center gap-2 hover:bg-line/50 w-full sm:w-64 disabled:opacity-60">
        <Icon name="download" size={18} /> {exporting ? 'Preparing…' : 'Export my data (JSON)'}
      </button>
      <button onClick={logout} className="border border-line bg-surface text-ink font-bold rounded-lg px-4 h-10 flex items-center justify-center gap-2 hover:bg-line/50 w-full sm:w-64">
        <Icon name="logout" size={18} /> Log out
      </button>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="border border-danger/30 bg-danger/5 text-danger font-bold rounded-lg px-4 h-10 flex items-center justify-center gap-2 hover:bg-danger/10 w-full sm:w-64 mt-4"
        >
          <Icon name="trash" size={18} /> Delete account
        </button>
      ) : (
        <form onSubmit={deleteAccount} className="mt-4 p-4 rounded-lg border border-danger/30 bg-danger/5 max-w-md space-y-3">
          <p className="text-sm text-ink">
            This permanently deletes your account, subjects and sessions. Enter your password to confirm.
          </p>
          <input
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfirming(false)} className="border border-line bg-paper text-ink font-semibold rounded-lg px-4 h-9 flex-1">
              Cancel
            </button>
            <button type="submit" className="bg-danger text-white font-bold rounded-lg px-4 h-9 flex-1 border-0">
              Delete forever
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const Section = ({ title, icon, accent, children }) => (
  <section className={`bg-paper border border-line rounded-xl p-6 ${accent || ''}`}>
    <div className="flex items-center gap-2 mb-4">
      {icon && <Icon name={icon} className="text-accent" size={20} />}
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
    </div>
    {children}
  </section>
);

const Settings = () => {
  const { logout } = useAuth();
  const { settings, loading, updateSettings, showToast } = useStudy();

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Settings</h1>
        <p className="text-muted mt-1 text-sm">Manage your account and preferences</p>
      </div>

      <Section title="Profile">
        <ProfileForm settings={settings} onSave={updateSettings} />
      </Section>

      <Section title="Study goals">
        <GoalForm key={settings.weeklyGoalHours} settings={settings} onSave={updateSettings} />
      </Section>

      <Section title="AI configuration" icon="sparkle" accent="border-l-4 border-l-accent">
        <AIKeyForm settings={settings} onSave={updateSettings} />
      </Section>

      <section className="bg-paper border border-danger/20 rounded-xl p-6">
        <h2 className="font-display text-xl font-bold text-danger mb-4">Account</h2>
        <DangerZone showToast={showToast} logout={logout} />
      </section>
    </div>
  );
};

export default Settings;
