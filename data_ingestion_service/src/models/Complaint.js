const db = require('../config/db');

const TABLE = 'complaints';

/**
 * Create a new complaint.
 * @param {Object} params
 * @param {string} params.user_id
 * @param {string} params.store_id
 * @param {string} params.category
 * @param {string} params.description
 * @param {string} params.region
 * @param {string} [params.sentiment]
 * @param {Object} [params.metadata]
 * @returns {Promise<Object>}
 */
async function create({ user_id, store_id, category, description, region, sentiment, metadata }) {
  const [complaint] = await db(TABLE)
    .insert({
      user_id,
      store_id,
      category,
      description,
      region,
      sentiment,
      metadata: JSON.stringify(metadata || {}),
    })
    .returning('*');
  return complaint;
}

/**
 * Find all complaints with optional filters and pagination.
 * @param {Object} params
 * @param {string} [params.region]
 * @param {string} [params.category]
 * @param {string} [params.status]
 * @param {number} [params.page=1]
 * @param {number} [params.limit=20]
 * @returns {Promise<{complaints: Array, total: number, page: number, limit: number}>}
 */
async function findAll({ region, category, status, page = 1, limit = 20 } = {}) {
  let query = db(TABLE).orderBy('created_at', 'desc');

  if (region) query = query.where('region', region);
  if (category) query = query.where('category', category);
  if (status) query = query.where('status', status);

  const offset = (page - 1) * limit;
  const complaints = await query.limit(limit).offset(offset);

  let countQuery = db(TABLE).count('* as total');
  if (region) countQuery = countQuery.where('region', region);
  if (category) countQuery = countQuery.where('category', category);
  if (status) countQuery = countQuery.where('status', status);

  const [{ total }] = await countQuery;

  return { complaints, total: parseInt(total), page, limit };
}

/**
 * Find a single complaint by its ID.
 * @param {string} complaintId
 * @returns {Promise<Object|undefined>}
 */
async function findById(complaintId) {
  return db(TABLE).where('complaint_id', complaintId).first();
}

/**
 * Update the status of a complaint.
 * @param {string} complaintId
 * @param {string} status
 * @returns {Promise<Object>}
 */
async function updateStatus(complaintId, status) {
  const updates = { status };
  if (status === 'resolved') {
    updates.resolved_at = new Date();
  }
  const [complaint] = await db(TABLE)
    .where('complaint_id', complaintId)
    .update(updates)
    .returning('*');
  return complaint;
}

module.exports = {
  create,
  findAll,
  findById,
  updateStatus,
};
