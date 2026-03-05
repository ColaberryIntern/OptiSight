const crypto = require('crypto');

const HASH_SALT = process.env.ANONYMIZE_SALT || 'optisight_default_salt_change_in_production';

/**
 * Utility for anonymizing PII before sending to analytics/AI processing.
 * Uses consistent hashing so the same input always produces the same output,
 * preserving relational integrity for analytics.
 */
const anonymize = {
  /**
   * Hash a value using SHA-256 with a salt.
   * Returns a consistent hash for the same input.
   * @param {string} value - The value to hash
   * @returns {string} Hex-encoded hash (first 16 chars for readability)
   */
  hashValue(value) {
    if (!value) return null;
    return crypto
      .createHmac('sha256', HASH_SALT)
      .update(String(value))
      .digest('hex')
      .substring(0, 16);
  },

  /**
   * Anonymize an email address.
   * Preserves the domain for analytics while hashing the local part.
   * @param {string} email
   * @returns {string} Anonymized email (e.g., "a1b2c3d4@domain.com")
   */
  hashEmail(email) {
    if (!email || !email.includes('@')) return null;
    const [localPart, domain] = email.split('@');
    const hashedLocal = this.hashValue(localPart).substring(0, 8);
    return `${hashedLocal}@${domain}`;
  },

  /**
   * Anonymize a user ID.
   * Returns a consistent hash so analytics can still group by user.
   * @param {string} userId
   * @returns {string} Hashed user ID
   */
  hashUserId(userId) {
    return this.hashValue(userId);
  },

  /**
   * Anonymize an object by hashing specified fields.
   * Returns a new object with specified fields anonymized.
   * @param {object} data - The data object
   * @param {string[]} fields - Field names to anonymize
   * @returns {object} New object with specified fields hashed
   */
  anonymizeFields(data, fields) {
    if (!data || typeof data !== 'object') return data;
    const result = { ...data };
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        if (field === 'email' || field.toLowerCase().includes('email')) {
          result[field] = this.hashEmail(result[field]);
        } else {
          result[field] = this.hashValue(result[field]);
        }
      }
    }
    return result;
  },

  /**
   * Anonymize an array of objects.
   * @param {object[]} records - Array of data records
   * @param {string[]} fields - Field names to anonymize
   * @returns {object[]} New array with specified fields hashed
   */
  anonymizeRecords(records, fields) {
    if (!Array.isArray(records)) return records;
    return records.map(record => this.anonymizeFields(record, fields));
  },
};

module.exports = anonymize;
