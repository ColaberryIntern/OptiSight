const { logger } = require('@retail-insight/shared');
const Complaint = require('../models/Complaint');

/**
 * Submit a new complaint.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.storeId
 * @param {string} params.category
 * @param {string} params.description
 * @param {string} params.region
 * @param {string} [params.sentiment]
 * @param {Object} [params.metadata]
 * @returns {Promise<{complaintId: string, message: string}>}
 */
async function submitComplaint({ userId, storeId, category, description, region, sentiment, metadata }) {
  const complaint = await Complaint.create({
    user_id: userId,
    store_id: storeId || null,
    category,
    description,
    region,
    sentiment: sentiment || null,
    metadata: metadata || {},
  });

  logger.info({
    message: 'Complaint submitted',
    complaintId: complaint.complaint_id,
    category,
    region,
  });

  return {
    complaintId: complaint.complaint_id,
    message: 'Complaint submitted successfully',
  };
}

/**
 * Get complaints with optional filters and pagination.
 * @param {Object} filters
 * @returns {Promise<{complaints: Array, total: number, page: number, limit: number}>}
 */
async function getComplaints(filters) {
  return Complaint.findAll(filters);
}

module.exports = {
  submitComplaint,
  getComplaints,
};
