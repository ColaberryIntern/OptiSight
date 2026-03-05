"""Tests for the AI engine metrics middleware."""
import pytest
from prometheus_client import REGISTRY, CollectorRegistry
import importlib


@pytest.fixture
def app():
    """Create a fresh Flask test app with metrics enabled."""
    # We need to unregister previous collectors to avoid duplicates
    # across test runs. Use a fresh registry approach.
    from flask import Flask

    test_app = Flask(__name__)

    @test_app.route('/health')
    def health():
        return 'ok', 200

    @test_app.route('/predict', methods=['POST'])
    def predict():
        return '{"recommendations": []}', 200

    @test_app.route('/error')
    def error():
        return 'error', 500

    # Import and setup metrics fresh
    from middleware.metrics import setup_metrics
    setup_metrics(test_app)

    return test_app


@pytest.fixture
def client(app):
    """Create a Flask test client."""
    return app.test_client()


class TestMetricsEndpoint:
    """Tests for the /metrics endpoint."""

    def test_metrics_endpoint_returns_prometheus_format(self, client):
        """Test that /metrics returns data in Prometheus exposition format."""
        response = client.get('/metrics')
        assert response.status_code == 200
        content_type = response.content_type
        assert 'text/plain' in content_type or 'text/openmetrics' in content_type

    def test_metrics_endpoint_contains_custom_metrics(self, client):
        """Test that /metrics contains our custom metric names."""
        # First make a request to generate some metrics
        client.get('/health')

        response = client.get('/metrics')
        data = response.data.decode('utf-8')

        assert 'optisight_ai_http_requests_total' in data
        assert 'optisight_ai_http_request_duration_seconds' in data

    def test_request_counter_increments(self, client):
        """Test that the request counter increments when requests are made."""
        # Make several requests
        client.get('/health')
        client.get('/health')
        client.get('/health')

        response = client.get('/metrics')
        data = response.data.decode('utf-8')

        # The counter should show at least some requests to /health
        assert 'optisight_ai_http_requests_total' in data
        # Verify /health endpoint appears in the metrics
        assert '/health' in data

    def test_request_duration_is_recorded(self, client):
        """Test that request duration histogram is populated."""
        client.get('/health')

        response = client.get('/metrics')
        data = response.data.decode('utf-8')

        # Histogram should have bucket, count, and sum entries
        assert 'optisight_ai_http_request_duration_seconds_bucket' in data
        assert 'optisight_ai_http_request_duration_seconds_count' in data
        assert 'optisight_ai_http_request_duration_seconds_sum' in data

    def test_error_counter_tracks_errors(self, client):
        """Test that 5xx responses are tracked in the error counter."""
        client.get('/error')

        response = client.get('/metrics')
        data = response.data.decode('utf-8')

        assert 'optisight_ai_http_request_errors_total' in data
        # Verify the error endpoint and 500 status code appear
        assert '/error' in data
        assert '500' in data

    def test_successful_requests_not_in_error_counter(self, client):
        """Test that 2xx responses do not increment the error counter."""
        client.get('/health')

        response = client.get('/metrics')
        data = response.data.decode('utf-8')

        # Parse lines to check error counter does not have /health with 200
        lines = data.split('\n')
        error_lines = [
            line for line in lines
            if line.startswith('optisight_ai_http_request_errors_total')
            and '/health' in line
            and '200' in line
        ]
        assert len(error_lines) == 0
