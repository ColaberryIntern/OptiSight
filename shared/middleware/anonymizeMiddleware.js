const anonymize = require('../utils/anonymize');

/**
 * Express middleware that anonymizes PII in request data before it reaches analytics endpoints.
 * Attaches anonymized versions of user data to req.anonymized.
 *
 * @param {string[]} fields - Fields to anonymize (default: ['email', 'user_id', 'userId'])
 */
function anonymizeMiddleware(fields = ['email', 'user_id', 'userId']) {
  return (req, res, next) => {
    req.anonymized = {};

    // Anonymize user info from JWT token
    if (req.user) {
      req.anonymized.user = anonymize.anonymizeFields(req.user, fields);
    }

    // Anonymize body data if present
    if (req.body && typeof req.body === 'object') {
      req.anonymized.body = anonymize.anonymizeFields(req.body, fields);
    }

    // Anonymize query params if present
    if (req.query) {
      req.anonymized.query = anonymize.anonymizeFields(req.query, fields);
    }

    next();
  };
}

module.exports = anonymizeMiddleware;
