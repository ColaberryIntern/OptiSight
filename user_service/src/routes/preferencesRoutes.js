const { Router } = require('express');
const { authMiddleware } = require('@retail-insight/shared');
const UserPreference = require('../models/UserPreference');
const BehaviorEvent = require('../models/BehaviorEvent');

const router = Router();

/**
 * GET /api/v1/users/:userId/preferences
 * Returns user preferences.
 */
router.get('/:userId/preferences', authMiddleware, async (req, res, next) => {
  try {
    const prefs = await UserPreference.findByUserId(req.params.userId);
    res.json(prefs || { default_period: '30d', dashboard_layout: {}, favorite_widgets: [] });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/:userId/preferences
 * Creates or updates user preferences.
 */
router.put('/:userId/preferences', authMiddleware, async (req, res, next) => {
  try {
    const prefs = await UserPreference.upsert(req.params.userId, req.body);
    res.json(prefs);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/:userId/events
 * Logs a user behavior event.
 */
router.post('/:userId/events', authMiddleware, async (req, res, next) => {
  try {
    const { event_type, event_data, page } = req.body;
    if (!event_type) {
      return res.status(400).json({ error: { message: 'event_type is required' } });
    }
    const event = await BehaviorEvent.create({
      user_id: req.params.userId,
      event_type,
      event_data,
      page,
    });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
