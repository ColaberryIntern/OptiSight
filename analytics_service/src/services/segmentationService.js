const axios = require('axios');
const { config, logger } = require('@retail-insight/shared');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || config.serviceUrls.aiEngine;

/**
 * Fetch transactions and call AI engine for customer segmentation.
 *
 * @param {string|null} storeId - Optional store UUID to filter by
 * @returns {Promise<Object>} Segmentation result with segments and profiles
 */
async function getCustomerSegmentation(storeId = null) {
  const db = require('../config/db');

  let query = db('transactions')
    .select('user_id', 'total_amount', 'transaction_date');

  if (storeId) {
    query = query.where('store_id', storeId);
  }

  const transactions = await query;

  if (!transactions.length) {
    return { segments: [], profiles: [] };
  }

  logger.info({
    message: 'Requesting customer segmentation from AI engine',
    transactionCount: transactions.length,
    storeId,
  });

  const response = await axios.post(`${AI_ENGINE_URL}/segment`, {
    transactions: transactions.map(t => ({
      user_id: t.user_id,
      total_amount: parseFloat(t.total_amount),
      transaction_date: t.transaction_date
    }))
  });

  logger.info({
    message: 'Customer segmentation complete',
    segmentCount: response.data.segments ? response.data.segments.length : 0,
  });

  return response.data;
}

module.exports = { getCustomerSegmentation };
