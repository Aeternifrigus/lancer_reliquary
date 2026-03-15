import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { createSession, endSession, getSession, startSession } from '../services/sessionService';

const CreateSessionSchema = z.object({
  gameMode: z.enum([
    'deathmatch',
    'team_deathmatch',
    'capture_the_flag',
    'battle_royale',
    'ranked',
  ]),
  mapId: z.string().min(1).max(64),
  playerIds: z.array(z.string()).optional(),
});

const EndSessionSchema = z.object({
  results: z
    .array(
      z.object({
        playerId: z.string().min(1),
        kills: z.number().int().min(0),
        deaths: z.number().int().min(0),
        assists: z.number().int().min(0).optional(),
        score: z.number().int().min(0),
        outcome: z.enum(['WIN', 'LOSS', 'DRAW']),
      })
    )
    .min(1, 'Need at least one result'),
});

export async function handleCreateSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await createSession(CreateSessionSchema.parse(req.body));
    res.status(201).json({ success: true, data: session, message: 'Session created' });
  } catch (err) {
    next(err);
  }
}

export async function handleStartSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await startSession(req.params.id);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}

export async function handleEndSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await endSession(req.params.id, EndSessionSchema.parse(req.body));
    res.json({ success: true, data: session, message: 'Session ended, ELO updated' });
  } catch (err) {
    next(err);
  }
}

export async function handleGetSession(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await getSession(req.params.id);
    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
}
