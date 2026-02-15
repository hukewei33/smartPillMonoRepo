import type { DatabaseInstance } from '../db';
import type { Medication, MedicationInput, MedicationRow } from '../models/medication';

function rowToMedication(row: MedicationRow): Medication {
  return {
    id: row.id,
    name: row.name,
    dose: row.dose,
    start_date: row.start_date,
    daily_frequency: row.daily_frequency,
    day_interval: row.day_interval,
    created_at: row.created_at,
  };
}

export function validateMedicationInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || !b.name.trim()) return 'Name is required';
  if (typeof b.dose !== 'string' || !b.dose.trim()) return 'Dose is required';
  if (typeof b.start_date !== 'string' || !b.start_date.trim()) return 'Start date is required';
  if (typeof b.daily_frequency !== 'number' || b.daily_frequency < 1 || !Number.isInteger(b.daily_frequency)) {
    return 'Daily frequency must be a positive integer';
  }
  if (typeof b.day_interval !== 'number' || b.day_interval < 1 || !Number.isInteger(b.day_interval)) {
    return 'Day interval must be a positive integer';
  }
  const date = new Date((b.start_date as string).trim());
  if (Number.isNaN(date.getTime())) return 'Invalid start date';
  return null;
}

export function listMedications(db: DatabaseInstance, userId: number): Medication[] {
  const rows = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(userId) as MedicationRow[];
  return rows.map(rowToMedication);
}

export type CreateMedicationResult =
  | { ok: true; medication: Medication }
  | { ok: false; error: string };

export function createMedication(
  db: DatabaseInstance,
  userId: number,
  input: MedicationInput
): CreateMedicationResult {
  const result = db
    .prepare(
      `INSERT INTO medications (user_id, name, dose, start_date, daily_frequency, day_interval)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name.trim(),
      input.dose.trim(),
      input.start_date.trim(),
      input.daily_frequency,
      input.day_interval
    );
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ?'
    )
    .get(result.lastInsertRowid) as MedicationRow;
  return { ok: true, medication: rowToMedication(row) };
}

export type GetMedicationResult =
  | { ok: true; medication: Medication }
  | { ok: false; status: 400 | 404; error: string };

export function getMedication(
  db: DatabaseInstance,
  userId: number,
  id: number
): GetMedicationResult {
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, status: 400, error: 'Invalid medication id' };
  }
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ? AND user_id = ?'
    )
    .get(id, userId) as MedicationRow | undefined;
  if (!row) {
    return { ok: false, status: 404, error: 'Medication not found' };
  }
  return { ok: true, medication: rowToMedication(row) };
}

export type UpdateMedicationResult =
  | { ok: true; medication: Medication }
  | { ok: false; status: 400 | 404; error: string };

export function updateMedication(
  db: DatabaseInstance,
  userId: number,
  id: number,
  input: MedicationInput
): UpdateMedicationResult {
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, status: 400, error: 'Invalid medication id' };
  }
  const existing = db.prepare('SELECT id FROM medications WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return { ok: false, status: 404, error: 'Medication not found' };
  }
  db.prepare(
    `UPDATE medications SET name = ?, dose = ?, start_date = ?, daily_frequency = ?, day_interval = ?
     WHERE id = ? AND user_id = ?`
  ).run(
    input.name.trim(),
    input.dose.trim(),
    input.start_date.trim(),
    input.daily_frequency,
    input.day_interval,
    id,
    userId
  );
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ?'
    )
    .get(id) as MedicationRow;
  return { ok: true, medication: rowToMedication(row) };
}

export type DeleteMedicationResult =
  | { ok: true }
  | { ok: false; status: 400 | 404; error: string };

export function deleteMedication(
  db: DatabaseInstance,
  userId: number,
  id: number
): DeleteMedicationResult {
  if (!Number.isInteger(id) || id < 1) {
    return { ok: false, status: 400, error: 'Invalid medication id' };
  }
  const result = db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) {
    return { ok: false, status: 404, error: 'Medication not found' };
  }
  return { ok: true };
}
