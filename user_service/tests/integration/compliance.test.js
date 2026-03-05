const complianceService = require('../../src/services/complianceService');

// Mock the database module
jest.mock('../../src/config/db', () => {
  const mockDb = jest.fn((table) => mockDb._tables[table] || mockDb._defaultChain);
  mockDb._tables = {};
  mockDb._defaultChain = {};

  // Helper to create a chainable query builder mock
  function createChain(overrides = {}) {
    const chain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockResolvedValue(null),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{}]),
      then: undefined, // prevent auto-resolution
      ...overrides,
    };
    return chain;
  }

  mockDb._createChain = createChain;
  mockDb.fn = { now: jest.fn().mockReturnValue('NOW()'), uuid: jest.fn().mockReturnValue('mock-uuid') };

  return mockDb;
});

const db = require('../../src/config/db');

// Helper to set up table mocks
function mockTable(tableName, chain) {
  db._tables[tableName] = chain;
}

describe('complianceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset table mocks
    db._tables = {};
  });

  // ---------------------------------------------------------------
  // exportUserData
  // ---------------------------------------------------------------
  describe('exportUserData', () => {
    it('should return aggregated user data including profile, preferences, onboarding, and events', async () => {
      const mockUser = {
        user_id: 'u1',
        email: 'test@example.com',
        role: 'executive',
        profile_data: '{}',
        email_verified: true,
        consent: '{"analytics":true,"marketing":false,"data_sharing":false}',
        consent_updated_at: '2026-01-01T00:00:00Z',
        created_at: '2025-12-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      const mockPrefs = { user_id: 'u1', dashboard_layout: '{}' };
      const mockOnboarding = { user_id: 'u1', current_step: 3, is_complete: false };
      const mockEvents = [
        { event_id: 'e1', event_type: 'page_view', created_at: '2026-01-15T00:00:00Z' },
      ];

      // users table
      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(mockUser);
      mockTable('users', usersChain);

      // user_preferences table
      const prefsChain = db._createChain();
      prefsChain.first.mockResolvedValue(mockPrefs);
      mockTable('user_preferences', prefsChain);

      // onboarding_progress table
      const onboardingChain = db._createChain();
      onboardingChain.first.mockResolvedValue(mockOnboarding);
      mockTable('onboarding_progress', onboardingChain);

      // user_behavior_events table — returns array (no .first())
      const eventsChain = db._createChain();
      // Override orderBy to resolve to array
      eventsChain.orderBy.mockResolvedValue(mockEvents);
      mockTable('user_behavior_events', eventsChain);

      const result = await complianceService.exportUserData('u1');

      expect(result.user).toEqual(mockUser);
      expect(result.preferences).toEqual(mockPrefs);
      expect(result.onboarding_progress).toEqual(mockOnboarding);
      expect(result.behavior_events).toEqual(mockEvents);
      expect(result.exported_at).toBeDefined();
    });

    it('should throw 404 when user is not found', async () => {
      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(null);
      mockTable('users', usersChain);

      await expect(complianceService.exportUserData('nonexistent'))
        .rejects.toThrow('User not found');
    });
  });

  // ---------------------------------------------------------------
  // updateConsent
  // ---------------------------------------------------------------
  describe('updateConsent', () => {
    it('should update consent and return updated consent object', async () => {
      const existingUser = {
        user_id: 'u1',
        consent: '{"analytics":false,"marketing":false,"data_sharing":false}',
      };

      const usersChain = db._createChain();
      // first() is called twice: once for existence check, once in the method
      usersChain.first.mockResolvedValue(existingUser);
      usersChain.update.mockResolvedValue(1);
      mockTable('users', usersChain);

      const result = await complianceService.updateConsent('u1', {
        analytics: true,
        marketing: true,
      });

      expect(result.consent.analytics).toBe(true);
      expect(result.consent.marketing).toBe(true);
      expect(result.consent.data_sharing).toBe(false);
      expect(result.consent_updated_at).toBeDefined();
    });
  });

  // ---------------------------------------------------------------
  // getConsent
  // ---------------------------------------------------------------
  describe('getConsent', () => {
    it('should return current consent settings', async () => {
      const mockUser = {
        consent: '{"analytics":true,"marketing":false,"data_sharing":true}',
        consent_updated_at: '2026-02-01T00:00:00Z',
      };

      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(mockUser);
      mockTable('users', usersChain);

      const result = await complianceService.getConsent('u1');

      expect(result.consent).toEqual({
        analytics: true,
        marketing: false,
        data_sharing: true,
      });
      expect(result.consent_updated_at).toBe('2026-02-01T00:00:00Z');
    });

    it('should throw 404 when user is not found', async () => {
      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(null);
      mockTable('users', usersChain);

      await expect(complianceService.getConsent('nonexistent'))
        .rejects.toThrow('User not found');
    });
  });

  // ---------------------------------------------------------------
  // requestDeletion
  // ---------------------------------------------------------------
  describe('requestDeletion', () => {
    it('should set deletion_requested_at and return scheduled deletion date', async () => {
      const mockUser = { user_id: 'u1', email: 'test@example.com' };

      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(mockUser);
      usersChain.update.mockResolvedValue(1);
      mockTable('users', usersChain);

      const result = await complianceService.requestDeletion('u1');

      expect(result.message).toMatch(/deletion request received/i);
      expect(result.deletion_requested_at).toBeDefined();
      expect(result.scheduled_deletion_date).toBeDefined();

      // Verify scheduled date is ~30 days in the future
      const requested = new Date(result.deletion_requested_at);
      const scheduled = new Date(result.scheduled_deletion_date);
      const diffDays = Math.round((scheduled - requested) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });
  });

  // ---------------------------------------------------------------
  // executeDeletion
  // ---------------------------------------------------------------
  describe('executeDeletion', () => {
    it('should delete related data and anonymize user record', async () => {
      const mockUser = { user_id: 'u1', email: 'test@example.com' };

      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(mockUser);
      usersChain.update.mockResolvedValue(1);
      mockTable('users', usersChain);

      const eventsChain = db._createChain();
      eventsChain.del.mockResolvedValue(5);
      mockTable('user_behavior_events', eventsChain);

      const onboardingChain = db._createChain();
      onboardingChain.del.mockResolvedValue(1);
      mockTable('onboarding_progress', onboardingChain);

      const prefsChain = db._createChain();
      prefsChain.del.mockResolvedValue(1);
      mockTable('user_preferences', prefsChain);

      const result = await complianceService.executeDeletion('u1');

      expect(result.message).toMatch(/permanently deleted/i);
      expect(result.anonymized_email).toMatch(/^deleted_.*@deleted\.com$/);
    });

    it('should throw 404 when user is not found', async () => {
      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(null);
      mockTable('users', usersChain);

      await expect(complianceService.executeDeletion('nonexistent'))
        .rejects.toThrow('User not found');
    });
  });

  // ---------------------------------------------------------------
  // Route authentication (testing via service-level contracts)
  // ---------------------------------------------------------------
  describe('authentication requirement', () => {
    it('should require a valid user (service throws for non-existent users)', async () => {
      const usersChain = db._createChain();
      usersChain.first.mockResolvedValue(null);
      mockTable('users', usersChain);

      // All service methods should reject for non-existent users
      await expect(complianceService.exportUserData('bad-id')).rejects.toThrow('User not found');
      await expect(complianceService.getConsent('bad-id')).rejects.toThrow('User not found');
      await expect(complianceService.updateConsent('bad-id', {})).rejects.toThrow('User not found');
      await expect(complianceService.requestDeletion('bad-id')).rejects.toThrow('User not found');
      await expect(complianceService.executeDeletion('bad-id')).rejects.toThrow('User not found');
    });
  });
});
