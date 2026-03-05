import time
from functools import wraps
from flask import request, g
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

REQUEST_COUNT = Counter(
    'optisight_ai_http_requests_total',
    'Total HTTP requests to AI engine',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'optisight_ai_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

REQUEST_ERRORS = Counter(
    'optisight_ai_http_request_errors_total',
    'Total HTTP request errors',
    ['method', 'endpoint', 'status_code']
)


def setup_metrics(app):
    """Register metrics middleware with Flask app."""

    @app.before_request
    def before_request():
        g.start_time = time.time()

    @app.after_request
    def after_request(response):
        duration = time.time() - g.get('start_time', time.time())
        endpoint = request.path
        method = request.method
        status = str(response.status_code)

        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status).inc()
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)

        if response.status_code >= 400:
            REQUEST_ERRORS.labels(method=method, endpoint=endpoint, status_code=status).inc()

        return response

    @app.route('/metrics')
    def metrics():
        return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}
