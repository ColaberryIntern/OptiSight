const { Router } = require('express');
const { authMiddleware } = require('@retail-insight/shared');
const recommendationController = require('../controllers/recommendationController');

const router = Router();

// GET /api/v1/recommendations/:userId - Get recommendations (auth required)
router.get(
  '/:userId',
  authMiddleware,
  recommendationController.getRecommendations
);

module.exports = router;
