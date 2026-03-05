const ingestionService = require('../services/ingestionService');

/**
 * POST /api/v1/data/ingest
 * Ingest a new transaction.
 */
async function ingestData(req, res, next) {
  try {
    const { storeId, totalAmount, items, transactionDate } = req.body;
    const userId = req.user ? req.user.userId : null;

    const result = await ingestionService.ingestTransaction({
      storeId,
      totalAmount,
      items,
      transactionDate,
      userId,
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/data/transactions
 * Get paginated transactions with optional filters.
 */
async function getTransactions(req, res, next) {
  try {
    const { page, limit, storeId, startDate, endDate } = req.query;

    const result = await ingestionService.getTransactions({
      page,
      limit,
      storeId,
      startDate,
      endDate,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/data/products
 * Get products with optional search, category filter, and pagination.
 */
async function getProducts(req, res, next) {
  try {
    const { search, category, page, limit } = req.query;
    const result = await ingestionService.getProducts({ search, category, page, limit });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/data/stores
 * Get all active stores.
 */
async function getStores(req, res, next) {
  try {
    const stores = await ingestionService.getStores();
    return res.status(200).json(stores);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  ingestData,
  getTransactions,
  getProducts,
  getStores,
};
