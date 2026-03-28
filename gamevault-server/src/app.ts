import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

import authRouter from './routes/auth';
import playersRouter from './routes/players';
import sessionsRouter from './routes/sessions';
import leaderboardRouter from './routes/leaderboard';
import itemsRouter from './routes/items';

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Swagger docs are optional; skip them if swagger.yaml is missing
try {
  const spec = YAML.load(path.join(__dirname, '../swagger.yaml')) as object;
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
} catch {
  // fine
}

app.use('/auth', authRouter);
app.use('/players', playersRouter);
app.use('/sessions', sessionsRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/items', itemsRouter);

app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

export default app;
