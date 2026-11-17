import { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import Icon from '../components/Icon';
import { formatMinutes, SUBJECT_COLORS, subjectColor } from '../lib/format';

const EMPTY = { name: '', color: 'violet' };

const Subjects = () => {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudy();
  const [form, setForm] = useState(null); // null | { id?, name, color }
  const [saving, setSaving] = useState(false);

  const openForm = (subject) => {
    if (subject) {
      setForm({ id: subject.id, name: subject.name, color: subject.color });
    } else {
      // Pick a colour that isn't used yet, if possible.
      const used = new Set(subjects.map((s) => s.color));
      setForm({ ...EMPTY, color: SUBJECT_COLORS.find((c) => !used.has(c.name))?.name || 'violet' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (subjects.some((s) => s.id !== form.id && s.name.toLowerCase() === name.toLowerCase())) {
      window.alert('You already have a subject with that name.');
      return;
    }
    setSaving(true);
    const payload = { name, color: form.color };
    const ok = form.id ? await updateSubject(form.id, payload) : await addSubject(payload);
    setSaving(false);
    if (ok) setForm(null);
  };

  const handleDelete = (subject) => {
    if (window.confirm(`Delete "${subject.name}"? Its sessions are kept but will show "No subject".`)) {
      deleteSubject(subject.id);
    }
  };

  const totalMinutes = subjects.reduce((sum, s) => sum + (s.totalMinutes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Subjects</h1>
          <p className="text-muted mt-1 text-sm">
            {subjects.length} subjects · {formatMinutes(totalMinutes)} studied in total
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-10 flex items-center gap-2 shadow-sm border-0"
        >
          <Icon name="plus" size={18} /> Add subject
        </button>
      </div>

      {form && (
        <div className="bg-paper border border-line rounded-xl p-6">
          <h2 className="font-display text-xl font-bold mb-4">{form.id ? 'Edit subject' : 'New subject'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
            <div>
              <label htmlFor="subject-name" className="text-xs font-bold tracking-wider text-muted uppercase">Subject name</label>
              <input
                id="subject-name"
                type="text"
                required
                autoFocus
                maxLength={60}
                className="w-full mt-1.5 h-10 px-3 bg-sidebar-bg border border-line rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-ink"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Linear Algebra"
              />
            </div>

            <div>
              <span className="text-xs font-bold tracking-wider text-muted uppercase">Colour</span>
              <div className="flex gap-2 mt-2 flex-wrap" role="radiogroup" aria-label="Colour">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    role="radio"
                    aria-checked={form.color === c.name}
                    aria-label={c.name}
                    onClick={() => setForm({ ...form, color: c.name })}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform border-0 text-white ${
                      form.color === c.name ? 'scale-110 ring-2 ring-offset-2 ring-ink' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {form.color === c.name && <Icon name="check" size={14} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="border border-line bg-paper text-ink font-semibold rounded-lg px-4 h-10 hover:bg-surface flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary-dark text-white font-bold rounded-lg px-4 h-10 flex-1 shadow-sm border-0 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {subjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted border-2 border-dashed border-line rounded-xl">
            No subjects yet. Add one to get started.
          </div>
        ) : (
          subjects.map((subject) => {
            const share = totalMinutes ? Math.round((subject.totalMinutes / totalMinutes) * 100) : 0;
            return (
              <div key={subject.id} className="bg-paper border border-line rounded-xl p-5 flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: subjectColor(subject.color) }} />
                <div className="pl-3 flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-ink truncate">{subject.name}</h3>
                    <p className="text-sm text-muted mt-1">
                      {formatMinutes(subject.totalMinutes)} studied{totalMinutes > 0 && ` · ${share}%`}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 max-md:opacity-100 transition-opacity">
                    <button onClick={() => openForm(subject)} aria-label={`Edit ${subject.name}`} className="p-1.5 text-muted hover:text-primary bg-surface rounded-md border-0">
                      <Icon name="edit" size={16} />
                    </button>
                    <button onClick={() => handleDelete(subject)} aria-label={`Delete ${subject.name}`} className="p-1.5 text-muted hover:text-danger bg-surface rounded-md border-0">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Subjects;
