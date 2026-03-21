import { Player } from '../models/Player';
import { LeaderboardEntry, PaginatedLeaderboard } from '../types';
import { createError } from '../middleware/errorHandler';

export interface LeaderboardQuery {
  page?: number;
  limit?: number;
  minElo?: number;
}

export async function getLeaderboard(query: LeaderboardQuery): Promise<PaginatedLeaderboard> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (query.minElo !== undefined) filter.elo = { $gte: query.minElo };

  const [players, total] = await Promise.all([
    Player.find(filter)
      .sort({ elo: -1, 'stats.wins': -1 })
      .skip(skip)
      .limit(limit)
      .select('username elo stats')
      .lean(),
    Player.countDocuments(filter),
  ]);

  const entries: LeaderboardEntry[] = players.map((p, idx) => ({
    rank: skip + idx + 1,
    playerId: p._id.toString(),
    username: p.username,
    elo: p.elo,
    wins: p.stats.wins,
    losses: p.stats.losses,
    gamesPlayed: p.stats.gamesPlayed,
    winRate:
      p.stats.gamesPlayed > 0 ? Math.round((p.stats.wins / p.stats.gamesPlayed) * 100) / 100 : 0,
  }));

  return { entries, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getPlayerRank(
  playerId: string
): Promise<{ rank: number; entry: LeaderboardEntry }> {
  const player = await Player.findById(playerId).select('username elo stats').lean();
  if (!player) throw createError('Player not found', 404);

  // rank = number of players with higher ELO + 1
  const rank = (await Player.countDocuments({ elo: { $gt: player.elo } })) + 1;

  return {
    rank,
    entry: {
      rank,
      playerId: player._id.toString(),
      username: player.username,
      elo: player.elo,
      wins: player.stats.wins,
      losses: player.stats.losses,
      gamesPlayed: player.stats.gamesPlayed,
      winRate:
        player.stats.gamesPlayed > 0
          ? Math.round((player.stats.wins / player.stats.gamesPlayed) * 100) / 100
          : 0,
    },
  };
}
