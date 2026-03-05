"""
OptiSight AI Engine — Safe SQL Generator.

Provides parameterized query templates for the orchestrator pipeline.
All queries use %s placeholders with parameter tuples for safe execution
via psycopg2. No raw string interpolation is ever used.

Each function returns a (sql_string, params_tuple) pair ready for
cursor.execute(sql, params).
"""

import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


def store_performance(
    store_id: Optional[str] = None,
    region: Optional[str] = None,
) -> Tuple[str, tuple]:
    """
    Query store performance metrics from the materialized view.

    Args:
        store_id: Optional store UUID to filter to a single store.
        region: Optional region name to filter by region.

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    sql = "SELECT * FROM store_performance_features"
    conditions = []
    params = []

    if store_id:
        conditions.append("store_id = %s")
        params.append(store_id)

    if region:
        conditions.append("region = %s")
        params.append(region)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY store_id"

    logger.debug("store_performance SQL: %s, params: %s", sql, params)
    return sql, tuple(params)


def revenue_trends(
    store_id: Optional[str] = None,
    days: int = 90,
) -> Tuple[str, tuple]:
    """
    Query daily revenue trends from transactions.

    Args:
        store_id: Optional store UUID to filter to a single store.
        days: Number of days to look back (default 90).

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    params = []

    sql = """
        SELECT
            DATE(t.transaction_date) AS date,
            SUM(t.total_amount) AS daily_revenue,
            COUNT(*) AS transaction_count,
            AVG(t.total_amount) AS avg_transaction_value
        FROM transactions t
        WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '%s days'
    """
    params.append(days)

    if store_id:
        sql += " AND t.store_id = %s"
        params.append(store_id)

    sql += """
        GROUP BY DATE(t.transaction_date)
        ORDER BY date DESC
    """

    logger.debug("revenue_trends SQL generated, params: %s", params)
    return sql, tuple(params)


def issue_analysis(
    store_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
) -> Tuple[str, tuple]:
    """
    Query issue/complaint data from the issues table.

    Args:
        store_id: Optional store UUID filter.
        status: Optional status filter (open, resolved, pending).
        category: Optional issue category filter.

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    sql = """
        SELECT
            i.complaint_id,
            i.description,
            i.category,
            i.status,
            i.priority,
            i.store_id,
            i.created_at,
            i.resolved_at,
            i.resolution_notes
        FROM issues i
    """
    conditions = []
    params = []

    if store_id:
        conditions.append("i.store_id = %s")
        params.append(store_id)

    if status:
        conditions.append("i.status = %s")
        params.append(status)

    if category:
        conditions.append("i.category = %s")
        params.append(category)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY i.created_at DESC LIMIT 100"

    logger.debug("issue_analysis SQL generated, params: %s", params)
    return sql, tuple(params)


def inventory_status(
    product_type: Optional[str] = None,
    store_id: Optional[str] = None,
) -> Tuple[str, tuple]:
    """
    Query inventory status from the inventory_risk_features materialized view.

    Args:
        product_type: Optional product type/category filter.
        store_id: Optional store UUID filter.

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    sql = "SELECT * FROM inventory_risk_features"
    conditions = []
    params = []

    if store_id:
        conditions.append("store_id = %s")
        params.append(store_id)

    if product_type:
        conditions.append("product_type = %s")
        params.append(product_type)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY store_id"

    logger.debug("inventory_status SQL generated, params: %s", params)
    return sql, tuple(params)


