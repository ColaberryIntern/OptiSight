const db = require('../config/db');

const TABLE = 'stores';

/**
 * Find all active stores.
 * @returns {Promise<Array>}
 */
async function findAll() {
  return db(TABLE)
    .where('is_active', true)
    .orderBy('store_name', 'asc');
}

/**
 * Find a single store by its ID.
 * @param {string} storeId
 * @returns {Promise<Object|null>}
 */
async function findById(storeId) {
  const store = await db(TABLE)
    .where('store_id', storeId)
    .first();

  return store || null;
}

module.exports = {
  findAll,
  findById,
};
