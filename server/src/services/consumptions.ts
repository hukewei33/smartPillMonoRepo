import type { DatabaseInstance } from '../db';
import type {
  MedicationConsumption,
  MedicationConsumptionInput,
  MedicationConsumptionRow,
} from '../models/medication-consumption';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{1,2}:\d{2}(:\d{2})?$/;

function rowToConsumption(row: MedicationConsumptionRow): MedicationConsumption {
  return {
    id: row.id,
    medication_id: row.medication_id,
    date: row.date,
    time: row.time,
    created_at: row.created_at,
  };
}

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}

function isValidTime(timeStr: string): boolean {
  if (!TIME_REGEX.test(timeStr.trim())) return false;
  const [h, m, s] = timeStr.trim().split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return false;
  if (s !== undefined && (s < 0 || s > 59)) return false;
  return true;
}

export function validateConsumptionInput(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Invalid body';
  const b = body as Record<string, unknown>;
  if (typeof b.date !== 'string' || !b.date.trim()) return 'Date is required';
  if (typeof b.time !== 'string' || !b.time.trim()) return 'Time is required';
  if (!isValidDate((b.date as string).trim())) return 'Invalid date (use YYYY-MM-DD)';
  if (!isValidTime((b.time as string).trim())) return 'Invalid time (use HH:MM or HH:MM:SS)';
  return null;
}

export type CreateConsumptionResult =
  | { ok: true; consumption: MedicationConsumption }
  | { ok: false; status: 400 | 404; error: string };

export function createConsumption(
  db: DatabaseInstance,
  userId: number,
  medicationId: number,
  input: MedicationConsumptionInput
): CreateConsumptionResult {
  if (!Number.isInteger(medicationId) || medicationId < 1) {
    return { ok: false, status: 400, error: 'Invalid medication id' };
  }
  const medication = db
    .prepare('SELECT id, user_id FROM medications WHERE id = ? AND user_id = ?')
    .get(medicationId, userId);
  if (!medication) {
    return { ok: false, status: 404, error: 'Medication not found' };
  }
  const date = input.date.trim();
  const time = input.time.trim();
  const result = db
    .prepare(
      'INSERT INTO medication_consumptions (medication_id, date, time) VALUES (?, ?, ?)'
    )
    .run(medicationId, date, time);
  const row = db
    .prepare(
      'SELECT id, medication_id, date, time, created_at FROM medication_consumptions WHERE id = ?'
    )
    .get(result.lastInsertRowid) as MedicationConsumptionRow;
  return { ok: true, consumption: rowToConsumption(row) };
}
