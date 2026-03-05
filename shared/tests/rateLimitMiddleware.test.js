const { createRateLimiter, generalLimiter, authLimiter, apiLimiter } = require('../middleware/rateLimitMiddleware');

describe('rateLimitMiddleware', () => {
  describe('createRateLimiter', () => {
    it('should return a function (middleware)', () => {
      const limiter = createRateLimiter();
      expect(typeof limiter).toBe('function');
    });

    it('should accept custom options', () => {
      const limiter = createRateLimiter({
        windowMs: 5 * 60 * 1000,
        max: 10,
        message: 'Custom limit reached.',
      });
      expect(typeof limiter).toBe('function');
    });

    it('should work with default options when called with no arguments', () => {
      const limiter = createRateLimiter();
      expect(typeof limiter).toBe('function');
    });

    it('should work with partial options', () => {
      const limiter = createRateLimiter({ max: 50 });
      expect(typeof limiter).toBe('function');
    });
  });

  describe('pre-configured limiters', () => {
    it('generalLimiter should be a function', () => {
      expect(typeof generalLimiter).toBe('function');
    });

    it('authLimiter should be a function', () => {
      expect(typeof authLimiter).toBe('function');
    });

    it('apiLimiter should be a function', () => {
      expect(typeof apiLimiter).toBe('function');
    });
  });
});
