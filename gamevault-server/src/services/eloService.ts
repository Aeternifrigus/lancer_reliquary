// Standard ELO. Higher K means bigger swings, so new players settle faster.

const K_PROVISIONAL = 32; // < 30 games
const K_ESTABLISHED = 24; // 30-100 games
const K_ELITE = 16; // > 100 games or very high elo

const ELITE_ELO = 2400;
const ELITE_GAMES = 100;
const SETTLED_GAMES = 30;

export type GameOutcome = 'WIN' | 'LOSS' | 'DRAW';

export interface EloResult {
  newElo: number;
  change: number;
}

function kFactor(elo: number, gamesPlayed: number): number {
  if (gamesPlayed < SETTLED_GAMES) return K_PROVISIONAL;
  if (elo >= ELITE_ELO || gamesPlayed > ELITE_GAMES) return K_ELITE;
  return K_ESTABLISHED;
}

function score(outcome: GameOutcome): number {
  return outcome === 'WIN' ? 1 : outcome === 'DRAW' ? 0.5 : 0;
}

export function calculateElo(
  playerElo: number,
  opponentElo: number,
  outcome: GameOutcome,
  gamesPlayed: number
): EloResult {
  const k = kFactor(playerElo, gamesPlayed);
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const change = Math.round(k * (score(outcome) - expected));
  const newElo = Math.max(0, playerElo + change);

  return { newElo, change };
}

// For multi-player sessions each participant is rated against the average ELO
// of everyone else in the match.
export function calculateSessionElo(
  participants: Array<{
    playerId: string;
    elo: number;
    gamesPlayed: number;
    outcome: GameOutcome;
  }>
): Array<{ playerId: string; eloBefore: number; eloAfter: number; eloChange: number }> {
  const totalElo = participants.reduce((sum, p) => sum + p.elo, 0);

  return participants.map((p) => {
    const opponentAvg =
      participants.length > 1 ? (totalElo - p.elo) / (participants.length - 1) : p.elo;

    const { newElo, change } = calculateElo(p.elo, opponentAvg, p.outcome, p.gamesPlayed);

    return {
      playerId: p.playerId,
      eloBefore: p.elo,
      eloAfter: newElo,
      eloChange: change,
    };
  });
}
