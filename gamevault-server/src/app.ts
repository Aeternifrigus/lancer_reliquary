import express from 'express';

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

export default app;
