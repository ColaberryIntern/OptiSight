const segmentationService = require('../services/segmentationService');

/**
 * GET /api/v1/analytics/customer-segmentation
 *
 * Query params:
 *   - storeId: UUID (optional, filter by store)
 *
 * Returns customer segments and segment profiles.
 */
async function getCustomerSegmentation(req, res, next) {
  try {
    const storeId = req.query.storeId || null;

    const result = await segmentationService.getCustomerSegmentation(storeId);

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomerSegmentation,
};
