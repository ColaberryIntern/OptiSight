"""
Tests for the SalesForecaster model and Flask /forecast-sales endpoint.

Covers:
- Model fitting with valid data
- Edge cases: empty data, single data point
- Forecast generation with confidence intervals
- Forecast-before-fit error handling
- Non-negative forecast values
- Trend detection (upward, downward, stable)
- Model summary statistics
- Flask /forecast-sales endpoint
- Flask endpoint validation (insufficient data, missing fields)
"""

import json
import sys
import os

import pytest
import numpy as np
import pandas as pd

# Add ai_engine root to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.sales_forecaster import SalesForecaster
from app import app as flask_app


# ─────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────

@pytest.fixture
def forecaster():
    """Return a fresh SalesForecaster instance."""
    return SalesForecaster()


@pytest.fixture
def upward_series():
    """Create a time series with clear upward trend."""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    values = [100 + i * 5 + np.random.normal(0, 2) for i in range(30)]
    return pd.DataFrame({'date': dates, 'value': values})


@pytest.fixture
def downward_series():
    """Create a time series with clear downward trend."""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    values = [500 - i * 10 + np.random.normal(0, 2) for i in range(30)]
    return pd.DataFrame({'date': dates, 'value': values})


@pytest.fixture
def stable_series():
    """Create a time series with no clear trend."""
    dates = pd.date_range('2025-01-01', periods=30, freq='D')
    values = [100.0] * 30  # perfectly flat
    return pd.DataFrame({'date': dates, 'value': values})


@pytest.fixture
def client():
    """Create a Flask test client."""
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as c:
        yield c


# ─────────────────────────────────────────────────────────────
# Fit Tests
# ─────────────────────────────────────────────────────────────

class TestFit:
    """Tests for the fit() method."""

    def test_fit_basic(self, forecaster, upward_series):
        """Fitting with valid data should set fitted=True."""
        result = forecaster.fit(upward_series)
        assert result is forecaster  # returns self
        assert forecaster.fitted is True
        assert forecaster.level is not None
        assert forecaster.trend is not None
        assert forecaster.residual_std is not None

    def test_fit_empty_data(self, forecaster):
        """Fitting with empty data should leave fitted=False."""
        empty_df = pd.DataFrame(columns=['date', 'value'])
        forecaster.fit(empty_df)
        assert forecaster.fitted is False

    def test_fit_single_point(self, forecaster):
        """Fitting with a single data point should leave fitted=False (need >= 2)."""
        single_df = pd.DataFrame({
            'date': ['2025-01-01'],
            'value': [100.0],
        })
        forecaster.fit(single_df)
        assert forecaster.fitted is False

    def test_fit_two_points(self, forecaster):
        """Fitting with exactly two data points should work."""
        df = pd.DataFrame({
            'date': ['2025-01-01', '2025-01-02'],
            'value': [100.0, 110.0],
        })
        forecaster.fit(df)
        assert forecaster.fitted is True

    def test_fit_sorts_by_date(self, forecaster):
        """Fit should handle unsorted date data correctly."""
        df = pd.DataFrame({
            'date': ['2025-01-10', '2025-01-01', '2025-01-05'],
            'value': [300.0, 100.0, 200.0],
        })
        forecaster.fit(df)
        assert forecaster.fitted is True
        # After sorting, last date should be 2025-01-10
        assert forecaster.series['date'].iloc[-1] == pd.Timestamp('2025-01-10')


# ─────────────────────────────────────────────────────────────
# Forecast Tests
# ─────────────────────────────────────────────────────────────

class TestForecast:
    """Tests for the forecast() method."""

    def test_forecast_basic(self, forecaster, upward_series):
        """Forecast should return the requested number of periods."""
        forecaster.fit(upward_series)
        forecasts = forecaster.forecast(periods=10)

        assert len(forecasts) == 10
        for f in forecasts:
            assert 'date' in f
            assert 'predicted' in f
            assert 'lower' in f
            assert 'upper' in f

    def test_forecast_before_fit_raises(self, forecaster):
        """Forecasting before fitting should raise ValueError."""
        with pytest.raises(ValueError, match='Model not fitted'):
            forecaster.forecast(periods=5)

    def test_forecast_non_negative(self, forecaster, downward_series):
        """All forecast values should be non-negative."""
        forecaster.fit(downward_series)
        # Forecast far enough out that trend might go negative
        forecasts = forecaster.forecast(periods=100)

        for f in forecasts:
            assert f['predicted'] >= 0
            assert f['lower'] >= 0

    def test_forecast_confidence_widens(self, forecaster, upward_series):
        """Confidence intervals should widen with forecast horizon."""
        forecaster.fit(upward_series)
        forecasts = forecaster.forecast(periods=30)

        first_margin = forecasts[0]['upper'] - forecasts[0]['lower']
        last_margin = forecasts[-1]['upper'] - forecasts[-1]['lower']
        assert last_margin > first_margin

    def test_forecast_dates_consecutive(self, forecaster, upward_series):
        """Forecast dates should be consecutive days from the last data point."""
        forecaster.fit(upward_series)
        forecasts = forecaster.forecast(periods=5)

        last_data_date = upward_series['date'].max()
        for i, f in enumerate(forecasts):
            expected_date = (pd.Timestamp(last_data_date) + pd.Timedelta(days=i + 1)).strftime('%Y-%m-%d')
            assert f['date'] == expected_date

    def test_forecast_upper_greater_than_lower(self, forecaster, upward_series):
        """Upper bound should always be >= lower bound."""
        forecaster.fit(upward_series)
        forecasts = forecaster.forecast(periods=30)

        for f in forecasts:
            assert f['upper'] >= f['lower']


