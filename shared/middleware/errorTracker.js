const logger = require('../utils/logger');

/**
 * Middleware that tracks errors and sends them to centralized logging.
 * Works with the existing errorHandler but adds structured error tracking.
 */
function errorTracker(serviceName) {
  return (err, req, res, next) => {
    const errorEvent = {
      type: 'error_event',
      service: serviceName || process.env.SERVICE_NAME || 'unknown',
      error: {
        name: err.name || 'Error',
        message: err.message,
        stack: err.stack,
        code: err.statusCode || err.code || 500,
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        userId: req.user?.userId || null,
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    logger.error(errorEvent);

    // Pass to next error handler (the existing errorHandler)
    next(err);
  };
}

module.exports = errorTracker;
