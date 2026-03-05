const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 min)
 * @param {number} options.max - Max requests per window (default: 100)
 * @param {string} options.message - Error message
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: { error: { message } },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

// Pre-configured limiters
const generalLimiter = createRateLimiter();
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts, please try again later.',
});
const apiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: 'API rate limit exceeded.',
});

module.exports = { createRateLimiter, generalLimiter, authLimiter, apiLimiter };
