const db = require('../config/db');

const TABLE = 'products';

/**
 * Find all products with optional search, category filter, and pagination.
 *
 * @param {Object}  [options]
 * @param {string}  [options.search]   - partial match on product_name (case-insensitive)
 * @param {string}  [options.category] - exact match on category
 * @param {number}  [options.page]     - 1-based page number (default 1)
 * @param {number}  [options.limit]    - rows per page (default 50)
 * @returns {Promise<{products: Array, total: number, page: number, limit: number}>}
 */
async function findAll({ search, category, page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  let query = db(TABLE);

  if (search) {
    query = query.whereRaw('LOWER(product_name) LIKE ?', [`%${search.toLowerCase()}%`]);
  }
  if (category) {
    query = query.where('category', category);
  }

  // Clone the query for counting before adding order/limit
  const countResult = await query.clone().count('* as count').first();
  const total = parseInt(countResult.count, 10);

  const products = await query
    .orderBy('product_name', 'asc')
    .limit(limitNum)
    .offset(offset);

  return { products, total, page: pageNum, limit: limitNum };
}

/**
 * Find a single product by its ID.
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
async function findById(productId) {
  const product = await db(TABLE)
    .where('product_id', productId)
    .first();

  return product || null;
}

/**
 * Find products in a given category.
 * @param {string} category
 * @returns {Promise<Array>}
 */
async function findByCategory(category) {
  return db(TABLE)
    .where('category', category)
    .orderBy('product_name', 'asc');
}

module.exports = {
  findAll,
  findById,
  findByCategory,
};
