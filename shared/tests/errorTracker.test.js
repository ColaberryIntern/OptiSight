const errorTracker = require('../middleware/errorTracker');
const logger = require('../utils/logger');

// Mock the logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

// Mock request object
function mockReq(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    ip: '127.0.0.1',
    get: jest.fn((header) => {
      if (header === 'user-agent') return 'test-agent';
      return null;
    }),
    user: null,
    ...overrides,
  };
}

// Mock response object
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SERVICE_NAME;
    delete process.env.NODE_ENV;
  });

  it('should call next(err) to pass error to the next error handler', () => {
    const middleware = errorTracker();
    const err = new Error('Test error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  it('should log a structured error event', () => {
    const middleware = errorTracker();
    const err = new Error('Something went wrong');
    err.statusCode = 400;
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const loggedEvent = logger.error.mock.calls[0][0];

    expect(loggedEvent.type).toBe('error_event');
    expect(loggedEvent.error.name).toBe('Error');
    expect(loggedEvent.error.message).toBe('Something went wrong');
    expect(loggedEvent.error.stack).toBeDefined();
    expect(loggedEvent.error.code).toBe(400);
    expect(loggedEvent.timestamp).toBeDefined();
  });

  it('should include request info (method, url)', () => {
    const middleware = errorTracker();
    const err = new Error('Request error');
    const req = mockReq({ method: 'POST', originalUrl: '/api/v1/data' });
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.request.method).toBe('POST');
    expect(loggedEvent.request.url).toBe('/api/v1/data');
    expect(loggedEvent.request.userAgent).toBe('test-agent');
    expect(loggedEvent.request.ip).toBe('127.0.0.1');
  });

  it('should handle missing user gracefully', () => {
    const middleware = errorTracker();
    const err = new Error('No user');
    const req = mockReq(); // user is null by default
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.request.userId).toBeNull();
  });

  it('should include userId when user is present', () => {
    const middleware = errorTracker();
    const err = new Error('Auth error');
    const req = mockReq({ user: { userId: 'user-123' } });
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.request.userId).toBe('user-123');
  });

  it('should use SERVICE_NAME env var for service name', () => {
    process.env.SERVICE_NAME = 'analytics_service';
    const middleware = errorTracker();
    const err = new Error('Service error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.service).toBe('analytics_service');
  });

  it('should use the serviceName argument if provided', () => {
    process.env.SERVICE_NAME = 'env_service';
    const middleware = errorTracker('explicit_service');
    const err = new Error('Named service error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.service).toBe('explicit_service');
  });

  it('should default to "unknown" when no service name is available', () => {
    const middleware = errorTracker();
    const err = new Error('Unknown service');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.service).toBe('unknown');
  });

  it('should default error code to 500 when not specified', () => {
    const middleware = errorTracker();
    const err = new Error('Generic error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.error.code).toBe(500);
  });

  it('should include environment in the error event', () => {
    process.env.NODE_ENV = 'production';
    const middleware = errorTracker();
    const err = new Error('Prod error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.environment).toBe('production');
  });

  it('should default environment to "development"', () => {
    const middleware = errorTracker();
    const err = new Error('Dev error');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(err, req, res, next);

    const loggedEvent = logger.error.mock.calls[0][0];
    expect(loggedEvent.environment).toBe('development');
  });
});
