const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * GDPR/CCPA Compliance Service
 *
 * Handles data export, deletion requests, deletion execution,
 * and consent management for user privacy compliance.
 */
const complianceService = {
  /**
   * Export all user data for a GDPR/CCPA data subject access request.
   * Collects user profile, preferences, onboarding progress, and behavior events.
   * @param {string} userId
   * @returns {Promise<object>} Aggregated user data
   */
  async exportUserData(userId) {
    const user = await db('users')
      .select(
        'user_id',
        'email',
        'role',
        'profile_data',
        'email_verified',
        'consent',
        'consent_updated_at',
        'created_at',
        'updated_at'
      )
      .where({ user_id: userId })
      .first();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const preferences = await db('user_preferences')
      .where({ user_id: userId })
      .first();

    const onboardingProgress = await db('onboarding_progress')
      .where({ user_id: userId })
      .first();

    const behaviorEvents = await db('user_behavior_events')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    return {
      user,
      preferences: preferences || null,
      onboarding_progress: onboardingProgress || null,
      behavior_events: behaviorEvents || [],
      exported_at: new Date().toISOString(),
    };
  },

  /**
   * Request account deletion (soft). Sets deletion_requested_at timestamp.
   * Actual deletion is deferred per GDPR Article 17 grace period.
   * @param {string} userId
   * @returns {Promise<object>} Acknowledgment with scheduled deletion date
   */
  async requestDeletion(userId) {
    const user = await db('users').where({ user_id: userId }).first();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();
    await db('users')
      .where({ user_id: userId })
      .update({ deletion_requested_at: now, updated_at: now });

    // Schedule deletion 30 days from now per GDPR grace period
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    return {
      message: 'Deletion request received. Your account and data will be permanently deleted after the grace period.',
      deletion_requested_at: now.toISOString(),
      scheduled_deletion_date: scheduledDate.toISOString(),
    };
  },

  /**
   * Execute permanent deletion of user data.
   * Removes behavior events, onboarding progress, preferences,
   * then anonymizes the user record (does not hard-delete for audit trail).
   * @param {string} userId
   * @returns {Promise<object>} Confirmation of deletion
   */
  async executeDeletion(userId) {
    const user = await db('users').where({ user_id: userId }).first();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Delete related data in dependency order
    await db('user_behavior_events').where({ user_id: userId }).del();
    await db('onboarding_progress').where({ user_id: userId }).del();
    await db('user_preferences').where({ user_id: userId }).del();

    // Anonymize user record rather than hard-delete (for audit trail integrity)
    const anonymizedEmail = `deleted_${uuidv4()}@deleted.com`;
    await db('users')
      .where({ user_id: userId })
      .update({
        email: anonymizedEmail,
        password_hash: 'DELETED',
        profile_data: JSON.stringify({}),
        consent: JSON.stringify({ analytics: false, marketing: false, data_sharing: false }),
        updated_at: new Date(),
      });

    return {
      message: 'User data has been permanently deleted and account anonymized.',
      anonymized_email: anonymizedEmail,
    };
  },

  /**
   * Update user consent preferences.
   * @param {string} userId
   * @param {object} consentData - { analytics?: boolean, marketing?: boolean, data_sharing?: boolean }
   * @returns {Promise<object>} Updated consent record
   */
  async updateConsent(userId, consentData) {
    const user = await db('users').where({ user_id: userId }).first();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Merge with existing consent to allow partial updates
    const existingConsent = typeof user.consent === 'string'
      ? JSON.parse(user.consent)
      : (user.consent || { analytics: false, marketing: false, data_sharing: false });

    const updatedConsent = {
      analytics: consentData.analytics !== undefined ? consentData.analytics : existingConsent.analytics,
      marketing: consentData.marketing !== undefined ? consentData.marketing : existingConsent.marketing,
      data_sharing: consentData.data_sharing !== undefined ? consentData.data_sharing : existingConsent.data_sharing,
    };

    const now = new Date();
    await db('users')
      .where({ user_id: userId })
      .update({
        consent: JSON.stringify(updatedConsent),
        consent_updated_at: now,
        updated_at: now,
      });

    return {
      consent: updatedConsent,
      consent_updated_at: now.toISOString(),
    };
  },

  /**
   * Get current consent settings for a user.
   * @param {string} userId
   * @returns {Promise<object>} Current consent object
   */
  async getConsent(userId) {
    const user = await db('users')
      .select('consent', 'consent_updated_at')
      .where({ user_id: userId })
      .first();

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const consent = typeof user.consent === 'string'
      ? JSON.parse(user.consent)
      : (user.consent || { analytics: false, marketing: false, data_sharing: false });

    return {
      consent,
      consent_updated_at: user.consent_updated_at || null,
    };
  },
};

module.exports = complianceService;