def exam_metrics(
    store_id: Optional[str] = None,
    days: int = 90,
) -> Tuple[str, tuple]:
    """
    Query eye exam metrics from the eye_exams table.

    Args:
        store_id: Optional store UUID filter.
        days: Number of days to look back (default 90).

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    params = []

    sql = """
        SELECT
            e.store_id,
            COUNT(*) AS total_exams,
            COUNT(CASE WHEN e.exam_type = 'comprehensive' THEN 1 END) AS comprehensive_exams,
            COUNT(CASE WHEN e.exam_type = 'contact_lens' THEN 1 END) AS contact_lens_exams,
            AVG(e.exam_fee) AS avg_exam_fee,
            COUNT(DISTINCT e.customer_id) AS unique_patients,
            COUNT(DISTINCT e.employee_id) AS examining_doctors
        FROM eye_exams e
        WHERE e.created_at >= CURRENT_DATE - INTERVAL '%s days'
    """
    params.append(days)

    if store_id:
        sql += " AND e.store_id = %s"
        params.append(store_id)

    sql += " GROUP BY e.store_id ORDER BY total_exams DESC"

    logger.debug("exam_metrics SQL generated, params: %s", params)
    return sql, tuple(params)


def customer_metrics(
    store_id: Optional[str] = None,
) -> Tuple[str, tuple]:
    """
    Query customer behavior metrics from the materialized view.

    Args:
        store_id: Optional store UUID filter.

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    sql = "SELECT * FROM customer_behavior_features"
    conditions = []
    params = []

    if store_id:
        conditions.append("store_id = %s")
        params.append(store_id)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY store_id"

    logger.debug("customer_metrics SQL generated, params: %s", params)
    return sql, tuple(params)


def top_products(
    store_id: Optional[str] = None,
    limit: int = 10,
) -> Tuple[str, tuple]:
    """
    Query top products by revenue from transactions.

    Args:
        store_id: Optional store UUID filter.
        limit: Maximum number of products to return (default 10).

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    params = []

    sql = """
        SELECT
            p.product_id,
            p.product_name,
            p.product_type,
            p.price,
            COUNT(t.transaction_id) AS units_sold,
            SUM(t.total_amount) AS total_revenue,
            AVG(t.total_amount) AS avg_sale_value
        FROM products p
        JOIN transactions t ON t.product_id = p.product_id
    """

    conditions = []
    if store_id:
        conditions.append("t.store_id = %s")
        params.append(store_id)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += """
        GROUP BY p.product_id, p.product_name, p.product_type, p.price
        ORDER BY total_revenue DESC
        LIMIT %s
    """
    params.append(limit)

    logger.debug("top_products SQL generated, params: %s", params)
    return sql, tuple(params)


def store_locations(
    store_id: Optional[str] = None,
    region: Optional[str] = None,
) -> Tuple[str, tuple]:
    """
    Query store locations with coordinates for geo visualization.

    Args:
        store_id: Optional store UUID filter.
        region: Optional region name filter.

    Returns:
        Tuple of (sql_string, params_tuple).
    """
    sql = """
        SELECT
            s.store_id,
            s.store_name,
            s.lat,
            s.lng,
            s.city,
            s.state,
            s.region
        FROM stores s
    """
    conditions = []
    params = []

    if store_id:
        conditions.append("s.store_id = %s")
        params.append(store_id)

    if region:
        conditions.append("s.region = %s")
        params.append(region)

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    sql += " ORDER BY s.store_name"

    logger.debug("store_locations SQL generated, params: %s", params)
    return sql, tuple(params)


# ─────────────────────────────────────────────────────────────
# Template Registry — Maps template names to generator functions
# ─────────────────────────────────────────────────────────────

TEMPLATE_REGISTRY = {
    "store_performance": store_performance,
    "revenue_trends": revenue_trends,
    "issue_analysis": issue_analysis,
    "inventory_status": inventory_status,
    "exam_metrics": exam_metrics,
    "customer_metrics": customer_metrics,
    "top_products": top_products,
    "store_locations": store_locations,
}


def generate_query(template_name: str, params: dict) -> Tuple[str, tuple]:
    """
    Generate a parameterized SQL query from a template name and parameters.

    Args:
        template_name: Name of the query template (must be in TEMPLATE_REGISTRY).
        params: Dictionary of parameters to pass to the template function.

    Returns:
        Tuple of (sql_string, params_tuple).

    Raises:
        ValueError: If template_name is not recognized.
    """
    if template_name not in TEMPLATE_REGISTRY:
        raise ValueError(
            f"Unknown SQL template: '{template_name}'. "
            f"Available templates: {list(TEMPLATE_REGISTRY.keys())}"
        )

    generator_fn = TEMPLATE_REGISTRY[template_name]

    # Filter params to only those accepted by the function
    import inspect
    sig = inspect.signature(generator_fn)
    valid_params = {
        k: v for k, v in params.items()
        if k in sig.parameters and v is not None
    }

    logger.info("Generating SQL for template '%s' with params: %s", template_name, valid_params)
    return generator_fn(**valid_params)
