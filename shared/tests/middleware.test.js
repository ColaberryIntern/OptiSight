const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const errorHandler = require('../middleware/errorHandler');

// Mock response object
function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// Mock request object
function mockReq(overrides = {}) {
  return {
    headers: {},
    originalUrl: '/test',
    method: 'GET',
    ...overrides,
  };
}

describe('authMiddleware', () => {
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  it('should return 401 if no authorization header', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: '401', message: 'Authentication required' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next and set req.user for valid token', () => {
    const payload = { userId: '123', email: 'test@test.com', role: 'admin' };
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('123');
    expect(req.user.role).toBe('admin');
  });

  it('should return 401 for malformed authorization header', () => {
    const req = mockReq({ headers: { authorization: 'NotBearer token' } });
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('roleMiddleware', () => {
  it('should return 401 if no user on request', () => {
    const middleware = roleMiddleware('admin');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user role is not allowed', () => {
    const middleware = roleMiddleware('admin');
    const req = mockReq({ user: { role: 'executive' } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next if user role is allowed', () => {
    const middleware = roleMiddleware('admin', 'executive');
    const req = mockReq({ user: { role: 'executive' } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept multiple roles', () => {
    const middleware = roleMiddleware('admin', 'manager');
    const req = mockReq({ user: { role: 'manager' } });
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('errorHandler', () => {
  it('should return 500 for errors without statusCode', () => {
    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: '500', message: 'Internal server error' },
    });
  });

  it('should use custom statusCode and message', () => {
    const err = new Error('Not found');
    err.statusCode = 404;
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: '404', message: 'Not found' },
    });
  });
});
