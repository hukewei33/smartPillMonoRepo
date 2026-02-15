'use client';

import * as Tabs from '@radix-ui/react-tabs';
import React from 'react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  createMedication,
  createMedicationConsumption,
  deleteMedication,
  getConsumptionReport,
  hello,
  listMedications,
  type DayResult,
  type Medication,
} from '@/lib/api';
import { getToken } from '@/lib/session';
import { useSession } from '@/lib/SessionContext';

const emptyForm = {
  name: '',
  dose: '',
  start_date: '',
  daily_frequency: '1',
  day_interval: '1',
};

export default function HomePage() {
  const { isLoggedIn, logout } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [addLoading, setAddLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [loggingConsumptionForId, setLoggingConsumptionForId] = useState<number | null>(null);
  const [consumptionDate, setConsumptionDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [consumptionTime, setConsumptionTime] = useState('08:00');
  const [consumptionLoading, setConsumptionLoading] = useState(false);
  const [consumptionError, setConsumptionError] = useState<string | null>(null);
  const [reportStartDate, setReportStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [report, setReport] = useState<DayResult[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  async function handleAddMedication(e: React.FormEvent) {
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
      toast.error('Fill all fields; frequency and interval must be positive numbers.');
      return;
    }
    setAddLoading(true);
    try {
      await createMedication(token, {
        name: form.name.trim(),
        dose: form.dose.trim(),
        start_date: form.start_date.trim(),
        daily_frequency,
        day_interval,
      });
      setForm(emptyForm);
      await fetchMedications();
      toast.success('Medication added.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add medication');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const token = getToken();
    if (!token) return;
    try {
      await deleteMedication(token, id);
      setDeleteConfirmId(null);
      await fetchMedications();
      toast.success('Medication deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function openLogConsumption(med: Medication) {
    setLoggingConsumptionForId(med.id);
    setConsumptionDate(new Date().toISOString().slice(0, 10));
    setConsumptionTime('08:00');
    setConsumptionError(null);
  }

  function cancelLogConsumption() {
    setLoggingConsumptionForId(null);
    setConsumptionError(null);
  }

  async function handleLogConsumption(e: React.FormEvent, medicationId: number) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setConsumptionError(null);
    setConsumptionLoading(true);
    try {
      await createMedicationConsumption(token, medicationId, {
        date: consumptionDate,
        time: consumptionTime,
      });
      setLoggingConsumptionForId(null);
      await fetchMedications();
      toast.success('Consumption logged.');
    } catch (err) {
      setConsumptionError(err instanceof Error ? err.message : 'Failed to log consumption');
    } finally {
      setConsumptionLoading(false);
    }
  }

  async function handleRunReport(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setReportError(null);
    setReportLoading(true);
    try {
      const data = await getConsumptionReport(token, reportStartDate);
      setReport(data);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to load report');
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  if (isLoggedIn === null || isLoggedIn === false) {
    return <p>Loading...</p>;
  }
  if (loading) {
    return <p>Loading...</p>;
  }

  const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  };
  const thTdStyles: React.CSSProperties = {
    border: '1px solid #ddd',
    padding: '8px 10px',
    textAlign: 'left',
    verticalAlign: 'top',
  };

  return (
    <main style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Home</h1>
          {message != null && <p style={{ margin: '4px 0 0', color: '#666' }}>{message}</p>}
        </div>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <Tabs.Root defaultValue="medications" style={{ marginTop: 8 }}>
        <Tabs.List
          style={{
            display: 'flex',
            gap: 4,
            borderBottom: '1px solid #ccc',
            marginBottom: 16,
          }}
        >
          <Tabs.Trigger
            value="medications"
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: '2px solid transparent',
              marginBottom: -1,
            }}
          >
            Medications
          </Tabs.Trigger>
          <Tabs.Trigger
            value="add"
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: '2px solid transparent',
              marginBottom: -1,
            }}
          >
            Add medication
          </Tabs.Trigger>
          <Tabs.Trigger
            value="report"
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderBottom: '2px solid transparent',
              marginBottom: -1,
            }}
          >
            Report
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="medications">
          {medicationsError && (
            <p style={{ color: 'red', marginBottom: 8 }}>{medicationsError}</p>
          )}
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            <table style={tableStyles}>
              <thead>
                <tr>
                  <th style={thTdStyles}>Name</th>
                  <th style={thTdStyles}>Dose</th>
                  <th style={thTdStyles}>Start date</th>
                  <th style={thTdStyles}>Freq</th>
                  <th style={thTdStyles}>Interval</th>
                  <th style={thTdStyles}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medications.length === 0 && (
                  <tr>
                    <td colSpan={6} style={thTdStyles}>
                      No medications yet. Add one in the &quot;Add medication&quot; tab.
                    </td>
                  </tr>
                )}
                {medications.map((med) => (
                  <React.Fragment key={med.id}>
                    <tr>
                      <td style={thTdStyles}>{med.name}</td>
                      <td style={thTdStyles}>{med.dose}</td>
                      <td style={thTdStyles}>{med.start_date}</td>
                      <td style={thTdStyles}>{med.daily_frequency}/day</td>
                      <td style={thTdStyles}>every {med.day_interval} day(s)</td>
                      <td style={thTdStyles}>
                        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => openLogConsumption(med)}>
                            Log consumption
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
                      </td>
                    </tr>
                    {loggingConsumptionForId === med.id && (
                      <tr key={`${med.id}-log`}>
                        <td colSpan={6} style={{ ...thTdStyles, background: '#f8f8f8' }}>
                          <form
                            onSubmit={(e) => handleLogConsumption(e, med.id)}
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 8,
                              alignItems: 'center',
                            }}
                          >
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              Date
                              <input
                                type="date"
                                value={consumptionDate}
                                onChange={(e) => setConsumptionDate(e.target.value)}
                                required
                                style={{ padding: 4 }}
                              />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              Time
                              <input
                                type="time"
                                value={consumptionTime}
                                onChange={(e) => setConsumptionTime(e.target.value)}
                                required
                                style={{ padding: 4 }}
                              />
                            </label>
                            <button type="submit" disabled={consumptionLoading}>
                              {consumptionLoading ? 'Logging…' : 'Log'}
                            </button>
                            <button type="button" onClick={cancelLogConsumption}>
                              Cancel
                            </button>
                            {consumptionError && (
                              <span style={{ color: 'red', width: '100%' }}>{consumptionError}</span>
                            )}
                          </form>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Tabs.Content>

        <Tabs.Content value="add">
          <form
            onSubmit={handleAddMedication}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              maxWidth: 400,
              padding: 16,
              border: '1px solid #ccc',
              borderRadius: 8,
            }}
          >
            <h3 style={{ margin: 0 }}>Create medication</h3>
            <label>
              Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
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
                style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
              />
            </label>
            <label>
              Start date
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
                style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
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
                style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
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
                style={{ display: 'block', marginTop: 4, width: '100%', padding: 8 }}
              />
            </label>
            <button type="submit" disabled={addLoading}>
              {addLoading ? 'Adding…' : 'Add medication'}
            </button>
          </form>
        </Tabs.Content>

        <Tabs.Content value="report">
          <form
            onSubmit={handleRunReport}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Start date (first day of 7-day window)
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                required
                style={{ padding: 8 }}
              />
            </label>
            <button type="submit" disabled={reportLoading}>
              {reportLoading ? 'Loading…' : 'Query'}
            </button>
          </form>
          {reportError && (
            <p style={{ color: 'red', marginBottom: 12 }}>{reportError}</p>
          )}
          {report && report.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyles}>
                <thead>
                  <tr>
                    <th style={thTdStyles}>Day</th>
                    {report.map((day) => (
                      <th key={day.date} style={thTdStyles}>
                        {day.date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...thTdStyles, fontWeight: 600, background: '#f5f5f5' }}>
                      Expected
                    </td>
                    {report.map((day) => (
                      <td key={day.date} style={thTdStyles}>
                        {day.expected.length === 0 ? (
                          <span style={{ color: '#999' }}>—</span>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {day.expected.map((e, i) => (
                              <li key={i}>
                                {e.medication_name} (dose {e.dose_index})
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ ...thTdStyles, fontWeight: 600, background: '#f5f5f5' }}>
                      Actual
                    </td>
                    {report.map((day) => (
                      <td key={day.date} style={thTdStyles}>
                        {day.actual.length === 0 ? (
                          <span style={{ color: '#999' }}>—</span>
                        ) : (
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {day.actual.map((a) => (
                              <li key={a.id}>
                                {a.medication_name} @ {a.time}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {report && report.length === 0 && (
            <p style={{ color: '#666' }}>No data for this range.</p>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}
