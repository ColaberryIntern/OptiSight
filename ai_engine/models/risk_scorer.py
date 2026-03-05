"""
Composite Risk Scorer for Store Health Assessment.

Computes a weighted risk score (0-100) from multiple operational signals:
complaint velocity, revenue trend, inventory health, employee turnover,
and exam conversion rate. Fetches data from PostgreSQL materialized views
and returns risk level classifications with contributing factor breakdown.
"""

import os
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Risk weight configuration
RISK_WEIGHTS = {
    'complaint_velocity': 0.25,
    'revenue_trend': 0.25,
    'inventory_health': 0.20,
    'employee_turnover': 0.15,
    'exam_conversion': 0.15,
}

# Risk level thresholds
RISK_LEVELS = [
    (80, 'critical'),
    (60, 'high'),
    (40, 'medium'),
    (0, 'low'),
]


def _get_db_connection():
    """Create a psycopg2 connection using DATABASE_URL env var."""
    import psycopg2
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://retail_insight:changeme@postgres:5432/retail_insight'
    )
    return psycopg2.connect(database_url)


def _classify_risk(score):
    """
    Classify a numeric risk score into a risk level string.

    Args:
        score: Risk score from 0 to 100.

    Returns:
        One of 'critical', 'high', 'medium', 'low'.
    """
    for threshold, level in RISK_LEVELS:
        if score >= threshold:
            return level
    return 'low'


