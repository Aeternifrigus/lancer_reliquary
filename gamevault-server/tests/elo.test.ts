import { calculateElo, calculateSessionElo } from '../src/services/eloService';

describe('calculateElo', () => {
  it('increases ELO for a win against an equal opponent', () => {
    const { newElo, change } = calculateElo(1200, 1200, 'WIN', 0);
    expect(change).toBeGreaterThan(0);
    expect(newElo).toBeGreaterThan(1200);
  });

  it('decreases ELO for a loss against an equal opponent', () => {
    const { newElo, change } = calculateElo(1200, 1200, 'LOSS', 0);
    expect(change).toBeLessThan(0);
    expect(newElo).toBeLessThan(1200);
  });

  it('gives smaller gain when beating a much weaker opponent', () => {
    const { change: bigGain } = calculateElo(1200, 1200, 'WIN', 5);
    const { change: smallGain } = calculateElo(1200, 800, 'WIN', 5);
    expect(smallGain).toBeLessThan(bigGain);
  });

  it('inflicts larger penalty when losing to a much weaker opponent', () => {
    const { change: normalLoss } = calculateElo(1200, 1200, 'LOSS', 5);
    const { change: bigLoss } = calculateElo(1200, 800, 'LOSS', 5);
    expect(bigLoss).toBeLessThan(normalLoss);
  });

  it('uses K=32 for provisional players (< 30 games)', () => {
    const { change } = calculateElo(1200, 1200, 'WIN', 5);
    // Expected score against equal = 0.5, K=32: 32 * (1 - 0.5) = 16
    expect(change).toBe(16);
  });

  it('uses K=16 for elite players (> 100 games)', () => {
    const { change } = calculateElo(1200, 1200, 'WIN', 101);
    expect(change).toBe(8); // 16 * 0.5
  });

  it('draws produce no change against an equal opponent', () => {
    const { change } = calculateElo(1200, 1200, 'DRAW', 5);
    expect(change).toBe(0);
  });

  it('ELO never goes below 0', () => {
    // even match, so a loss costs 16 points
    const { newElo } = calculateElo(10, 10, 'LOSS', 5);
    expect(newElo).toBe(0);
  });
});

describe('calculateSessionElo', () => {
  it('calculates ELO changes for all participants', () => {
    const results = calculateSessionElo([
      { playerId: 'p1', elo: 1200, gamesPlayed: 5, outcome: 'WIN' },
      { playerId: 'p2', elo: 1200, gamesPlayed: 5, outcome: 'LOSS' },
    ]);

    expect(results).toHaveLength(2);

    const winner = results.find((r) => r.playerId === 'p1')!;
    const loser = results.find((r) => r.playerId === 'p2')!;

    expect(winner.eloChange).toBeGreaterThan(0);
    expect(loser.eloChange).toBeLessThan(0);
    expect(winner.eloAfter).toBe(winner.eloBefore + winner.eloChange);
    expect(loser.eloAfter).toBe(loser.eloBefore + loser.eloChange);
  });
});
