const auditMiddleware = require('../middleware/auditMiddleware');

// Mock the logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
}));

const logger = require('../utils/logger');

function createMockReq(overrides = {}) {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    get: jest.fn().mockReturnValue('test-agent'),
    body: {},
    user: null,
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    end: jest.fn(),
  };
  return res;
}

describe('auditMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log mutation requests (POST)', () => {
    const req = createMockReq({ method: 'POST', body: { name: 'test' } });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
      method: 'POST',
      path: '/api/v1/test',
      userId: 'anonymous',
      body: { name: 'test' },
    }));
    expect(next).toHaveBeenCalled();
  });

  it('should not log GET requests', () => {
    const req = createMockReq({ method: 'GET' });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(logger.info).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should sanitize sensitive fields (password -> [REDACTED])', () => {
    const req = createMockReq({
      method: 'POST',
      body: { username: 'admin', password: 'secret123', token: 'abc', credit_card: '4111' },
    });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
      body: {
        username: 'admin',
        password: '[REDACTED]',
        token: '[REDACTED]',
        credit_card: '[REDACTED]',
      },
    }));
  });

  it('should capture response status code and log AUDIT_FAILURE for errors', () => {
    const req = createMockReq({ method: 'DELETE' });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    // Simulate error response
    res.statusCode = 500;
    res.end();

    expect(logger.warn).toHaveBeenCalledWith('AUDIT_FAILURE', expect.objectContaining({
      statusCode: 500,
      method: 'DELETE',
    }));
  });

  it('should handle missing user gracefully', () => {
    const req = createMockReq({ method: 'PUT', user: undefined });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
      userId: 'anonymous',
    }));
    expect(next).toHaveBeenCalled();
  });

  it('should use user_id when available on req.user', () => {
    const req = createMockReq({ method: 'POST', user: { user_id: 'usr-123' } });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({
      userId: 'usr-123',
    }));
  });

  it('should log PUT and PATCH requests as mutations', () => {
    const next = jest.fn();

    auditMiddleware(createMockReq({ method: 'PUT' }), createMockRes(), next);
    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({ method: 'PUT' }));

    jest.clearAllMocks();

    auditMiddleware(createMockReq({ method: 'PATCH' }), createMockRes(), next);
    expect(logger.info).toHaveBeenCalledWith('AUDIT', expect.objectContaining({ method: 'PATCH' }));
  });

  it('should not log AUDIT_FAILURE for successful responses', () => {
    const req = createMockReq({ method: 'POST' });
    const res = createMockRes();
    const next = jest.fn();

    auditMiddleware(req, res, next);

    res.statusCode = 201;
    res.end();

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
