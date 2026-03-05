const crypto = require('crypto');
const {
  encrypt,
  decrypt,
  hashDeterministic,
  validateKey,
  getKeyFromEnv,
} = require('../utils/encryption');
const {
  decryptRequestFields,
  encryptResponseFields,
  getNestedValue,
  setNestedValue,
} = require('../middleware/encryptionMiddleware');

// Valid 32-byte hex key for tests
const TEST_KEY = crypto.randomBytes(32).toString('hex');
// A second valid key for wrong-key tests
const WRONG_KEY = crypto.randomBytes(32).toString('hex');

// ─── encryption.js ──────────────────────────────────────────────────────────

describe('encrypt / decrypt', () => {
  test('round-trip: decrypt(encrypt(text)) returns original text', () => {
    const plaintext = 'user@example.com';
    const ciphertext = encrypt(plaintext, TEST_KEY);
    expect(decrypt(ciphertext, TEST_KEY)).toBe(plaintext);
  });

  test('encrypts empty string and decrypts back', () => {
    const ciphertext = encrypt('', TEST_KEY);
    expect(decrypt(ciphertext, TEST_KEY)).toBe('');
  });

  test('encrypting the same plaintext twice produces different ciphertexts (random IV)', () => {
    const plaintext = 'sensitive-data';
    const a = encrypt(plaintext, TEST_KEY);
    const b = encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
    // Both still decrypt to the same value
    expect(decrypt(a, TEST_KEY)).toBe(plaintext);
    expect(decrypt(b, TEST_KEY)).toBe(plaintext);
  });

  test('ciphertext format is iv:authTag:data (3 colon-separated base64 parts)', () => {
    const ciphertext = encrypt('hello', TEST_KEY);
    const parts = ciphertext.split(':');
    expect(parts).toHaveLength(3);
    // Each part should be valid base64
    for (const part of parts) {
      expect(() => Buffer.from(part, 'base64')).not.toThrow();
    }
  });

  test('decryption with wrong key throws', () => {
    const ciphertext = encrypt('secret', TEST_KEY);
    expect(() => decrypt(ciphertext, WRONG_KEY)).toThrow();
  });

  test('tampered ciphertext fails GCM authentication', () => {
    const ciphertext = encrypt('secret', TEST_KEY);
    const parts = ciphertext.split(':');
    // Tamper with the encrypted data portion
    const tamperedData = Buffer.from(parts[2], 'base64');
    tamperedData[0] ^= 0xff;
    parts[2] = tamperedData.toString('base64');
    const tampered = parts.join(':');
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });

  test('tampered auth tag fails GCM authentication', () => {
    const ciphertext = encrypt('secret', TEST_KEY);
    const parts = ciphertext.split(':');
    // Tamper with the auth tag
    const tamperedTag = Buffer.from(parts[1], 'base64');
    tamperedTag[0] ^= 0xff;
    parts[1] = tamperedTag.toString('base64');
    const tampered = parts.join(':');
    expect(() => decrypt(tampered, TEST_KEY)).toThrow();
  });

  test('encrypt throws on null or undefined plaintext', () => {
    expect(() => encrypt(null, TEST_KEY)).toThrow('must not be null');
    expect(() => encrypt(undefined, TEST_KEY)).toThrow('must not be null');
  });

  test('encrypt throws on non-string plaintext', () => {
    expect(() => encrypt(42, TEST_KEY)).toThrow('must be a string');
  });

  test('decrypt throws on invalid ciphertext format', () => {
    expect(() => decrypt('not-valid', TEST_KEY)).toThrow('Invalid ciphertext format');
    expect(() => decrypt('a:b', TEST_KEY)).toThrow('Invalid ciphertext format');
    expect(() => decrypt('', TEST_KEY)).toThrow();
  });

  test('handles unicode and multi-byte characters', () => {
    const plaintext = 'Hello \u4e16\u754c \ud83d\ude80 caf\u00e9';
    const ciphertext = encrypt(plaintext, TEST_KEY);
    expect(decrypt(ciphertext, TEST_KEY)).toBe(plaintext);
  });
});

// ─── hashDeterministic ──────────────────────────────────────────────────────

