import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getHelloMessage } from '../services/hello';

const router = Router();

router.get('/hello', authMiddleware(), (req, res: Response) => {
  const message = getHelloMessage(req.user?.email as string | undefined);
  res.json({ message });
});

export default router;
