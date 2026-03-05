const db = require('../config/db');

const TABLE = 'notifications';

/**
 * Data access layer for the notifications table.
 * All database interactions for notification records go through this module.
 */
const Notification = {
  /**
   * Create a new notification record.
   * @param {{ userId: string, type: string, title: string, message: string, metadata?: object }} data
   * @returns {Promise<object>} The created notification
   */
  async create({ userId, type, title, message, metadata }) {
    const [notification] = await db(TABLE)
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : '{}',
      })
      .returning([
        'notification_id',
        'user_id',
        'type',
        'title',
        'message',
        'metadata',
        'is_read',
        'created_at',
      ]);
    return notification;
  },

  /**
   * Find notifications for a given user, paginated and sorted by created_at desc.
   * @param {string} userId
   * @param {{ page: number, limit: number }} pagination
   * @returns {Promise<{ data: object[], total: number }>}
   */
  async findByUserId(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;

    const [countResult] = await db(TABLE)
      .where({ user_id: userId })
      .count('notification_id as total');

    const total = parseInt(countResult.total, 10);

    const data = await db(TABLE)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { data, total };
  },

  /**
   * Mark a notification as read.
   * @param {string} notificationId
   * @returns {Promise<object|null>} The updated notification or null if not found
   */
  async markAsRead(notificationId) {
    const [updated] = await db(TABLE)
      .where({ notification_id: notificationId })
      .update({ is_read: true })
      .returning([
        'notification_id',
        'user_id',
        'type',
        'title',
        'message',
        'metadata',
        'is_read',
        'created_at',
      ]);
    return updated || null;
  },

  /**
   * Count unread notifications for a given user.
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countUnread(userId) {
    const [result] = await db(TABLE)
      .where({ user_id: userId, is_read: false })
      .count('notification_id as count');
    return parseInt(result.count, 10);
  },
};

module.exports = Notification;
