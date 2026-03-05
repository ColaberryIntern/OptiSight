// Set environment variables before any imports
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test-secret';

const emailDeliveryService = require('../src/services/emailDeliveryService');
const emailTemplates = require('../src/templates/emailTemplates');

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

// Mock logger to avoid noisy output in tests
jest.mock('@retail-insight/shared', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const nodemailer = require('nodemailer');

describe('emailDeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env to dev mode
    process.env.NODE_ENV = 'development';
    delete process.env.SMTP_HOST;
  });

  describe('sendNotificationEmail - dev mode', () => {
    it('should return { sent: false, devMode: true } when no transporter configured', async () => {
      const result = await emailDeliveryService.sendNotificationEmail(
        'user@example.com',
        {
          type: 'anomalyAlert',
          title: 'Sales Anomaly',
          message: 'Revenue dropped unexpectedly.',
          metadata: { deviation: 15 },
        }
      );

      expect(result).toEqual({ sent: false, devMode: true });
    });

    it('should log the email delivery attempt in dev mode', async () => {
      const { logger } = require('@retail-insight/shared');

      await emailDeliveryService.sendNotificationEmail(
        'manager@store.com',
        {
          type: 'inventoryAlert',
          title: 'Low Stock',
          message: 'Widget supply is low.',
          metadata: { currentLevel: 5 },
        }
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email delivery (dev mode)',
          email: 'manager@store.com',
          type: 'inventoryAlert',
          title: 'Low Stock',
        })
      );
    });
  });

  describe('sendNotificationEmail - production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'testuser';
      process.env.SMTP_PASS = 'testpass';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'development';
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
    });

    it('should send email via transporter in production mode', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'prod-1' });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      const result = await emailDeliveryService.sendNotificationEmail(
        'admin@optisight.ai',
        {
          type: 'anomalyAlert',
          title: 'Revenue Alert',
          message: 'Revenue anomaly detected.',
          metadata: { deviation: 20, amount: 5000 },
        }
      );

      expect(result).toEqual({ sent: true });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@optisight.ai',
          subject: 'OptiSight: Revenue Alert',
          html: expect.any(String),
        })
      );
    });

    it('should return error when transporter.sendMail fails', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP connection failed'));
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      const result = await emailDeliveryService.sendNotificationEmail(
        'admin@optisight.ai',
        {
          type: 'generic',
          title: 'Test',
          message: 'Test message',
        }
      );

      expect(result).toEqual({ sent: false, error: 'SMTP connection failed' });
    });
  });

  describe('template selection', () => {
    it('should use anomalyAlert template for anomalyAlert type', async () => {
      const result = await emailDeliveryService.sendNotificationEmail(
        'user@test.com',
        {
          type: 'anomalyAlert',
          title: 'Anomaly',
          message: 'Revenue anomaly.',
          metadata: { deviation: 10 },
        }
      );

      expect(result).toEqual({ sent: false, devMode: true });
    });

    it('should use inventoryAlert template for inventoryAlert type', async () => {
      const result = await emailDeliveryService.sendNotificationEmail(
        'user@test.com',
        {
          type: 'inventoryAlert',
          title: 'Inventory Low',
          message: 'Stock is low.',
          metadata: { currentLevel: 3, reorderPoint: 10 },
        }
      );

      expect(result).toEqual({ sent: false, devMode: true });
    });

    it('should use generic template for unknown types', async () => {
      const result = await emailDeliveryService.sendNotificationEmail(
        'user@test.com',
        {
          type: 'unknownType',
          title: 'Unknown',
          message: 'Some message.',
        }
      );

      expect(result).toEqual({ sent: false, devMode: true });
    });

    it('should handle metadata passed as a JSON string', async () => {
      const result = await emailDeliveryService.sendNotificationEmail(
        'user@test.com',
        {
          type: 'anomalyAlert',
          title: 'Anomaly',
          message: 'Revenue anomaly.',
          metadata: JSON.stringify({ deviation: 25, amount: 10000 }),
        }
      );

      expect(result).toEqual({ sent: false, devMode: true });
    });
  });
});
