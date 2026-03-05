"""
Sales Forecasting using Holt's Linear Exponential Smoothing.

Provides time series forecasting with trend detection and confidence intervals.
Uses simple statistical methods (no statsmodels/prophet dependency) that can be
upgraded to ARIMA/Prophet in Phase 2+.
"""

import numpy as np
import pandas as pd


class SalesForecaster:
    """Time series sales forecasting using Holt's linear exponential smoothing.

    Uses double exponential smoothing (level + trend) to capture both the
    current value and the direction of the series. Provides forecasts with
    confidence intervals that widen with the forecast horizon.
    """

    def __init__(self):
        self.fitted = False
        self.last_values = None
        self.trend = None
        self.level = None
        self.alpha = 0.3   # smoothing factor for level
        self.beta = 0.1    # smoothing factor for trend
        self.residual_std = None
        self.series = None

    def fit(self, time_series_df):
        """
        Fit the forecasting model on historical data.

        Applies Holt's linear exponential smoothing to decompose the series
        into level and trend components.

        Args:
            time_series_df: DataFrame with columns [date, value]

        Returns:
            self
        """
        if time_series_df.empty or len(time_series_df) < 2:
            self.fitted = False
            return self

        df = time_series_df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)

        self.series = df
        values = df['value'].values.astype(float)

        # Holt's linear exponential smoothing
        n = len(values)
        level = np.zeros(n)
        trend_arr = np.zeros(n)

        level[0] = values[0]
        trend_arr[0] = values[1] - values[0] if n > 1 else 0

        for t in range(1, n):
            level[t] = self.alpha * values[t] + (1 - self.alpha) * (level[t - 1] + trend_arr[t - 1])
            trend_arr[t] = self.beta * (level[t] - level[t - 1]) + (1 - self.beta) * trend_arr[t - 1]

        self.level = level[-1]
        self.trend = trend_arr[-1]

        # Calculate residual standard deviation for confidence intervals
        fitted_values = level + trend_arr
        residuals = values - fitted_values
        self.residual_std = float(np.std(residuals)) if len(residuals) > 1 else float(np.mean(values) * 0.1)

        self.fitted = True
        return self

    def forecast(self, periods=30):
        """
        Generate forecast for future periods.

        Each forecast point includes a predicted value and a confidence interval
        that widens with the forecast horizon.

        Args:
            periods: Number of days to forecast

        Returns:
            List of dicts: [{date, predicted, lower, upper}]

        Raises:
            ValueError: If the model has not been fitted yet
        """
        if not self.fitted:
            raise ValueError('Model not fitted. Call fit() first.')

        last_date = self.series['date'].max()
        forecasts = []

        for h in range(1, periods + 1):
            forecast_date = last_date + pd.Timedelta(days=h)
            predicted = self.level + self.trend * h
            predicted = max(0, predicted)  # no negative revenue

            # Confidence interval widens with forecast horizon
            margin = 1.96 * self.residual_std * np.sqrt(h)
            lower = max(0, predicted - margin)
            upper = predicted + margin

            forecasts.append({
                'date': forecast_date.strftime('%Y-%m-%d'),
                'predicted': round(float(predicted), 2),
                'lower': round(float(lower), 2),
                'upper': round(float(upper), 2),
            })

        return forecasts

    def detect_trend(self):
        """
        Detect overall trend direction from the fitted model.

        Uses the trend component relative to the residual standard deviation
        to classify the trend as upward, downward, or stable.

        Returns:
            'upward', 'downward', or 'stable'
        """
        if not self.fitted:
            return 'stable'

        # Use the trend component relative to noise.
        # When residual_std is zero (perfectly flat data), any non-zero trend
        # would be meaningful, but a zero trend is definitively stable.
        threshold = self.residual_std * 0.1 if self.residual_std > 0 else 1e-10
        if abs(self.trend) < threshold:
            return 'stable'
        elif self.trend > 0:
            return 'upward'
        else:
            return 'downward'

    def get_summary(self):
        """
        Get model summary statistics.

        Returns:
            Dict with data_points, mean, std, min, max, trend, trend_magnitude
        """
        if not self.fitted:
            return {}

        values = self.series['value'].values
        return {
            'data_points': len(values),
            'mean': round(float(np.mean(values)), 2),
            'std': round(float(np.std(values)), 2),
            'min': round(float(np.min(values)), 2),
            'max': round(float(np.max(values)), 2),
            'trend': self.detect_trend(),
            'trend_magnitude': round(float(self.trend), 4),
        }
