process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:1';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the forecast service
jest.mock('../../src/services/forecastService', () => ({
  getSalesForecast: jest.fn(),
}));

const app = require('../../src/app');
const forecastService = require('../../src/services/forecastService');

const token = jwt.sign(
  { userId: 'test-user', email: 'test@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

afterEach(() => {
  jest.clearAllMocks();
});

const mockForecast = {
  forecast: [
    { date: '2026-03-04', predicted: 1000, lower: 900, upper: 1100 },
    { date: '2026-03-05', predicted: 1050, lower: 920, upper: 1180 },
    { date: '2026-03-06', predicted: 1080, lower: 940, upper: 1220 },
  ],
  trend: 'upward',
  summary: {
    data_points: 90,
    mean: 1043.33,
    std: 40.41,
    min: 1000,
    max: 1080,
    trend: 'upward',
    trend_magnitude: 0.04,
  },
};

describe('Sales Forecast API - Integration Tests', () => {
  describe('GET /api/v1/analytics/sales-forecast', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/sales-forecast')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 200 with correct shape when authenticated', async () => {
      forecastService.getSalesForecast.mockResolvedValue(mockForecast);

      const res = await request(app)
        .get('/api/v1/analytics/sales-forecast')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('forecast');
      expect(res.body).toHaveProperty('trend');
      expect(res.body).toHaveProperty('summary');
      expect(Array.isArray(res.body.forecast)).toBe(true);
      expect(typeof res.body.trend).toBe('string');
      expect(['upward', 'downward', 'stable']).toContain(res.body.trend);

      const entry = res.body.forecast[0];
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('predicted');
      expect(entry).toHaveProperty('lower');
      expect(entry).toHaveProperty('upper');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.upper).toBeGreaterThanOrEqual(entry.lower);
    });

    it('should accept optional storeId and periods query parameters', async () => {
      forecastService.getSalesForecast.mockResolvedValue(mockForecast);

      const res = await request(app)
        .get('/api/v1/analytics/sales-forecast?storeId=00000000-0000-0000-0000-000000000000&periods=7')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('forecast');
      expect(forecastService.getSalesForecast).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000000', 7);
    });

    it('should return summary with expected fields', async () => {
      forecastService.getSalesForecast.mockResolvedValue(mockForecast);

      const res = await request(app)
        .get('/api/v1/analytics/sales-forecast')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.summary).toHaveProperty('data_points');
      expect(res.body.summary).toHaveProperty('mean');
      expect(res.body.summary).toHaveProperty('std');
      expect(res.body.summary).toHaveProperty('min');
      expect(res.body.summary).toHaveProperty('max');
      expect(res.body.summary).toHaveProperty('trend');
      expect(res.body.summary.max).toBeGreaterThanOrEqual(res.body.summary.min);
    });
  });
});
