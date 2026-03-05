const logger = require('../utils/logger');

/**
 * Audit middleware that logs all mutation requests (POST, PUT, PATCH, DELETE).
 */
function auditMiddleware(req, res, next) {
  const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutationMethods.includes(req.method)) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.user_id || req.user?.id || 'anonymous',
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      body: sanitizeBody(req.body),
    };

    logger.info('AUDIT', auditEntry);

    // Capture response status
    const originalEnd = res.end;
    res.end = function(...args) {
      auditEntry.statusCode = res.statusCode;
      if (res.statusCode >= 400) {
        logger.warn('AUDIT_FAILURE', auditEntry);
      }
      originalEnd.apply(res, args);
    };
  }

  next();
}

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'credit_card', 'ssn'];
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

module.exports = auditMiddleware;
