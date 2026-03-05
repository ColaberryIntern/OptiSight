const axios = require('axios');
const db = require('../config/db');
const { logger } = require('@retail-insight/shared');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Get sales forecast via the AI engine's exponential smoothing model.
 *
 * Aggregates daily revenue from the transactions table, sends the time series
 * to the AI engine /forecast-sales endpoint, and returns forecasted values
 * with confidence intervals and trend detection.
 *
 * @param {string} [storeId] - Optional store UUID to filter transactions by
 * @param {number} [periods=30] - Number of days to forecast
 * @returns {Promise<Object>} Object with forecast array, trend, and summary
 */
async function getSalesForecast(storeId = null, periods = 30) {
  let query = db('transactions')
    .select(db.raw('DATE(transaction_date) as date'))
    .sum('total_amount as value')
    .groupByRaw('DATE(transaction_date)')
    .orderBy('date', 'asc');

  if (storeId) {
    query = query.where('store_id', storeId);
  }

  const timeSeries = await query;

  if (timeSeries.length < 2) {
    logger.info({ message: 'Insufficient data for sales forecast', dataPoints: timeSeries.length });
    return { forecast: [], trend: 'stable', summary: {} };
  }

  logger.info({
    message: 'Requesting sales forecast from AI engine',
    dataPoints: timeSeries.length,
    periods,
    storeId,
  });

  const response = await axios.post(`${AI_ENGINE_URL}/forecast-sales`, {
    time_series: timeSeries.map(row => ({
      date: row.date,
      value: parseFloat(row.value),
    })),
    periods,
  });

  logger.info({
    message: 'Sales forecast complete',
    trend: response.data.trend,
    forecastPoints: response.data.forecast ? response.data.forecast.length : 0,
  });

  return response.data;
}

module.exports = { getSalesForecast };
