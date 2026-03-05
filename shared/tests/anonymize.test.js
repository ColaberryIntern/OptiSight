const anonymize = require('../utils/anonymize');

describe('anonymize utility', () => {
  describe('hashValue', () => {
    it('returns a consistent hash for the same input', () => {
      const hash1 = anonymize.hashValue('test@example.com');
      const hash2 = anonymize.hashValue('test@example.com');
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different inputs', () => {
      const hash1 = anonymize.hashValue('user1');
      const hash2 = anonymize.hashValue('user2');
      expect(hash1).not.toBe(hash2);
    });

    it('returns null for null/undefined input', () => {
      expect(anonymize.hashValue(null)).toBeNull();
      expect(anonymize.hashValue(undefined)).toBeNull();
      expect(anonymize.hashValue('')).toBeNull();
    });

    it('returns a 16-character hex string', () => {
      const hash = anonymize.hashValue('test');
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('hashEmail', () => {
    it('preserves domain while hashing local part', () => {
      const result = anonymize.hashEmail('john@example.com');
      expect(result).toMatch(/^[a-f0-9]{8}@example\.com$/);
    });

    it('returns null for invalid email', () => {
      expect(anonymize.hashEmail('notanemail')).toBeNull();
      expect(anonymize.hashEmail(null)).toBeNull();
    });

    it('produces consistent results', () => {
      const r1 = anonymize.hashEmail('john@example.com');
      const r2 = anonymize.hashEmail('john@example.com');
      expect(r1).toBe(r2);
    });
  });

  describe('hashUserId', () => {
    it('returns a hashed user ID', () => {
      const result = anonymize.hashUserId('user-123-abc');
      expect(result).toMatch(/^[a-f0-9]{16}$/);
    });

    it('produces consistent results', () => {
      const r1 = anonymize.hashUserId('user-123');
      const r2 = anonymize.hashUserId('user-123');
      expect(r1).toBe(r2);
    });
  });

  describe('anonymizeFields', () => {
    it('anonymizes specified fields', () => {
      const data = { email: 'john@example.com', name: 'John', userId: 'abc-123' };
      const result = anonymize.anonymizeFields(data, ['email', 'userId']);
      expect(result.email).toMatch(/^[a-f0-9]{8}@example\.com$/);
      expect(result.userId).toMatch(/^[a-f0-9]{16}$/);
      expect(result.name).toBe('John'); // Untouched
    });

    it('handles null data', () => {
      expect(anonymize.anonymizeFields(null, ['email'])).toBeNull();
    });

    it('preserves fields not in the list', () => {
      const data = { email: 'test@test.com', role: 'admin' };
      const result = anonymize.anonymizeFields(data, ['email']);
      expect(result.role).toBe('admin');
    });

    it('skips null field values', () => {
      const data = { email: null, name: 'John' };
      const result = anonymize.anonymizeFields(data, ['email']);
      expect(result.email).toBeNull();
    });
  });

  describe('anonymizeRecords', () => {
    it('anonymizes an array of records', () => {
      const records = [
        { email: 'a@b.com', name: 'A' },
        { email: 'c@d.com', name: 'C' },
      ];
      const result = anonymize.anonymizeRecords(records, ['email']);
      expect(result).toHaveLength(2);
      expect(result[0].email).toMatch(/@b\.com$/);
      expect(result[1].email).toMatch(/@d\.com$/);
      expect(result[0].name).toBe('A');
    });

    it('handles non-array input', () => {
      expect(anonymize.anonymizeRecords(null, ['email'])).toBeNull();
      expect(anonymize.anonymizeRecords('not array', ['email'])).toBe('not array');
    });
  });
});
