const Notification = require('../models/Notification');
const { logger } = require('@retail-insight/shared');
const emailDeliveryService = require('./emailDeliveryService');

/** Notification types that trigger automatic email delivery */
const EMAIL_ENABLED_TYPES = ['anomalyAlert', 'inventoryAlert', 'weeklyDigest'];

/**
 * Business logic for notification operations.
 */
const notificationService = {
  /**
   * Create a new notification.
   * Validates required fields before persisting.
   *
   * @param {{ userId: string, type: string, title: string, message: string, metadata?: object }} data
   * @returns {Promise<object>} The created notification
   */
  async createNotification({ userId, type, title, message, metadata }) {
    // Validate required fields
    if (!userId) {
      const error = new Error('userId is required');
      error.statusCode = 400;
      throw error;
    }
    if (!type) {
      const error = new Error('type is required');
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

    const notification = await Notification.create({ userId, type, title, message, metadata });

    logger.info({
      message: 'Notification created',
      notificationId: notification.notification_id,
      userId,
      type,
    });

    // Trigger email delivery for supported types when an email is provided in metadata
    const parsedMeta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    if (EMAIL_ENABLED_TYPES.includes(type) && parsedMeta && parsedMeta.email) {
      // Fire-and-forget: email delivery should not block notification creation
      emailDeliveryService
        .sendNotificationEmail(parsedMeta.email, { type, title, message, metadata })
        .catch((err) => {
          logger.error({
            message: 'Background email delivery failed',
            notificationId: notification.notification_id,
            error: err.message,
          });
        });
    }

    return notification;
  },

  /**
   * Get notifications for a user with pagination.
   *
   * @param {string} userId
   * @param {{ page?: number, limit?: number }} options
   * @returns {Promise<{ data: object[], pagination: { page: number, limit: number, total: number } }>}
   */
  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const { data, total } = await Notification.findByUserId(userId, {
      page: parsedPage,
      limit: parsedLimit,
    });

    return {
      data,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
      },
    };
  },

  /**
   * Mark a notification as read.
   *
   * @param {string} notificationId
   * @returns {Promise<object>} The updated notification
   */
  async markNotificationRead(notificationId) {
    const notification = await Notification.markAsRead(notificationId);
    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    logger.info({
      message: 'Notification marked as read',
      notificationId,
    });

    return notification;
  },

  /**
   * Get the count of unread notifications for a user.
   *
   * @param {string} userId
   * @returns {Promise<{ unreadCount: number }>}
   */
  async getUnreadCount(userId) {
    const count = await Notification.countUnread(userId);
    return { unreadCount: count };
  },
};

module.exports = notificationService;
