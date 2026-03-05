const express = require('express');
const { authMiddleware, cacheMiddleware } = require('@retail-insight/shared');
const { getPerformance } = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/v1/dashboard/performance
// Query params: period (default "30d"), storeId (optional)
router.get('/performance', authMiddleware, cacheMiddleware('dashboard', 300), getPerformance);

module.exports = router;
