import { Types } from 'mongoose';
import { Session, SessionDocument } from '../models/Session';
import { Player } from '../models/Player';
import { SessionPlayerResult } from '../types';
import { calculateSessionElo, GameOutcome } from './eloService';
import { createError } from '../middleware/errorHandler';

export interface CreateSessionDto {
  gameMode: string;
  mapId: string;
  playerIds?: string[];
}

export interface EndSessionDto {
  results: Array<{
    playerId: string;
    kills: number;
    deaths: number;
    assists?: number;
    score: number;
    outcome: 'WIN' | 'LOSS' | 'DRAW';
  }>;
}

export async function createSession(dto: CreateSessionDto): Promise<SessionDocument> {
  const playerObjectIds = (dto.playerIds ?? []).map((id) => {
    if (!Types.ObjectId.isValid(id)) throw createError(`Invalid player ID: ${id}`, 400);
    return new Types.ObjectId(id);
  });

  return Session.create({
    gameMode: dto.gameMode,
    mapId: dto.mapId,
    status: 'WAITING',
    players: playerObjectIds,
  });
}

export async function startSession(sessionId: string): Promise<SessionDocument> {
  const session = await Session.findById(sessionId);
  if (!session) throw createError('Session not found', 404);
  if (session.status !== 'WAITING') {
    throw createError(`Session is already ${session.status}`, 400);
  }

  session.status = 'ACTIVE';
  session.startedAt = new Date();
  await session.save();
  return session;
}

export async function endSession(sessionId: string, dto: EndSessionDto): Promise<SessionDocument> {
  const session = await Session.findById(sessionId);
  if (!session) throw createError('Session not found', 404);
  if (session.status === 'FINISHED') throw createError('Session is already finished', 400);
  if (session.status === 'ABANDONED') throw createError('Session was abandoned', 400);

  const playerIds = dto.results.map((r) => r.playerId);
  const players = await Player.find({ _id: { $in: playerIds } });

  if (players.length !== dto.results.length) {
    throw createError('One or more player IDs not found', 400);
  }

  const playerMap = new Map(players.map((p) => [p._id.toString(), p]));

  const eloInputs = dto.results.map((r) => {
    const player = playerMap.get(r.playerId)!;
    return {
      playerId: r.playerId,
      elo: player.elo,
      gamesPlayed: player.stats.gamesPlayed,
      outcome: r.outcome as GameOutcome,
    };
  });

  const eloResults = calculateSessionElo(eloInputs);
  const eloMap = new Map(eloResults.map((e) => [e.playerId, e]));

  const sessionResults: SessionPlayerResult[] = [];
  const updates: Promise<unknown>[] = [];

  for (const r of dto.results) {
    const elo = eloMap.get(r.playerId)!;

    sessionResults.push({
      playerId: new Types.ObjectId(r.playerId),
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists ?? 0,
      score: r.score,
      outcome: r.outcome,
      eloBefore: elo.eloBefore,
      eloAfter: elo.eloAfter,
      eloChange: elo.eloChange,
    });

    updates.push(
      Player.findByIdAndUpdate(r.playerId, {
        $set: { elo: elo.eloAfter },
        $inc: {
          'stats.gamesPlayed': 1,
          'stats.wins': r.outcome === 'WIN' ? 1 : 0,
          'stats.losses': r.outcome === 'LOSS' ? 1 : 0,
          'stats.draws': r.outcome === 'DRAW' ? 1 : 0,
          'stats.kills': r.kills,
          'stats.deaths': r.deaths,
        },
      })
    );
  }

  await Promise.all(updates);

  session.status = 'FINISHED';
  session.endedAt = new Date();
  session.results = sessionResults;
  if (!session.startedAt) session.startedAt = new Date();
  await session.save();

  return session;
}

export async function getSession(sessionId: string): Promise<SessionDocument> {
  const session = await Session.findById(sessionId).populate('players', 'username elo stats');
  if (!session) throw createError('Session not found', 404);
  return session;
}
