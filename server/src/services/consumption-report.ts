import type { DatabaseInstance } from '../db';
import type { Medication } from '../models/medication';
import type { ActualConsumption, DayResult, ExpectedConsumption } from '../models/consumption-report';
import { listMedications } from './medications';

const REPORT_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as local calendar date (noon to avoid DST edge cases). */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Number of whole days from startDate to endDate (YYYY-MM-DD, calendar days). */
function daysBetween(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

/** Whether the given date is a dose day for a medication (start_date, day_interval). */
function isDoseDay(med: Medication, date: string): boolean {
  const deltaDays = daysBetween(med.start_date, date);
  return deltaDays >= 0 && deltaDays % med.day_interval === 0;
}

/** Add expected consumption slots for a medication on a given date. */
function expectedForMedicationOnDate(
  med: Medication,
  date: string
): ExpectedConsumption[] {
  if (!isDoseDay(med, date)) return [];
  const result: ExpectedConsumption[] = [];
  for (let i = 1; i <= med.daily_frequency; i++) {
    result.push({
      medication_id: med.id,
      medication_name: med.name,
      dose_index: i,
    });
  }
  return result;
}

/** Format date as YYYY-MM-DD. */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type GetWeeklyReportResult =
  | { ok: true; report: DayResult[] }
  | { ok: false; status: 400; error: string };

export function getWeeklyReport(
  db: DatabaseInstance,
  userId: number,
  startDateParam: string
): GetWeeklyReportResult {
  const trimmed = typeof startDateParam === 'string' ? startDateParam.trim() : '';
  if (!trimmed) {
    return { ok: false, status: 400, error: 'start_date is required' };
  }
  if (!isValidDateString(trimmed)) {
    return { ok: false, status: 400, error: 'Invalid start_date (use YYYY-MM-DD)' };
  }

  const medications = listMedications(db, userId);
  const startDate = parseLocalDate(trimmed);

  const dayResults: DayResult[] = [];
  for (let i = 0; i < REPORT_DAYS; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateStr = toDateStr(d);

    const expected: ExpectedConsumption[] = [];
    for (const med of medications) {
      expected.push(...expectedForMedicationOnDate(med, dateStr));
    }

    dayResults.push({
      date: dateStr,
      expected,
      actual: [],
    });
  }

  const dateStrs = dayResults.map((r) => r.date);
  const minDate = dateStrs[0];
  const maxDate = dateStrs[dateStrs.length - 1];

  const medicationIds = medications.map((m) => m.id);
  if (medicationIds.length === 0) {
    return { ok: true, report: dayResults };
  }

  const placeholders = medicationIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT c.id, c.medication_id, m.name AS medication_name, c.date, c.time
       FROM medication_consumptions c
       JOIN medications m ON c.medication_id = m.id
       WHERE m.user_id = ? AND c.medication_id IN (${placeholders}) AND c.date >= ? AND c.date <= ?
       ORDER BY c.date, c.time`
    )
    .all(userId, ...medicationIds, minDate, maxDate) as Array<{
    id: number;
    medication_id: number;
    medication_name: string;
    date: string;
    time: string;
  }>;

  const actualByDate = new Map<string, ActualConsumption[]>();
  for (const r of dayResults) {
    actualByDate.set(r.date, []);
  }
  for (const row of rows) {
    const list = actualByDate.get(row.date);
    if (list) {
      list.push({
        id: row.id,
        medication_id: row.medication_id,
        medication_name: row.medication_name,
        date: row.date,
        time: row.time,
      });
    }
  }
  for (const day of dayResults) {
    day.actual = actualByDate.get(day.date) ?? [];
  }

  return { ok: true, report: dayResults };
}
