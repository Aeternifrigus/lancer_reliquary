import mongoose from 'mongoose';
import app from './app';
import config from './config';
import { logger } from './lib/logger';

async function main() {
  await mongoose.connect(config.mongodb.uri);
  logger.info('Connected to MongoDB');

  app.listen(config.port, () => {
    logger.info(`GameVault running on :${config.port}  (${config.nodeEnv})`);
    if (config.nodeEnv !== 'production') {
      logger.info(`Docs: http://localhost:${config.port}/docs`);
    }
  });
}

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  void mongoose.connection.close().then(() => process.exit(0));
});

process.on('SIGINT', () => {
  void mongoose.connection.close().then(() => process.exit(0));
});

main().catch((err) => {
  logger.error('Failed to start', { err: String(err) });
  process.exit(1);
});
