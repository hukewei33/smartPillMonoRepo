import { Router, Request, Response } from 'express';
import * as authService from '../services/auth';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = authService.validateRegisterBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const result = await authService.register(db, req.body as { email: string; password: string });
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(201).json(result.user);
});

router.post('/login', async (req: Request, res: Response) => {
  const db = req.app.get('db');
  const validationError = authService.validateLoginBody(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }
  const result = await authService.login(db, req.body as { email: string; password: string });
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.status(200).json({ token: result.token });
});

export default router;