class RiskScorer:
    """Composite risk scoring model for store health assessment.

    Combines five operational signals into a single risk score (0-100):
    - Complaint velocity (25%): Rate of complaints relative to norm
    - Revenue trend (25%): Negative revenue trend increases risk
    - Inventory health (20%): Stockout/overstock ratio
    - Employee turnover (15%): Staff churn rate
    - Exam conversion (15%): Low conversion rate increases risk

    Each component is normalized to 0-100 where higher = more risky,
    then combined using the configured weights.
    """

    def __init__(self, weights=None):
        """
        Initialize the risk scorer.

        Args:
            weights: Optional dict overriding default risk factor weights.
                     Must sum to 1.0. Keys: complaint_velocity, revenue_trend,
                     inventory_health, employee_turnover, exam_conversion.
        """
        self.weights = weights or RISK_WEIGHTS.copy()

        # Validate weights sum to 1.0
        weight_sum = sum(self.weights.values())
        if abs(weight_sum - 1.0) > 0.01:
            logger.warning(
                'Risk weights sum to %.3f, expected 1.0. Normalizing.',
                weight_sum,
            )
            for key in self.weights:
                self.weights[key] /= weight_sum

    def score(self, store_id=None):
        """
        Compute risk scores for one or all stores from database data.

        Fetches data from materialized views and computes composite risk scores.

        Args:
            store_id: Optional store UUID. If provided, returns score for that
                      store only. If None, returns scores for all stores.

        Returns:
            List of dicts:
            [
                {
                    "store_id": "uuid",
                    "risk_score": float (0-100),
                    "risk_level": "critical" | "high" | "medium" | "low",
                    "contributing_factors": {
                        "complaint_velocity": {"score": float, "weight": float, "weighted_score": float},
                        ...
                    }
                },
                ...
            ]
        """
        data = self._fetch_risk_data(store_id)

        if data.empty:
            logger.warning('No risk data available')
            return []

        return self._compute_scores(data)

    def score_all(self):
        """
        Compute risk scores for all stores.

        Convenience alias for score(store_id=None).

        Returns:
            Same as score() for all stores, sorted by risk_score descending.
        """
        results = self.score(store_id=None)
        results.sort(key=lambda x: x['risk_score'], reverse=True)
        return results

    def score_from_data(self, data):
        """
        Compute risk scores from a pre-loaded DataFrame (for testing/offline use).

        Args:
            data: DataFrame with store features. Expected columns vary by
                  available materialized views.

        Returns:
            Same format as score().
        """
        if data is None or data.empty:
            return []
        return self._compute_scores(data)

    def _compute_scores(self, data):
        """
        Compute composite risk scores from a features DataFrame.

        Each risk component is computed using available columns, normalized
        to 0-100, then combined using the configured weights.

        Args:
            data: DataFrame with store features.

        Returns:
            List of risk score dicts.
        """
        results = []

        for _, row in data.iterrows():
            store_id = str(row.get('store_id', 'unknown'))
            factors = {}

            # 1. Complaint velocity: higher complaint rate = higher risk
            complaint_score = self._score_complaint_velocity(row, data)
            factors['complaint_velocity'] = {
                'score': round(complaint_score, 2),
                'weight': self.weights['complaint_velocity'],
                'weighted_score': round(
                    complaint_score * self.weights['complaint_velocity'], 2
                ),
            }

            # 2. Revenue trend: declining revenue = higher risk
            revenue_score = self._score_revenue_trend(row, data)
            factors['revenue_trend'] = {
                'score': round(revenue_score, 2),
                'weight': self.weights['revenue_trend'],
                'weighted_score': round(
                    revenue_score * self.weights['revenue_trend'], 2
                ),
            }

            # 3. Inventory health: poor inventory metrics = higher risk
            inventory_score = self._score_inventory_health(row, data)
            factors['inventory_health'] = {
                'score': round(inventory_score, 2),
                'weight': self.weights['inventory_health'],
                'weighted_score': round(
                    inventory_score * self.weights['inventory_health'], 2
                ),
            }

            # 4. Employee turnover: high turnover = higher risk
            turnover_score = self._score_employee_turnover(row, data)
            factors['employee_turnover'] = {
                'score': round(turnover_score, 2),
                'weight': self.weights['employee_turnover'],
                'weighted_score': round(
                    turnover_score * self.weights['employee_turnover'], 2
                ),
            }

            # 5. Exam conversion: low conversion = higher risk
            conversion_score = self._score_exam_conversion(row, data)
            factors['exam_conversion'] = {
                'score': round(conversion_score, 2),
                'weight': self.weights['exam_conversion'],
                'weighted_score': round(
                    conversion_score * self.weights['exam_conversion'], 2
                ),
            }

            # Composite risk score
            composite = sum(f['weighted_score'] for f in factors.values())
            composite = max(0, min(100, composite))

            results.append({
                'store_id': store_id,
                'risk_score': round(composite, 2),
                'risk_level': _classify_risk(composite),
                'contributing_factors': factors,
            })

        return results

    def _score_complaint_velocity(self, row, data):
        """
        Score complaint velocity risk (0-100).

        Uses complaint count or complaint density relative to the population.
        Higher complaint rate relative to peers = higher risk score.
        """
        # Try various column names that might hold complaint data
        for col in ['complaint_count', 'complaints_30d', 'complaint_density',
                     'total_complaints']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                col_values = data[col].fillna(0).values.astype(float)
                return self._percentile_score(value, col_values)

        return 50.0  # Neutral if no complaint data available

    def _score_revenue_trend(self, row, data):
        """
        Score revenue trend risk (0-100).

        Declining revenue yields a higher risk score. Uses revenue change
        percentage or compares recent to historical revenue.
        """
        # Revenue growth columns (negative growth = higher risk)
        for col in ['revenue_change_pct', 'revenue_trend', 'revenue_growth']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                # Invert: negative growth should give HIGH risk
                return max(0, min(100, 50 - value))

        # Absolute revenue columns (lower = higher risk)
        for col in ['revenue_30d', 'total_revenue', 'revenue']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                col_values = data[col].fillna(0).values.astype(float)
                # Invert: low revenue = high risk
                return 100 - self._percentile_score(value, col_values)

        return 50.0

    def _score_inventory_health(self, row, data):
        """
        Score inventory health risk (0-100).

        High stockout rates or excessive overstock relative to peers = higher risk.
        """
        for col in ['stockout_rate', 'inventory_risk', 'overstock_ratio']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                col_values = data[col].fillna(0).values.astype(float)
                return self._percentile_score(value, col_values)

        # Days of supply: too low or too high is risky
        for col in ['days_of_supply', 'inventory_days']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                # Optimal range: 15-45 days
                if value < 15:
                    return min(100, (15 - value) * 5)
                elif value > 45:
                    return min(100, (value - 45) * 2)
                else:
                    return 10.0  # Low risk if in optimal range

        return 50.0

    def _score_employee_turnover(self, row, data):
        """
        Score employee turnover risk (0-100).

        Higher turnover rate relative to peers = higher risk.
        """
        for col in ['employee_turnover', 'turnover_rate', 'staff_turnover']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                col_values = data[col].fillna(0).values.astype(float)
                return self._percentile_score(value, col_values)

        return 50.0

    def _score_exam_conversion(self, row, data):
        """
        Score exam conversion risk (0-100).

        Lower conversion rate = higher risk.
        """
        for col in ['exam_conversion', 'conversion_rate', 'exam_conversion_rate']:
            if col in data.columns:
                value = float(row.get(col, 0) or 0)
                col_values = data[col].fillna(0).values.astype(float)
                # Invert: low conversion = high risk
                return 100 - self._percentile_score(value, col_values)

        return 50.0

    def _percentile_score(self, value, all_values):
        """
        Convert a value to a 0-100 percentile score relative to the population.

        Args:
            value: The value to score.
            all_values: Array of all values in the population.

        Returns:
            Float from 0 to 100 representing the percentile.
        """
        all_values = np.array(all_values, dtype=float)
        all_values = all_values[~np.isnan(all_values)]

        if len(all_values) == 0:
            return 50.0

        # Percentile rank: what fraction of the population is at or below this value
        percentile = float(np.sum(all_values <= value) / len(all_values)) * 100
        return max(0, min(100, percentile))

    def _fetch_risk_data(self, store_id=None):
        """
        Fetch risk-relevant features from multiple materialized views.

        Joins store_performance_features, inventory_risk_features, and
        complaint_density_features to build a comprehensive risk profile.

        Args:
            store_id: Optional store UUID filter.

        Returns:
            DataFrame with combined risk features per store.
        """
        try:
            conn = _get_db_connection()

            # Primary: store performance features
            query = 'SELECT * FROM store_performance_features'
            if store_id:
                query += ' WHERE store_id = %s'
                df = pd.read_sql(query, conn, params=[store_id])
            else:
                df = pd.read_sql(query, conn)

            if df.empty:
                conn.close()
                return df

            # Try to join inventory risk features
            try:
                inv_query = 'SELECT * FROM inventory_risk_features'
                inv_df = pd.read_sql(inv_query, conn)
                if not inv_df.empty and 'store_id' in inv_df.columns:
                    df = df.merge(inv_df, on='store_id', how='left',
                                  suffixes=('', '_inv'))
            except Exception:
                logger.debug('inventory_risk_features view not available')

            # Try to join complaint density features
            try:
                comp_query = 'SELECT * FROM complaint_density_features'
                comp_df = pd.read_sql(comp_query, conn)
                if not comp_df.empty and 'store_id' in comp_df.columns:
                    df = df.merge(comp_df, on='store_id', how='left',
                                  suffixes=('', '_comp'))
            except Exception:
                logger.debug('complaint_density_features view not available')

            conn.close()
            return df

        except Exception as e:
            logger.error('Failed to fetch risk data: %s', str(e))
            raise RuntimeError(f'Database query failed: {str(e)}') from e
