const axios = require('axios');
const db = require('../config/db');
const { logger } = require('@retail-insight/shared');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Get inventory optimization recommendations via the AI engine's EOQ model.
 *
 * Fetches all products and recent transactions from the database, sends them
 * to the AI engine /optimize-inventory endpoint, and returns per-product
 * recommendations including EOQ, safety stock, reorder point, and status.
 *
 * @param {string} [storeId] - Optional store UUID to filter transactions by
 * @returns {Promise<Object>} Object with recommendations array
 */
async function getInventoryOptimization(storeId = null) {
  const products = await db('products')
    .select('product_id', 'product_name', 'price', 'inventory_count');

  let transactionQuery = db('transactions').select('items', 'transaction_date');
  if (storeId) {
    transactionQuery = transactionQuery.where('store_id', storeId);
  }
  const transactions = await transactionQuery;

  if (!products.length) {
    return { recommendations: [] };
  }

  logger.info({
    message: 'Requesting inventory optimization from AI engine',
    productCount: products.length,
    transactionCount: transactions.length,
    storeId,
  });

  const response = await axios.post(`${AI_ENGINE_URL}/optimize-inventory`, {
    products: products.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      price: parseFloat(p.price),
      inventory_count: p.inventory_count,
    })),
    transactions: transactions.map(t => ({
      items: typeof t.items === 'string' ? JSON.parse(t.items) : t.items,
      transaction_date: t.transaction_date,
    })),
  });

  logger.info({
    message: 'Inventory optimization complete',
    recommendationCount: response.data.recommendations ? response.data.recommendations.length : 0,
  });

  return response.data;
}

module.exports = { getInventoryOptimization };
