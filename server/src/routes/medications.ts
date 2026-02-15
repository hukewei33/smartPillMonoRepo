import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware());

export interface MedicationRow {
  id: number;
  user_id: number;
  name: string;
  dose: string;
  start_date: string;
  daily_frequency: number;
  day_interval: number;
  created_at: string;
}

function getUserId(req: Request): number {
  const sub = req.user?.sub;
  if (sub == null || typeof sub !== 'number') {
    throw new Error('User id missing');
  }
  return sub;
}

function validateMedicationBody(body: unknown): string | null {
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

function toMedication(row: MedicationRow) {
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

/** GET /medications — list all medications for the authenticated user */
router.get('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const rows = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(userId) as MedicationRow[];
  res.json({ medications: rows.map(toMedication) });
});

/** POST /medications — create a medication for the authenticated user */
router.post('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const errMsg = validateMedicationBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }
  const userId = getUserId(req);
  const { name, dose, start_date, daily_frequency, day_interval } = req.body as {
    name: string;
    dose: string;
    start_date: string;
    daily_frequency: number;
    day_interval: number;
  };
  const result = db
    .prepare(
      `INSERT INTO medications (user_id, name, dose, start_date, daily_frequency, day_interval)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userId, name.trim(), dose.trim(), start_date.trim(), daily_frequency, day_interval);
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ?'
    )
    .get(result.lastInsertRowid) as MedicationRow;
  return res.status(201).json(toMedication(row));
});

/** GET /medications/:id — get one medication (only if owned by user) */
router.get('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid medication id' });
  }
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ? AND user_id = ?'
    )
    .get(id, userId) as MedicationRow | undefined;
  if (!row) {
    return res.status(404).json({ error: 'Medication not found' });
  }
  return res.json(toMedication(row));
});

/** PUT /medications/:id — update a medication (only if owned by user) */
router.put('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const errMsg = validateMedicationBody(req.body);
  if (errMsg) {
    return res.status(400).json({ error: errMsg });
  }
  const userId = getUserId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid medication id' });
  }
  const existing = db.prepare('SELECT id FROM medications WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Medication not found' });
  }
  const { name, dose, start_date, daily_frequency, day_interval } = req.body as {
    name: string;
    dose: string;
    start_date: string;
    daily_frequency: number;
    day_interval: number;
  };
  db.prepare(
    `UPDATE medications SET name = ?, dose = ?, start_date = ?, daily_frequency = ?, day_interval = ?
     WHERE id = ? AND user_id = ?`
  ).run(name.trim(), dose.trim(), start_date.trim(), daily_frequency, day_interval, id, userId);
  const row = db
    .prepare(
      'SELECT id, user_id, name, dose, start_date, daily_frequency, day_interval, created_at FROM medications WHERE id = ?'
    )
    .get(id) as MedicationRow;
  return res.json(toMedication(row));
});

/** DELETE /medications/:id — delete a medication (only if owned by user) */
router.delete('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid medication id' });
  }
  const result = db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Medication not found' });
  }
  return res.status(204).send();
});

export default router;
