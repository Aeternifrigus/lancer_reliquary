import express from 'express';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

import authRouter from './routes/auth';
import playersRouter from './routes/players';
import sessionsRouter from './routes/sessions';

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use('/auth', authRouter);
app.use('/players', playersRouter);
app.use('/sessions', sessionsRouter);

app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

export default app;
