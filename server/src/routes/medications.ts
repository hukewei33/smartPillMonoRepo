import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as medicationsService from '../services/medications';

const router = Router();
router.use(authMiddleware());

function getUserId(req: Request): number {
  const sub = req.user?.sub;
  if (sub == null || typeof sub !== 'number') {
    throw new Error('User id missing');
  }
  return sub;
}

router.get('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const medications = medicationsService.listMedications(db, userId);
  res.json({ medications });
});

router.post('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = medicationsService.validateMedicationInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const userId = getUserId(req);
  const input = req.body as {
    name: string;
    dose: string;
    start_date: string;
    daily_frequency: number;
    day_interval: number;
  };
  const result = medicationsService.createMedication(db, userId, input);
  if (!result.ok) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json(result.medication);
});

router.get('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const id = Number(req.params.id);
  const result = medicationsService.getMedication(db, userId, id);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json(result.medication);
});

router.put('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = medicationsService.validateMedicationInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const userId = getUserId(req);
  const id = Number(req.params.id);
  const input = req.body as {
    name: string;
    dose: string;
    start_date: string;
    daily_frequency: number;
    day_interval: number;
  };
  const result = medicationsService.updateMedication(db, userId, id, input);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json(result.medication);
});

router.delete('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = getUserId(req);
  const id = Number(req.params.id);
  const result = medicationsService.deleteMedication(db, userId, id);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(204).send();
});

export default router;
