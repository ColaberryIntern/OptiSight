// Set environment variables before requiring any modules
process.env.JWT_SECRET = 'unit-test-secret';
process.env.NODE_ENV = 'development';

// Mock the User model
jest.mock('../../src/models/User');
// Mock the shared logger
jest.mock('@retail-insight/shared', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
// Mock nodemailer (emailService depends on it)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

const User = require('../../src/models/User');
const { logger } = require('@retail-insight/shared');
const verificationToken = require('../../src/utils/verificationToken');
const emailService = require('../../src/services/emailService');
const authService = require('../../src/services/authService');

describe('Email Verification Flow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // emailService
  // -------------------------------------------------------------------
  describe('emailService', () => {
    describe('sendVerificationEmail', () => {
      it('logs the verification URL in dev mode (no transporter)', async () => {
        await emailService.sendVerificationEmail('user@example.com', 'some-token');

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Verification email (dev mode)',
            email: 'user@example.com',
            verifyUrl: expect.stringContaining('/api/v1/users/verify-email/some-token'),
          })
        );
      });

      it('includes the correct base URL in the verify URL', async () => {
        const originalBaseUrl = process.env.APP_BASE_URL;
        process.env.APP_BASE_URL = 'https://app.optisight.ai';

        await emailService.sendVerificationEmail('user@example.com', 'abc-token');

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            verifyUrl: 'https://app.optisight.ai/api/v1/users/verify-email/abc-token',
          })
        );

        // Restore
        if (originalBaseUrl) {
          process.env.APP_BASE_URL = originalBaseUrl;
        } else {
          delete process.env.APP_BASE_URL;
        }
      });
    });

    describe('sendNotificationEmail', () => {
      it('logs the notification email in dev mode', async () => {
        await emailService.sendNotificationEmail(
          'user@example.com',
          'Test Subject',
          '<p>Test content</p>'
        );

        expect(logger.info).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Email (dev mode)',
            email: 'user@example.com',
            subject: 'Test Subject',
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------
  // authService.verifyEmail
  // -------------------------------------------------------------------
  describe('authService.verifyEmail', () => {
    it('verifies email successfully with a valid token', async () => {
      const token = verificationToken.generate('user-123', 'user@example.com');

      User.findById.mockResolvedValue({
        user_id: 'user-123',
        email: 'user@example.com',
        email_verified: false,
      });
      User.updateEmailVerified.mockResolvedValue(1);

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(User.updateEmailVerified).toHaveBeenCalledWith('user-123');
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Email verified',
          userId: 'user-123',
        })
      );
    });

    it('returns already-verified message if user is already verified', async () => {
      const token = verificationToken.generate('user-123', 'user@example.com');

      User.findById.mockResolvedValue({
        user_id: 'user-123',
        email: 'user@example.com',
        email_verified: true,
      });

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({ message: 'Email already verified' });
      expect(User.updateEmailVerified).not.toHaveBeenCalled();
    });

    it('throws 400 for an invalid token', async () => {
      await expect(
        authService.verifyEmail('invalid.token.here')
      ).rejects.toMatchObject({
        message: 'Invalid or expired verification token',
        statusCode: 400,
      });
    });

    it('throws 400 for an expired token', async () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 'user-123', email: 'user@example.com', purpose: 'email_verification' },
        process.env.JWT_SECRET + '_email_verify',
        { expiresIn: '0s' }
      );

      await expect(
        authService.verifyEmail(expiredToken)
      ).rejects.toMatchObject({
        message: 'Invalid or expired verification token',
        statusCode: 400,
      });
    });

    it('throws 404 when user not found for valid token', async () => {
      const token = verificationToken.generate('nonexistent-user', 'missing@example.com');
      User.findById.mockResolvedValue(null);

      await expect(
        authService.verifyEmail(token)
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      });
    });
  });

  // -------------------------------------------------------------------
  // authService.resendVerification
  // -------------------------------------------------------------------
  describe('authService.resendVerification', () => {
    it('resends verification email for an unverified user', async () => {
      User.findByEmail.mockResolvedValue({
        user_id: 'user-456',
        email: 'unverified@example.com',
        email_verified: false,
      });

      const result = await authService.resendVerification('unverified@example.com');

      expect(result).toEqual({ message: 'Verification email sent' });
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Verification email resent',
          userId: 'user-456',
        })
      );
    });

    it('throws 400 if email is already verified', async () => {
      User.findByEmail.mockResolvedValue({
        user_id: 'user-789',
        email: 'verified@example.com',
        email_verified: true,
      });

      await expect(
        authService.resendVerification('verified@example.com')
      ).rejects.toMatchObject({
        message: 'Email is already verified',
        statusCode: 400,
      });
    });

    it('throws 404 if user not found', async () => {
      User.findByEmail.mockResolvedValue(null);

      await expect(
        authService.resendVerification('nobody@example.com')
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      });
    });
  });

  // -------------------------------------------------------------------
  // authService.login includes email_verified
  // -------------------------------------------------------------------
  describe('authService.login email_verified in response', () => {
    it('includes email_verified false for unverified user', async () => {
      const bcrypt = require('bcryptjs');
      const storedHash = bcrypt.hashSync('Correct!1', 10);

      User.findByEmail.mockResolvedValue({
        user_id: 'user-login-1',
        email: 'login@example.com',
        role: 'manager',
        password_hash: storedHash,
        email_verified: false,
      });

      const result = await authService.login({
        email: 'login@example.com',
        password: 'Correct!1',
      });

      expect(result.user.email_verified).toBe(false);
    });

    it('includes email_verified true for verified user', async () => {
      const bcrypt = require('bcryptjs');
      const storedHash = bcrypt.hashSync('Correct!1', 10);

      User.findByEmail.mockResolvedValue({
        user_id: 'user-login-2',
        email: 'verified-login@example.com',
        role: 'admin',
        password_hash: storedHash,
        email_verified: true,
      });

      const result = await authService.login({
        email: 'verified-login@example.com',
        password: 'Correct!1',
      });

      expect(result.user.email_verified).toBe(true);
    });
  });
});
