"""
ML Routes Blueprint — Phase 3 ML Intelligence Endpoints.

Exposes REST endpoints for anomaly detection, forecasting, issue clustering,
root cause analysis, and risk scoring. Each endpoint delegates to the
corresponding model class in models/.
"""

import logging
import traceback

from flask import Blueprint, jsonify, request

logger = logging.getLogger(__name__)

ml_bp = Blueprint('ml', __name__, url_prefix='/ml')


@ml_bp.route('/anomaly', methods=['POST'])
def anomaly_detection():
    """
    Run anomaly detection on store performance data.

    Body (optional):
        { "store_ids": ["uuid1", "uuid2", ...] }

    If store_ids is omitted or empty, detects anomalies across all stores.

    Returns:
        {
            "results": [
                {
                    "store_id": "uuid",
                    "anomaly_score": float,
                    "is_anomaly": bool,
                    "feature_contributions": {...}
                },
                ...
            ]
        }
    """
    try:
        from models.anomaly_detector import AnomalyDetector

        data = request.get_json(force=True, silent=True) or {}
        store_ids = data.get('store_ids', None)

        detector = AnomalyDetector()
        results = detector.detect_from_db(store_ids=store_ids)

        return jsonify({'results': results}), 200

    except RuntimeError as e:
        logger.error('Anomaly detection DB error: %s', str(e))
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error('Anomaly detection error: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@ml_bp.route('/forecast', methods=['POST'])
def forecast():
    """
    Run time series forecast for a store metric.

    Body:
        {
            "store_id": "uuid",
            "metric": "revenue",     (optional, default "revenue")
            "periods": 90            (optional, default 90)
        }

    Returns:
        {
            "store_id": "uuid",
            "metric": "revenue",
            "forecast": [...],
            "changepoints": [...],
            "seasonality": {...},
            "trend": "upward" | "downward" | "stable",
            "summary": {...}
        }
    """
    try:
        from models.forecaster import Forecaster

        data = request.get_json(force=True, silent=True) or {}

        store_id = data.get('store_id')
        if not store_id:
            return jsonify({'error': 'store_id is required'}), 400

        metric = data.get('metric', 'revenue')
        periods = data.get('periods', 90)

        if not isinstance(periods, int) or periods < 1:
            periods = 90

        forecaster = Forecaster()
        result = forecaster.forecast_from_db(
            store_id=store_id,
            metric=metric,
            periods=periods,
        )

        return jsonify(result), 200

    except ValueError as e:
        logger.warning('Forecast validation error: %s', str(e))
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        logger.error('Forecast DB error: %s', str(e))
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error('Forecast error: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@ml_bp.route('/cluster', methods=['POST'])
def cluster_issues():
    """
    Run HDBSCAN clustering on issue/complaint descriptions.

    Body (optional):
        {}

    Clusters all issues from the database.

    Returns:
        {
            "clusters": [
                {
                    "cluster_id": int,
                    "top_keywords": [...],
                    "issue_count": int,
                    "sample_issues": [...]
                },
                ...
            ],
            "noise_count": int,
            "total_issues": int,
            "hierarchy": [...]
        }
    """
    try:
        from models.issue_clusterer import IssueClustered

        clusterer = IssueClustered()
        result = clusterer.cluster_from_db()

        return jsonify(result), 200

    except RuntimeError as e:
        logger.error('Issue clustering DB error: %s', str(e))
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error('Issue clustering error: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@ml_bp.route('/root-cause', methods=['POST'])
def root_cause():
    """
    Run root cause analysis using XGBoost + SHAP.

    Body:
        {
            "target_metric": "revenue_30d",
            "store_id": "uuid"              (optional)
        }

    Returns:
        {
            "global_importance": [
                {"feature": "...", "importance": float, "direction": "..."},
                ...
            ],
            "store_explanations": [...],
            "model_performance": {...}
        }
    """
    try:
        from models.root_cause_explainer import RootCauseExplainer

        data = request.get_json(force=True, silent=True) or {}

        target_metric = data.get('target_metric')
        if not target_metric:
            return jsonify({'error': 'target_metric is required'}), 400

        store_id = data.get('store_id', None)

        explainer = RootCauseExplainer()
        result = explainer.explain_from_db(
            target_metric=target_metric,
            store_id=store_id,
        )

        return jsonify(result), 200

    except ValueError as e:
        logger.warning('Root cause validation error: %s', str(e))
        return jsonify({'error': str(e)}), 400
    except RuntimeError as e:
        logger.error('Root cause DB error: %s', str(e))
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error('Root cause error: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500


@ml_bp.route('/risk-score', methods=['POST'])
def risk_score():
    """
    Get composite risk scores for stores.

    Body (optional):
        { "store_id": "uuid" }

    If store_id is omitted, returns scores for all stores sorted by risk.

    Returns:
        {
            "results": [
                {
                    "store_id": "uuid",
                    "risk_score": float (0-100),
                    "risk_level": "critical" | "high" | "medium" | "low",
                    "contributing_factors": {...}
                },
                ...
            ]
        }
    """
    try:
        from models.risk_scorer import RiskScorer

        data = request.get_json(force=True, silent=True) or {}
        store_id = data.get('store_id', None)

        scorer = RiskScorer()

        if store_id:
            results = scorer.score(store_id=store_id)
        else:
            results = scorer.score_all()

        return jsonify({'results': results}), 200

    except RuntimeError as e:
        logger.error('Risk scoring DB error: %s', str(e))
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        logger.error('Risk scoring error: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500
