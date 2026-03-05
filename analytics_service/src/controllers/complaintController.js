const complaintService = require('../services/complaintService');

/**
 * GET /api/v1/analytics/complaint-clusters
 *
 * Query params:
 *   - storeId: Optional store ID filter
 *
 * Returns clustered complaints with regional heatmap data.
 */
async function getComplaintClusters(req, res, next) {
  try {
    const storeId = req.query.storeId || null;

    const result = await complaintService.getComplaintClusters(storeId);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getComplaintClusters,
};
