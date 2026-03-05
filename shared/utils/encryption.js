const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Validates that the encryption key is a 32-byte hex string (64 hex characters).
 * Returns the key as a Buffer.
 */
function validateKey(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('Encryption key must be a non-empty string');
  }
  const cleaned = key.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error(
      'Encryption key must be a 64-character hex string (32 bytes)'
    );
  }
  return Buffer.from(cleaned, 'hex');
}

/**
 * Encrypts plaintext using AES-256-GCM with a random IV.
 * Returns a string in the format: iv:authTag:ciphertext (all base64-encoded).
 *
 * @param {string} plaintext - The text to encrypt
 * @param {string} key - 32-byte hex string (64 hex characters)
 * @returns {string} Encrypted string in iv:authTag:ciphertext format
 */
function encrypt(plaintext, key) {
  if (plaintext === null || plaintext === undefined) {
    throw new Error('Plaintext must not be null or undefined');
  }
  if (typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a string');
  }

  const keyBuffer = validateKey(key);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypts a ciphertext string produced by encrypt().
 * Expects format: iv:authTag:ciphertext (all base64-encoded).
 *
 * @param {string} ciphertext - The encrypted string to decrypt
 * @param {string} key - 32-byte hex string (64 hex characters)
 * @returns {string} Decrypted plaintext
 */
function decrypt(ciphertext, key) {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid ciphertext format. Expected iv:authTag:ciphertext'
    );
  }

  const keyBuffer = validateKey(key);
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Produces a deterministic HMAC-SHA256 hash for a value.
 * Useful for creating searchable indexes on encrypted fields
 * (e.g., lookup by email without decrypting every row).
 *
 * @param {string} value - The value to hash
 * @param {string} key - 32-byte hex string (64 hex characters)
 * @returns {string} Hex-encoded HMAC hash
 */
function hashDeterministic(value, key) {
  if (value === null || value === undefined) {
    throw new Error('Value must not be null or undefined');
  }
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }

  const keyBuffer = validateKey(key);
  return crypto.createHmac('sha256', keyBuffer).update(value).digest('hex');
}

/**
 * Returns a validated key from the ENCRYPTION_KEY environment variable.
 * Convenience helper so callers don't have to manage the env var themselves.
 */
function getKeyFromEnv() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set'
    );
  }
  validateKey(key); // will throw if invalid
  return key;
}

module.exports = {
  encrypt,
  decrypt,
  hashDeterministic,
  validateKey,
  getKeyFromEnv,
};
