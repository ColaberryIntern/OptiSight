const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const TABLE = 'analytic_results';

/**
 * Create a new analytic result record.
 * @param {Object} params
 * @param {string} params.metric - The metric identifier (e.g., "daily_revenue")
 * @param {number} params.value - The numeric value of the metric
 * @param {Object} [params.metadata={}] - Optional JSONB metadata
 * @returns {Promise<Object>} The inserted record
 */
async function create({ metric, value, metadata = {} }) {
  const [row] = await db(TABLE)
    .insert({
      result_id: uuidv4(),
      metric,
      value,
      metadata: JSON.stringify(metadata),
      calculated_at: new Date().toISOString(),
    })
    .returning('*');

  return row;
}

/**
 * Find the most recent analytic result for a given metric.
 * @param {string} metric - The metric identifier to look up
 * @returns {Promise<Object|null>} The latest result or null
 */
async function findByMetric(metric) {
  const row = await db(TABLE)
    .where({ metric })
    .orderBy('calculated_at', 'desc')
    .first();

  return row || null;
}

module.exports = {
  create,
  findByMetric,
};
