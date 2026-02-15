import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/hello', authMiddleware(), (_req, res: Response) => {
  const email = _req.user?.email;
  const message = email ? `Hello, ${email}` : 'Hello, world';
  res.json({ message });
});

export default router;
