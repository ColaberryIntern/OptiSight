const authMiddleware = require('./middleware/authMiddleware');
const roleMiddleware = require('./middleware/roleMiddleware');
const validationMiddleware = require('./middleware/validationMiddleware');
const errorHandler = require('./middleware/errorHandler');
const errorTracker = require('./middleware/errorTracker');
const cacheMiddleware = require('./middleware/cacheMiddleware');
const queryLogger = require('./middleware/queryLogger');
const { createRateLimiter, generalLimiter, authLimiter, apiLimiter } = require('./middleware/rateLimitMiddleware');
const auditMiddleware = require('./middleware/auditMiddleware');
const securityHeaders = require('./middleware/securityHeaders');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metricsMiddleware');
const anonymizeMiddleware = require('./middleware/anonymizeMiddleware');
const { decryptRequestFields, encryptResponseFields } = require('./middleware/encryptionMiddleware');
const logger = require('./utils/logger');
const config = require('./utils/config');
const cache = require('./utils/cache');
const sanitize = require('./utils/sanitize');
const anonymize = require('./utils/anonymize');
const featureFlags = require('./utils/featureFlags');
const encryption = require('./utils/encryption');

module.exports = {
  authMiddleware,
  roleMiddleware,
  validationMiddleware,
  errorHandler,
  errorTracker,
  cacheMiddleware,
  queryLogger,
  createRateLimiter,
  generalLimiter,
  authLimiter,
  apiLimiter,
  auditMiddleware,
  securityHeaders,
  metricsMiddleware,
  metricsEndpoint,
  logger,
  config,
  cache,
  sanitize,
  anonymize,
  anonymizeMiddleware,
  featureFlags,
  encryption,
  decryptRequestFields,
  encryptResponseFields,
};
