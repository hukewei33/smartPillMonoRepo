import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth';
import consumptionReportRoutes from './routes/consumption-report';
import helloRoutes from './routes/hello';
import medicationsRoutes from './routes/medications';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use(helloRoutes);
app.use('/medications', medicationsRoutes);
app.use('/consumption-report', consumptionReportRoutes);

app.use((err: Error & { name?: string }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }
  next(err);
});

export default app;
