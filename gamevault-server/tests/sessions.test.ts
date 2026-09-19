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
  let opponentToken: string;
  let opponentId: string;

  beforeEach(async () => {
    await setup();
    const opponent = await request(app).post('/auth/register').send({
      username: 'opponent',
      email: 'opponent@example.com',
      password: 'Pass12345',
    });
    opponentToken = opponent.body.data.token as string;
    opponentId = opponent.body.data.player.id as string;
  });

  // Creates a session hosted by the first player, with the opponent in it.
  async function activeSession(): Promise<string> {
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'ranked', mapId: 'arena_01', playerIds: [opponentId] });
    const sessionId = createRes.body.data._id as string;

    await request(app)
      .patch(`/sessions/${sessionId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return sessionId;
  }

  function results(winner = playerId, loser = opponentId) {
    return {
      results: [
        { playerId: winner, kills: 15, deaths: 4, assists: 2, score: 3500, outcome: 'WIN' },
        { playerId: loser, kills: 4, deaths: 15, score: 900, outcome: 'LOSS' },
      ],
    };
  }

  it('ends a session and updates player ELO', async () => {
    const sessionId = await activeSession();

    const endRes = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send(results());

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

  it('adds the creator to the session automatically', async () => {
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'ranked', mapId: 'arena_01', playerIds: [opponentId] });

    expect(createRes.body.data.players).toEqual(expect.arrayContaining([playerId, opponentId]));
    expect(createRes.body.data.createdBy).toBe(playerId);
  });

  it('rejects an end request from a player who is not the host', async () => {
    const sessionId = await activeSession();

    const res = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${opponentToken}`)
      .send(results(opponentId, playerId));

    expect(res.status).toBe(403);
    const opponent = await request(app).get(`/players/${opponentId}`);
    expect(opponent.body.data.elo).toBe(1200);
  });

  it('rejects results for a player who was not in the session', async () => {
    const outsider = await request(app).post('/auth/register').send({
      username: 'outsider',
      email: 'outsider@example.com',
      password: 'Pass12345',
    });
    const outsiderId = outsider.body.data.player.id as string;
    const sessionId = await activeSession();

    const res = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send(results(playerId, outsiderId));

    expect(res.status).toBe(400);
    const player = await request(app).get(`/players/${outsiderId}`);
    expect(player.body.data.elo).toBe(1200);
  });

  it('rejects results that leave out a player', async () => {
    const sessionId = await activeSession();

    const res = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send({ results: [results().results[0]] });

    expect(res.status).toBe(400);
  });

  it('rejects the same player twice in the results', async () => {
    const sessionId = await activeSession();

    const res = await request(app)
      .patch(`/sessions/${sessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send(results(playerId, playerId));

    expect(res.status).toBe(400);
  });

  it('refuses to end a session that was never started', async () => {
    const createRes = await request(app)
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameMode: 'ranked', mapId: 'arena_01', playerIds: [opponentId] });

    const res = await request(app)
      .patch(`/sessions/${createRes.body.data._id}/end`)
      .set('Authorization', `Bearer ${token}`)
      .send(results());

    expect(res.status).toBe(400);
  });

  it('applies ELO only once when two end requests race', async () => {
    const sessionId = await activeSession();

    const [a, b] = await Promise.all([
      request(app)
        .patch(`/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .send(results()),
      request(app)
        .patch(`/sessions/${sessionId}/end`)
        .set('Authorization', `Bearer ${token}`)
        .send(results()),
    ]);

    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const winner = await request(app).get(`/players/${playerId}`);
    expect(winner.body.data.stats.gamesPlayed).toBe(1);
    expect(winner.body.data.stats.wins).toBe(1);
  });
});
