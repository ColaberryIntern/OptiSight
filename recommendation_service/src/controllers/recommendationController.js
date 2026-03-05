const recommendationService = require('../services/recommendationService');

/**
 * GET /api/v1/recommendations/:userId
 * Get AI-powered product recommendations for a specific user.
 */
async function getRecommendations(req, res, next) {
  try {
    const { userId } = req.params;
    const n = parseInt(req.query.n, 10) || 5;

    if (!userId) {
      return res.status(400).json({
        error: { code: '400', message: 'userId parameter is required' },
      });
    }

    const recommendations = await recommendationService.getRecommendations(userId, n);

    return res.status(200).json({
      userId,
      recommendations,
      count: recommendations.length,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRecommendations,
};
