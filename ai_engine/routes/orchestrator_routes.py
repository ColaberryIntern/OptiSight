"""
OptiSight AI Engine — Orchestrator Routes.

Flask Blueprint providing the main LLM orchestration endpoint.
Processes executive questions through intent classification,
plan generation, multi-source data retrieval, and narrative generation.

Endpoints:
    POST /orchestrator/query — Process an executive question
    GET  /orchestrator/executive-summary — Executive KPI header data
    GET  /orchestrator/auto-insights — Auto-surfaced insights for empty canvas
    GET  /orchestrator/store-network — Store network data for left panel
    GET  /orchestrator/store-similarity — Store similarity edges (vector)
    GET  /orchestrator/health — System health check (SQL, ML, Vector, LLM)
"""

import logging
import traceback

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

orchestrator_bp = Blueprint("orchestrator", __name__, url_prefix="/orchestrator")


@orchestrator_bp.route("/query", methods=["POST"])
def query():
    """
    Process an executive question through the LLM orchestration pipeline.

    Request JSON:
        {
            "question": "What is the revenue trend for store X?",
            "user_id": "uuid-string",
            "context": {}  (optional additional context)
        }

    Response JSON:
        {
            "answer": "narrative text",
            "data": { structured data used },
            "visualizations": [
                {
                    "type": "line|bar|heatmap|geo|network|radar|waterfall|forecast_cone|risk_matrix",
                    "data": {},
                    "title": ""
                }
            ],
            "follow_up_questions": ["..."],
            "execution_path": "SQL + ML(anomaly, root_cause) + Vector",
            "sources": ["store_performance_features", "anomaly_detector", "issues"]
        }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        question = data.get("question", "")
        if not question or not question.strip():
            return jsonify({"error": "question field is required and cannot be empty"}), 400

        user_id = data.get("user_id", "")
        if not user_id:
            return jsonify({"error": "user_id field is required"}), 400

        context = data.get("context", {})
        if not isinstance(context, dict):
            context = {}

        from orchestrator.query_engine import process_query

        result = process_query(
            question=question.strip(),
            user_id=user_id,
            context=context,
        )

        return jsonify(result), 200

    except ValueError as e:
        logger.warning("Orchestrator validation error: %s", str(e))
        return jsonify({"error": str(e), "error_type": "validation"}), 400

    except RuntimeError as e:
        logger.error("Orchestrator runtime error: %s", str(e))
        return jsonify({
            "error": f"Service unavailable: {str(e)}",
            "error_type": "ml_failure" if "model" in str(e).lower() else "db_failure",
        }), 503

    except Exception as e:
        logger.error(
            "Orchestrator error: %s\n%s",
            str(e),
            traceback.format_exc(),
        )
        error_str = str(e).lower()
        if "openai" in error_str or "llm" in error_str or "api key" in error_str:
            error_type = "llm_failure"
        elif "psycopg2" in error_str or "database" in error_str:
            error_type = "db_failure"
        elif "timeout" in error_str:
            error_type = "timeout"
        else:
            error_type = "unknown"
        return jsonify({
            "error": f"Internal server error: {str(e)}",
            "error_type": error_type,
        }), 500


@orchestrator_bp.route("/executive-summary", methods=["GET"])
def executive_summary():
    """
    Return deterministic executive KPI data for the header panel.
    No LLM call — purely data-driven from ML models and SQL.

    Response JSON:
        {
            "risk_level": "medium",
            "risk_score": 54.3,
            "active_alerts": 3,
            "revenue_trend_30d": {"delta_pct": -4.2, "direction": "declining"},
            "complaint_spike": {"active": true, "category": "anti-glare", "count": 12},
            "inventory_risk": {"at_risk_stores": 2, "total_stores": 8},
            "forecast_confidence": {"avg_confidence": 0.82}
        }
    """
    try:
        import psycopg2
        import psycopg2.extras
        from orchestrator.query_engine import _get_db_connection

        summary = {
            "risk_level": "low",
            "risk_score": 0,
            "active_alerts": 0,
            "revenue_trend_30d": {"delta_pct": 0, "direction": "stable"},
            "complaint_spike": {"active": False, "category": None, "count": 0},
            "inventory_risk": {"at_risk_stores": 0, "total_stores": 0},
            "forecast_confidence": {"avg_confidence": 0.0},
        }

        # Risk scores
        try:
            from models.risk_scorer import RiskScorer
            scorer = RiskScorer()
            risk_results = scorer.score_all()
            if risk_results:
                avg_risk = sum(r["risk_score"] for r in risk_results) / len(risk_results)
                summary["risk_score"] = round(avg_risk, 1)
                if avg_risk >= 70:
                    summary["risk_level"] = "critical"
                elif avg_risk >= 55:
                    summary["risk_level"] = "high"
                elif avg_risk >= 40:
                    summary["risk_level"] = "medium"
                else:
                    summary["risk_level"] = "low"
                summary["active_alerts"] = sum(
                    1 for r in risk_results if r.get("risk_level") in ("critical", "high")
                )
        except Exception as e:
            logger.warning("Executive summary — risk scoring failed: %s", e)

        # Revenue trend (30d vs prior 30d)
        try:
            conn = _get_db_connection()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT
                        COALESCE(SUM(CASE WHEN transaction_date >= CURRENT_DATE - INTERVAL '30 days'
                                     THEN total_amount ELSE 0 END), 0) AS recent,
                        COALESCE(SUM(CASE WHEN transaction_date >= CURRENT_DATE - INTERVAL '60 days'
                                          AND transaction_date < CURRENT_DATE - INTERVAL '30 days'
                                     THEN total_amount ELSE 0 END), 0) AS prior
                    FROM transactions
                """)
                row = cur.fetchone()
                recent = float(row["recent"])
                prior = float(row["prior"])
                if prior > 0:
                    delta = round((recent - prior) / prior * 100, 1)
                    summary["revenue_trend_30d"] = {
                        "delta_pct": delta,
                        "direction": "growing" if delta > 1 else "declining" if delta < -1 else "stable",
                    }
            conn.close()
        except Exception as e:
            logger.warning("Executive summary — revenue trend failed: %s", e)

        # Complaint spike detection
        try:
            conn = _get_db_connection()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT category, COUNT(*) AS cnt
                    FROM issues
                    WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
                    GROUP BY category
                    ORDER BY cnt DESC
                    LIMIT 1
                """)
                row = cur.fetchone()
                if row and int(row["cnt"]) >= 5:
                    summary["complaint_spike"] = {
                        "active": True,
                        "category": row["category"],
                        "count": int(row["cnt"]),
                    }
            conn.close()
        except Exception as e:
            logger.warning("Executive summary — complaint spike failed: %s", e)

        # Inventory risk
        try:
            conn = _get_db_connection()
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT COUNT(DISTINCT store_id) AS total FROM stores")
                total = int(cur.fetchone()["total"])
                summary["inventory_risk"]["total_stores"] = total

                # Stores with risk_score > 60
                if risk_results:
                    at_risk = sum(1 for r in risk_results if r["risk_score"] > 60)
                    summary["inventory_risk"]["at_risk_stores"] = at_risk
            conn.close()
        except Exception as e:
            logger.warning("Executive summary — inventory risk failed: %s", e)

        # Forecast confidence
        try:
            from models.forecaster import Forecaster
            forecaster = Forecaster()
            fc = forecaster.forecast_from_db(metric="revenue", periods=30)
            if fc and fc.get("forecast"):
                forecasts = fc["forecast"]
                if forecasts:
                    ranges = [
                        (f["upper"] - f["lower"]) for f in forecasts
                        if f.get("upper") and f.get("lower")
                    ]
                    means = [f["predicted"] for f in forecasts if f.get("predicted")]
                    if ranges and means:
                        avg_range = sum(ranges) / len(ranges)
                        avg_pred = sum(means) / len(means)
                        confidence = max(0, min(1, 1 - (avg_range / (avg_pred + 1))))
                        summary["forecast_confidence"]["avg_confidence"] = round(confidence, 2)
        except Exception as e:
            logger.warning("Executive summary — forecast confidence failed: %s", e)

        return jsonify(summary), 200

    except Exception as e:
        logger.error("Executive summary error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": f"Executive summary failed: {str(e)}"}), 500


@orchestrator_bp.route("/auto-insights", methods=["GET"])
def auto_insights():
    """
    Return 3-4 auto-surfaced insight cards for the empty canvas state.
    Each insight includes a chart-ready visualization.

    Response JSON:
        {
            "insights": [
                {
                    "type": "risk_stores",
                    "title": "Top Risk Stores",
                    "summary": "...",
                    "severity": "high",
                    "visualization": {"type": "bar", "data": {...}},
                    "follow_up": "Which stores need immediate attention?"
                }
            ]
        }
    """
    try:
        insights = []

        # Insight 1: Top Risk Stores
        try:
            from models.risk_scorer import RiskScorer
            scorer = RiskScorer()
            risk_results = scorer.score_all()
            if risk_results:
                top_risk = risk_results[:5]
                high_risk_count = sum(
                    1 for r in risk_results
                    if r.get("risk_level") in ("critical", "high")
                )
                labels = [str(r.get("store_id", ""))[:8] for r in top_risk]
                scores = [r["risk_score"] for r in top_risk]
                colors = [
                    "#D93025" if r.get("risk_level") == "critical"
                    else "#F9AB00" if r.get("risk_level") in ("high", "medium")
                    else "#34A853"
                    for r in top_risk
                ]
                insights.append({
                    "type": "risk_stores",
                    "title": "Top Risk Stores",
                    "summary": f"{high_risk_count} store(s) flagged as high or critical risk. "
                               f"Highest risk score: {top_risk[0]['risk_score']:.0f}/100.",
                    "severity": "high" if high_risk_count > 0 else "medium",
                    "visualization": {
                        "type": "bar",
                        "data": {
                            "labels": labels,
                            "datasets": [{
                                "label": "Risk Score",
                                "data": scores,
                                "backgroundColor": colors,
                                "borderRadius": 4,
                            }],
                        },
                    },
                    "follow_up": "Which stores need immediate attention?",
                })
        except Exception as e:
            logger.warning("Auto-insights — risk stores failed: %s", e)

        # Insight 2: Complaint Clusters
        try:
            from models.issue_clusterer import IssueClustered
            clusterer = IssueClustered()
            cluster_result = clusterer.cluster_from_db()
            if cluster_result and cluster_result.get("clusters"):
                clusters = cluster_result["clusters"]
                top_cluster = clusters[0]
                keywords = ", ".join(top_cluster.get("top_keywords", [])[:3])
                insights.append({
                    "type": "complaint_cluster",
                    "title": "Emerging Complaint Pattern",
                    "summary": f"Detected {len(clusters)} distinct complaint clusters. "
                               f"Largest cluster ({top_cluster['issue_count']} issues): {keywords}.",
                    "severity": "medium",
                    "visualization": {
                        "type": "bar",
                        "data": {
                            "labels": [
                                ", ".join(c.get("top_keywords", [])[:2])
                                for c in clusters[:5]
                            ],
                            "datasets": [{
                                "label": "Issues",
                                "data": [c["issue_count"] for c in clusters[:5]],
                                "backgroundColor": "#8E24AA",
                                "borderRadius": 4,
                            }],
                        },
                    },
                    "follow_up": "Are there similar anti-glare complaints across stores?",
                })
        except Exception as e:
            logger.warning("Auto-insights — complaint clusters failed: %s", e)

        # Insight 3: Revenue Anomaly
        try:
            from models.anomaly_detector import AnomalyDetector
            detector = AnomalyDetector()
            anomalies = detector.detect_from_db()
            anomalous = [a for a in anomalies if a.get("is_anomaly")]
            if anomalous:
                top = anomalous[0]
                top_factors = sorted(
                    top.get("feature_contributions", {}).items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:3]
                factor_text = ", ".join(f[0].replace("_", " ") for f in top_factors)
                insights.append({
                    "type": "revenue_anomaly",
                    "title": "Performance Anomaly Detected",
                    "summary": f"{len(anomalous)} store(s) showing anomalous performance. "
                               f"Top contributing factors: {factor_text}.",
                    "severity": "high",
                    "visualization": {
                        "type": "bar",
                        "data": {
                            "labels": [str(a.get("store_id", ""))[:8] for a in anomalous[:5]],
                            "datasets": [{
                                "label": "Anomaly Score",
                                "data": [round(abs(a.get("anomaly_score", 0)) * 100, 1)
                                         for a in anomalous[:5]],
                                "backgroundColor": "#EA4335",
                                "borderRadius": 4,
                            }],
                        },
                    },
                    "follow_up": "What caused the revenue drop in the anomalous stores?",
                })
        except Exception as e:
            logger.warning("Auto-insights — anomaly detection failed: %s", e)

        # Insight 4: Forecast Summary
        try:
            from models.forecaster import Forecaster
            forecaster = Forecaster()
            fc = forecaster.forecast_from_db(metric="revenue", periods=30)
            if fc and fc.get("forecast"):
                forecasts = fc["forecast"]
                trend = fc.get("trend", "stable")
                last_pred = forecasts[-1]["predicted"] if forecasts else 0
                first_pred = forecasts[0]["predicted"] if forecasts else 0
                delta = round(((last_pred - first_pred) / (first_pred + 1)) * 100, 1)
                insights.append({
                    "type": "forecast_deviation",
                    "title": f"30-Day Revenue Forecast ({trend.title()})",
                    "summary": f"Revenue projected to {'increase' if delta > 0 else 'decrease'} "
                               f"by {abs(delta):.1f}% over the next 30 days. Trend: {trend}.",
                    "severity": "low" if trend == "upward" else "medium",
                    "visualization": {
                        "type": "forecast_cone",
                        "data": {
                            "dates": [f["date"] for f in forecasts],
                            "forecast": [f["predicted"] for f in forecasts],
                            "upper": [f["upper"] for f in forecasts],
                            "lower": [f["lower"] for f in forecasts],
                        },
                    },
                    "follow_up": "Forecast Houston revenue for the next 90 days.",
                })
        except Exception as e:
            logger.warning("Auto-insights — forecast failed: %s", e)

        return jsonify({"insights": insights}), 200

    except Exception as e:
        logger.error("Auto-insights error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": f"Auto-insights failed: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# GET /orchestrator/store-network
# ─────────────────────────────────────────────────────────────


@orchestrator_bp.route("/store-network", methods=["GET"])
def store_network():
    """
    Return enriched store data for the left-panel store intelligence network.

    Merges stores table, performance features, risk scores, and anomaly flags
    into a single payload the frontend renders as a D3 force graph.
    """
    try:
        import os
        import psycopg2
        import psycopg2.extras
        from orchestrator.query_engine import _get_db_connection

        conn = _get_db_connection()
        stores_map = {}

        # 1. Base store info
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT store_id, store_name, city, state, region, lat, lng
                FROM stores WHERE is_active = true
            """)
            for row in cur.fetchall():
                sid = str(row["store_id"])
                stores_map[sid] = {
                    "store_id": sid,
                    "store_name": row["store_name"],
                    "city": row.get("city"),
                    "region": row.get("region"),
                    "lat": float(row["lat"]) if row.get("lat") else None,
                    "lng": float(row["lng"]) if row.get("lng") else None,
                    "revenue_30d": 0,
                    "complaint_count": 0,
                    "txn_count": 0,
                    "risk_score": 50,
                    "risk_level": "medium",
                    "anomaly_detected": False,
                    "contributing_factors": {},
                }

        # 2. Performance features
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT store_id,
                       COALESCE(revenue_30d, 0) AS revenue_30d,
                       COALESCE(complaint_count_30d, 0) AS complaint_count,
                       COALESCE(txn_count_30d, 0) AS txn_count
                FROM store_performance_features
            """)
            for row in cur.fetchall():
                sid = str(row["store_id"])
                if sid in stores_map:
                    stores_map[sid]["revenue_30d"] = float(row["revenue_30d"])
                    stores_map[sid]["complaint_count"] = int(row["complaint_count"])
                    stores_map[sid]["txn_count"] = int(row["txn_count"])

        conn.close()

        # 3. Risk scores
        try:
            from models.risk_scorer import RiskScorer
            scorer = RiskScorer()
            risk_results = scorer.score_all()
            for r in risk_results:
                sid = str(r["store_id"])
                if sid in stores_map:
                    stores_map[sid]["risk_score"] = round(r["risk_score"], 1)
                    stores_map[sid]["risk_level"] = r["risk_level"]
                    stores_map[sid]["contributing_factors"] = r.get(
                        "contributing_factors", {}
                    )
        except Exception as e:
            logger.warning("store-network — risk scoring failed: %s", e)

        # 4. Anomaly detection
        try:
            from models.anomaly_detector import AnomalyDetector
            detector = AnomalyDetector()
            anomalies = detector.detect_from_db()
            anomaly_ids = set()
            for a in anomalies:
                if a.get("is_anomaly"):
                    anomaly_ids.add(str(a.get("store_id", "")))
            for sid in anomaly_ids:
                if sid in stores_map:
                    stores_map[sid]["anomaly_detected"] = True
        except Exception as e:
            logger.warning("store-network — anomaly detection failed: %s", e)

        return jsonify({"stores": list(stores_map.values())}), 200

    except Exception as e:
        logger.error("store-network error: %s\n%s", str(e), traceback.format_exc())
        return jsonify({"error": f"Store network failed: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────
# GET /orchestrator/store-similarity
# ─────────────────────────────────────────────────────────────


@orchestrator_bp.route("/store-similarity", methods=["GET"])
def store_similarity():
    """Return similarity edges between stores from vector embeddings."""
    try:
        from services.vector_service import store_similarity_network
        threshold = request.args.get("threshold", 0.5, type=float)
        result = store_similarity_network(threshold=threshold)
        return jsonify(result), 200
    except Exception as e:
        logger.warning("store-similarity failed: %s", e)
        return jsonify({"edges": []}), 200


# ─────────────────────────────────────────────────────────────
# GET /orchestrator/health
# ─────────────────────────────────────────────────────────────


@orchestrator_bp.route("/health", methods=["GET"])
def system_health():
    """
    Comprehensive health check for all system layers.

    Returns individual status for SQL, pgvector, ML models, and LLM.
    """
    import os
    result = {}

    # SQL connectivity
    try:
        import psycopg2
        from orchestrator.query_engine import _get_db_connection
        conn = _get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
        conn.close()
        result["sql"] = {"status": "ok"}
    except Exception as e:
        result["sql"] = {"status": "error", "detail": str(e)[:100]}

    # pgvector extension
    try:
        import psycopg2
        from orchestrator.query_engine import _get_db_connection
        conn = _get_db_connection()
        with conn.cursor() as cur:
            cur.execute(
                "SELECT extname FROM pg_extension WHERE extname = 'vector'"
            )
            row = cur.fetchone()
        conn.close()
        if row:
            result["vector"] = {"status": "ok"}
        else:
            result["vector"] = {"status": "error", "detail": "pgvector not installed"}
    except Exception as e:
        result["vector"] = {"status": "error", "detail": str(e)[:100]}

    # ML models loadable
    try:
        from models.risk_scorer import RiskScorer
        from models.anomaly_detector import AnomalyDetector
        from models.forecaster import Forecaster
        result["ml"] = {"status": "ok"}
    except Exception as e:
        result["ml"] = {"status": "error", "detail": str(e)[:100]}

    # LLM API key
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if api_key and not api_key.startswith("sk-placeholder"):
        result["llm"] = {"status": "ok", "model": "gpt-4o"}
    else:
        result["llm"] = {"status": "error", "detail": "OPENAI_API_KEY not configured"}

    return jsonify(result), 200
