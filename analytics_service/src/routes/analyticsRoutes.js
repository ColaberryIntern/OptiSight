const express = require('express');
const { authMiddleware, roleMiddleware, cacheMiddleware } = require('@retail-insight/shared');
const { getRevenueAnomalies, getInventoryOptimization, getSalesForecast, generateReport } = require('../controllers/analyticsController');
const { getCustomerSegmentation } = require('../controllers/segmentationController');
const { getComplaintClusters } = require('../controllers/complaintController');

const router = express.Router();

// GET /api/v1/analytics/revenue-anomalies
// Query params: period (default "30d")
router.get('/revenue-anomalies', authMiddleware, getRevenueAnomalies);

// GET /api/v1/analytics/customer-segmentation
// Query params: storeId (optional)
router.get('/customer-segmentation', authMiddleware, cacheMiddleware('segmentation', 600), getCustomerSegmentation);

// GET /api/v1/analytics/complaint-clusters
// Query params: storeId (optional)
router.get('/complaint-clusters', authMiddleware, cacheMiddleware('complaints', 600), getComplaintClusters);

// GET /api/v1/analytics/inventory-optimization
// Query params: storeId (optional)
router.get('/inventory-optimization', authMiddleware, cacheMiddleware('inventory', 300), getInventoryOptimization);

// GET /api/v1/analytics/sales-forecast
// Query params: storeId (optional), periods (default 30)
router.get('/sales-forecast', authMiddleware, cacheMiddleware('forecast', 600), getSalesForecast);

// POST /api/v1/analytics/generate-report
// Body: { email, type } -- type defaults to 'weekly'
router.post('/generate-report', authMiddleware, roleMiddleware('admin', 'manager'), generateReport);

module.exports = router;
