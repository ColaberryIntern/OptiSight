const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('@retail-insight/shared');
const emailService = require('./emailService');
const verificationToken = require('../utils/verificationToken');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

/**
 * Business logic for authentication and user operations.
 */
const authService = {
  /**
   * Register a new user.
   * Validates uniqueness, hashes password, persists user record.
   *
   * @param {{ email: string, password: string, role?: string }} data
   * @returns {Promise<{ userId: string, email: string, role: string }>}
   */
  async register({ email, password, role }) {
    // Check for existing user
    const existing = await User.findByEmail(email);
    if (existing) {
      const error = new Error('Email already registered');
      error.statusCode = 409;
      throw error;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Persist user
    const user = await User.create({ email, passwordHash, role });

    logger.info({ message: 'User registered', userId: user.user_id, email });

    // Generate verification token and send verification email
    try {
      const token = verificationToken.generate(user.user_id, email);
      await emailService.sendVerificationEmail(email, token);
    } catch (emailErr) {
      // Email failure should not block registration
      logger.error({ message: 'Failed to send verification email', email, error: emailErr.message });
    }

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    };
  },

  /**
   * Authenticate a user by email + password.
   * Returns a signed JWT and the user profile on success.
   *
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ token: string, user: { userId: string, email: string, role: string } }>}
   */
  async login({ email, password }) {
    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const payload = {
      userId: user.user_id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    logger.info({ message: 'User logged in', userId: user.user_id, email });

    return {
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        email_verified: user.email_verified || false,
      },
    };
  },

  /**
   * Verify a user's email address using a verification token.
   *
   * @param {string} token - JWT verification token
   * @returns {Promise<{ message: string }>}
   */
  async verifyEmail(token) {
    let decoded;
    try {
      decoded = verificationToken.verify(token);
    } catch (err) {
      const error = new Error('Invalid or expired verification token');
      error.statusCode = 400;
      throw error;
    }

    if (decoded.purpose !== 'email_verification') {
      const error = new Error('Invalid token purpose');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.email_verified) {
      return { message: 'Email already verified' };
    }

    await User.updateEmailVerified(decoded.userId);
    logger.info({ message: 'Email verified', userId: decoded.userId, email: decoded.email });

    return { message: 'Email verified successfully' };
  },

  /**
   * Resend a verification email to a user.
   *
   * @param {string} email
   * @returns {Promise<{ message: string }>}
   */
  async resendVerification(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (user.email_verified) {
      const error = new Error('Email is already verified');
      error.statusCode = 400;
      throw error;
    }

    const token = verificationToken.generate(user.user_id, email);
    await emailService.sendVerificationEmail(email, token);

    logger.info({ message: 'Verification email resent', userId: user.user_id, email });

    return { message: 'Verification email sent' };
  },

  /**
   * Retrieve a user profile by ID (no password_hash).
   *
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  },
};

module.exports = authService;
