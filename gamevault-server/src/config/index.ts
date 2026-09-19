import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/gamevault',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
  },
} as const;

// The built-in fallbacks are only safe on a developer machine or in tests.
// Anything else (production, staging, or NODE_ENV forgotten entirely) must
// supply real values, otherwise tokens would be signed with a public secret.
const LOCAL_ENVS = ['development', 'test'];

if (!LOCAL_ENVS.includes(config.nodeEnv)) {
  if (!process.env.JWT_SECRET) {
    throw new Error(`JWT_SECRET must be set when NODE_ENV is "${config.nodeEnv}"`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error(`MONGODB_URI must be set when NODE_ENV is "${config.nodeEnv}"`);
  }
}

export default config;
