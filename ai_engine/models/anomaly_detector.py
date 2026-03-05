"""
Anomaly Detection using Isolation Forest.

Detects anomalous store performance patterns from multivariate features
sourced from the store_performance_features materialized view in PostgreSQL.
Provides anomaly scores, boolean flags, and per-feature contribution analysis.
"""

import os
import logging

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


def _get_db_connection():
    """Create a psycopg2 connection using DATABASE_URL env var."""
    import psycopg2
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://retail_insight:changeme@postgres:5432/retail_insight'
    )
    return psycopg2.connect(database_url)


class AnomalyDetector:
    """Isolation Forest anomaly detector for store performance data.

    Uses scikit-learn's IsolationForest to identify stores whose multivariate
    feature profiles deviate significantly from the norm. Returns anomaly scores,
    boolean anomaly flags, and per-feature contribution breakdowns.
    """

    def __init__(self, contamination=0.1, n_estimators=100, random_state=42):
        """
        Initialize the anomaly detector.

        Args:
            contamination: Expected proportion of anomalies (0-0.5). Default 0.1.
            n_estimators: Number of isolation trees. Default 100.
            random_state: Random seed for reproducibility.
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = None
        self.fitted = False

    def fit(self, data):
        """
        Fit the Isolation Forest model on multivariate feature data.

        Args:
            data: pandas DataFrame of numeric features. Non-numeric columns
                  (e.g. store_id) are automatically excluded.

        Returns:
            self
        """
        if data is None or data.empty:
            logger.warning('AnomalyDetector.fit called with empty data')
            self.fitted = False
            return self

        # Separate numeric features
        numeric_df = data.select_dtypes(include=[np.number])
        if numeric_df.empty:
            logger.warning('No numeric features found in data')
            self.fitted = False
            return self

        self.feature_names = list(numeric_df.columns)

        # Scale features
        scaled = self.scaler.fit_transform(numeric_df.fillna(0))

        # Train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            n_jobs=-1,
        )
        self.model.fit(scaled)
        self.fitted = True

        logger.info(
            'AnomalyDetector fitted on %d samples with %d features',
            len(data), len(self.feature_names),
        )
        return self

    def detect(self, data):
        """
        Detect anomalies in new data using the fitted model.

        Args:
            data: pandas DataFrame with the same feature columns used in fit().

        Returns:
            List of dicts, one per row:
            [
                {
                    "anomaly_score": float (-1 to 0, more negative = more anomalous),
                    "is_anomaly": bool,
                    "feature_contributions": {feature_name: contribution_score, ...}
                },
                ...
            ]
        """
        if not self.fitted:
            raise ValueError('Model not fitted. Call fit() first.')

        if data is None or data.empty:
            return []

        numeric_df = data[self.feature_names].fillna(0)
        scaled = self.scaler.transform(numeric_df)

        # Anomaly scores: negative = anomalous, positive = normal
        raw_scores = self.model.decision_function(scaled)
        predictions = self.model.predict(scaled)  # -1 = anomaly, 1 = normal

        results = []
        for i in range(len(data)):
            # Compute per-feature contribution via deviation from mean
            contributions = self._compute_feature_contributions(scaled[i])

            results.append({
                'anomaly_score': round(float(raw_scores[i]), 4),
                'is_anomaly': bool(predictions[i] == -1),
                'feature_contributions': contributions,
            })

        return results

    def detect_from_db(self, store_ids=None):
        """
        Fetch store performance features from the database and run anomaly detection.

        Queries the store_performance_features materialized view, fits the model
        on the full dataset, then returns detection results.

        Args:
            store_ids: Optional list of store UUIDs to filter results.
                       Model is always fitted on all available data.

        Returns:
            List of dicts with store_id and anomaly detection results:
            [
                {
                    "store_id": "uuid",
                    "anomaly_score": float,
                    "is_anomaly": bool,
                    "feature_contributions": {...}
                },
                ...
            ]
        """
        try:
            conn = _get_db_connection()
            query = 'SELECT * FROM store_performance_features'
            df = pd.read_sql(query, conn)
            conn.close()
        except Exception as e:
            logger.error('Failed to fetch store performance features: %s', str(e))
            raise RuntimeError(f'Database query failed: {str(e)}') from e

        if df.empty:
            logger.warning('No data in store_performance_features view')
            return []

        # Preserve store_id for output mapping
        store_id_col = None
        if 'store_id' in df.columns:
            store_id_col = df['store_id'].copy()

        # Fit on all data
        self.fit(df)

        if not self.fitted:
            return []

        # Detect anomalies
        detections = self.detect(df)

        # Attach store_id
        results = []
        for i, detection in enumerate(detections):
            row = {**detection}
            if store_id_col is not None:
                row['store_id'] = str(store_id_col.iloc[i])
            results.append(row)

        # Filter by requested store_ids if provided
        if store_ids:
            store_ids_set = set(str(sid) for sid in store_ids)
            results = [r for r in results if r.get('store_id') in store_ids_set]

        return results

    def _compute_feature_contributions(self, scaled_row):
        """
        Compute per-feature contribution to anomaly score.

        Uses the absolute deviation of each scaled feature from zero (the mean)
        as a proxy for how much each feature contributes to the anomaly.
        Normalizes contributions to sum to 1.0.

        Args:
            scaled_row: 1D numpy array of scaled feature values.

        Returns:
            Dict mapping feature name to normalized contribution score.
        """
        deviations = np.abs(scaled_row)
        total = deviations.sum()

        if total == 0:
            # All features at mean — equal contribution
            n = len(self.feature_names)
            return {name: round(1.0 / n, 4) for name in self.feature_names}

        contributions = {}
        for j, name in enumerate(self.feature_names):
            contributions[name] = round(float(deviations[j] / total), 4)

        return contributions
