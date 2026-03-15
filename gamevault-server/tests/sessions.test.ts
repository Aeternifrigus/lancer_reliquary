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
    // Create session
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'ranked', mapId: 'arena_01' });

    const sessionId = createRes.body.data._id as string;

    // End session with results
    const endRes = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        results: [
          {
            playerId,
            kills: 15,
            deaths: 4,
            assists: 2,
            score: 3500,
            outcome: 'WIN',
          },
        ],
      });

    expect(endRes.status).toBe(200);
    expect(endRes.body.data.status).toBe('FINISHED');
    expect(endRes.body.data.results[0].eloChange).toBeDefined();

    // Player ELO should have changed
    const playerRes = await request(app).get(`/players/${playerId}`);
    expect(playerRes.body.data.elo).not.toBe(1200);
    expect(playerRes.body.data.stats.wins).toBe(1);
    expect(playerRes.body.data.stats.kills).toBe(15);
  });
});
