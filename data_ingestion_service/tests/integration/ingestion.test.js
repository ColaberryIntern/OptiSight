// Set environment variables before any imports
process.env.DATABASE_URL = 'postgres://retail_insight:changeme@localhost:5433/retail_insight';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'development';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const db = require('../../src/config/db');

// Generate test tokens with valid UUIDs (transactions.user_id is UUID type)
const adminToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000001', email: 'admin@test.com', role: 'admin' },
  'test-secret',
  { expiresIn: '1h' }
);

const executiveToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000002', email: 'exec@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

const managerToken = jwt.sign(
  { userId: 'a0000000-0000-0000-0000-000000000003', email: 'manager@test.com', role: 'manager' },
  'test-secret',
  { expiresIn: '1h' }
);

// Store a valid storeId fetched from the seeded DB
let validStoreId;

beforeAll(async () => {
  // Fetch a real store ID from the seeded database
  const store = await db('stores').select('store_id').first();
  if (store) {
    validStoreId = store.store_id;
  }
});

afterAll(async () => {
  await db.destroy();
});

describe('Data Ingestion Service - Integration Tests', () => {
  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/data/ingest
  // ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/data/ingest', () => {
    it('should return 401 when no auth token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .send({
          storeId: validStoreId,
          totalAmount: 49.99,
          items: [],
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('401');
    });

    it('should return 403 when user has executive role (not admin/manager)', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', `Bearer ${executiveToken}`)
        .send({
          storeId: validStoreId,
          totalAmount: 49.99,
          items: [],
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('403');
    });

    it('should return 201 when valid data is submitted with admin token', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeId: validStoreId,
          totalAmount: 129.97,
          items: [
            { product_id: '00000000-0000-0000-0000-000000000001', quantity: 2, unit_price: 49.99 },
            { product_id: '00000000-0000-0000-0000-000000000002', quantity: 1, unit_price: 29.99 },
          ],
          transactionDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.transactionId).toBeDefined();
      expect(res.body.message).toBe('Transaction ingested successfully');
    });

    it('should return 400 when storeId is missing', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          totalAmount: 49.99,
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('400');
    });

    it('should return 400 when totalAmount is missing or invalid', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          storeId: validStoreId,
          totalAmount: -5,
          items: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('400');
    });

    it('should return 201 with manager token', async () => {
      const res = await request(app)
        .post('/api/v1/data/ingest')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          storeId: validStoreId,
          totalAmount: 25.00,
          items: [
            { product_id: '00000000-0000-0000-0000-000000000001', quantity: 1, unit_price: 25.00 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.transactionId).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/data/transactions
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/data/transactions', () => {
    it('should return 200 with paginated transaction data', async () => {
      const res = await request(app)
        .get('/api/v1/data/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBeDefined();
      expect(res.body.pagination.limit).toBeDefined();
      expect(res.body.pagination.total).toBeDefined();
    });

    it('should return 200 with correct page size when limit=5', async () => {
      const res = await request(app)
        .get('/api/v1/data/transactions?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/data/transactions');

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/data/products
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/data/products', () => {
    it('should return 200 with an array of products', async () => {
      const res = await request(app)
        .get('/api/v1/data/products')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Check product shape
      const product = res.body[0];
      expect(product.product_id).toBeDefined();
      expect(product.product_name).toBeDefined();
      expect(product.category).toBeDefined();
      expect(product.price).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/data/products');

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/data/stores
  // ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/data/stores', () => {
    it('should return 200 with an array of stores', async () => {
      const res = await request(app)
        .get('/api/v1/data/stores')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      // Check store shape
      const store = res.body[0];
      expect(store.store_id).toBeDefined();
      expect(store.store_name).toBeDefined();
      expect(store.region).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/v1/data/stores');

      expect(res.status).toBe(401);
    });
  });
});
