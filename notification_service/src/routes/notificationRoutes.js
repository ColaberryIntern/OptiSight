const { Router } = require('express');
const { authMiddleware, roleMiddleware } = require('@retail-insight/shared');
const notificationController = require('../controllers/notificationController');

const router = Router();

/**
 * POST /api/v1/notifications
 * Protected endpoint - creates a new notification.
 * Requires admin or manager role.
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  notificationController.create
);

/**
 * POST /api/v1/notifications/send-email
 * Protected endpoint - sends a notification email directly.
 * Requires admin or manager role.
 * NOTE: This route must be defined BEFORE /:userId to avoid matching "send-email" as a userId.
 */
router.post(
  '/send-email',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  notificationController.sendEmail
);

/**
 * GET /api/v1/notifications/:userId/unread-count
 * Protected endpoint - returns the count of unread notifications for a user.
 * NOTE: This route must be defined BEFORE /:userId to avoid matching "unread-count" as a userId.
 */
router.get(
  '/:userId/unread-count',
  authMiddleware,
  notificationController.getUnreadCount
);

/**
 * GET /api/v1/notifications/:userId
 * Protected endpoint - returns paginated notifications for a user.
 * Supports ?page= and ?limit= query parameters.
 */
router.get(
  '/:userId',
  authMiddleware,
  notificationController.getUserNotifications
);

/**
 * PATCH /api/v1/notifications/:notificationId/read
 * Protected endpoint - marks a notification as read.
 */
router.patch(
  '/:notificationId/read',
  authMiddleware,
  notificationController.markAsRead
);

module.exports = router;
