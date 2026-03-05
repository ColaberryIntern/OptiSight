/**
 * Creates materialized views for the OptiSight analytics layer.
 *
 * Four views are created:
 *   1. store_performance_features   — per-store revenue, txn, exam, complaint metrics
 *   2. customer_behavior_features   — per-customer spend, visit, exam history
 *   3. inventory_risk_features      — per-product inventory risk classification
 *   4. complaint_density_features   — per-store/region complaint density & resolution
 *
 * Each view has a unique index to support REFRESH MATERIALIZED VIEW CONCURRENTLY.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // ── 1. Store Performance Features ─────────────────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS store_performance_features AS
    SELECT
      s.store_id,
      s.store_name,
      s.region,
      s.lat,
      s.lng,
      s.store_type,
      COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '30 days'), 0) AS revenue_30d,
      COALESCE(SUM(t.total_amount) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '90 days'), 0) AS revenue_90d,
      COUNT(DISTINCT t.transaction_id) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '30 days') AS txn_count_30d,
      COUNT(DISTINCT t.customer_id) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '30 days') AS customer_count_30d,
      COALESCE(AVG(t.total_amount), 0) AS avg_ticket,
      COUNT(DISTINCT i.complaint_id) FILTER (WHERE i.created_at > NOW() - INTERVAL '30 days') AS complaint_count_30d,
      COUNT(DISTINCT e.exam_id) FILTER (WHERE e.exam_date > NOW() - INTERVAL '30 days') AS exam_count_30d
    FROM stores s
    LEFT JOIN transactions t ON s.store_id = t.store_id
    LEFT JOIN issues i ON s.store_id = i.store_id
    LEFT JOIN eye_exams e ON s.store_id = e.store_id
    GROUP BY s.store_id, s.store_name, s.region, s.lat, s.lng, s.store_type
    WITH DATA;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_store_performance_features_store_id
    ON store_performance_features(store_id);
  `);

  // ── 2. Customer Behavior Features ─────────────────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS customer_behavior_features AS
    SELECT
      c.customer_id,
      c.first_name,
      c.last_name,
      c.insurance_provider,
      COUNT(DISTINCT t.transaction_id) AS total_transactions,
      COALESCE(SUM(t.total_amount), 0) AS total_spend,
      COALESCE(AVG(t.total_amount), 0) AS avg_spend,
      MAX(t.transaction_date) AS last_visit,
      EXTRACT(DAY FROM NOW() - MAX(t.transaction_date)) AS days_since_last_visit,
      COUNT(DISTINCT e.exam_id) AS total_exams,
      MAX(e.exam_date) AS last_exam_date,
      c.preferred_store_id
    FROM customers c
    LEFT JOIN transactions t ON c.customer_id = t.customer_id
    LEFT JOIN eye_exams e ON c.customer_id = e.customer_id
    GROUP BY c.customer_id, c.first_name, c.last_name, c.insurance_provider, c.preferred_store_id
    WITH DATA;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_behavior_features_customer_id
    ON customer_behavior_features(customer_id);
  `);

  // ── 3. Inventory Risk Features ────────────────────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_risk_features AS
    SELECT
      p.product_id,
      p.product_name,
      p.product_type,
      p.brand,
      p.price,
      p.inventory_count,
      COUNT(DISTINCT t.transaction_id) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '90 days') AS sales_90d,
      CASE WHEN COUNT(DISTINCT t.transaction_id) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '90 days') > 0
        THEN p.inventory_count::float / (COUNT(DISTINCT t.transaction_id) FILTER (WHERE t.transaction_date > NOW() - INTERVAL '90 days') / 90.0)
        ELSE 999
      END AS days_of_supply,
      CASE
        WHEN p.inventory_count <= 5 THEN 'critical'
        WHEN p.inventory_count <= 15 THEN 'low'
        WHEN p.inventory_count > 100 THEN 'overstock'
        ELSE 'healthy'
      END AS risk_level
    FROM products p
    LEFT JOIN transactions t ON t.items::text LIKE '%%' || p.product_id::text || '%%'
    GROUP BY p.product_id, p.product_name, p.product_type, p.brand, p.price, p.inventory_count
    WITH DATA;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_risk_features_product_id
    ON inventory_risk_features(product_id);
  `);

  // ── 4. Complaint Density Features ─────────────────────────
  await knex.raw(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS complaint_density_features AS
    SELECT
      COALESCE(i.store_id, '00000000-0000-0000-0000-000000000000'::uuid) AS store_id,
      s.store_name,
      i.region,
      COUNT(*) AS total_issues,
      COUNT(*) FILTER (WHERE i.status = 'open') AS open_issues,
      COUNT(*) FILTER (WHERE i.created_at > NOW() - INTERVAL '30 days') AS issues_30d,
      COUNT(*) FILTER (WHERE i.category = 'Product Quality') AS quality_issues,
      COUNT(*) FILTER (WHERE i.category = 'Customer Service') AS service_issues,
      COALESCE(AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at)) / 3600) FILTER (WHERE i.resolved_at IS NOT NULL), 0) AS avg_resolution_hours,
      COUNT(*) FILTER (WHERE i.escalation_level >= 3) AS high_escalation_count
    FROM issues i
    LEFT JOIN stores s ON i.store_id = s.store_id
    GROUP BY i.store_id, s.store_name, i.region
    WITH DATA;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_complaint_density_features_store_region
    ON complaint_density_features(store_id, region);
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS complaint_density_features CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS inventory_risk_features CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS customer_behavior_features CASCADE');
  await knex.raw('DROP MATERIALIZED VIEW IF EXISTS store_performance_features CASCADE');
};
