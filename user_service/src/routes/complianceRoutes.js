const { Router } = require('express');
const { authMiddleware } = require('@retail-insight/shared');
const complianceService = require('../services/complianceService');

const router = Router();

/**
 * GET /api/v1/users/:userId/data-export
 * Protected — exports all user data for GDPR/CCPA data subject access request.
 */
router.get('/:userId/data-export', authMiddleware, async (req, res, next) => {
  try {
    const data = await complianceService.exportUserData(req.params.userId);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/users/:userId/deletion-request
 * Protected — requests account deletion with 30-day grace period.
 */
router.post('/:userId/deletion-request', authMiddleware, async (req, res, next) => {
  try {
    const result = await complianceService.requestDeletion(req.params.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/users/:userId/consent
 * Protected — returns current consent settings.
 */
router.get('/:userId/consent', authMiddleware, async (req, res, next) => {
  try {
    const consent = await complianceService.getConsent(req.params.userId);
    res.json(consent);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/users/:userId/consent
 * Protected — updates consent preferences.
 */
router.put('/:userId/consent', authMiddleware, async (req, res, next) => {
  try {
    const result = await complianceService.updateConsent(req.params.userId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
