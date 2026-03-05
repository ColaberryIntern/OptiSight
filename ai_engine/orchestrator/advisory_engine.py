"""
OptiSight AI Engine — Advisory Engine.

Rule-based + data-driven recommendation engine that generates executive
action items based on risk factors, ML results, and SQL analysis.

Called after step 7 (narrative generation) in the orchestration pipeline.
Returns prioritized recommendations attached to the query response.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Rule Definitions
# ─────────────────────────────────────────────────────────────

_RULES = [
    {
        "condition": lambda risk, ml, sql: _high_complaint_velocity(risk),
        "action": "Review vendor quality and initiate supplier audit",
        "category": "Operations",
        "priority": "high",
        "reasoning": "Complaint velocity is elevated — suggests product or service quality issues.",
    },
    {
        "condition": lambda risk, ml, sql: _revenue_decline(risk),
        "action": "Analyze pricing strategy and promotional effectiveness",
        "category": "Revenue",
        "priority": "high",
        "reasoning": "Revenue trend score is high-risk — indicates declining sales trajectory.",
    },
    {
        "condition": lambda risk, ml, sql: _inventory_risk(risk),
        "action": "Adjust reorder points and review safety stock levels",
        "category": "Inventory",
        "priority": "medium",
        "reasoning": "Inventory health risk is elevated — stockout or overstock conditions detected.",
    },
    {
        "condition": lambda risk, ml, sql: _turnover_risk(risk),
        "action": "Conduct employee retention analysis and schedule stay interviews",
        "category": "HR",
        "priority": "medium",
        "reasoning": "Employee turnover risk is above threshold — retention interventions recommended.",
    },
    {
        "condition": lambda risk, ml, sql: _exam_conversion_low(risk),
        "action": "Review exam-to-purchase conversion funnel and optician upsell training",
        "category": "Customer",
        "priority": "medium",
        "reasoning": "Exam conversion rate is underperforming — potential revenue leakage.",
    },
    {
        "condition": lambda risk, ml, sql: _anomalies_detected(ml),
        "action": "Investigate anomalous store performance for root cause",
        "category": "Operations",
        "priority": "high",
        "reasoning": "ML anomaly detection flagged unusual store behavior.",
    },
    {
        "condition": lambda risk, ml, sql: _complaint_cluster_found(ml),
        "action": "Escalate dominant complaint cluster to product/QA team",
        "category": "Quality",
        "priority": "medium",
        "reasoning": "HDBSCAN clustering identified a recurring complaint pattern.",
    },
    {
        "condition": lambda risk, ml, sql: _forecast_declining(ml),
        "action": "Plan promotional campaigns to counteract projected revenue decline",
        "category": "Revenue",
        "priority": "high",
        "reasoning": "Prophet forecast projects declining revenue trend.",
    },
]


# ─────────────────────────────────────────────────────────────
# Condition Helpers
# ─────────────────────────────────────────────────────────────

def _high_complaint_velocity(risk_results):
    if not risk_results:
        return False
    for r in risk_results:
        factors = r.get("contributing_factors", {})
        cv = factors.get("complaint_velocity", {})
        if cv.get("score", 0) > 70:
            return True
    return False


def _revenue_decline(risk_results):
    if not risk_results:
        return False
    for r in risk_results:
        factors = r.get("contributing_factors", {})
        rt = factors.get("revenue_trend", {})
        if rt.get("score", 0) > 60:
            return True
    return False


def _inventory_risk(risk_results):
    if not risk_results:
        return False
    for r in risk_results:
        factors = r.get("contributing_factors", {})
        ih = factors.get("inventory_health", {})
        if ih.get("score", 0) > 65:
            return True
    return False


def _turnover_risk(risk_results):
    if not risk_results:
        return False
    for r in risk_results:
        factors = r.get("contributing_factors", {})
        et = factors.get("employee_turnover", {})
        if et.get("score", 0) > 60:
            return True
    return False


def _exam_conversion_low(risk_results):
    if not risk_results:
        return False
    for r in risk_results:
        factors = r.get("contributing_factors", {})
        ec = factors.get("exam_conversion", {})
        if ec.get("score", 0) > 55:
            return True
    return False


def _anomalies_detected(ml_results):
    anomalies = ml_results.get("anomaly_detector")
    if not isinstance(anomalies, list):
        return False
    return any(a.get("is_anomaly") for a in anomalies)


def _complaint_cluster_found(ml_results):
    clusters = ml_results.get("issue_clusterer")
    if not isinstance(clusters, dict):
        return False
    cl = clusters.get("clusters", [])
    return len(cl) >= 2


def _forecast_declining(ml_results):
    fc = ml_results.get("forecaster")
    if not isinstance(fc, dict):
        return False
    return fc.get("trend") == "downward"


# ─────────────────────────────────────────────────────────────
# Public Entry Point
# ─────────────────────────────────────────────────────────────

def generate_recommendations(
    risk_results: List[Dict[str, Any]],
    ml_results: Dict[str, Any],
    sql_results: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Evaluate all advisory rules against available data and return
    matching recommendations sorted by priority.

    Args:
        risk_results: List of risk_scorer results (may be empty).
        ml_results: Dict of {model_name: result} from ML execution.
        sql_results: Dict of {template_name: rows} from SQL execution.

    Returns:
        List of recommendation dicts with keys:
        action, priority, category, reasoning.
    """
    recommendations = []

    for rule in _RULES:
        try:
            if rule["condition"](risk_results, ml_results, sql_results):
                recommendations.append({
                    "action": rule["action"],
                    "priority": rule["priority"],
                    "category": rule["category"],
                    "reasoning": rule["reasoning"],
                })
        except Exception as e:
            logger.warning("Advisory rule evaluation failed: %s", e)

    # Sort: high > medium > low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda r: priority_order.get(r["priority"], 9))

    # Cap at 5 recommendations
    return recommendations[:5]
