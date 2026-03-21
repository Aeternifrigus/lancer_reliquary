import request from 'supertest';
import app from '../src/app';
import { connectTestDb, clearCollections, disconnectTestDb } from './setup/db';
import { Player } from '../src/models/Player';

beforeAll(() => connectTestDb());
afterEach(() => clearCollections());
afterAll(() => disconnectTestDb());

async function seedPlayers() {
  const players = [
    {
      username: 'alpha',
      email: 'a@test.com',
      elo: 1800,
      stats: { wins: 50, losses: 10, draws: 0, kills: 0, deaths: 0, gamesPlayed: 60 },
    },
    {
      username: 'beta',
      email: 'b@test.com',
      elo: 1600,
      stats: { wins: 35, losses: 15, draws: 0, kills: 0, deaths: 0, gamesPlayed: 50 },
    },
    {
      username: 'gamma',
      email: 'c@test.com',
      elo: 1400,
      stats: { wins: 20, losses: 25, draws: 0, kills: 0, deaths: 0, gamesPlayed: 45 },
    },
    {
      username: 'delta',
      email: 'd@test.com',
      elo: 1200,
      stats: { wins: 10, losses: 30, draws: 5, kills: 0, deaths: 0, gamesPlayed: 45 },
    },
  ];

  // Insert directly, skipping registration
  await Player.insertMany(players.map((p) => ({ ...p, passwordHash: '$2b$12$placeholder' })));
}

describe('GET /leaderboard', () => {
  beforeEach(() => seedPlayers());

  it('returns players sorted by ELO descending', async () => {
    const res = await request(app).get('/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body.data.entries[0].username).toBe('alpha');
    expect(res.body.data.entries[0].rank).toBe(1);
    expect(res.body.data.entries[1].username).toBe('beta');
  });

  it('paginates correctly', async () => {
    const res = await request(app).get('/leaderboard?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(2);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.entries[0].rank).toBe(3); // page 2 starts at rank 3
  });

  it('filters by minimum ELO', async () => {
    const res = await request(app).get('/leaderboard?minElo=1500');

    expect(res.status).toBe(200);
    expect(res.body.data.entries.every((e: { elo: number }) => e.elo >= 1500)).toBe(true);
  });
});

describe('GET /leaderboard/:playerId', () => {
  beforeEach(() => seedPlayers());

  it("returns a player's rank", async () => {
    const players = await Player.find().sort({ elo: -1 }).lean();
    const targetId = players[1]._id.toString(); // beta is rank 2

    const res = await request(app).get(`/leaderboard/${targetId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.rank).toBe(2);
    expect(res.body.data.entry.username).toBe('beta');
  });
});
