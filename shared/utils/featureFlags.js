/**
 * Simple feature flag and A/B testing framework.
 * Flags are defined in code with optional experiment configuration.
 * User assignment is deterministic based on userId hash.
 */
const crypto = require('crypto');

// Feature flag definitions
const FLAGS = {
  // Example flags - add new ones here
  new_dashboard_layout: {
    enabled: true,
    rolloutPercentage: 100,
    description: 'New customizable dashboard layout',
  },
  dark_mode_default: {
    enabled: false,
    rolloutPercentage: 0,
    description: 'Default to dark mode for new users',
  },
};

// Experiment definitions for A/B testing
const EXPERIMENTS = {
  // Example experiment
  recommendation_algorithm: {
    enabled: true,
    variants: ['control', 'collaborative', 'hybrid'],
    description: 'Test different recommendation algorithms',
  },
  dashboard_kpi_layout: {
    enabled: true,
    variants: ['grid', 'list'],
    description: 'Test KPI widget display format',
  },
};

const featureFlags = {
  /**
   * Check if a feature flag is enabled for a user.
   * Uses deterministic hashing so the same user always gets the same result.
   * @param {string} flagName
   * @param {string} userId - User ID for rollout percentage calculation
   * @returns {boolean}
   */
  isEnabled(flagName, userId) {
    const flag = FLAGS[flagName];
    if (!flag || !flag.enabled) return false;
    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    // Deterministic hash-based rollout
    const hash = crypto
      .createHash('md5')
      .update(`${flagName}:${userId}`)
      .digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;
    return bucket < flag.rolloutPercentage;
  },

  /**
   * Get the experiment variant for a user.
   * Assignment is deterministic based on userId.
   * @param {string} experimentName
   * @param {string} userId
   * @returns {string|null} The variant name, or null if experiment is disabled
   */
  getVariant(experimentName, userId) {
    const experiment = EXPERIMENTS[experimentName];
    if (!experiment || !experiment.enabled) return null;

    const hash = crypto
      .createHash('md5')
      .update(`${experimentName}:${userId}`)
      .digest('hex');
    const bucket = parseInt(hash.substring(0, 8), 16) % experiment.variants.length;
    return experiment.variants[bucket];
  },

  /**
   * Get all flags and their status for a user.
   * Useful for frontend feature flag checks.
   * @param {string} userId
   * @returns {object} Map of flag names to boolean values
   */
  getAllFlags(userId) {
    const result = {};
    for (const flagName of Object.keys(FLAGS)) {
      result[flagName] = this.isEnabled(flagName, userId);
    }
    return result;
  },

  /**
   * Get all experiment assignments for a user.
   * @param {string} userId
   * @returns {object} Map of experiment names to variant strings
   */
  getAllExperiments(userId) {
    const result = {};
    for (const expName of Object.keys(EXPERIMENTS)) {
      result[expName] = this.getVariant(expName, userId);
    }
    return result;
  },

  /**
   * Get both flags and experiments for a user (combined).
   * @param {string} userId
   * @returns {{ flags: object, experiments: object }}
   */
  getUserConfig(userId) {
    return {
      flags: this.getAllFlags(userId),
      experiments: this.getAllExperiments(userId),
    };
  },
};

module.exports = featureFlags;
