import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import { logger } from '../lib/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// Registered last, so every error reaches the client (including the C++ one)
// in the same shape.
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Mongoose duplicate key (e.g. unique username/email)
  if (
    (err as NodeJS.ErrnoException).name === 'MongoServerError' &&
    (err as { code?: number }).code === 11000
  ) {
    res.status(409).json({ success: false, error: 'Resource already exists' });
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ success: false, error: messages.join(', ') });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ success: false, error: 'Invalid ID format' });
    return;
  }

  const statusCode = err.statusCode ?? 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack, url: req.url });
  }

  res.status(statusCode).json({ success: false, error: message });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}
