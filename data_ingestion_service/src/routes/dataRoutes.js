const { Router } = require('express');
const { body } = require('express-validator');
const {
  authMiddleware,
  roleMiddleware,
  validationMiddleware: { validate },
} = require('@retail-insight/shared');
const dataController = require('../controllers/dataController');
const complaintController = require('../controllers/complaintController');

const router = Router();

// POST /api/v1/data/ingest - Ingest a new transaction (admin/manager only)
router.post(
  '/ingest',
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  [
    body('storeId')
      .notEmpty()
      .withMessage('storeId is required'),
    body('totalAmount')
      .isFloat({ gt: 0 })
      .withMessage('totalAmount must be a positive number'),
    body('items')
      .isArray()
      .withMessage('items must be an array'),
  ],
  validate,
  dataController.ingestData
);

// GET /api/v1/data/transactions - Get paginated transactions (any authenticated user)
router.get(
  '/transactions',
  authMiddleware,
  dataController.getTransactions
);

// GET /api/v1/data/products - Get all products (any authenticated user)
router.get(
  '/products',
  authMiddleware,
  dataController.getProducts
);

// GET /api/v1/data/stores - Get all active stores (any authenticated user)
router.get(
  '/stores',
  authMiddleware,
  dataController.getStores
);

// POST /api/v1/data/complaints - Submit a new complaint (any authenticated user)
router.post(
  '/complaints',
  authMiddleware,
  [
    body('description')
      .notEmpty()
      .withMessage('description is required'),
    body('category')
      .notEmpty()
      .withMessage('category is required'),
    body('region')
      .notEmpty()
      .withMessage('region is required'),
  ],
  validate,
  complaintController.submitComplaint
);

// GET /api/v1/data/complaints - Get complaints with filters (any authenticated user)
router.get(
  '/complaints',
  authMiddleware,
  complaintController.getComplaints
);

module.exports = router;
