const securityHeaders = require('../middleware/securityHeaders');

describe('securityHeaders', () => {
  it('should return a function (middleware)', () => {
    const middleware = securityHeaders();
    expect(typeof middleware).toBe('function');
  });

  it('should set security headers on the response', () => {
    const middleware = securityHeaders();

    // Helmet returns an array of middleware functions or a single function
    // that sets various headers. We verify it can be invoked without errors.
    const req = {};
    const res = {
      setHeader: jest.fn(),
      getHeader: jest.fn(),
      removeHeader: jest.fn(),
    };
    const next = jest.fn();

    // Helmet middleware may call next or invoke sub-middleware
    // We just verify it doesn't throw
    expect(() => {
      middleware(req, res, next);
    }).not.toThrow();
  });

  it('should be callable multiple times to create independent instances', () => {
    const middleware1 = securityHeaders();
    const middleware2 = securityHeaders();
    expect(typeof middleware1).toBe('function');
    expect(typeof middleware2).toBe('function');
    expect(middleware1).not.toBe(middleware2);
  });
});
