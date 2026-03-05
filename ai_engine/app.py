"""
OptiSight AI Engine - Flask application.

Exposes /health, /predict, /segment, /cluster-complaints, /optimize-inventory,
and /forecast-sales endpoints (Phase 1).
Phase 2 adds /vector/* endpoints for semantic search and RAG.
Phase 3 adds /ml/* endpoints for anomaly detection, forecasting,
issue clustering, root cause analysis, and risk scoring.
Phase 4 adds /orchestrator/* endpoints for LLM-powered executive intelligence.
"""

import logging
import traceback

import pandas as pd
from flask import Flask, jsonify, request

from models.collaborative_filter import CollaborativeFilter
from middleware.metrics import setup_metrics
from routes.vector_routes import vector_bp
from routes.ml_routes import ml_bp
from routes.orchestrator_routes import orchestrator_bp

app = Flask(__name__)
setup_metrics(app)
app.register_blueprint(vector_bp)
app.register_blueprint(ml_bp)
app.register_blueprint(orchestrator_bp)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)

# ── Background embedding initialization ──
import os
import threading


def _init_embeddings():
    """Populate vector embeddings if empty. Runs in background thread."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("sk-placeholder"):
        logger.warning(
            "OPENAI_API_KEY not set or placeholder — skipping embedding init"
        )
        return
    try:
        from services.embedding_pipeline import (
            generate_store_summaries,
            embed_all_issues,
            embed_store_summaries,
        )
        logger.info("Starting background embedding initialization...")
        gen_stats = generate_store_summaries()
        logger.info("Store summaries: %s", gen_stats)
        issue_stats = embed_all_issues()
        logger.info("Issue embeddings: %s", issue_stats)
        store_stats = embed_store_summaries()
        logger.info("Store embeddings: %s", store_stats)
        logger.info("Background embedding initialization complete")
    except Exception as e:
        logger.warning("Embedding init failed (non-fatal): %s", e)


threading.Thread(target=_init_embeddings, daemon=True).start()


@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({'status': 'ok', 'service': 'ai_engine'})


@app.route('/predict', methods=['POST'])
def predict():
    """
    Generate product recommendations for a user.

    Expects JSON body:
    {
        "user_id": "...",
        "interactions": [
            { "user_id": "...", "product_id": "...", "interaction_score": N },
            ...
        ],
        "n": 5
    }

    Returns:
    {
        "recommendations": [
            { "product_id": "...", "score": 0.85, "reason": "..." },
            ...
        ]
    }
    """
    try:
        data = request.get_json(force=True, silent=True)
        if data is None:
            return jsonify({
                'error': 'Request body must be valid JSON',
            }), 400

        user_id = data.get('user_id')
        interactions = data.get('interactions', [])
        n = data.get('n', 5)

        if not user_id:
            return jsonify({
                'error': 'user_id is required',
            }), 400

        if not isinstance(n, int) or n < 1:
            n = 5

        # If no interactions provided, return empty recommendations
        if not interactions or len(interactions) == 0:
            logger.info('No interactions provided for user %s, returning empty', user_id)
            return jsonify({'recommendations': []})

        # Build DataFrame from interactions
        df = pd.DataFrame(interactions)

        # Validate required columns
        required_cols = {'user_id', 'product_id', 'interaction_score'}
        missing = required_cols - set(df.columns)
        if missing:
            return jsonify({
                'error': f'Interactions missing required fields: {list(missing)}',
            }), 400

        # Ensure interaction_score is numeric
        df['interaction_score'] = pd.to_numeric(df['interaction_score'], errors='coerce').fillna(0)

        # Train the collaborative filter on the provided interactions
        model = CollaborativeFilter()
        model.fit(df)

        # Generate recommendations
        recommendations = model.recommend(user_id, n=n)

        logger.info(
            'Generated %d recommendations for user %s',
            len(recommendations),
            user_id,
        )

        return jsonify({'recommendations': recommendations})

    except Exception as e:
        logger.error('Error in /predict: %s\n%s', str(e), traceback.format_exc())
        return jsonify({
            'error': f'Internal server error: {str(e)}',
        }), 500


@app.route('/segment', methods=['POST'])
def segment_customers():
    """
    Segment customers using K-Means clustering on RFM data.

    Expects JSON body:
    {
        "transactions": [
            { "user_id": "...", "total_amount": 99.99, "transaction_date": "2024-01-01" },
            ...
        ],
        "n_clusters": 4
    }

    Returns:
    {
        "segments": [
            { "user_id": "...", "segment": "Champions", "rfm_scores": { ... } },
            ...
        ],
        "profiles": [
            { "segment": "Champions", "count": 10, "avg_recency": ..., ... },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or 'transactions' not in data:
        return jsonify({'error': 'transactions field is required'}), 400

    transactions = data['transactions']
    if not transactions:
        return jsonify({'segments': [], 'profiles': []}), 200

    n_clusters = data.get('n_clusters', 4)

    try:
        from models.customer_segmentation import CustomerSegmentation

        df = pd.DataFrame(transactions)
        required_cols = ['user_id', 'total_amount', 'transaction_date']
        for col in required_cols:
            if col not in df.columns:
                return jsonify({'error': f'Missing required field: {col}'}), 400

        segmenter = CustomerSegmentation()
        rfm_df = segmenter.compute_rfm(df)

        if rfm_df.empty:
            return jsonify({'segments': [], 'profiles': []}), 200

        segmenter.fit(rfm_df, n_clusters=min(n_clusters, len(rfm_df)))
        segments = segmenter.predict(rfm_df)
        profiles = segmenter.get_segment_profiles()

        return jsonify({
            'segments': segments,
            'profiles': profiles
        }), 200
    except Exception as e:
        logger.error('Error in /segment: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/cluster-complaints', methods=['POST'])
def cluster_complaints():
    """
    Cluster complaint descriptions using TF-IDF + K-Means.

    Expects JSON body:
    {
        "complaints": [
            { "description": "...", "region": "...", "category": "..." },
            ...
        ],
        "n_clusters": 5
    }

    Returns:
    {
        "clusters": [
            { "cluster_id": 0, "top_keywords": [...], "complaint_count": 10,
              "sample_complaints": [...] },
            ...
        ],
        "heatmap": {
            "regions": [...],
            "categories": [...],
            "data": [[...], ...]
        }
    }
    """
    data = request.get_json()
    if not data or 'complaints' not in data:
        return jsonify({'error': 'complaints field is required'}), 400

    complaints = data['complaints']
    if not complaints:
        return jsonify({
            'clusters': [],
            'heatmap': {'regions': [], 'categories': [], 'data': []}
        }), 200

    n_clusters = data.get('n_clusters', 5)

    try:
        from models.complaint_clustering import ComplaintClusterer

        df = pd.DataFrame(complaints)
        if 'description' not in df.columns:
            return jsonify({'error': 'Each complaint must have a description field'}), 400

        clusterer = ComplaintClusterer()
        clusterer.fit(df, n_clusters=n_clusters)
        clusters = clusterer.get_clusters(df)
        heatmap = clusterer.get_regional_heatmap(df)

        return jsonify({
            'clusters': clusters,
            'heatmap': heatmap
        }), 200
    except Exception as e:
        logger.error('Error in /cluster-complaints: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/optimize-inventory', methods=['POST'])
def optimize_inventory():
    """
    Optimize inventory levels using Economic Order Quantity (EOQ).

    Expects JSON body:
    {
        "products": [
            { "product_id": "...", "product_name": "...", "price": 10.0, "inventory_count": 50 },
            ...
        ],
        "transactions": [
            { "items": [...], "transaction_date": "2024-01-01" },
            ...
        ],
        "lead_time_days": 7,
        "ordering_cost": 50,
        "holding_cost_rate": 0.25
    }

    Returns:
    {
        "recommendations": [
            { "product_id": "...", "status": "reorder_now", "eoq": 100, ... },
            ...
        ]
    }
    """
    data = request.get_json()
    if not data or 'products' not in data:
        return jsonify({'error': 'products field is required'}), 400

    products = data['products']
    transactions = data.get('transactions', [])

    try:
        from models.inventory_optimizer import InventoryOptimizer

        products_df = pd.DataFrame(products)
        transactions_df = pd.DataFrame(transactions) if transactions else pd.DataFrame()

        optimizer = InventoryOptimizer()
        recommendations = optimizer.optimize(
            products_df,
            transactions_df,
            lead_time_days=data.get('lead_time_days', 7),
            ordering_cost=data.get('ordering_cost', 50),
            holding_cost_rate=data.get('holding_cost_rate', 0.25),
        )

        return jsonify({'recommendations': recommendations}), 200
    except Exception as e:
        logger.error('Error in /optimize-inventory: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/forecast-sales', methods=['POST'])
def forecast_sales():
    """
    Forecast future sales using Holt's linear exponential smoothing.

    Expects JSON body:
    {
        "time_series": [
            { "date": "2024-01-01", "value": 1000.0 },
            ...
        ],
        "periods": 30
    }

    Returns:
    {
        "forecast": [
            { "date": "2024-02-01", "predicted": 1050.0, "lower": 900.0, "upper": 1200.0 },
            ...
        ],
        "trend": "upward",
        "summary": { ... }
    }
    """
    data = request.get_json()
    if not data or 'time_series' not in data:
        return jsonify({'error': 'time_series field is required'}), 400

    time_series = data['time_series']
    if len(time_series) < 2:
        return jsonify({'error': 'Need at least 2 data points for forecasting'}), 400

    periods = data.get('periods', 30)

    try:
        from models.sales_forecaster import SalesForecaster

        df = pd.DataFrame(time_series)
        if 'date' not in df.columns or 'value' not in df.columns:
            return jsonify({'error': 'Each entry must have date and value fields'}), 400

        forecaster = SalesForecaster()
        forecaster.fit(df)
        forecasts = forecaster.forecast(periods=periods)
        trend = forecaster.detect_trend()
        summary = forecaster.get_summary()

        return jsonify({
            'forecast': forecasts,
            'trend': trend,
            'summary': summary,
        }), 200
    except Exception as e:
        logger.error('Error in /forecast-sales: %s\n%s', str(e), traceback.format_exc())
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
