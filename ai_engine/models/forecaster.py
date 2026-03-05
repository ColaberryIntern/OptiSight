"""
Time Series Forecasting using Facebook Prophet.

Provides advanced forecasting with confidence intervals, changepoint detection,
seasonality decomposition, and scenario modeling via external regressors.
This replaces the simpler Holt's smoothing approach from sales_forecaster.py
while keeping that module intact for backward compatibility.
"""

import os
import logging
from datetime import datetime

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


class Forecaster:
    """Prophet-based time series forecaster with scenario modeling.

    Supports univariate forecasting with optional external regressors,
    automatic changepoint detection, and seasonality decomposition.
    Provides confidence intervals and scenario-based what-if analysis.
    """

    def __init__(self, yearly_seasonality=True, weekly_seasonality=True,
                 daily_seasonality=False, changepoint_prior_scale=0.05):
        """
        Initialize the Forecaster.

        Args:
            yearly_seasonality: Enable yearly seasonality. Default True.
            weekly_seasonality: Enable weekly seasonality. Default True.
            daily_seasonality: Enable daily seasonality. Default False.
            changepoint_prior_scale: Flexibility of changepoints. Higher = more flexible.
        """
        self.yearly_seasonality = yearly_seasonality
        self.weekly_seasonality = weekly_seasonality
        self.daily_seasonality = daily_seasonality
        self.changepoint_prior_scale = changepoint_prior_scale
        self.model = None
        self.fitted = False
        self.training_df = None
        self.regressors = []

    def forecast(self, df, periods=90, freq='D', regressors=None,
                 scenario_adjustments=None):
        """
        Fit Prophet on historical data and generate a forecast.

        Args:
            df: DataFrame with columns 'ds' (date) and 'y' (value).
                Alternatively, columns 'date' and 'value' are accepted and
                will be renamed automatically.
            periods: Number of future periods to forecast. Default 90.
            freq: Frequency of the time series ('D', 'W', 'M'). Default 'D'.
            regressors: Optional list of column names in df to use as
                        external regressors.
            scenario_adjustments: Optional dict of {regressor_name: adjustment_value}
                                  for what-if scenario modeling on the forecast period.

        Returns:
            Dict with keys:
            - forecast: List of {date, predicted, lower, upper}
            - changepoints: List of detected changepoint dates
            - seasonality: Dict with yearly, weekly decomposition summaries
            - trend: 'upward', 'downward', or 'stable'
            - summary: Dict with training stats
        """
        from prophet import Prophet

        # Normalize column names
        input_df = df.copy()
        if 'date' in input_df.columns and 'ds' not in input_df.columns:
            input_df = input_df.rename(columns={'date': 'ds'})
        if 'value' in input_df.columns and 'y' not in input_df.columns:
            input_df = input_df.rename(columns={'value': 'y'})

        if 'ds' not in input_df.columns or 'y' not in input_df.columns:
            raise ValueError("DataFrame must have 'ds'/'date' and 'y'/'value' columns")

        input_df['ds'] = pd.to_datetime(input_df['ds'])
        input_df['y'] = pd.to_numeric(input_df['y'], errors='coerce')
        input_df = input_df.dropna(subset=['ds', 'y']).sort_values('ds').reset_index(drop=True)

        if len(input_df) < 2:
            raise ValueError('Need at least 2 data points for forecasting')

        self.training_df = input_df

        # Initialize Prophet
        self.model = Prophet(
            yearly_seasonality=self.yearly_seasonality,
            weekly_seasonality=self.weekly_seasonality,
            daily_seasonality=self.daily_seasonality,
            changepoint_prior_scale=self.changepoint_prior_scale,
        )

        # Add regressors if specified
        self.regressors = regressors or []
        for reg in self.regressors:
            if reg in input_df.columns:
                self.model.add_regressor(reg)

        # Fit model (suppress Prophet's verbose logging)
        import logging as _logging
        prophet_logger = _logging.getLogger('prophet')
        cmdstanpy_logger = _logging.getLogger('cmdstanpy')
        original_prophet_level = prophet_logger.level
        original_cmdstanpy_level = cmdstanpy_logger.level
        prophet_logger.setLevel(_logging.WARNING)
        cmdstanpy_logger.setLevel(_logging.WARNING)

        try:
            self.model.fit(input_df)
        finally:
            prophet_logger.setLevel(original_prophet_level)
            cmdstanpy_logger.setLevel(original_cmdstanpy_level)

        self.fitted = True

        # Generate future dataframe
        future = self.model.make_future_dataframe(periods=periods, freq=freq)

        # Add regressor values to future dataframe
        for reg in self.regressors:
            if reg in input_df.columns:
                # For historical rows, use actual values
                future = future.merge(
                    input_df[['ds', reg]], on='ds', how='left'
                )
                # For future rows, use last known value or apply scenario adjustments
                last_value = float(input_df[reg].iloc[-1])
                if scenario_adjustments and reg in scenario_adjustments:
                    future[reg] = future[reg].fillna(
                        last_value + scenario_adjustments[reg]
                    )
                else:
                    future[reg] = future[reg].fillna(last_value)

        # Predict
        forecast_df = self.model.predict(future)

        # Extract future-only forecast
        last_date = input_df['ds'].max()
        future_mask = forecast_df['ds'] > last_date
        future_forecast = forecast_df[future_mask]

        forecast_list = []
        for _, row in future_forecast.iterrows():
            forecast_list.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'predicted': round(float(row['yhat']), 2),
                'lower': round(float(row['yhat_lower']), 2),
                'upper': round(float(row['yhat_upper']), 2),
            })

        # Changepoints
        changepoints = []
        if hasattr(self.model, 'changepoints') and self.model.changepoints is not None:
            changepoints = [
                cp.strftime('%Y-%m-%d')
                for cp in pd.to_datetime(self.model.changepoints)
            ]

        # Seasonality decomposition summary
        seasonality = self._extract_seasonality(forecast_df)

        # Trend detection
        trend = self._detect_trend(forecast_df, last_date)

        # Training summary
        summary = self._get_summary(input_df)

        return {
            'forecast': forecast_list,
            'changepoints': changepoints,
            'seasonality': seasonality,
            'trend': trend,
            'summary': summary,
        }

    def forecast_from_db(self, store_id, metric='revenue', periods=90):
        """
        Fetch time series data from the database and generate a forecast.

        Queries the store_performance_features or related tables to build a
        time series for the specified store and metric.

        Args:
            store_id: UUID of the store to forecast.
            metric: Metric to forecast (e.g. 'revenue', 'complaints', 'transactions').
                    Default 'revenue'.
            periods: Number of future periods to forecast. Default 90.

        Returns:
            Same as forecast() with an additional 'store_id' key.
        """
        try:
            conn = _get_db_connection()

            # Map metric names to likely database columns
            metric_column_map = {
                'revenue': 'total_amount',
                'transactions': 'transaction_count',
                'complaints': 'complaint_count',
            }
            db_column = metric_column_map.get(metric, metric)

            # Try to query from a daily aggregation table or transactions
            query = """
                SELECT
                    DATE(t.transaction_date) as ds,
                    SUM(t.total_amount) as y
                FROM transactions t
                WHERE t.store_id = %s
                GROUP BY DATE(t.transaction_date)
                ORDER BY ds
            """

            if metric == 'complaints':
                query = """
                    SELECT
                        DATE(c.created_at) as ds,
                        COUNT(*) as y
                    FROM issues c
                    WHERE c.store_id = %s
                    GROUP BY DATE(c.created_at)
                    ORDER BY ds
                """
            elif metric == 'transactions':
                query = """
                    SELECT
                        DATE(t.transaction_date) as ds,
                        COUNT(*) as y
                    FROM transactions t
                    WHERE t.store_id = %s
                    GROUP BY DATE(t.transaction_date)
                    ORDER BY ds
                """

            df = pd.read_sql(query, conn, params=[store_id])
            conn.close()

        except Exception as e:
            logger.error('Failed to fetch time series data: %s', str(e))
            raise RuntimeError(f'Database query failed: {str(e)}') from e

        if df.empty or len(df) < 2:
            raise ValueError(
                f'Insufficient data for store {store_id}, metric {metric}. '
                f'Need at least 2 data points.'
            )

        result = self.forecast(df, periods=periods)
        result['store_id'] = str(store_id)
        result['metric'] = metric
        return result

    def _detect_trend(self, forecast_df, last_date):
        """
        Detect the overall trend direction from the Prophet forecast.

        Examines the trend component over the historical period to determine
        whether the series is trending upward, downward, or remaining stable.

        Args:
            forecast_df: Prophet forecast DataFrame with 'trend' column.
            last_date: Last date in the training data.

        Returns:
            'upward', 'downward', or 'stable'
        """
        if 'trend' not in forecast_df.columns:
            return 'stable'

        historical = forecast_df[forecast_df['ds'] <= last_date]
        if len(historical) < 2:
            return 'stable'

        trend_values = historical['trend'].values
        trend_change = trend_values[-1] - trend_values[0]
        trend_std = np.std(trend_values)

        if trend_std == 0:
            return 'stable'

        # Relative change compared to noise
        relative_change = abs(trend_change) / trend_std

        if relative_change < 0.5:
            return 'stable'
        elif trend_change > 0:
            return 'upward'
        else:
            return 'downward'

    def _extract_seasonality(self, forecast_df):
        """
        Extract seasonality decomposition summary.

        Args:
            forecast_df: Prophet forecast DataFrame.

        Returns:
            Dict with yearly and weekly seasonality summaries.
        """
        seasonality = {}

        if 'yearly' in forecast_df.columns:
            yearly = forecast_df['yearly'].values
            seasonality['yearly'] = {
                'amplitude': round(float(np.max(yearly) - np.min(yearly)), 2),
                'mean_effect': round(float(np.mean(yearly)), 2),
            }

        if 'weekly' in forecast_df.columns:
            weekly = forecast_df['weekly'].values
            seasonality['weekly'] = {
                'amplitude': round(float(np.max(weekly) - np.min(weekly)), 2),
                'mean_effect': round(float(np.mean(weekly)), 2),
            }

        return seasonality

    def _get_summary(self, training_df):
        """
        Generate training data summary statistics.

        Args:
            training_df: DataFrame with 'ds' and 'y' columns.

        Returns:
            Dict with summary statistics.
        """
        values = training_df['y'].values
        return {
            'data_points': int(len(values)),
            'date_range': {
                'start': training_df['ds'].min().strftime('%Y-%m-%d'),
                'end': training_df['ds'].max().strftime('%Y-%m-%d'),
            },
            'mean': round(float(np.mean(values)), 2),
            'std': round(float(np.std(values)), 2),
            'min': round(float(np.min(values)), 2),
            'max': round(float(np.max(values)), 2),
        }
