import request from 'supertest';
import app from '../src/app';
import { connectTestDb, clearCollections, disconnectTestDb } from './setup/db';

let token: string;
let playerId: string;

beforeAll(() => connectTestDb());
afterEach(() => clearCollections());
afterAll(() => disconnectTestDb());

async function setup() {
  const res = await request(app).post('/auth/register').send({
    username: 'sessionPlayer',
    email: 'session@example.com',
    password: 'Pass12345',
  });
  token = res.body.data.token as string;
  playerId = res.body.data.player.id as string;
}

describe('POST /sessions', () => {
  beforeEach(() => setup());

  it('creates a session in WAITING status', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'deathmatch', mapId: 'map_dust2' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('WAITING');
    expect(res.body.data.gameMode).toBe('deathmatch');
  });

  it('rejects unknown game modes', async () => {
    const res = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'zombie_mode', mapId: 'map_01' });

    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/sessions')
      .send({ gameMode: 'deathmatch', mapId: 'map_01' });

    expect(res.status).toBe(401);
  });
});

describe('PATCH /sessions/:id/end', () => {
  beforeEach(() => setup());

  it('ends a session and updates player ELO', async () => {
    const opponent = await request(app).post('/auth/register').send({
      username: 'opponent',
      email: 'opponent@example.com',
      password: 'Pass12345',
    });
    const opponentId = opponent.body.data.player.id as string;

    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'ranked', mapId: 'arena_01' });

    const sessionId = createRes.body.data._id as string;

    const endRes = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        results: [
          { playerId, kills: 15, deaths: 4, assists: 2, score: 3500, outcome: 'WIN' },
          { playerId: opponentId, kills: 4, deaths: 15, score: 900, outcome: 'LOSS' },
        ],
      });

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.status).toBe('FINISHED');
    expect(endRes.body.data.results).toHaveLength(2);

    const winner = await request(app).get(`/players/${playerId}`);
    expect(winner.body.data.elo).toBeGreaterThan(1200);
    expect(winner.body.data.stats.wins).toBe(1);
    expect(winner.body.data.stats.kills).toBe(15);

    const loser = await request(app).get(`/players/${opponentId}`);
    expect(loser.body.data.elo).toBeLessThan(1200);
    expect(loser.body.data.stats.losses).toBe(1);
  });
});
