const dashboardService = require('../services/dashboardService');

/**
 * GET /api/v1/dashboard/performance
 *
 * Query params:
 *   - period: "7d" | "30d" | "90d" (default: "30d")
 *   - storeId: UUID (optional, filter by store)
 *
 * Returns aggregated performance metrics.
 */
async function getPerformance(req, res, next) {
  try {
    const period = req.query.period || '30d';
    const storeId = req.query.storeId || undefined;

    const metrics = await dashboardService.getPerformanceMetrics({ period, storeId });

    return res.status(200).json(metrics);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPerformance,
};
