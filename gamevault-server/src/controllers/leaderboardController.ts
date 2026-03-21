import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getLeaderboard, getPlayerRank } from '../services/rankingService';

const QuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  minElo: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(0).optional()),
});

export async function handleGetLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getLeaderboard(QuerySchema.parse(req.query));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleGetPlayerRank(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getPlayerRank(req.params.playerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
