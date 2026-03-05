// Mock shared before anything loads it
jest.mock('@retail-insight/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Mock analyticsService
jest.mock('../../src/services/analyticsService');
const analyticsService = require('../../src/services/analyticsService');

// Mock inventoryService
jest.mock('../../src/services/inventoryService');
const inventoryService = require('../../src/services/inventoryService');

// Mock forecastService
jest.mock('../../src/services/forecastService');
const forecastService = require('../../src/services/forecastService');

const reportGenerator = require('../../src/services/reportGenerator');

describe('reportGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  describe('generateWeeklyDigest()', () => {
    it('should generate a digest with metrics from all services', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: [
          { date: '2025-01-15', severity: 'high' },
          { date: '2025-01-16', severity: 'medium' },
        ],
      });
      inventoryService.getInventoryOptimization.mockResolvedValue({
        recommendations: [
          { action: 'reorder', product: 'A' },
          { action: 'reorder', product: 'B' },
          { action: 'maintain', product: 'C' },
        ],
      });
      forecastService.getSalesForecast.mockResolvedValue({
        trend: 'increasing',
      });

      const result = await reportGenerator.generateWeeklyDigest(null);

      expect(result.type).toBe('weeklyDigest');
      expect(result.title).toBe('Weekly Performance Digest');
      expect(result.metadata.items).toHaveLength(3);
      expect(result.metadata.items[0]).toContain('2 revenue anomalies');
      expect(result.metadata.items[1]).toContain('2 products need reordering');
      expect(result.metadata.items[2]).toContain('Sales trend: increasing');
      expect(result.metadata.email).toBeNull();
    });

    it('should handle single anomaly with correct grammar', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: [{ date: '2025-01-15', severity: 'high' }],
      });
      inventoryService.getInventoryOptimization.mockResolvedValue({
        recommendations: [{ action: 'reorder', product: 'A' }],
      });
      forecastService.getSalesForecast.mockResolvedValue({
        trend: 'stable',
      });

      const result = await reportGenerator.generateWeeklyDigest(null);

      expect(result.metadata.items[0]).toContain('1 revenue anomaly');
      expect(result.metadata.items[0]).not.toContain('anomalies');
      expect(result.metadata.items[1]).toContain('1 product need');
      expect(result.metadata.items[1]).not.toContain('products');
    });

    it('should handle service failures gracefully via Promise.allSettled', async () => {
      analyticsService.detectRevenueAnomalies.mockRejectedValue(
        new Error('DB connection failed')
      );
      inventoryService.getInventoryOptimization.mockRejectedValue(
        new Error('AI engine down')
      );
      forecastService.getSalesForecast.mockRejectedValue(
        new Error('No data available')
      );

      const result = await reportGenerator.generateWeeklyDigest(null);

      // Should still return a valid report with empty items (rejected promises are skipped)
      expect(result.type).toBe('weeklyDigest');
      expect(result.title).toBe('Weekly Performance Digest');
      expect(result.metadata.items).toHaveLength(0);
    });

    it('should handle partial service failures', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: [{ date: '2025-01-15', severity: 'medium' }],
      });
      inventoryService.getInventoryOptimization.mockRejectedValue(
        new Error('AI engine down')
      );
      forecastService.getSalesForecast.mockResolvedValue({
        trend: 'decreasing',
      });

      const result = await reportGenerator.generateWeeklyDigest(null);

      // Only fulfilled services contribute items
      expect(result.metadata.items).toHaveLength(2);
      expect(result.metadata.items[0]).toContain('1 revenue anomaly');
      expect(result.metadata.items[1]).toContain('Sales trend: decreasing');
    });

    it('should send email when targetEmail is provided', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });
      inventoryService.getInventoryOptimization.mockResolvedValue({ recommendations: [] });
      forecastService.getSalesForecast.mockResolvedValue({ trend: 'stable' });

      const result = await reportGenerator.generateWeeklyDigest('admin@example.com');

      expect(axios.post).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith(
        'http://notification_service:3005/api/v1/notifications/send-email',
        expect.objectContaining({
          email: 'admin@example.com',
          type: 'weeklyDigest',
          title: 'Weekly Performance Digest',
        }),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        })
      );
      expect(result.metadata.email).toBe('admin@example.com');
    });

    it('should not send email when targetEmail is null', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });
      inventoryService.getInventoryOptimization.mockResolvedValue({ recommendations: [] });
      forecastService.getSalesForecast.mockResolvedValue({ trend: 'stable' });

      await reportGenerator.generateWeeklyDigest(null);

      expect(axios.post).not.toHaveBeenCalled();
    });

    it('should handle email delivery failure gracefully', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });
      inventoryService.getInventoryOptimization.mockResolvedValue({ recommendations: [] });
      forecastService.getSalesForecast.mockResolvedValue({ trend: 'stable' });
      axios.post.mockRejectedValue(new Error('SMTP server unavailable'));

      // Should not throw even though email fails
      const result = await reportGenerator.generateWeeklyDigest('admin@example.com');
      expect(result.type).toBe('weeklyDigest');
    });

    it('should use default trend "stable" when forecast has no trend', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });
      inventoryService.getInventoryOptimization.mockResolvedValue({ recommendations: [] });
      forecastService.getSalesForecast.mockResolvedValue({});

      const result = await reportGenerator.generateWeeklyDigest(null);

      expect(result.metadata.items[2]).toContain('Sales trend: stable');
    });
  });
});
