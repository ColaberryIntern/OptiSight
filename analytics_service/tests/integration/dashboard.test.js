const request = require('supertest');
const jwt = require('jsonwebtoken');

// Set environment variables before loading the app
process.env.DATABASE_URL = 'postgres://retail_insight:changeme@localhost:5433/retail_insight';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'development';

const app = require('../../src/app');
const db = require('../../src/config/db');

// Generate a valid JWT for authenticated requests
const token = jwt.sign(
  { userId: 'test-user', email: 'test@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

afterAll(async () => {
  await db.destroy();
});

describe('Dashboard API - Integration Tests', () => {
  describe('GET /api/v1/dashboard/performance', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/performance')
        .expect(401);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', '401');
    });

    it('should return 200 with correct shape when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/performance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify response shape
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('transactionCount');
      expect(res.body).toHaveProperty('averageOrderValue');
      expect(res.body).toHaveProperty('customerCount');
      expect(res.body).toHaveProperty('topProducts');
      expect(res.body).toHaveProperty('revenueByDay');

      // Verify types
      expect(typeof res.body.totalRevenue).toBe('number');
      expect(typeof res.body.transactionCount).toBe('number');
      expect(typeof res.body.averageOrderValue).toBe('number');
      expect(typeof res.body.customerCount).toBe('number');
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(Array.isArray(res.body.revenueByDay)).toBe(true);

      // Verify topProducts shape if any exist
      if (res.body.topProducts.length > 0) {
        const product = res.body.topProducts[0];
        expect(product).toHaveProperty('productId');
        expect(product).toHaveProperty('productName');
        expect(product).toHaveProperty('totalSold');
        expect(product).toHaveProperty('revenue');
        expect(typeof product.productId).toBe('string');
        expect(typeof product.productName).toBe('string');
        expect(typeof product.totalSold).toBe('number');
        expect(typeof product.revenue).toBe('number');
      }

      // Verify revenueByDay shape if any exist
      if (res.body.revenueByDay.length > 0) {
        const dayEntry = res.body.revenueByDay[0];
        expect(dayEntry).toHaveProperty('date');
        expect(dayEntry).toHaveProperty('revenue');
        expect(typeof dayEntry.date).toBe('string');
        expect(typeof dayEntry.revenue).toBe('number');
        // Verify date format (YYYY-MM-DD)
        expect(dayEntry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }

      // topProducts should have at most 10 entries
      expect(res.body.topProducts.length).toBeLessThanOrEqual(10);
    });

    it('should return 200 with filtered data for period=7d', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/performance?period=7d')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify response shape (same structure)
      expect(res.body).toHaveProperty('totalRevenue');
      expect(res.body).toHaveProperty('transactionCount');
      expect(res.body).toHaveProperty('averageOrderValue');
      expect(res.body).toHaveProperty('customerCount');
      expect(res.body).toHaveProperty('topProducts');
      expect(res.body).toHaveProperty('revenueByDay');

      expect(typeof res.body.totalRevenue).toBe('number');
      expect(typeof res.body.transactionCount).toBe('number');
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(Array.isArray(res.body.revenueByDay)).toBe(true);

      // Revenue by day entries should all be within the last 7 days
      if (res.body.revenueByDay.length > 0) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        for (const entry of res.body.revenueByDay) {
          expect(entry.date >= sevenDaysAgoStr).toBe(true);
        }
      }
    });
  });

  describe('GET /api/v1/analytics/revenue-anomalies', () => {
    it('should return 200 with anomalies array when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/revenue-anomalies')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify response shape
      expect(res.body).toHaveProperty('anomalies');
      expect(Array.isArray(res.body.anomalies)).toBe(true);

      // Verify anomaly shape if any exist
      if (res.body.anomalies.length > 0) {
        const anomaly = res.body.anomalies[0];
        expect(anomaly).toHaveProperty('date');
        expect(anomaly).toHaveProperty('expectedRevenue');
        expect(anomaly).toHaveProperty('actualRevenue');
        expect(anomaly).toHaveProperty('deviationPercent');
        expect(anomaly).toHaveProperty('severity');

        expect(typeof anomaly.date).toBe('string');
        expect(anomaly.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof anomaly.expectedRevenue).toBe('number');
        expect(typeof anomaly.actualRevenue).toBe('number');
        expect(typeof anomaly.deviationPercent).toBe('number');
        expect(['high', 'medium']).toContain(anomaly.severity);

        // Verify deviation is actually > 20%
        expect(Math.abs(anomaly.deviationPercent)).toBeGreaterThan(20);
      }
    });
  });
});