# ─────────────────────────────────────────────────────────────
# Trend Detection Tests
# ─────────────────────────────────────────────────────────────

class TestDetectTrend:
    """Tests for the detect_trend() method."""

    def test_detect_trend_upward(self, forecaster, upward_series):
        """Should detect upward trend in increasing data."""
        forecaster.fit(upward_series)
        trend = forecaster.detect_trend()
        assert trend == 'upward'

    def test_detect_trend_downward(self, forecaster, downward_series):
        """Should detect downward trend in decreasing data."""
        forecaster.fit(downward_series)
        trend = forecaster.detect_trend()
        assert trend == 'downward'

    def test_detect_trend_stable(self, forecaster, stable_series):
        """Should detect stable trend in flat data."""
        forecaster.fit(stable_series)
        trend = forecaster.detect_trend()
        assert trend == 'stable'

    def test_detect_trend_unfitted(self, forecaster):
        """Should return stable when model is not fitted."""
        trend = forecaster.detect_trend()
        assert trend == 'stable'


# ─────────────────────────────────────────────────────────────
# Summary Tests
# ─────────────────────────────────────────────────────────────

class TestGetSummary:
    """Tests for the get_summary() method."""

    def test_get_summary_basic(self, forecaster, upward_series):
        """Summary should contain expected keys."""
        forecaster.fit(upward_series)
        summary = forecaster.get_summary()

        assert 'data_points' in summary
        assert 'mean' in summary
        assert 'std' in summary
        assert 'min' in summary
        assert 'max' in summary
        assert 'trend' in summary
        assert 'trend_magnitude' in summary

        assert summary['data_points'] == 30
        assert summary['max'] >= summary['min']

    def test_get_summary_unfitted(self, forecaster):
        """Summary should be empty dict when model is not fitted."""
        assert forecaster.get_summary() == {}


# ─────────────────────────────────────────────────────────────
# Flask Endpoint Tests
# ─────────────────────────────────────────────────────────────

class TestForecastSalesEndpoint:
    """Tests for POST /forecast-sales."""

    def test_flask_forecast_endpoint(self, client):
        """Endpoint should return forecast for valid input."""
        time_series = [
            {'date': f'2025-01-{str(d).zfill(2)}', 'value': 100.0 + d * 5}
            for d in range(1, 31)
        ]

        response = client.post('/forecast-sales', json={
            'time_series': time_series,
            'periods': 7,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert 'forecast' in data
        assert 'trend' in data
        assert 'summary' in data
        assert len(data['forecast']) == 7

        for f in data['forecast']:
            assert 'date' in f
            assert 'predicted' in f
            assert 'lower' in f
            assert 'upper' in f

    def test_flask_forecast_insufficient_data(self, client):
        """Endpoint should return 400 with fewer than 2 data points."""
        response = client.post('/forecast-sales', json={
            'time_series': [{'date': '2025-01-01', 'value': 100}],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_forecast_missing_time_series(self, client):
        """Endpoint should return 400 when time_series field is missing."""
        response = client.post('/forecast-sales', json={
            'periods': 30,
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_forecast_missing_fields(self, client):
        """Endpoint should return 400 when entries lack date or value."""
        response = client.post('/forecast-sales', json={
            'time_series': [
                {'date': '2025-01-01'},
                {'date': '2025-01-02'},
            ],
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_flask_forecast_default_periods(self, client):
        """Endpoint should default to 30 forecast periods."""
        time_series = [
            {'date': f'2025-01-{str(d).zfill(2)}', 'value': 100.0 + d}
            for d in range(1, 21)
        ]

        response = client.post('/forecast-sales', json={
            'time_series': time_series,
        })

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['forecast']) == 30
