const db = require('../config/db');
const { logger } = require('@retail-insight/shared');

/**
 * Parse a period string like "7d", "30d", "90d" into a number of days.
 * @param {string} period
 * @returns {number}
 */
function parsePeriodDays(period) {
  const match = period.match(/^(\d+)d$/);
  if (!match) {
    throw Object.assign(new Error(`Invalid period format: ${period}. Use "7d", "30d", or "90d".`), { statusCode: 400 });
  }
  return parseInt(match[1], 10);
}

/**
 * Detect revenue anomalies by comparing the current period's daily revenue
 * against the daily average of an equal-length comparison (previous) period.
 *
 * An anomaly is any day where revenue deviates more than 20% from the
 * comparison period's daily average.
 *
 * @param {Object} params
 * @param {string} [params.period="30d"] - Period to analyze
 * @returns {Promise<Object>} Object with anomalies array
 */
async function detectRevenueAnomalies({ period = '30d' } = {}) {
  const days = parsePeriodDays(period);

  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Current period: [currentStart, now]
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  currentStart.setHours(0, 0, 0, 0);

  // Comparison period: [comparisonStart, currentStart)
  const comparisonStart = new Date(currentStart);
  comparisonStart.setDate(comparisonStart.getDate() - days);

  logger.info({
    message: 'Detecting revenue anomalies',
    period,
    currentStart: currentStart.toISOString(),
    comparisonStart: comparisonStart.toISOString(),
  });

  // Get comparison period daily average revenue
  const [comparisonAgg] = await db('transactions')
    .where('transaction_date', '>=', comparisonStart)
    .andWhere('transaction_date', '<', currentStart)
    .select(
      db.raw('COALESCE(SUM(total_amount), 0) as total'),
      db.raw('COUNT(DISTINCT DATE(transaction_date))::int as day_count')
    );

  const compDayCount = comparisonAgg.day_count || 1;
  const dailyAverage = parseFloat(comparisonAgg.total) / compDayCount;

  if (dailyAverage === 0) {
    logger.info({ message: 'No comparison data available, returning empty anomalies' });
    return { anomalies: [] };
  }

  // Get current period daily revenue
  const currentDailyRevenue = await db('transactions')
    .where('transaction_date', '>=', currentStart)
    .andWhere('transaction_date', '<=', now)
    .select(
      db.raw('DATE(transaction_date) as date'),
      db.raw('COALESCE(SUM(total_amount), 0) as revenue')
    )
    .groupByRaw('DATE(transaction_date)')
    .orderBy('date', 'asc');

  // Identify anomalies: deviation > 20% from comparison daily average
  const anomalies = [];

  for (const row of currentDailyRevenue) {
    const actualRevenue = parseFloat(row.revenue);
    const deviationPercent = ((actualRevenue - dailyAverage) / dailyAverage) * 100;
    const absDeviation = Math.abs(deviationPercent);

    if (absDeviation > 20) {
      const severity = absDeviation > 40 ? 'high' : 'medium';
      const dateStr = typeof row.date === 'string' ? row.date : row.date.toISOString().split('T')[0];

      anomalies.push({
        date: dateStr,
        expectedRevenue: parseFloat(dailyAverage.toFixed(2)),
        actualRevenue: parseFloat(actualRevenue.toFixed(2)),
        deviationPercent: parseFloat(deviationPercent.toFixed(1)),
        severity,
      });
    }
  }

  logger.info({
    message: 'Anomaly detection complete',
    anomalyCount: anomalies.length,
    comparisonDailyAverage: parseFloat(dailyAverage.toFixed(2)),
  });

  return { anomalies };
}

module.exports = {
  detectRevenueAnomalies,
};
