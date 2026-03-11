import { Response, NextFunction } from 'express';
import { Player } from '../models/Player';
import { AuthRequest } from '../types';
import { createError } from '../middleware/errorHandler';

export async function getPlayer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const player = await Player.findById(req.params.id).select('-passwordHash');
    if (!player) throw createError('Player not found', 404);
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.player) throw createError('Not authenticated', 401);

    const player = await Player.findById(req.player.playerId).select('-passwordHash');
    if (!player) throw createError('Player not found', 404);

    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
}
