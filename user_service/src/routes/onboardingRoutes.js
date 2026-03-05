const { Router } = require('express');
const { authMiddleware } = require('@retail-insight/shared');
const OnboardingProgress = require('../models/OnboardingProgress');

const router = Router();

/**
 * GET /api/v1/users/:userId/onboarding
 * Returns onboarding progress for a user.
 */
router.get('/:userId/onboarding', authMiddleware, async (req, res, next) => {
  try {
    const progress = await OnboardingProgress.getOrCreate(req.params.userId);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/users/:userId/onboarding
 * Updates onboarding progress.
 */
router.patch('/:userId/onboarding', authMiddleware, async (req, res, next) => {
  try {
    const { current_step, steps_completed, is_complete } = req.body;
    const updates = {};
    if (current_step !== undefined) updates.current_step = current_step;
    if (steps_completed !== undefined) updates.steps_completed = steps_completed;
    if (is_complete !== undefined) updates.is_complete = is_complete;

    // Ensure record exists
    await OnboardingProgress.getOrCreate(req.params.userId);
    const progress = await OnboardingProgress.update(req.params.userId, updates);
    res.json(progress);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
