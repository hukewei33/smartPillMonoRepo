'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  createMedication,
  deleteMedication,
  hello,
  listMedications,
  updateMedication,
  type Medication,
} from '@/lib/api';
import { getToken } from '@/lib/session';
import { useSession } from '@/lib/SessionContext';

type FormState = {
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: string;
  day_interval: string;
};

const emptyForm: FormState = {
  name: '',
  dose: '',
  start_date: '',
  daily_frequency: '1',
  day_interval: '1',
};

function formatMedication(m: Medication): string {
  return `${m.name} ${m.dose} — ${m.daily_frequency}x/day, every ${m.day_interval} day(s), from ${m.start_date}`;
}

export default function HomePage() {
  const { isLoggedIn, logout } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const fetchMedications = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setMedicationsError(null);
    try {
      const { medications: list } = await listMedications(token);
      setMedications(list);
    } catch (err) {
      setMedicationsError(err instanceof Error ? err.message : 'Failed to load medications');
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn === false) {
      router.replace('/');
      return;
    }
    if (isLoggedIn !== true) return;

    const token = getToken();
    if (!token) {
      router.replace('/');
      return;
    }
    Promise.all([
      hello(token).then((d) => setMessage(d.message)).catch(() => {}),
      fetchMedications(),
    ]).finally(() => setLoading(false));
  }, [isLoggedIn, router, fetchMedications]);

  function handleLogout() {
    logout();
    router.replace('/');
  }

  function openEdit(med: Medication) {
    setEditingId(med.id);
    setForm({
      name: med.name,
      dose: med.dose,
      start_date: med.start_date,
      daily_frequency: String(med.daily_frequency),
      day_interval: String(med.day_interval),
    });
    setSubmitError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setSubmitError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const daily_frequency = parseInt(form.daily_frequency, 10);
    const day_interval = parseInt(form.day_interval, 10);
    if (
      !form.name.trim() ||
      !form.dose.trim() ||
      !form.start_date.trim() ||
      Number.isNaN(daily_frequency) ||
      daily_frequency < 1 ||
      Number.isNaN(day_interval) ||
      day_interval < 1
    ) {
      setSubmitError('Please fill all fields; frequency and interval must be positive numbers.');
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      if (editingId !== null) {
        await updateMedication(token, editingId, {
          name: form.name.trim(),
          dose: form.dose.trim(),
          start_date: form.start_date.trim(),
          daily_frequency,
          day_interval,
        });
        cancelEdit();
      } else {
        await createMedication(token, {
          name: form.name.trim(),
          dose: form.dose.trim(),
          start_date: form.start_date.trim(),
          daily_frequency,
          day_interval,
        });
        setForm(emptyForm);
      }
      await fetchMedications();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const token = getToken();
    if (!token) return;
    setSubmitError(null);
    try {
      await deleteMedication(token, id);
      setDeleteConfirmId(null);
      if (editingId === id) cancelEdit();
      await fetchMedications();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  if (isLoggedIn === null || isLoggedIn === false) {
    return <p>Loading...</p>;
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
      <h1>Home</h1>
      {message != null && <p style={{ marginBottom: 16 }}>{message}</p>}
      <button type="button" onClick={handleLogout} style={{ marginBottom: 24 }}>
        Log out
      </button>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ marginBottom: 12 }}>Medications</h2>
        {medicationsError && (
          <p style={{ color: 'red', marginBottom: 8 }}>{medicationsError}</p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 20,
            padding: 16,
            border: '1px solid #ccc',
            borderRadius: 8,
          }}
        >
          <h3 style={{ margin: 0 }}>
            {editingId !== null ? 'Edit medication' : 'Add medication'}
          </h3>
          <label>
            Name
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 6 }}
            />
          </label>
          <label>
            Dose
            <input
              type="text"
              value={form.dose}
              onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
              placeholder="e.g. 100mg"
              required
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 6 }}
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              required
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 6 }}
            />
          </label>
          <label>
            Daily frequency (times per day)
            <input
              type="number"
              min={1}
              value={form.daily_frequency}
              onChange={(e) => setForm((f) => ({ ...f, daily_frequency: e.target.value }))}
              required
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 6 }}
            />
          </label>
          <label>
            Day interval (every N days)
            <input
              type="number"
              min={1}
              value={form.day_interval}
              onChange={(e) => setForm((f) => ({ ...f, day_interval: e.target.value }))}
              placeholder="1 = daily"
              required
              style={{ display: 'block', marginTop: 4, width: '100%', padding: 6 }}
            />
          </label>
          {submitError && <p style={{ color: 'red', margin: 0 }}>{submitError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={submitLoading}>
              {editingId !== null ? 'Save' : 'Add'}
            </button>
            {editingId !== null && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {medications.length === 0 && (
            <li style={{ color: '#666', padding: 12 }}>No medications yet. Add one above.</li>
          )}
          {medications.map((med) => (
            <li
              key={med.id}
              style={{
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 8,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ flex: '1 1 200px' }}>{formatMedication(med)}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => openEdit(med)}>
                  Edit
                </button>
                {deleteConfirmId === med.id ? (
                  <>
                    <span>Delete?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(med.id)}
                      style={{ background: '#c00', color: '#fff' }}
                    >
                      Yes
                    </button>
                    <button type="button" onClick={() => setDeleteConfirmId(null)}>
                      No
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(med.id)}
                    style={{ color: '#c00' }}
                  >
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