describe('hashDeterministic', () => {
  test('produces same hash for same input and key', () => {
    const a = hashDeterministic('user@example.com', TEST_KEY);
    const b = hashDeterministic('user@example.com', TEST_KEY);
    expect(a).toBe(b);
  });

  test('produces different hash for different inputs', () => {
    const a = hashDeterministic('user@example.com', TEST_KEY);
    const b = hashDeterministic('other@example.com', TEST_KEY);
    expect(a).not.toBe(b);
  });

  test('produces different hash with different key', () => {
    const a = hashDeterministic('user@example.com', TEST_KEY);
    const b = hashDeterministic('user@example.com', WRONG_KEY);
    expect(a).not.toBe(b);
  });

  test('returns a 64-character hex string (SHA-256)', () => {
    const hash = hashDeterministic('test', TEST_KEY);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('throws on null or undefined value', () => {
    expect(() => hashDeterministic(null, TEST_KEY)).toThrow('must not be null');
    expect(() => hashDeterministic(undefined, TEST_KEY)).toThrow('must not be null');
  });
});

// ─── validateKey ────────────────────────────────────────────────────────────

describe('validateKey', () => {
  test('accepts a valid 64-character hex string', () => {
    expect(() => validateKey(TEST_KEY)).not.toThrow();
  });

  test('rejects short key', () => {
    expect(() => validateKey('abcd1234')).toThrow('64-character hex');
  });

  test('rejects non-hex characters', () => {
    expect(() => validateKey('g'.repeat(64))).toThrow('64-character hex');
  });

  test('rejects null and empty string', () => {
    expect(() => validateKey(null)).toThrow('non-empty string');
    expect(() => validateKey('')).toThrow('non-empty string');
  });
});

// ─── getKeyFromEnv ──────────────────────────────────────────────────────────

describe('getKeyFromEnv', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  test('returns key when ENCRYPTION_KEY is set and valid', () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    expect(getKeyFromEnv()).toBe(TEST_KEY);
  });

  test('throws when ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => getKeyFromEnv()).toThrow('ENCRYPTION_KEY environment variable');
  });
});

// ─── encryptionMiddleware ───────────────────────────────────────────────────

describe('encryptionMiddleware', () => {
  describe('encryptResponseFields', () => {
    test('encrypts specified fields in res.json output', () => {
      const middleware = encryptResponseFields(['email'], { key: TEST_KEY });
      const originalJson = jest.fn();
      const res = { json: originalJson };
      const next = jest.fn();

      middleware({}, res, next);
      expect(next).toHaveBeenCalled();

      // Call the wrapped res.json
      res.json({ email: 'user@example.com', name: 'Alice' });

      // originalJson should have been called with the mutated body
      expect(originalJson).toHaveBeenCalledTimes(1);
      const sentBody = originalJson.mock.calls[0][0];
      expect(sentBody.email).not.toBe('user@example.com');
      expect(sentBody.email.split(':')).toHaveLength(3);
      // name should be untouched
      expect(sentBody.name).toBe('Alice');
      // encrypted email should decrypt back
      expect(decrypt(sentBody.email, TEST_KEY)).toBe('user@example.com');
    });

    test('handles nested fields with dot notation', () => {
      const middleware = encryptResponseFields(['user.email'], { key: TEST_KEY });
      const originalJson = jest.fn();
      const res = { json: originalJson };
      const next = jest.fn();

      middleware({}, res, next);
      res.json({ user: { email: 'test@test.com', id: 1 } });

      const sentBody = originalJson.mock.calls[0][0];
      expect(sentBody.user.id).toBe(1);
      expect(decrypt(sentBody.user.email, TEST_KEY)).toBe('test@test.com');
    });

    test('throws if fields argument is empty', () => {
      expect(() => encryptResponseFields([])).toThrow('non-empty array');
    });
  });

  describe('decryptRequestFields', () => {
    test('decrypts specified fields in req.body', () => {
      const encrypted = encrypt('user@example.com', TEST_KEY);
      const middleware = decryptRequestFields(['email'], { key: TEST_KEY });
      const req = { body: { email: encrypted, name: 'Alice' } };
      const next = jest.fn();

      middleware(req, {}, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBe('user@example.com');
      expect(req.body.name).toBe('Alice');
    });

    test('skips decryption when req.body is missing', () => {
      const middleware = decryptRequestFields(['email'], { key: TEST_KEY });
      const req = {};
      const next = jest.fn();

      middleware(req, {}, next);
      expect(next).toHaveBeenCalled();
    });

    test('throws if fields argument is empty', () => {
      expect(() => decryptRequestFields([])).toThrow('non-empty array');
    });
  });

  describe('getNestedValue / setNestedValue', () => {
    test('gets and sets deeply nested values', () => {
      const obj = { a: { b: { c: 'deep' } } };
      expect(getNestedValue(obj, 'a.b.c')).toBe('deep');

      setNestedValue(obj, 'a.b.c', 'changed');
      expect(obj.a.b.c).toBe('changed');
    });

    test('getNestedValue returns undefined for missing path', () => {
      expect(getNestedValue({ a: 1 }, 'b.c')).toBeUndefined();
    });
  });
});
