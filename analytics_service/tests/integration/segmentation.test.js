process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = 'redis://localhost:1';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock the segmentation service
jest.mock('../../src/services/segmentationService', () => ({
  getCustomerSegmentation: jest.fn(),
}));

const app = require('../../src/app');
const segmentationService = require('../../src/services/segmentationService');

const token = jwt.sign(
  { userId: 'test-user', email: 'test@test.com', role: 'executive' },
  'test-secret',
  { expiresIn: '1h' }
);

afterEach(() => {
  jest.clearAllMocks();
});

const mockSegmentationResponse = {
  segments: [
    { user_id: 'u1', segment: 'Champions', rfm_scores: { recency: 5, frequency: 10, monetary: 5000 } },
    { user_id: 'u2', segment: 'Loyal', rfm_scores: { recency: 15, frequency: 5, monetary: 2000 } },
    { user_id: 'u3', segment: 'At-Risk', rfm_scores: { recency: 45, frequency: 2, monetary: 500 } },
  ],
  profiles: [
    { segment: 'Champions', count: 1, avg_recency: 5, avg_frequency: 10, avg_monetary: 5000 },
    { segment: 'Loyal', count: 1, avg_recency: 15, avg_frequency: 5, avg_monetary: 2000 },
    { segment: 'At-Risk', count: 1, avg_recency: 45, avg_frequency: 2, avg_monetary: 500 },
  ],
};

describe('Customer Segmentation API - Integration Tests', () => {
  describe('GET /api/v1/analytics/customer-segmentation', () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/customer-segmentation')
        .expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 200 with segments and profiles when authenticated', async () => {
      segmentationService.getCustomerSegmentation.mockResolvedValue(mockSegmentationResponse);

      const res = await request(app)
        .get('/api/v1/analytics/customer-segmentation')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('segments');
      expect(res.body).toHaveProperty('profiles');
      expect(Array.isArray(res.body.segments)).toBe(true);
      expect(Array.isArray(res.body.profiles)).toBe(true);

      const segment = res.body.segments[0];
      expect(segment).toHaveProperty('user_id');
      expect(segment).toHaveProperty('segment');
      expect(segment).toHaveProperty('rfm_scores');
    });

    it('should return empty arrays for non-existent storeId', async () => {
      segmentationService.getCustomerSegmentation.mockResolvedValue({ segments: [], profiles: [] });

      const res = await request(app)
        .get('/api/v1/analytics/customer-segmentation?storeId=00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.segments).toEqual([]);
      expect(res.body.profiles).toEqual([]);
    });

    it('should accept storeId query parameter', async () => {
      segmentationService.getCustomerSegmentation.mockResolvedValue(mockSegmentationResponse);

      const res = await request(app)
        .get('/api/v1/analytics/customer-segmentation?storeId=11111111-1111-1111-1111-111111111111')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(segmentationService.getCustomerSegmentation).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });

    it('should handle service errors gracefully', async () => {
      segmentationService.getCustomerSegmentation.mockRejectedValue(new Error('AI engine error'));

      const res = await request(app)
        .get('/api/v1/analytics/customer-segmentation')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
    });
  });
});
