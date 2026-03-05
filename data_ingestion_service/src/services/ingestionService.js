const { logger } = require('@retail-insight/shared');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Store = require('../models/Store');

/**
 * Ingest a new transaction.
 * Validates that the store exists and that items have the correct format.
 *
 * @param {Object} params
 * @param {string} params.storeId
 * @param {number} params.totalAmount
 * @param {Array}  params.items
 * @param {string} [params.transactionDate]
 * @param {string} [params.userId]
 * @returns {Promise<{transactionId: string, message: string}>}
 */
async function ingestTransaction({ storeId, totalAmount, items, transactionDate, userId }) {
  // Validate store exists
  const store = await Store.findById(storeId);
  if (!store) {
    const error = new Error(`Store with ID '${storeId}' not found`);
    error.statusCode = 404;
    throw error;
  }

  // Validate items format
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id && !item.productId) {
        const error = new Error(`Item at index ${i} is missing product_id`);
        error.statusCode = 400;
        throw error;
      }
      if (item.quantity == null || item.quantity <= 0) {
        const error = new Error(`Item at index ${i} has invalid quantity`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const transaction = await Transaction.create({
    userId: userId || null,
    storeId,
    totalAmount,
    transactionDate: transactionDate || new Date().toISOString(),
    items: items || [],
  });

  logger.info({
    message: 'Transaction ingested',
    transactionId: transaction.transaction_id,
    storeId,
    totalAmount,
  });

  return {
    transactionId: transaction.transaction_id,
    message: 'Transaction ingested successfully',
  };
}

/**
 * Get transactions with pagination and optional filters.
 * @param {Object} filters
 * @returns {Promise<{data: Array, pagination: Object}>}
 */
async function getTransactions(filters) {
  return Transaction.findAll(filters);
}

/**
 * Get products with optional search, category filter, and pagination.
 *
 * @param {Object}  [filters]
 * @param {string}  [filters.search]   - partial match on product_name
 * @param {string}  [filters.category] - exact match on category
 * @param {number}  [filters.page]     - 1-based page number
 * @param {number}  [filters.limit]    - rows per page
 * @returns {Promise<{products: Array, total: number, page: number, limit: number}>}
 */
async function getProducts(filters) {
  return Product.findAll(filters);
}

/**
 * Get all active stores.
 * @returns {Promise<Array>}
 */
async function getStores() {
  return Store.findAll();
}

module.exports = {
  ingestTransaction,
  getTransactions,
  getProducts,
  getStores,
};
