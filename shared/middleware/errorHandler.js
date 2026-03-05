const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    statusCode,
  });

  res.status(statusCode).json({
    error: {
      code: String(statusCode),
      message: statusCode === 500 ? 'Internal server error' : message,
    },
  });
}

module.exports = errorHandler;
