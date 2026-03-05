const authService = require('../services/authService');

/**
 * Express route handlers for authentication endpoints.
 * Each handler delegates to authService and formats the HTTP response.
 * Errors are forwarded to the shared errorHandler via next().
 */
const authController = {
  /**
   * POST /api/v1/users/register
   */
  async register(req, res, next) {
    try {
      const { email, password, role } = req.body;
      const result = await authService.register({ email, password, role });
      return res.status(201).json({
        userId: result.userId,
        email: result.email,
        role: result.role,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/users/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      return res.status(200).json({
        token: result.token,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/users/verify-email/:token
   */
  async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;
      const result = await authService.verifyEmail(token);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/users/resend-verification
   */
  async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.resendVerification(email);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/users/feature-flags
   */
  async getFeatureFlags(req, res, next) {
    try {
      const { featureFlags } = require('@retail-insight/shared');
      const userId = req.user.userId;
      const config = featureFlags.getUserConfig(userId);
      return res.status(200).json(config);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/users/:userId
   */
  async getProfile(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await authService.getUserProfile(userId);
      return res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
