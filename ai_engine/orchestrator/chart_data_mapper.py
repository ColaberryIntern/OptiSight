"""
OptiSight AI Engine — Chart Data Mapper.

Transforms raw SQL / ML / vector results into chart-ready data structures
matching the frontend chart component contracts. Called as step 8b in the
orchestration pipeline, after visualization recommendation.

Each chart type has a dedicated mapper that returns the exact shape the
corresponding React component expects (see frontend/src/components/Canvas/charts).
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

_CHART_PALETTE = [
    "#4285F4", "#34A853", "#FBBC04", "#EA4335",
    "#8E24AA", "#00ACC1", "#FF7043", "#9E9D24",
]


def _safe_float(val, default=0.0):
    """Coerce a value to float, returning *default* on failure."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _pick(row: dict, *keys, default=None):
    """Return the first non-None value found for the given keys in *row*."""
    for k in keys:
        v = row.get(k)
        if v is not None:
            return v
    return default


# ─────────────────────────────────────────────────────────────
# Line Chart
# ─────────────────────────────────────────────────────────────

def map_line(data_keys: List[str], sql: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{labels, datasets}`` for a LineChart.

    Primary source: revenue_trends SQL rows.
    Fallback: any SQL template whose rows have a date-like column.
    """
    # Try revenue_trends first
    rows = sql.get("revenue_trends", [])
    if not rows:
        # Fallback: any SQL result with a "date" column
        for _, v in sql.items():
            if v and isinstance(v, list) and "date" in (v[0] if v else {}):
                rows = v
                break
    if not rows:
        return None

    # Sort chronologically
    rows = sorted(rows, key=lambda r: str(r.get("date", "")))

    labels = [str(r.get("date", "")) for r in rows]
    metric_keys = [k for k in data_keys if k in rows[0]] if data_keys else []
    if not metric_keys:
        # Auto-detect numeric columns (skip 'date')
        metric_keys = [
            k for k, v in rows[0].items()
            if k != "date" and isinstance(v, (int, float))
        ]
    if not metric_keys:
        metric_keys = ["daily_revenue"]

    datasets = []
    for i, mk in enumerate(metric_keys):
        datasets.append({
            "label": mk.replace("_", " ").title(),
            "data": [_safe_float(r.get(mk)) for r in rows],
            "borderColor": _CHART_PALETTE[i % len(_CHART_PALETTE)],
            "tension": 0.3,
        })

    return {"labels": labels, "datasets": datasets} if datasets else None


# ─────────────────────────────────────────────────────────────
# Bar Chart
# ─────────────────────────────────────────────────────────────

def map_bar(data_keys: List[str], sql: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{labels, datasets}`` for a BarChart.

    Sources: store_performance, top_products, risk_scorer, or any SQL with
    a name + numeric column.
    """
    # Priority 1: risk_scorer ML results → store risk bar chart
    risk = ml.get("risk_scorer")
    if isinstance(risk, list) and risk:
        labels = [r.get("store_id", "")[:8] for r in risk]
        return {
            "labels": labels,
            "datasets": [{
                "label": "Risk Score",
                "data": [_safe_float(r.get("risk_score")) for r in risk],
                "backgroundColor": [
                    "#D93025" if r.get("risk_level") == "critical"
                    else "#F9AB00" if r.get("risk_level") in ("high", "medium")
                    else "#34A853"
                    for r in risk
                ],
                "borderRadius": 4,
            }],
        }

    # Priority 2: top_products SQL
    rows = sql.get("top_products", [])
    if rows:
        labels = [r.get("product_name", f"Product {i+1}") for i, r in enumerate(rows)]
        metric = "total_revenue" if "total_revenue" in rows[0] else "units_sold"
        return {
            "labels": labels,
            "datasets": [{
                "label": metric.replace("_", " ").title(),
                "data": [_safe_float(r.get(metric)) for r in rows],
                "backgroundColor": _CHART_PALETTE[0],
                "borderRadius": 4,
            }],
        }

    # Priority 3: store_performance SQL
    rows = sql.get("store_performance", [])
    if rows:
        labels = [str(r.get("store_id", ""))[:8] for r in rows]
        metric_keys = [k for k in data_keys if k in rows[0]] if data_keys else []
        if not metric_keys:
            metric_keys = [
                k for k, v in rows[0].items()
                if k not in ("store_id", "region") and isinstance(v, (int, float))
            ][:3]
        datasets = []
        for i, mk in enumerate(metric_keys):
            datasets.append({
                "label": mk.replace("_", " ").title(),
                "data": [_safe_float(r.get(mk)) for r in rows],
                "backgroundColor": _CHART_PALETTE[i % len(_CHART_PALETTE)],
                "borderRadius": 4,
            })
        return {"labels": labels, "datasets": datasets} if datasets else None

    # Priority 4: issue_analysis SQL → complaints by category
    rows = sql.get("issue_analysis", [])
    if rows:
        category_counts = {}
        for r in rows:
            cat = r.get("category", "unknown")
            category_counts[cat] = category_counts.get(cat, 0) + 1
        labels = list(category_counts.keys())
        return {
            "labels": labels,
            "datasets": [{
                "label": "Complaint Count",
                "data": list(category_counts.values()),
                "backgroundColor": _CHART_PALETTE[:len(labels)],
                "borderRadius": 4,
            }],
        }

    return None


# ─────────────────────────────────────────────────────────────
# Geo Map
# ─────────────────────────────────────────────────────────────

def map_geo(sql: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{stores: [{name, lat, lng, metrics}]}`` for a GeoMap.

    Requires store_locations SQL or store_performance with lat/lng.
    Enriches with risk scores when available.
    """
    rows = sql.get("store_locations", []) or sql.get("store_performance", [])
    if not rows:
        return None

    # Check rows actually have lat/lng
    if not any(r.get("lat") or r.get("latitude") for r in rows):
        return None

    # Build risk lookup
    risk_lookup = {}
    risk_data = ml.get("risk_scorer")
    if isinstance(risk_data, list):
        for r in risk_data:
            risk_lookup[r.get("store_id")] = r

    # Count complaints per store
    complaint_counts = {}
    issues = sql.get("issue_analysis", [])
    for iss in issues:
        sid = iss.get("store_id")
        if sid:
            complaint_counts[sid] = complaint_counts.get(sid, 0) + 1

    stores = []
    for row in rows:
        sid = row.get("store_id", "")
        lat = _safe_float(_pick(row, "lat", "latitude"))
        lng = _safe_float(_pick(row, "lng", "longitude"))
        if lat == 0.0 and lng == 0.0:
            continue  # Skip rows without valid coordinates

        risk_info = risk_lookup.get(sid, {})
        health = round(100 - _safe_float(risk_info.get("risk_score"), 50))

        stores.append({
            "name": _pick(row, "store_name", "name") or str(sid)[:8],
            "lat": lat,
            "lng": lng,
            "metrics": {
                "revenue": _safe_float(_pick(row, "total_revenue", "revenue")),
                "health": health,
                "complaints": complaint_counts.get(sid, 0),
            },
            "health": health,
        })

    return {"stores": stores} if stores else None


# ─────────────────────────────────────────────────────────────
# Forecast Cone
# ─────────────────────────────────────────────────────────────

def map_forecast(ml: dict) -> Optional[dict]:
    """
    Build ``{dates, actual, forecast, upper, lower}`` for a ForecastCone.

    Source: forecaster ML result.
    """
    fc = ml.get("forecaster")
    if not fc or not isinstance(fc, dict):
        return None

    forecast_rows = fc.get("forecast", [])
    if not forecast_rows:
        return None

    dates = [r.get("date", "") for r in forecast_rows]
    predicted = [_safe_float(r.get("predicted")) for r in forecast_rows]
    upper = [_safe_float(r.get("upper")) for r in forecast_rows]
    lower = [_safe_float(r.get("lower")) for r in forecast_rows]

    result = {"dates": dates, "forecast": predicted, "upper": upper, "lower": lower}

    # If revenue_trends SQL exists, prepend actual historical data
    return result


def map_forecast_with_actuals(sql: dict, ml: dict) -> Optional[dict]:
    """Extended forecast mapper that includes historical actuals from SQL."""
    base = map_forecast(ml)
    if not base:
        return None

    rev_rows = sql.get("revenue_trends", [])
    if rev_rows:
        rev_rows = sorted(rev_rows, key=lambda r: str(r.get("date", "")))
        hist_dates = [str(r.get("date", "")) for r in rev_rows]
        hist_values = [_safe_float(r.get("daily_revenue")) for r in rev_rows]

        # Combine: actuals then forecast
        all_dates = hist_dates + base["dates"]
        actual = hist_values + [None] * len(base["dates"])
        forecast = [None] * len(hist_dates) + base["forecast"]
        upper = [None] * len(hist_dates) + base["upper"]
        lower = [None] * len(hist_dates) + base["lower"]

        return {
            "dates": all_dates,
            "actual": actual,
            "forecast": forecast,
            "upper": upper,
            "lower": lower,
        }

    return base


# ─────────────────────────────────────────────────────────────
# Risk Matrix
# ─────────────────────────────────────────────────────────────

def map_risk(ml: dict) -> Optional[dict]:
    """
    Build ``{items: [{name, likelihood, impact, label}]}`` for a RiskMatrix.

    Source: risk_scorer ML result — maps risk factors to likelihood/impact axes.
    """
    risk_data = ml.get("risk_scorer")
    if not isinstance(risk_data, list) or not risk_data:
        return None

    # Map each store's composite risk to a likelihood/impact point
    items = []
    for r in risk_data:
        score = _safe_float(r.get("risk_score"))
        factors = r.get("contributing_factors", {})

        # Likelihood = average of complaint_velocity + employee_turnover
        # Impact = average of revenue_trend + inventory_health
        likelihood_raw = (
            _safe_float(factors.get("complaint_velocity", {}).get("score"))
            + _safe_float(factors.get("employee_turnover", {}).get("score"))
        ) / 2
        impact_raw = (
            _safe_float(factors.get("revenue_trend", {}).get("score"))
            + _safe_float(factors.get("inventory_health", {}).get("score"))
        ) / 2

        # Scale 0-100 → 0-5
        likelihood = round(likelihood_raw / 20, 1)
        impact = round(impact_raw / 20, 1)

        level = r.get("risk_level", "")
        label = f"{level.upper()}" if level else ""

        items.append({
            "name": str(r.get("store_id", ""))[:8],
            "likelihood": min(likelihood, 5),
            "impact": min(impact, 5),
            "label": label,
        })

    return {"items": items} if items else None


# ─────────────────────────────────────────────────────────────
# Radar Chart
# ─────────────────────────────────────────────────────────────

def map_radar(data_keys: List[str], sql: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{labels, datasets}`` for a RadarChart.

    Source: risk_scorer contributing_factors → multi-metric store profiles.
    """
    risk_data = ml.get("risk_scorer")
    if not isinstance(risk_data, list) or not risk_data:
        return None

    factor_labels = [
        "Revenue", "Complaints", "Inventory", "Turnover", "Exam Conv.",
    ]
    factor_keys = [
        "revenue_trend", "complaint_velocity", "inventory_health",
        "employee_turnover", "exam_conversion",
    ]

    datasets = []
    # Show up to 4 stores to avoid chart clutter
    for i, r in enumerate(risk_data[:4]):
        factors = r.get("contributing_factors", {})
        # Convert risk scores to health (100 - score) for positive framing
        data = [
            round(100 - _safe_float(factors.get(fk, {}).get("score")), 1)
            for fk in factor_keys
        ]
        datasets.append({
            "label": str(r.get("store_id", ""))[:8],
            "data": data,
            "borderColor": _CHART_PALETTE[i % len(_CHART_PALETTE)],
            "backgroundColor": _CHART_PALETTE[i % len(_CHART_PALETTE)] + "33",
        })

    return {"labels": factor_labels, "datasets": datasets} if datasets else None


# ─────────────────────────────────────────────────────────────
# Heatmap
# ─────────────────────────────────────────────────────────────

def map_heatmap(data_keys: List[str], sql: dict) -> Optional[dict]:
    """
    Build ``{rows, columns, values}`` for a HeatmapChart.

    Source: store_performance → stores × metrics matrix.
    """
    perf_rows = sql.get("store_performance", [])
    if not perf_rows:
        return None

    # Row = store, Column = metric
    store_ids = [str(r.get("store_id", ""))[:8] for r in perf_rows]
    # Pick numeric columns as metrics
    metric_keys = [k for k in data_keys if k in perf_rows[0]] if data_keys else []
    if not metric_keys:
        metric_keys = [
            k for k, v in perf_rows[0].items()
            if k not in ("store_id", "region") and isinstance(v, (int, float))
        ][:6]  # Cap at 6 metrics

    if not metric_keys:
        return None

    columns = [mk.replace("_", " ").title() for mk in metric_keys]
    values = []
    for row in perf_rows:
        values.append([_safe_float(row.get(mk)) for mk in metric_keys])

    return {"rows": store_ids, "columns": columns, "values": values}


# ─────────────────────────────────────────────────────────────
# Waterfall Chart
# ─────────────────────────────────────────────────────────────

def map_waterfall(data_keys: List[str], ml: dict) -> Optional[dict]:
    """
    Build ``{steps: [{label, value, type}]}`` for a WaterfallChart.

    Source: root_cause_explainer SHAP values or risk_scorer contributing_factors.
    """
    # Try root_cause_explainer first
    rce = ml.get("root_cause_explainer")
    if isinstance(rce, dict) and rce.get("global_importance"):
        gi = rce["global_importance"]
        # Start with total predicted value
        steps = []
        for f in gi[:8]:  # Top 8 factors
            shap = _safe_float(f.get("mean_shap"))
            steps.append({
                "label": f.get("feature", "").replace("_", " ").title(),
                "value": abs(round(shap, 2)),
                "type": "increase" if shap > 0 else "decrease",
            })
        if steps:
            return {"steps": steps}

    # Fallback: risk_scorer contributing factors for a single store
    risk_data = ml.get("risk_scorer")
    if isinstance(risk_data, list) and risk_data:
        store = risk_data[0]
        factors = store.get("contributing_factors", {})
        steps = [
            {"label": "Total Risk", "value": round(_safe_float(store.get("risk_score")), 1), "type": "total"},
        ]
        for key, factor in factors.items():
            ws = _safe_float(factor.get("weighted_score"))
            steps.append({
                "label": key.replace("_", " ").title(),
                "value": round(ws, 1),
                "type": "increase",
            })
        return {"steps": steps}

    return None


# ─────────────────────────────────────────────────────────────
# Network Graph
# ─────────────────────────────────────────────────────────────

def map_network(vector: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{nodes: [{id, label, group, radius}], links: [{source, target, weight}]}``
    for a NetworkGraph.

    Sources: similar_stores vector search or issue_clusterer.
    """
    # Try similar_stores vector search
    similar = vector.get("similar_stores") or vector.get("similar_issues")
    if similar and isinstance(similar, list):
        nodes = []
        links = []
        seen = set()
        for item in similar:
            sid = str(item.get("store_id", item.get("id", "")))
            if sid and sid not in seen:
                nodes.append({
                    "id": sid,
                    "label": item.get("store_name", sid[:8]),
                    "group": item.get("region", "default"),
                    "radius": 10,
                })
                seen.add(sid)
            # Links from similarity score
            score = _safe_float(item.get("similarity", item.get("score")))
            if score > 0 and len(nodes) > 1:
                links.append({
                    "source": nodes[0]["id"],
                    "target": sid,
                    "weight": round(score, 2),
                })
        if nodes:
            return {"nodes": nodes, "links": links}

    # Fallback: issue_clusterer → clusters as nodes, shared stores as links
    clusters = ml.get("issue_clusterer")
    if isinstance(clusters, dict) and clusters.get("clusters"):
        nodes = []
        for cl in clusters["clusters"]:
            cid = f"cluster-{cl.get('cluster_id', 0)}"
            top_kw = cl.get("top_keywords", [])
            nodes.append({
                "id": cid,
                "label": ", ".join(top_kw[:3]) if top_kw else f"Cluster {cl['cluster_id']}",
                "group": "cluster",
                "radius": min(5 + cl.get("issue_count", 1), 25),
            })
        return {"nodes": nodes, "links": []}

    return None


# ─────────────────────────────────────────────────────────────
# Decomposition Tree
# ─────────────────────────────────────────────────────────────

def map_tree(ml: dict) -> Optional[dict]:
    """
    Build ``{name, value, children}`` for a DecompositionTree.

    Source: root_cause_explainer or risk_scorer factor hierarchy.
    """
    # Try root_cause_explainer
    rce = ml.get("root_cause_explainer")
    if isinstance(rce, dict) and rce.get("store_explanations"):
        explanations = rce["store_explanations"]
        children = []
        for exp in explanations[:5]:  # Top 5 stores
            store_children = []
            for f in exp.get("top_factors", [])[:5]:
                store_children.append({
                    "name": f.get("feature", "").replace("_", " ").title(),
                    "value": round(abs(_safe_float(f.get("impact"))), 4),
                })
            children.append({
                "name": str(exp.get("store_id", ""))[:8],
                "value": round(_safe_float(exp.get("predicted_value")), 2),
                "children": store_children,
            })
        return {
            "name": rce.get("model_performance", {}).get("target_metric", "Root Cause"),
            "children": children,
        }

    # Fallback: risk_scorer hierarchy
    risk_data = ml.get("risk_scorer")
    if isinstance(risk_data, list) and risk_data:
        children = []
        for r in risk_data[:6]:
            factors = r.get("contributing_factors", {})
            factor_children = [
                {
                    "name": k.replace("_", " ").title(),
                    "value": round(_safe_float(v.get("score")), 1),
                }
                for k, v in factors.items()
            ]
            children.append({
                "name": str(r.get("store_id", ""))[:8],
                "value": round(_safe_float(r.get("risk_score")), 1),
                "children": factor_children,
            })
        return {"name": "Risk Decomposition", "children": children}

    return None


# ─────────────────────────────────────────────────────────────
# Root Cause Split Panel
# ─────────────────────────────────────────────────────────────

def map_root_cause_split(sql: dict, ml: dict) -> Optional[dict]:
    """
    Build ``{left: {type, data}, right: {factors}, explanation}``
    for a RootCausePanel.

    Source: root_cause_explainer SHAP values + revenue_trends.
    """
    rce = ml.get("root_cause_explainer")
    if not isinstance(rce, dict):
        return None

    # Right side: SHAP factors
    factors = []
    gi = rce.get("global_importance", [])
    for f in gi[:10]:
        factors.append({
            "feature": f.get("feature", ""),
            "impact": _safe_float(f.get("importance")),
            "direction": f.get("direction", "neutral"),
        })

    # Left side: trend from SQL if available
    left = None
    line_data = map_line([], sql, ml)
    if line_data:
        left = {"type": "line", "data": line_data}

    if not factors:
        return None

    return {
        "left": left,
        "right": {"factors": factors},
        "explanation": f"R² = {rce.get('model_performance', {}).get('r_squared', 'N/A')}",
    }


# ─────────────────────────────────────────────────────────────
# Cluster View
# ─────────────────────────────────────────────────────────────

def map_cluster(ml: dict) -> Optional[dict]:
    """
    Build cluster data for ClusterView component.

    Source: issue_clusterer ML result.
    """
    clusters_result = ml.get("issue_clusterer")
    if not isinstance(clusters_result, dict) or not clusters_result.get("clusters"):
        return None

    clusters = []
    colors = _CHART_PALETTE
    for i, cl in enumerate(clusters_result["clusters"]):
        clusters.append({
            "id": f"cluster-{cl.get('cluster_id', i)}",
            "label": ", ".join(cl.get("top_keywords", [])[:3]),
            "keywords": cl.get("top_keywords", []),
            "count": cl.get("issue_count", 0),
            "color": colors[i % len(colors)],
            "stores": cl.get("complaint_ids", [])[:5],
        })

    return {
        "clusters": clusters,
        "noise_count": clusters_result.get("noise_count", 0),
        "links": [],
    }


# ─────────────────────────────────────────────────────────────
# Mapper Registry
# ─────────────────────────────────────────────────────────────

_MAPPERS = {
    "line": lambda dk, sql, ml, vec: map_line(dk, sql, ml),
    "bar": lambda dk, sql, ml, vec: map_bar(dk, sql, ml),
    "geo": lambda dk, sql, ml, vec: map_geo(sql, ml),
    "forecast_cone": lambda dk, sql, ml, vec: map_forecast_with_actuals(sql, ml),
    "forecast": lambda dk, sql, ml, vec: map_forecast_with_actuals(sql, ml),
    "risk_matrix": lambda dk, sql, ml, vec: map_risk(ml),
    "risk": lambda dk, sql, ml, vec: map_risk(ml),
    "radar": lambda dk, sql, ml, vec: map_radar(dk, sql, ml),
    "heatmap": lambda dk, sql, ml, vec: map_heatmap(dk, sql),
    "waterfall": lambda dk, sql, ml, vec: map_waterfall(dk, ml),
    "network": lambda dk, sql, ml, vec: map_network(vec, ml),
    "decomposition_tree": lambda dk, sql, ml, vec: map_tree(ml),
    "root_cause_split": lambda dk, sql, ml, vec: map_root_cause_split(sql, ml),
    "cluster": lambda dk, sql, ml, vec: map_cluster(ml),
}


# ─────────────────────────────────────────────────────────────
# Public Entry Point
# ─────────────────────────────────────────────────────────────

def prepare_chart_data(
    visualizations: List[Dict[str, Any]],
    structured_data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Attach chart-ready ``data`` to each visualization dict.

    Called after step 8 (recommend_visualizations) in the orchestration
    pipeline.  Mutates *visualizations* in place **and** returns the list
    for convenience.

    Args:
        visualizations: List of ``{type, title, description, data_keys, priority}``
            dicts produced by the LLM visualization step.
        structured_data: ``{sql: {…}, ml: {…}, vector: {…}}`` collected
            during steps 3-5.

    Returns:
        The same *visualizations* list, now with a ``data`` key on each entry
        that the corresponding frontend chart component can render directly.
    """
    sql = structured_data.get("sql", {})
    ml = structured_data.get("ml", {})
    vector = structured_data.get("vector", {})

    for viz in visualizations:
        chart_type = viz.get("type", "")
        data_keys = viz.get("data_keys", [])
        mapper = _MAPPERS.get(chart_type)

        if mapper:
            try:
                chart_data = mapper(data_keys, sql, ml, vector)
                if chart_data:
                    viz["data"] = chart_data
                    logger.info(
                        "Mapped chart data for '%s' (%s): keys=%s",
                        viz.get("title"), chart_type, list(chart_data.keys()),
                    )
                else:
                    logger.warning(
                        "No data produced for chart '%s' (%s)",
                        viz.get("title"), chart_type,
                    )
            except Exception:
                logger.exception(
                    "Error mapping data for chart '%s' (%s)",
                    viz.get("title"), chart_type,
                )
        else:
            logger.warning("No mapper registered for chart type '%s'", chart_type)

    return visualizations
