// Set environment variables BEFORE any app modules are loaded
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://retail_insight:changeme@localhost:5433/retail_insight';
process.env.NODE_ENV = 'development';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/db');

// Unique suffix to avoid email collisions across parallel test runs
const UNIQUE = Date.now();
const TEST_EMAIL = `inttest_${UNIQUE}@example.com`;
const TEST_PASSWORD = 'Str0ng!Pass1';
const TEST_ROLE = 'executive';

// Store values shared across tests
let registeredUserId;
let authToken;

afterAll(async () => {
  // Clean up test users created during this run
  await db('users').where('email', 'like', `inttest_${UNIQUE}%`).del();
  await db.destroy();
});

// -------------------------------------------------------------------
// POST /api/v1/users/register
// -------------------------------------------------------------------
describe('POST /api/v1/users/register', () => {
  it('should create a new user and return 201 with userId', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, role: TEST_ROLE });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.role).toBe(TEST_ROLE);

    registeredUserId = res.body.userId;
  });

  it('should return 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD, role: TEST_ROLE });

    expect(res.status).toBe(409);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('409');
    expect(res.body.error.message).toMatch(/already registered/i);
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('400');
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
      ])
    );
  });

  it('should return 400 for weak password (too short)', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: `inttest_${UNIQUE}_weak@example.com`, password: 'Ab1!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('400');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('should return 400 for password without number', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: `inttest_${UNIQUE}_nonum@example.com`, password: 'Abcdefgh!' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });

  it('should return 400 for password without special character', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({ email: `inttest_${UNIQUE}_nospec@example.com`, password: 'Abcdefgh1' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'password' }),
      ])
    );
  });
});

// -------------------------------------------------------------------
// POST /api/v1/users/login
// -------------------------------------------------------------------
describe('POST /api/v1/users/login', () => {
  it('should return 200 and a JWT token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.userId).toBe(registeredUserId);
    expect(res.body.user.email).toBe(TEST_EMAIL);

    // Verify token is valid
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBe(registeredUserId);

    authToken = res.body.token;
  });

  it('should return 401 for wrong password without revealing which field is wrong', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword!1' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toBe('Invalid email or password');
    // Must NOT say "wrong password" or "password incorrect" specifically
    expect(res.body.error.message).not.toMatch(/wrong password/i);
    expect(res.body.error.message).not.toMatch(/password incorrect/i);
  });

  it('should return 401 for non-existent email without revealing it', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });
});

// -------------------------------------------------------------------
// GET /api/v1/users/:userId
// -------------------------------------------------------------------
describe('GET /api/v1/users/:userId', () => {
  it('should return 401 when no token is provided', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${registeredUserId}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 401 for an invalid token', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${registeredUserId}`)
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });

  it('should return 200 with user profile (no password_hash) for valid token', async () => {
    const res = await request(app)
      .get(`/api/v1/users/${registeredUserId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(registeredUserId);
    expect(res.body.email).toBe(TEST_EMAIL);
    expect(res.body.role).toBe(TEST_ROLE);
    expect(res.body.password_hash).toBeUndefined();
    expect(res.body.password).toBeUndefined();
  });

  it('should return 404 for a non-existent userId', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/v1/users/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });
});
