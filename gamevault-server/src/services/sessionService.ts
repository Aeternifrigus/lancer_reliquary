import { Types } from 'mongoose';
import { Session, SessionDocument } from '../models/Session';
import { Player } from '../models/Player';
import { SessionPlayerResult } from '../types';
import { calculateSessionElo, GameOutcome } from './eloService';
import { createError } from '../middleware/errorHandler';
import { logger } from '../lib/logger';

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

function toObjectId(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id)) throw createError(`Invalid player ID: ${id}`, 400);
  return new Types.ObjectId(id);
}

// Only the player who created a session may start or end it. Sessions created
// before createdBy existed have no owner, so nobody can end them through the API.
function assertHost(session: SessionDocument, requesterId: string): void {
  if (!session.createdBy || session.createdBy.toString() !== requesterId) {
    throw createError('Only the player who created this session can do that', 403);
  }
}

export async function createSession(
  dto: CreateSessionDto,
  creatorId: string
): Promise<SessionDocument> {
  // The creator always takes part, and each player appears once.
  const ids = [...new Set([creatorId, ...(dto.playerIds ?? [])])];
  const playerObjectIds = ids.map(toObjectId);

  const found = await Player.countDocuments({ _id: { $in: playerObjectIds } });
  if (found !== playerObjectIds.length) {
    throw createError('One or more player IDs not found', 400);
  }

  return Session.create({
    gameMode: dto.gameMode,
    mapId: dto.mapId,
    status: 'WAITING',
    createdBy: toObjectId(creatorId),
    players: playerObjectIds,
  });
}

export async function startSession(
  sessionId: string,
  requesterId: string
): Promise<SessionDocument> {
  const session = await Session.findById(sessionId);
  if (!session) throw createError('Session not found', 404);
  assertHost(session, requesterId);

  // Conditional update, so two start calls at once cannot both succeed.
  const started = await Session.findOneAndUpdate(
    { _id: session._id, status: 'WAITING' },
    { $set: { status: 'ACTIVE', startedAt: new Date() } },
    { new: true }
  );
  if (!started) throw createError(`Session is already ${session.status}`, 400);
  return started;
}

export async function endSession(
  sessionId: string,
  dto: EndSessionDto,
  requesterId: string
): Promise<SessionDocument> {
  const session = await Session.findById(sessionId);
  if (!session) throw createError('Session not found', 404);
  assertHost(session, requesterId);
  if (session.status !== 'ACTIVE') {
    throw createError(`Only an ACTIVE session can be ended (this one is ${session.status})`, 400);
  }

  // Results must cover exactly the players registered in the session: nobody
  // missing, nobody added, nobody twice. Without this a caller could move the
  // rating of any player on the server.
  const resultIds = dto.results.map((r) => r.playerId);
  if (new Set(resultIds).size !== resultIds.length) {
    throw createError('Each player can only appear once in the results', 400);
  }
  const sessionIds = new Set(session.players.map((p) => p.toString()));
  const outsiders = resultIds.filter((id) => !sessionIds.has(id));
  if (outsiders.length > 0) {
    throw createError(`Players not in this session: ${outsiders.join(', ')}`, 400);
  }
  if (resultIds.length !== sessionIds.size) {
    throw createError('Results must include every player in the session', 400);
  }

  const players = await Player.find({ _id: { $in: resultIds } });
  if (players.length !== resultIds.length) {
    throw createError('One or more player IDs not found', 400);
  }
  const playerMap = new Map(players.map((p) => [p._id.toString(), p]));

  const eloResults = calculateSessionElo(
    dto.results.map((r) => {
      const player = playerMap.get(r.playerId)!;
      return {
        playerId: r.playerId,
        elo: player.elo,
        gamesPlayed: player.stats.gamesPlayed,
        outcome: r.outcome as GameOutcome,
      };
    })
  );
  const eloMap = new Map(eloResults.map((e) => [e.playerId, e]));

  const sessionResults: SessionPlayerResult[] = dto.results.map((r) => {
    const elo = eloMap.get(r.playerId)!;
    return {
      playerId: new Types.ObjectId(r.playerId),
      kills: r.kills,
      deaths: r.deaths,
      assists: r.assists ?? 0,
      score: r.score,
      outcome: r.outcome,
      eloBefore: elo.eloBefore,
      eloAfter: elo.eloAfter,
      eloChange: elo.eloChange,
    };
  });

  // Claim the session first, in one conditional write. If two end requests
  // race, only one of them matches status ACTIVE; the other gets a 409 and
  // never touches player ratings.
  const now = new Date();
  const finished = await Session.findOneAndUpdate(
    { _id: session._id, status: 'ACTIVE' },
    {
      $set: {
        status: 'FINISHED',
        endedAt: now,
        results: sessionResults,
        startedAt: session.startedAt ?? now,
      },
    },
    { new: true }
  );
  if (!finished) throw createError('Session has already been ended', 409);

  // $inc rather than $set: if the same player finishes two sessions at the
  // same moment, both rating changes are kept instead of one overwriting the other.
  try {
    await Player.bulkWrite(
      sessionResults.map((r) => ({
        updateOne: {
          filter: { _id: r.playerId },
          update: {
            $inc: {
              elo: r.eloAfter - r.eloBefore,
              'stats.gamesPlayed': 1,
              'stats.wins': r.outcome === 'WIN' ? 1 : 0,
              'stats.losses': r.outcome === 'LOSS' ? 1 : 0,
              'stats.draws': r.outcome === 'DRAW' ? 1 : 0,
              'stats.kills': r.kills,
              'stats.deaths': r.deaths,
            },
          },
        },
      }))
    );
  } catch (err) {
    // The session is recorded as finished, but some player stats may not be.
    // Log enough to reconcile by hand. Full atomicity needs a replica set and
    // a transaction.
    logger.error('Player updates failed after session was finished', {
      sessionId: finished._id.toString(),
      message: (err as Error).message,
    });
    throw err;
  }

  return finished;
}

export async function getSession(sessionId: string): Promise<SessionDocument> {
  const session = await Session.findById(sessionId).populate('players', 'username elo stats');
  if (!session) throw createError('Session not found', 404);
  return session;
}
