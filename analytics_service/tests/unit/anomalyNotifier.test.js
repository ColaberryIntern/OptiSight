// Mock shared before anything loads it
jest.mock('@retail-insight/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  config: {
    jwtSecret: 'test-secret',
    serviceUrls: {
      notificationService: 'http://notification_service:3005',
    },
  },
}));

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Mock analyticsService
jest.mock('../../src/services/analyticsService');
const analyticsService = require('../../src/services/analyticsService');

// Mock socketManager
jest.mock('../../src/socketManager');
const socketManager = require('../../src/socketManager');

const anomalyNotifier = require('../../src/services/anomalyNotifier');

describe('anomalyNotifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    socketManager.emitToAll.mockImplementation(() => {});
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    anomalyNotifier.stopSchedule();
  });

  describe('checkAndNotify()', () => {
    it('should do nothing when no anomalies are detected', async () => {
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });

      const result = await anomalyNotifier.checkAndNotify();

      expect(result).toEqual({ notified: false, anomalyCount: 0 });
      expect(axios.post).not.toHaveBeenCalled();
      expect(socketManager.emitToAll).not.toHaveBeenCalled();
    });

    it('should create notifications and emit socket event when anomalies found', async () => {
      const mockAnomalies = [
        {
          date: '2025-01-15',
          expectedRevenue: 1000,
          actualRevenue: 1500,
          deviationPercent: 50.0,
          severity: 'high',
        },
        {
          date: '2025-01-16',
          expectedRevenue: 1000,
          actualRevenue: 750,
          deviationPercent: -25.0,
          severity: 'medium',
        },
      ];

      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: mockAnomalies,
      });

      const result = await anomalyNotifier.checkAndNotify();

      expect(result).toEqual({ notified: true, anomalyCount: 2 });

      // Should POST to notification_service for each anomaly
      expect(axios.post).toHaveBeenCalledTimes(2);

      // Verify first notification call
      expect(axios.post.mock.calls[0][0]).toBe(
        'http://notification_service:3005/api/v1/notifications'
      );
      expect(axios.post.mock.calls[0][1]).toMatchObject({
        userId: 'system',
        type: 'anomaly',
        title: 'Revenue Anomaly Detected - HIGH',
        metadata: mockAnomalies[0],
      });
      expect(axios.post.mock.calls[0][1].message).toContain('50%');
      expect(axios.post.mock.calls[0][1].message).toContain('above');

      // Verify second notification call
      expect(axios.post.mock.calls[1][1]).toMatchObject({
        userId: 'system',
        type: 'anomaly',
        title: 'Revenue Anomaly Detected - MEDIUM',
        metadata: mockAnomalies[1],
      });
      expect(axios.post.mock.calls[1][1].message).toContain('25%');
      expect(axios.post.mock.calls[1][1].message).toContain('below');

      // Should emit socket event
      expect(socketManager.emitToAll).toHaveBeenCalledTimes(1);
      expect(socketManager.emitToAll).toHaveBeenCalledWith(
        'anomaly:detected',
        expect.objectContaining({
          anomalies: mockAnomalies,
          detectedAt: expect.any(String),
        })
      );
    });

    it('should continue even if notification_service call fails', async () => {
      const mockAnomalies = [
        {
          date: '2025-01-15',
          expectedRevenue: 1000,
          actualRevenue: 1500,
          deviationPercent: 50.0,
          severity: 'high',
        },
      ];

      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: mockAnomalies,
      });
      axios.post.mockRejectedValue(new Error('notification_service down'));

      const result = await anomalyNotifier.checkAndNotify();

      // Should still emit socket event and report success
      expect(result).toEqual({ notified: true, anomalyCount: 1 });
      expect(socketManager.emitToAll).toHaveBeenCalledTimes(1);
    });

    it('should continue even if socket emit fails', async () => {
      const mockAnomalies = [
        {
          date: '2025-01-15',
          expectedRevenue: 1000,
          actualRevenue: 1500,
          deviationPercent: 50.0,
          severity: 'high',
        },
      ];

      analyticsService.detectRevenueAnomalies.mockResolvedValue({
        anomalies: mockAnomalies,
      });
      socketManager.emitToAll.mockImplementation(() => {
        throw new Error('Socket not initialized');
      });

      const result = await anomalyNotifier.checkAndNotify();

      expect(result).toEqual({ notified: true, anomalyCount: 1 });
    });

    it('should handle detectRevenueAnomalies failure gracefully', async () => {
      analyticsService.detectRevenueAnomalies.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await anomalyNotifier.checkAndNotify();

      expect(result).toEqual({
        notified: false,
        anomalyCount: 0,
        error: 'Database connection failed',
      });
      expect(axios.post).not.toHaveBeenCalled();
      expect(socketManager.emitToAll).not.toHaveBeenCalled();
    });
  });

  describe('startSchedule() / stopSchedule()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      analyticsService.detectRevenueAnomalies.mockResolvedValue({ anomalies: [] });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start an interval that calls checkAndNotify', () => {
      anomalyNotifier.startSchedule(60000);

      // Initial delay check (10s timeout)
      jest.advanceTimersByTime(10000);
      expect(analyticsService.detectRevenueAnomalies).toHaveBeenCalledTimes(1);

      // After interval
      jest.advanceTimersByTime(60000);
      expect(analyticsService.detectRevenueAnomalies).toHaveBeenCalledTimes(2);
    });

    it('should stop the interval when stopSchedule is called', () => {
      anomalyNotifier.startSchedule(60000);

      jest.advanceTimersByTime(10000);
      expect(analyticsService.detectRevenueAnomalies).toHaveBeenCalledTimes(1);

      anomalyNotifier.stopSchedule();

      jest.advanceTimersByTime(120000);
      // Should not have been called again
      expect(analyticsService.detectRevenueAnomalies).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateServiceToken()', () => {
    it('should generate a valid JWT string', () => {
      const token = anomalyNotifier.generateServiceToken();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });
});
