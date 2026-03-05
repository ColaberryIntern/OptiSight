const notificationService = require('../services/notificationService');
const emailDeliveryService = require('../services/emailDeliveryService');

/**
 * Express route handlers for notification endpoints.
 * Each handler delegates to notificationService and formats the HTTP response.
 * Errors are forwarded to the shared errorHandler via next().
 */
const notificationController = {
  /**
   * POST /api/v1/notifications
   */
  async create(req, res, next) {
    try {
      const { userId, type, title, message, metadata } = req.body;
      const notification = await notificationService.createNotification({
        userId,
        type,
        title,
        message,
        metadata,
      });
      return res.status(201).json(notification);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/notifications/:userId
   */
  async getUserNotifications(req, res, next) {
    try {
      const { userId } = req.params;
      const { page, limit } = req.query;
      const result = await notificationService.getUserNotifications(userId, { page, limit });
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/v1/notifications/:notificationId/read
   */
  async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      const notification = await notificationService.markNotificationRead(notificationId);
      return res.status(200).json(notification);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/notifications/send-email
   * Directly sends a notification email without persisting it.
   */
  async sendEmail(req, res, next) {
    try {
      const { email, type, title, message, metadata } = req.body;

      if (!email) {
        const error = new Error('email is required');
        error.statusCode = 400;
        throw error;
      }
      if (!title) {
        const error = new Error('title is required');
        error.statusCode = 400;
        throw error;
      }
      if (!message) {
        const error = new Error('message is required');
        error.statusCode = 400;
        throw error;
      }

      const result = await emailDeliveryService.sendNotificationEmail(email, {
        type: type || 'generic',
        title,
        message,
        metadata,
      });

      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/notifications/:userId/unread-count
   */
  async getUnreadCount(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await notificationService.getUnreadCount(userId);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = notificationController;
