const analyticsService = require('../services/analyticsService');
const inventoryService = require('../services/inventoryService');
const forecastService = require('../services/forecastService');
const reportGenerator = require('../services/reportGenerator');

/**
 * GET /api/v1/analytics/revenue-anomalies
 *
 * Query params:
 *   - period: "7d" | "30d" | "90d" (default: "30d")
 *
 * Returns detected revenue anomalies for the given period.
 */
async function getRevenueAnomalies(req, res, next) {
  try {
    const period = req.query.period || '30d';

    const result = await analyticsService.detectRevenueAnomalies({ period });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/analytics/inventory-optimization
 *
 * Query params:
 *   - storeId: UUID (optional, filter transactions by store)
 *
 * Returns EOQ-based inventory optimization recommendations.
 */
async function getInventoryOptimization(req, res, next) {
  try {
    const storeId = req.query.storeId || null;

    const result = await inventoryService.getInventoryOptimization(storeId);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/analytics/sales-forecast
 *
 * Query params:
 *   - storeId: UUID (optional, filter transactions by store)
 *   - periods: number (default: 30, number of days to forecast)
 *
 * Returns sales forecast with trend detection and confidence intervals.
 */
async function getSalesForecast(req, res, next) {
  try {
    const storeId = req.query.storeId || null;
    const periods = parseInt(req.query.periods, 10) || 30;

    const result = await forecastService.getSalesForecast(storeId, periods);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/analytics/generate-report
 *
 * Body:
 *   - email: string (optional, sends report to this email)
 *   - type: "weekly" (default)
 *
 * Generates a performance report and optionally emails it.
 */
async function generateReport(req, res, next) {
  try {
    const { email, type } = req.body;
    const report = await reportGenerator.generateWeeklyDigest(email);
    return res.status(200).json({ message: 'Report generated', report });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRevenueAnomalies,
  getInventoryOptimization,
  getSalesForecast,
  generateReport,
};
