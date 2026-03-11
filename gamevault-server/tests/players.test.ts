import request from 'supertest';
import app from '../src/app';
import { connectTestDb, clearCollections, disconnectTestDb } from './setup/db';

let token: string;
let playerId: string;

beforeAll(() => connectTestDb());
afterEach(() => clearCollections());
afterAll(() => disconnectTestDb());

async function registerAndLogin() {
  const res = await request(app).post('/auth/register').send({
    username: 'profilePlayer',
    email: 'profile@example.com',
    password: 'TestPass99',
  });
  token = res.body.data.token as string;
  playerId = res.body.data.player.id as string;
}

describe('GET /players/:id', () => {
  beforeEach(() => registerAndLogin());

  it('returns the public player profile', async () => {
    const res = await request(app).get(`/players/${playerId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('profilePlayer');
    expect(res.body.data).not.toHaveProperty('passwordHash');
    expect(res.body.data.elo).toBe(1200);
    expect(res.body.data.stats).toBeDefined();
  });

  it('returns 400 for malformed ID', async () => {
    const res = await request(app).get('/players/not-a-real-id');
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown player', async () => {
    const res = await request(app).get('/players/000000000000000000000001');
    expect(res.status).toBe(404);
  });
});

describe('GET /players/me', () => {
  beforeEach(() => registerAndLogin());

  it('returns own profile when authenticated', async () => {
    const res = await request(app).get('/players/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('profilePlayer');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/players/me');
    expect(res.status).toBe(401);
  });
});
