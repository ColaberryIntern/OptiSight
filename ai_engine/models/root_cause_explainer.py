"""
Root Cause Explainer using XGBoost + SHAP.

Trains an XGBoost model on store features to predict a target metric (e.g.
revenue, complaints), then uses SHAP TreeExplainer to decompose predictions
into per-feature contributions. This reveals which factors most strongly
drive a store's performance — and in which direction.
"""

import os
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def _get_db_connection():
    """Create a psycopg2 connection using DATABASE_URL env var."""
    import psycopg2
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://retail_insight:changeme@postgres:5432/retail_insight'
    )
    return psycopg2.connect(database_url)


class RootCauseExplainer:
    """XGBoost + SHAP root cause analysis for store metrics.

    Trains a gradient-boosted tree model to predict a target metric from
    store features, then uses SHAP values to explain which features
    contribute most (positively or negatively) to each store's outcome.
    """

    def __init__(self, n_estimators=100, max_depth=6, learning_rate=0.1,
                 random_state=42):
        """
        Initialize the Root Cause Explainer.

        Args:
            n_estimators: Number of boosting rounds. Default 100.
            max_depth: Max tree depth. Default 6.
            learning_rate: Step size shrinkage. Default 0.1.
            random_state: Random seed for reproducibility.
        """
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.random_state = random_state
        self.model = None
        self.explainer = None
        self.feature_names = None
        self.target_metric = None
        self.fitted = False

    def explain(self, target_metric, data=None, store_id=None):
        """
        Train XGBoost on features to predict target_metric, then explain with SHAP.

        Args:
            target_metric: Name of the target column in the data (e.g. 'revenue_30d').
            data: DataFrame with features and the target column. If None, will
                  attempt to load from database.
            store_id: Optional store UUID to get explanation for a specific store.
                      If None, returns explanations for all stores.

        Returns:
            Dict with keys:
            - global_importance: List of {feature, importance, direction} sorted
              by absolute importance (top contributing factors globally).
            - store_explanations: List of dicts per store (or single store):
              {store_id, predicted_value, shap_values: {feature: value, ...},
               top_factors: [{feature, impact, direction}, ...]}
            - model_performance: Dict with training R-squared and feature count.
        """
        import xgboost as xgb
        import shap

        if data is None:
            data = self._fetch_data()

        if data is None or data.empty:
            raise ValueError('No data available for root cause analysis')

        if target_metric not in data.columns:
            raise ValueError(
                f'Target metric "{target_metric}" not found in data columns. '
                f'Available columns: {list(data.columns)}'
            )

        self.target_metric = target_metric

        # Separate store_id column if present
        store_ids_col = None
        if 'store_id' in data.columns:
            store_ids_col = data['store_id'].copy()

        # Prepare features and target
        feature_cols = [
            c for c in data.columns
            if c != target_metric and c != 'store_id'
            and data[c].dtype in [np.float64, np.int64, np.float32, np.int32, float, int]
        ]

        if not feature_cols:
            raise ValueError('No numeric feature columns found for modeling')

        self.feature_names = feature_cols
        X = data[feature_cols].fillna(0).values
        y = data[target_metric].fillna(0).values

        # Train XGBoost
        self.model = xgb.XGBRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            random_state=self.random_state,
            verbosity=0,
        )
        self.model.fit(X, y)
        self.fitted = True

        # Calculate R-squared
        predictions = self.model.predict(X)
        ss_res = np.sum((y - predictions) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        # SHAP explanation
        self.explainer = shap.TreeExplainer(self.model)
        shap_values = self.explainer.shap_values(X)

        # Global feature importance (mean absolute SHAP value)
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        mean_shap = shap_values.mean(axis=0)

        global_importance = []
        for j, feature in enumerate(self.feature_names):
            direction = 'positive' if mean_shap[j] > 0 else 'negative'
            if abs(mean_shap[j]) < 1e-6:
                direction = 'neutral'
            global_importance.append({
                'feature': feature,
                'importance': round(float(mean_abs_shap[j]), 4),
                'mean_shap': round(float(mean_shap[j]), 4),
                'direction': direction,
            })

        global_importance.sort(key=lambda x: x['importance'], reverse=True)

        # Per-store explanations
        store_explanations = []
        for i in range(len(data)):
            row_shap = {}
            top_factors = []

            for j, feature in enumerate(self.feature_names):
                shap_val = float(shap_values[i, j])
                row_shap[feature] = round(shap_val, 4)
                top_factors.append({
                    'feature': feature,
                    'impact': round(abs(shap_val), 4),
                    'direction': 'positive' if shap_val > 0 else 'negative',
                    'shap_value': round(shap_val, 4),
                })

            top_factors.sort(key=lambda x: x['impact'], reverse=True)

            explanation = {
                'predicted_value': round(float(predictions[i]), 4),
                'shap_values': row_shap,
                'top_factors': top_factors[:10],  # Top 10 factors
            }

            if store_ids_col is not None:
                explanation['store_id'] = str(store_ids_col.iloc[i])

            store_explanations.append(explanation)

        # Filter to specific store if requested
        if store_id and store_ids_col is not None:
            store_id_str = str(store_id)
            store_explanations = [
                e for e in store_explanations
                if e.get('store_id') == store_id_str
            ]

        return {
            'global_importance': global_importance[:20],  # Top 20 globally
            'store_explanations': store_explanations,
            'model_performance': {
                'r_squared': round(float(r_squared), 4),
                'n_features': len(self.feature_names),
                'n_samples': len(data),
                'target_metric': target_metric,
            },
        }

    def explain_from_db(self, target_metric, store_id=None):
        """
        Fetch data from the database and run root cause analysis.

        Convenience method that loads store_performance_features from PostgreSQL
        and delegates to explain().

        Args:
            target_metric: Name of the target column to explain.
            store_id: Optional store UUID for store-specific explanation.

        Returns:
            Same as explain().
        """
        data = self._fetch_data()
        return self.explain(target_metric, data=data, store_id=store_id)

    def _fetch_data(self):
        """
        Fetch store performance features from the database.

        Returns:
            DataFrame from the store_performance_features materialized view.
        """
        try:
            conn = _get_db_connection()
            query = 'SELECT * FROM store_performance_features'
            df = pd.read_sql(query, conn)
            conn.close()
            return df
        except Exception as e:
            logger.error('Failed to fetch store performance features: %s', str(e))
            raise RuntimeError(f'Database query failed: {str(e)}') from e
