const db = require('../config/db');
const { logger } = require('@retail-insight/shared');

/**
 * Parse a period string like "7d", "30d", "90d" into the start date.
 * @param {string} period - Period string (e.g., "7d", "30d", "90d")
 * @returns {Date} The start date for the period
 */
function getStartDate(period) {
  const match = period.match(/^(\d+)d$/);
  if (!match) {
    throw Object.assign(new Error(`Invalid period format: ${period}. Use "7d", "30d", or "90d".`), { statusCode: 400 });
  }

  const days = parseInt(match[1], 10);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get dashboard performance metrics.
 *
 * @param {Object} params
 * @param {string} [params.period="30d"] - Time period ("7d", "30d", "90d")
 * @param {string} [params.storeId] - Optional store UUID to filter by
 * @returns {Promise<Object>} Aggregated performance metrics
 */
async function getPerformanceMetrics({ period = '30d', storeId } = {}) {
  const startDate = getStartDate(period);

  logger.info({ message: 'Fetching performance metrics', period, storeId, startDate: startDate.toISOString() });

  // Base query builder that applies common filters
  function baseQuery() {
    let query = db('transactions').where('transaction_date', '>=', startDate);
    if (storeId) {
      query = query.andWhere('store_id', storeId);
    }
    return query;
  }

  // 1. Summary aggregates: totalRevenue, transactionCount, averageOrderValue
  const [summary] = await baseQuery()
    .select(
      db.raw('COALESCE(SUM(total_amount), 0) as "totalRevenue"'),
      db.raw('COUNT(*)::int as "transactionCount"'),
      db.raw('COALESCE(AVG(total_amount), 0) as "averageOrderValue"')
    );

  // 2. Customer count: distinct non-null user_id values
  const [customerRow] = await baseQuery()
    .whereNotNull('user_id')
    .select(db.raw('COUNT(DISTINCT user_id)::int as "customerCount"'));

  // 3. Top products by revenue via JSONB parsing
  // Unnest the items JSONB array, join with products table for authoritative name
  let topProductsQuery = db
    .with('line_items', (qb) => {
      let inner = qb
        .select(
          db.raw("jsonb_array_elements(items) ->> 'product_id' as product_id"),
          db.raw("jsonb_array_elements(items) ->> 'product_name' as item_product_name"),
          db.raw("(jsonb_array_elements(items) ->> 'quantity')::int as quantity"),
          db.raw("(jsonb_array_elements(items) ->> 'line_total')::numeric as line_total")
        )
        .from('transactions')
        .where('transaction_date', '>=', startDate);

      if (storeId) {
        inner = inner.andWhere('store_id', storeId);
      }
    })
    .select(
      'line_items.product_id as productId',
      db.raw('COALESCE(p.product_name, line_items.item_product_name, \'Unknown Product\') as "productName"'),
      db.raw('SUM(line_items.quantity)::int as "totalSold"'),
      db.raw('ROUND(SUM(line_items.line_total), 2) as revenue')
    )
    .from('line_items')
    .leftJoin('products as p', 'p.product_id', db.raw('line_items.product_id::uuid'))
    .groupBy('line_items.product_id', 'p.product_name', 'line_items.item_product_name')
    .orderBy('revenue', 'desc')
    .limit(10);

  const topProducts = await topProductsQuery;

  // 4. Revenue by day
  const revenueByDay = await baseQuery()
    .select(
      db.raw('DATE(transaction_date) as date'),
      db.raw('ROUND(SUM(total_amount), 2) as revenue')
    )
    .groupByRaw('DATE(transaction_date)')
    .orderBy('date', 'asc');

  // Format numeric outputs
  const result = {
    totalRevenue: parseFloat(Number(summary.totalRevenue).toFixed(2)),
    transactionCount: summary.transactionCount,
    averageOrderValue: parseFloat(Number(summary.averageOrderValue).toFixed(2)),
    customerCount: customerRow.customerCount,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      totalSold: p.totalSold,
      revenue: parseFloat(Number(p.revenue).toFixed(2)),
    })),
    revenueByDay: revenueByDay.map((r) => ({
      date: typeof r.date === 'string' ? r.date : r.date.toISOString().split('T')[0],
      revenue: parseFloat(Number(r.revenue).toFixed(2)),
    })),
  };

  logger.info({
    message: 'Performance metrics computed',
    totalRevenue: result.totalRevenue,
    transactionCount: result.transactionCount,
  });

  return result;
}

module.exports = {
  getPerformanceMetrics,
};
