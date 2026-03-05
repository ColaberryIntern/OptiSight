const { metricsMiddleware, metricsEndpoint, promClient } = require('../middleware/metricsMiddleware');

// Reset all metrics between tests to avoid state leakage
afterEach(async () => {
  promClient.register.resetMetrics();
});

describe('metricsMiddleware', () => {
  test('returns a middleware function', () => {
    const middleware = metricsMiddleware('test_service');
    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(3); // (req, res, next)
  });

  test('calls next() immediately', () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'GET', path: '/test' };
    const res = { on: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('registers finish event listener on response', () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'GET', path: '/test' };
    const res = { on: jest.fn() };
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  test('tracks request duration and counter on finish', async () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'GET', path: '/api/health' };
    let finishCallback;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    const next = jest.fn();

    middleware(req, res, next);

    // Simulate the response finishing
    finishCallback();

    // Verify metrics were recorded by checking the registry
    const metrics = await promClient.register.getMetricsAsJSON();
    const requestTotal = metrics.find((m) => m.name === 'optisight_http_requests_total');
    const requestDuration = metrics.find((m) => m.name === 'optisight_http_request_duration_seconds');

    expect(requestTotal).toBeDefined();
    expect(requestDuration).toBeDefined();

    // Verify counter was incremented
    expect(requestTotal.values.length).toBeGreaterThan(0);
    const counterValue = requestTotal.values.find(
      (v) =>
        v.labels.method === 'GET' &&
        v.labels.route === '/api/health' &&
        v.labels.service === 'test_service' &&
        v.labels.status_code === 200
    );
    expect(counterValue).toBeDefined();
    expect(counterValue.value).toBe(1);
  });

  test('tracks errors for 4xx status codes', async () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'POST', path: '/api/data' };
    let finishCallback;
    const res = {
      statusCode: 404,
      on: jest.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    const next = jest.fn();

    middleware(req, res, next);
    finishCallback();

    const metrics = await promClient.register.getMetricsAsJSON();
    const errorTotal = metrics.find((m) => m.name === 'optisight_http_request_errors_total');

    expect(errorTotal).toBeDefined();
    expect(errorTotal.values.length).toBeGreaterThan(0);
    const errorValue = errorTotal.values.find(
      (v) =>
        v.labels.method === 'POST' &&
        v.labels.status_code === 404 &&
        v.labels.service === 'test_service'
    );
    expect(errorValue).toBeDefined();
    expect(errorValue.value).toBe(1);
  });

  test('tracks errors for 5xx status codes', async () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'GET', path: '/api/broken' };
    let finishCallback;
    const res = {
      statusCode: 500,
      on: jest.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    const next = jest.fn();

    middleware(req, res, next);
    finishCallback();

    const metrics = await promClient.register.getMetricsAsJSON();
    const errorTotal = metrics.find((m) => m.name === 'optisight_http_request_errors_total');

    expect(errorTotal).toBeDefined();
    const errorValue = errorTotal.values.find(
      (v) => v.labels.status_code === 500 && v.labels.service === 'test_service'
    );
    expect(errorValue).toBeDefined();
    expect(errorValue.value).toBe(1);
  });

  test('does not track errors for 2xx status codes', async () => {
    const middleware = metricsMiddleware('test_service');
    const req = { method: 'GET', path: '/api/ok' };
    let finishCallback;
    const res = {
      statusCode: 200,
      on: jest.fn((event, cb) => {
        if (event === 'finish') finishCallback = cb;
      }),
    };
    const next = jest.fn();

    middleware(req, res, next);
    finishCallback();

    const metrics = await promClient.register.getMetricsAsJSON();
    const errorTotal = metrics.find((m) => m.name === 'optisight_http_request_errors_total');

    // Should exist as a metric definition but have no values for 200 status
    if (errorTotal && errorTotal.values.length > 0) {
      const errorValue = errorTotal.values.find((v) => v.labels.status_code === 200);
      expect(errorValue).toBeUndefined();
    }
  });
});

describe('metricsEndpoint', () => {
  test('returns prometheus metrics format', async () => {
    const req = {};
    const res = {
      set: jest.fn(),
      end: jest.fn(),
    };

    await metricsEndpoint(req, res);

    expect(res.set).toHaveBeenCalledWith('Content-Type', expect.stringContaining('text/'));
    expect(res.end).toHaveBeenCalledWith(expect.any(String));
  });
});
