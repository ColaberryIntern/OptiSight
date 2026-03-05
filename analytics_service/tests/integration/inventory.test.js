process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:1';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the inventory service
jest.mock('../../src/services/inventoryService', () => ({
  getInventoryOptimization: jest.fn(),
}));

const app = require('../../src/app');
const inventoryService = require('../../src/services/inventoryService');

const token = jwt.sign(
  { userId: 'test-user', email: 'test@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

afterEach(() => {
  jest.clearAllMocks();
});

const mockRecommendations = {
  recommendations: [
    {
      product_id: 'p1',
      product_name: 'Widget A',
      current_stock: 5,
      eoq: 100,
      safety_stock: 20,
      reorder_point: 25,
      status: 'reorder_now',
      daily_demand_avg: 3.5,
      days_of_supply: 1.4,
    },
    {
      product_id: 'p2',
      product_name: 'Widget B',
      current_stock: 15,
      eoq: 50,
      safety_stock: 10,
      reorder_point: 15,
      status: 'low_stock',
      daily_demand_avg: 2.0,
      days_of_supply: 7.5,
    },
    {
      product_id: 'p3',
      product_name: 'Widget C',
      current_stock: 500,
      eoq: 100,
      safety_stock: 30,
      reorder_point: 40,
      status: 'overstock',
      daily_demand_avg: 1.0,
      days_of_supply: 500,
    },
    {
      product_id: 'p4',
      product_name: 'Widget D',
      current_stock: 100,
      eoq: 80,
      safety_stock: 20,
      reorder_point: 30,
      status: 'ok',
      daily_demand_avg: 2.5,
      days_of_supply: 40,
    },
  ],
};

describe('Inventory Optimization API - Integration Tests', () => {
  describe('GET /api/v1/analytics/inventory-optimization', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/inventory-optimization')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 200 with correct shape when authenticated', async () => {
      inventoryService.getInventoryOptimization.mockResolvedValue(mockRecommendations);

      const res = await request(app)
        .get('/api/v1/analytics/inventory-optimization')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('recommendations');
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.recommendations.length).toBe(4);

      const rec = res.body.recommendations[0];
      expect(rec).toHaveProperty('product_id');
      expect(rec).toHaveProperty('product_name');
      expect(rec).toHaveProperty('current_stock');
      expect(rec).toHaveProperty('eoq');
      expect(rec).toHaveProperty('safety_stock');
      expect(rec).toHaveProperty('reorder_point');
      expect(rec).toHaveProperty('status');
      expect(['reorder_now', 'low_stock', 'overstock', 'ok']).toContain(rec.status);
    });

    it('should accept optional storeId query parameter', async () => {
      inventoryService.getInventoryOptimization.mockResolvedValue({ recommendations: [] });

      const res = await request(app)
        .get('/api/v1/analytics/inventory-optimization?storeId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('recommendations');
      expect(inventoryService.getInventoryOptimization).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000000');
    });

    it('should return recommendations sorted by urgency', async () => {
      inventoryService.getInventoryOptimization.mockResolvedValue(mockRecommendations);

      const res = await request(app)
        .get('/api/v1/analytics/inventory-optimization')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const statusOrder = { reorder_now: 0, low_stock: 1, overstock: 2, ok: 3 };
      const statuses = res.body.recommendations.map(r => statusOrder[r.status] ?? 99);

      for (let i = 1; i < statuses.length; i++) {
        expect(statuses[i]).toBeGreaterThanOrEqual(statuses[i - 1]);
      }
    });
  });
});
