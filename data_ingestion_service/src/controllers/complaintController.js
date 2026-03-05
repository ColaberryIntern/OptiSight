const complaintService = require('../services/complaintService');

/**
 * POST /api/v1/data/complaints
 * Submit a new complaint.
 */
async function submitComplaint(req, res, next) {
  try {
    const { category, description, region, storeId, sentiment, metadata } = req.body;
    const userId = req.user ? req.user.userId : null;

    const result = await complaintService.submitComplaint({
      userId,
      storeId,
      category,
      description,
      region,
      sentiment,
      metadata,
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/data/complaints
 * Get complaints with optional filters.
 */
async function getComplaints(req, res, next) {
  try {
    const { region, category, status, page, limit } = req.query;

    const result = await complaintService.getComplaints({
      region,
      category,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitComplaint,
  getComplaints,
};
