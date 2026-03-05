const db = require('../config/db');

const TABLE = 'transactions';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Create a new transaction.
 * @param {Object} params
 * @param {string} [params.userId]
 * @param {string} params.storeId
 * @param {number} params.totalAmount
 * @param {string} [params.transactionDate]
 * @param {Array}  [params.items]
 * @returns {Promise<Object>} The created transaction row.
 */
async function create({ userId, storeId, totalAmount, transactionDate, items }) {
  // Guard: only store user_id if it is a valid UUID (column is UUID type)
  const safeUserId = userId && UUID_REGEX.test(userId) ? userId : null;

  const [transaction] = await db(TABLE)
    .insert({
      user_id: safeUserId,
      store_id: storeId,
      total_amount: totalAmount,
      transaction_date: transactionDate || new Date().toISOString(),
      items: JSON.stringify(items || []),
    })
    .returning('*');

  return transaction;
}

/**
 * Find all transactions with pagination and optional filters.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @param {string} [params.storeId]
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @returns {Promise<{data: Array, pagination: {page: number, limit: number, total: number}}>}
 */
async function findAll({ page = 1, limit = 20, storeId, startDate, endDate } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  const query = db(TABLE);

  if (storeId) {
    query.where('store_id', storeId);
  }
  if (startDate) {
    query.where('transaction_date', '>=', startDate);
  }
  if (endDate) {
    query.where('transaction_date', '<=', endDate);
  }

  // Clone query for count before applying pagination
  const countQuery = query.clone().count('* as total').first();
  const dataQuery = query.clone()
    .orderBy('transaction_date', 'desc')
    .limit(limitNum)
    .offset(offset);

  const [countResult, data] = await Promise.all([countQuery, dataQuery]);
  const total = parseInt(countResult.total, 10);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
    },
  };
}

/**
 * Find a single transaction by its ID.
 * @param {string} transactionId
 * @returns {Promise<Object|null>}
 */
async function findById(transactionId) {
  const transaction = await db(TABLE)
    .where('transaction_id', transactionId)
    .first();

  return transaction || null;
}

module.exports = {
  create,
  findAll,
  findById,
};
