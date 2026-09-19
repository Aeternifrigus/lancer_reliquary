import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { connectTestDb, clearCollections, disconnectTestDb } from './setup/db';

beforeAll(() => connectTestDb());
afterEach(() => clearCollections());
afterAll(() => disconnectTestDb());

describe('POST /auth/register', () => {
  it('creates a new player and returns a JWT', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'xSniperPro',
      email: 'sniper@example.com',
      password: 'Secur3Pass!',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.player.username).toBe('xSniperPro');
    expect(res.body.data.player).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate usernames with 409', async () => {
    const payload = { username: 'duplicateUser', email: 'a@example.com', password: 'pass1234' };
    await request(app).post('/auth/register').send(payload);

    const res = await request(app)
      .post('/auth/register')
      .send({ ...payload, email: 'b@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'validUser',
      email: 'not-an-email',
      password: 'pass1234',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects passwords shorter than 8 characters', async () => {
    const res = await request(app).post('/auth/register').send({
      username: 'shortpass',
      email: 'short@example.com',
      password: 'abc',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/auth/register').send({
      username: 'loginUser',
      email: 'login@example.com',
      password: 'MyPassword1',
    });
  });

  it('returns a token on valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      username: 'loginUser',
      password: 'MyPassword1',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      username: 'loginUser',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app).post('/auth/login').send({
      username: 'ghost',
      password: 'irrelevant',
    });

    expect(res.status).toBe(401);
  });
});

describe('login timing', () => {
  afterEach(() => jest.restoreAllMocks());

  it('compares unknown usernames against a real bcrypt hash', async () => {
    const compare = jest.spyOn(bcrypt, 'compare');

    await request(app).post('/auth/login').send({ username: 'ghost', password: 'irrelevant' });

    expect(compare).toHaveBeenCalledTimes(1);
    const hash = compare.mock.calls[0][1];
    // A malformed hash makes bcryptjs return at once, which reveals that the
    // username does not exist. It must be a well-formed cost-12 hash.
    expect(hash).toMatch(/^\$2[aby]\$12\$[./A-Za-z0-9]{53}$/);
  });
});
