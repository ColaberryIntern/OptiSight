const { Router } = require('express');
const { body } = require('express-validator');
const { authMiddleware, validationMiddleware } = require('@retail-insight/shared');
const authController = require('../controllers/authController');

const { validate } = validationMiddleware;

const router = Router();

/**
 * POST /api/v1/users/register
 * Public endpoint - creates a new user account.
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('A valid email address is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>_\-+=\\[\]\/`~;']/)
      .withMessage('Password must contain at least one special character'),
    body('role')
      .optional()
      .isIn(['admin', 'executive', 'manager'])
      .withMessage('Role must be admin, executive, or manager'),
  ],
  validate,
  authController.register
);

/**
 * POST /api/v1/users/login
 * Public endpoint - authenticates and returns a JWT.
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('A valid email address is required'),
    body('password')
      .exists({ checkFalsy: true })
      .withMessage('Password is required'),
  ],
  validate,
  authController.login
);

/**
 * GET /api/v1/users/verify-email/:token
 * Public endpoint - verifies a user's email address via token.
 */
router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

/**
 * POST /api/v1/users/resend-verification
 * Protected endpoint - resends the verification email.
 */
router.post(
  '/resend-verification',
  authMiddleware,
  authController.resendVerification
);

/**
 * GET /api/v1/users/feature-flags
 * Protected endpoint - returns feature flags and experiment variants for the authenticated user.
 */
router.get(
  '/feature-flags',
  authMiddleware,
  authController.getFeatureFlags
);

/**
 * GET /api/v1/users/:userId
 * Protected endpoint - returns user profile.
 */
router.get(
  '/:userId',
  authMiddleware,
  authController.getProfile
);

module.exports = router;
