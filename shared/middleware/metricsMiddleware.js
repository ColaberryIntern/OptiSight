const promClient = require('prom-client');

// Collect default metrics (CPU, memory, event loop)
promClient.collectDefaultMetrics({ prefix: 'optisight_' });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'optisight_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new promClient.Counter({
  name: 'optisight_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
});

const httpRequestErrors = new promClient.Counter({
  name: 'optisight_http_request_errors_total',
  help: 'Total number of HTTP request errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'status_code', 'service'],
});

/**
 * Express middleware to track request metrics.
 * @param {string} serviceName - Name of the service (e.g., 'user_service')
 */
function metricsMiddleware(serviceName) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const route = req.route?.path || req.path;
      const labels = {
        method: req.method,
        route,
        status_code: res.statusCode,
        service: serviceName,
      };

      httpRequestDuration.observe(labels, duration);
      httpRequestTotal.inc(labels);

      if (res.statusCode >= 400) {
        httpRequestErrors.inc(labels);
      }
    });

    next();
  };
}

/**
 * Express route handler for /metrics endpoint.
 */
async function metricsEndpoint(req, res) {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
}

module.exports = { metricsMiddleware, metricsEndpoint, promClient };
