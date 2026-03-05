const cache = require('../utils/cache');

/**
 * Express middleware factory for caching GET responses.
 * @param {string} keyPrefix - Prefix for the cache key
 * @param {number} ttlSeconds - Time-to-live in seconds (default 300)
 * @returns {Function} Express middleware
 */
function cacheMiddleware(keyPrefix, ttlSeconds = 300) {
  return async (req, res, next) => {
    try {
      const cacheKey = `${keyPrefix}:${req.originalUrl}`;
      const cached = await cache.getCache(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response before sending
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        cache.setCache(cacheKey, data, ttlSeconds);
        return originalJson(data);
      };
      next();
    } catch (err) {
      // On any cache error, proceed without caching
      next();
    }
  };
}

module.exports = cacheMiddleware;
