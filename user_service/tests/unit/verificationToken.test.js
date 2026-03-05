// Set JWT_SECRET before requiring the module
process.env.JWT_SECRET = 'unit-test-secret';

const jwt = require('jsonwebtoken');
const verificationToken = require('../../src/utils/verificationToken');

const VERIFICATION_SECRET = process.env.JWT_SECRET + '_email_verify';

describe('verificationToken', () => {
  const userId = 'user-abc-123';
  const email = 'test@example.com';

  describe('generate', () => {
    it('returns a non-empty string', () => {
      const token = verificationToken.generate(userId, email);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('produces a valid JWT with correct payload', () => {
      const token = verificationToken.generate(userId, email);
      const decoded = jwt.verify(token, VERIFICATION_SECRET);

      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.purpose).toBe('email_verification');
      expect(decoded.exp).toBeDefined();
    });
  });

  describe('verify', () => {
    it('returns the correct payload for a valid token', () => {
      const token = verificationToken.generate(userId, email);
      const decoded = verificationToken.verify(token);

      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.purpose).toBe('email_verification');
    });

    it('throws on a tampered token', () => {
      const token = verificationToken.generate(userId, email);
      // Tamper with the token by changing a character in the payload section
      const parts = token.split('.');
      parts[1] = parts[1] + 'x';
      const tampered = parts.join('.');

      expect(() => verificationToken.verify(tampered)).toThrow();
    });

    it('throws on a token signed with a different secret', () => {
      const wrongToken = jwt.sign(
        { userId, email, purpose: 'email_verification' },
        'wrong_secret',
        { expiresIn: '24h' }
      );

      expect(() => verificationToken.verify(wrongToken)).toThrow();
    });

    it('throws on an expired token', () => {
      // Create a token that is already expired
      const expiredToken = jwt.sign(
        { userId, email, purpose: 'email_verification' },
        VERIFICATION_SECRET,
        { expiresIn: '0s' }
      );

      expect(() => verificationToken.verify(expiredToken)).toThrow();
    });
  });
});
