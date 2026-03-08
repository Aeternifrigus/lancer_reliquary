import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { registerPlayer, loginPlayer } from '../services/authService';

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username cannot exceed 24 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscores and hyphens'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = RegisterSchema.parse(req.body);
    const result = await registerPlayer(dto);
    res
      .status(201)
      .json({ success: true, data: result, message: 'Player registered successfully' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = LoginSchema.parse(req.body);
    const result = await loginPlayer(dto);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
