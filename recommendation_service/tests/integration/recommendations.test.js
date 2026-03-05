// Set environment variables before any imports
process.env.JWT_SECRET = 'dev_jwt_secret_change_in_production';
process.env.NODE_ENV = 'test';
process.env.AI_ENGINE_URL = 'http://localhost:5000';
process.env.DATA_INGESTION_URL = 'http://localhost:3002';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const nock = require('nock');
const app = require('../../src/app');

// Generate test tokens
const validToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000001', email: 'user@test.com', role: 'admin' },
  'dev_jwt_secret_change_in_production',
  { expiresIn: '1h' }
);

const sampleTransactions = {
  data: [
    {
      transaction_id: 'tx-001',
      user_id: 'a0000000-0000-0000-0000-000000000001',
      store_id: 's-001',
      total_amount: 49.99,
      items: [
        { product_id: 'p-001', quantity: 2, unit_price: 14.99 },
        { product_id: 'p-002', quantity: 1, unit_price: 19.99 },
      ],
    },
    {
      transaction_id: 'tx-002',
      user_id: 'a0000000-0000-0000-0000-000000000002',
      store_id: 's-001',
      total_amount: 29.99,
      items: [
        { product_id: 'p-001', quantity: 1, unit_price: 14.99 },
        { product_id: 'p-003', quantity: 3, unit_price: 4.99 },
      ],
    },
    {
      transaction_id: 'tx-003',
      user_id: 'a0000000-0000-0000-0000-000000000003',
      store_id: 's-002',
      total_amount: 39.99,
      items: [
        { product_id: 'p-002', quantity: 2, unit_price: 19.99 },
        { product_id: 'p-004', quantity: 1, unit_price: 9.99 },
      ],
    },
  ],
  pagination: { page: 1, limit: 20, total: 3 },
};

const sampleRecommendations = {
  recommendations: [
    { product_id: 'p-003', score: 0.92, reason: "Recommended based on similar users' purchase patterns" },
    { product_id: 'p-004', score: 0.78, reason: "Recommended based on similar users' purchase patterns" },
  ],
};

// Clean up nock interceptors after each test
afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe('Recommendation Service - Integration Tests', () => {
  // ──────────────────────────────────────────────────────────────
  // Health endpoint
  // ──────────────────────────────────────────────────────────────

  describe('GET /health', () => {
    it('should return 200 with service status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('recommendation_service');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/recommendations/:userId
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/recommendations/:userId', () => {
    it('should return 200 with recommendations when services respond', async () => {
      // Mock data_ingestion_service
      nock('http://localhost:3002')
        .get('/api/v1/data/transactions')
        .query({ userId: 'a0000000-0000-0000-0000-000000000001' })
        .reply(200, sampleTransactions);

      // Mock ai_engine
      nock('http://localhost:5000')
        .post('/predict')
        .reply(200, sampleRecommendations);

      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('a0000000-0000-0000-0000-000000000001');
      expect(res.body.recommendations).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.count).toBeDefined();
    });

    it('should return 401 without authentication token', async () => {
      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });

    it('should return empty recommendations when AI engine fails', async () => {
      // Mock data_ingestion_service (succeeds)
      nock('http://localhost:3002')
        .get('/api/v1/data/transactions')
        .query({ userId: 'a0000000-0000-0000-0000-000000000001' })
        .reply(200, sampleTransactions);

      // Mock ai_engine (fails)
      nock('http://localhost:5000')
        .post('/predict')
        .replyWithError('Connection refused');

      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return empty recommendations when data ingestion service fails', async () => {
      // Mock data_ingestion_service (fails)
      nock('http://localhost:3002')
        .get('/api/v1/data/transactions')
        .query({ userId: 'a0000000-0000-0000-0000-000000000001' })
        .replyWithError('Service unavailable');

      // Mock ai_engine (returns empty since no interactions)
      nock('http://localhost:5000')
        .post('/predict')
        .reply(200, { recommendations: [] });

      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
    });

    it('should pass the n query parameter to ai_engine', async () => {
      nock('http://localhost:3002')
        .get('/api/v1/data/transactions')
        .query({ userId: 'a0000000-0000-0000-0000-000000000001' })
        .reply(200, sampleTransactions);

      // Verify the body sent to ai_engine contains n=3
      nock('http://localhost:5000')
        .post('/predict', (body) => {
          return body.n === 3 && body.user_id === 'a0000000-0000-0000-0000-000000000001';
        })
        .reply(200, { recommendations: [sampleRecommendations.recommendations[0]] });

      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001?n=3')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeDefined();
    });

    it('should correctly transform transaction items into interactions', async () => {
      nock('http://localhost:3002')
        .get('/api/v1/data/transactions')
        .query({ userId: 'a0000000-0000-0000-0000-000000000001' })
        .reply(200, sampleTransactions);

      // Verify the interactions sent to ai_engine are properly formatted
      nock('http://localhost:5000')
        .post('/predict', (body) => {
          const interactions = body.interactions;
          if (!Array.isArray(interactions) || interactions.length === 0) return false;
          // Each interaction should have user_id, product_id, interaction_score
          return interactions.every(
            (i) => i.user_id && i.product_id && typeof i.interaction_score === 'number'
          );
        })
        .reply(200, sampleRecommendations);

      const res = await request(app)
        .get('/api/v1/recommendations/a0000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
    });
  });
});
