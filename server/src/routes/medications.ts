import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as authService from '../services/auth';
import * as consumptionsService from '../services/consumptions';
import * as medicationsService from '../services/medications';

const router = Router();
router.use(authMiddleware());

router.get('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = authService.getUserId(req.user);
  const medications = medicationsService.listMedications(db, userId);
  res.json({ medications });
});

router.post('/', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = medicationsService.validateMedicationInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const userId = authService.getUserId(req.user);
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

router.post('/:id/consumptions', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = consumptionsService.validateConsumptionInput(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const userId = authService.getUserId(req.user);
  const medicationId = Number(req.params.id);
  const input = req.body as { date: string; time: string };
  const result = consumptionsService.createConsumption(db, userId, medicationId, input);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(201).json(result.consumption);
});

router.get('/:id', (req: Request, res: Response) => {
  const db = req.app.get('db');
  const userId = authService.getUserId(req.user);
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
  const userId = authService.getUserId(req.user);
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
  const userId = authService.getUserId(req.user);
  const id = Number(req.params.id);
  const result = medicationsService.deleteMedication(db, userId, id);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(204).send();
});

export default router;
