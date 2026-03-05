const { encrypt, decrypt, getKeyFromEnv } = require('../utils/encryption');

/**
 * Creates middleware that decrypts specified fields on incoming request bodies.
 * Use this on routes that receive encrypted data from clients.
 *
 * @param {string[]} fields - Dot-notation field paths to decrypt (e.g. ['email', 'profile_data'])
 * @param {object} [options]
 * @param {string} [options.key] - Encryption key override (defaults to ENCRYPTION_KEY env var)
 * @returns {Function} Express middleware
 */
function decryptRequestFields(fields, options = {}) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('fields must be a non-empty array of field names');
  }

  return (req, _res, next) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      const key = options.key || getKeyFromEnv();

      for (const field of fields) {
        const value = getNestedValue(req.body, field);
        if (typeof value === 'string' && value.includes(':')) {
          try {
            const decrypted = decrypt(value, key);
            setNestedValue(req.body, field, decrypted);
          } catch {
            // Field may not actually be encrypted — leave it as-is
          }
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Creates middleware that encrypts specified fields on the response JSON body
 * before sending. Wraps res.json() to intercept outgoing data.
 *
 * @param {string[]} fields - Dot-notation field paths to encrypt (e.g. ['email', 'profile_data'])
 * @param {object} [options]
 * @param {string} [options.key] - Encryption key override (defaults to ENCRYPTION_KEY env var)
 * @returns {Function} Express middleware
 */
function encryptResponseFields(fields, options = {}) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('fields must be a non-empty array of field names');
  }

  return (_req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = (body) => {
      try {
        if (body && typeof body === 'object') {
          const key = options.key || getKeyFromEnv();

          for (const field of fields) {
            const value = getNestedValue(body, field);
            if (typeof value === 'string' && value.length > 0) {
              const encrypted = encrypt(value, key);
              setNestedValue(body, field, encrypted);
            }
          }
        }
      } catch {
        // If encryption fails, send unencrypted rather than breaking the response
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Gets a nested value from an object using dot-notation path.
 * @param {object} obj
 * @param {string} path - e.g. 'user.email'
 * @returns {*}
 */
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

/**
 * Sets a nested value on an object using dot-notation path.
 * @param {object} obj
 * @param {string} path - e.g. 'user.email'
 * @param {*} value
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (current[keys[i]] === undefined || current[keys[i]] === null || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

module.exports = {
  decryptRequestFields,
  encryptResponseFields,
  getNestedValue,
  setNestedValue,
};
