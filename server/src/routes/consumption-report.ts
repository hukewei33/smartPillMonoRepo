import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as authService from '../services/auth';
import * as reportService from '../services/consumption-report';

const router = Router();
router.use(authMiddleware());

router.get('/', (req: Request, res: Response) => {
  const userId = authService.getUserId(req.user);
  const db = req.app.get('db');
  const startDate = (req.query.start_date as string) ?? '';
  const result = reportService.getWeeklyReport(db, userId, startDate);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json(result.report);
});

export default router;
