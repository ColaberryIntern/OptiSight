const featureFlags = require('../utils/featureFlags');

describe('featureFlags', () => {
  describe('isEnabled()', () => {
    test('returns false for a disabled flag', () => {
      expect(featureFlags.isEnabled('dark_mode_default', 'user-123')).toBe(false);
    });

    test('returns true for a flag with 100% rollout', () => {
      expect(featureFlags.isEnabled('new_dashboard_layout', 'user-123')).toBe(true);
    });

    test('returns false for a flag with 0% rollout', () => {
      // dark_mode_default has rolloutPercentage 0 AND enabled false,
      // but this tests the 0% path as well
      expect(featureFlags.isEnabled('dark_mode_default', 'user-456')).toBe(false);
    });

    test('returns false for a non-existent flag', () => {
      expect(featureFlags.isEnabled('does_not_exist', 'user-123')).toBe(false);
    });

    test('is deterministic — same user always gets the same result', () => {
      const result1 = featureFlags.isEnabled('new_dashboard_layout', 'user-abc');
      const result2 = featureFlags.isEnabled('new_dashboard_layout', 'user-abc');
      const result3 = featureFlags.isEnabled('new_dashboard_layout', 'user-abc');
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('getVariant()', () => {
    test('returns null for a disabled experiment', () => {
      // No disabled experiment in defaults, so test with a non-existent one
      expect(featureFlags.getVariant('non_existent_experiment', 'user-123')).toBeNull();
    });

    test('returns a valid variant for an enabled experiment', () => {
      const variant = featureFlags.getVariant('recommendation_algorithm', 'user-123');
      expect(['control', 'collaborative', 'hybrid']).toContain(variant);
    });

    test('returns a valid variant for dashboard_kpi_layout experiment', () => {
      const variant = featureFlags.getVariant('dashboard_kpi_layout', 'user-123');
      expect(['grid', 'list']).toContain(variant);
    });

    test('is deterministic — same user always gets the same variant', () => {
      const variant1 = featureFlags.getVariant('recommendation_algorithm', 'user-xyz');
      const variant2 = featureFlags.getVariant('recommendation_algorithm', 'user-xyz');
      const variant3 = featureFlags.getVariant('recommendation_algorithm', 'user-xyz');
      expect(variant1).toBe(variant2);
      expect(variant2).toBe(variant3);
    });

    test('different users can get different variants', () => {
      // With enough users, we should see at least two different variants
      const variants = new Set();
      for (let i = 0; i < 100; i++) {
        variants.add(featureFlags.getVariant('recommendation_algorithm', `user-${i}`));
      }
      expect(variants.size).toBeGreaterThan(1);
    });
  });

  describe('getAllFlags()', () => {
    test('returns all flags with boolean values', () => {
      const flags = featureFlags.getAllFlags('user-123');
      expect(flags).toHaveProperty('new_dashboard_layout');
      expect(flags).toHaveProperty('dark_mode_default');
      expect(typeof flags.new_dashboard_layout).toBe('boolean');
      expect(typeof flags.dark_mode_default).toBe('boolean');
    });

    test('new_dashboard_layout is true (100% rollout)', () => {
      const flags = featureFlags.getAllFlags('user-123');
      expect(flags.new_dashboard_layout).toBe(true);
    });

    test('dark_mode_default is false (disabled)', () => {
      const flags = featureFlags.getAllFlags('user-123');
      expect(flags.dark_mode_default).toBe(false);
    });
  });

  describe('getAllExperiments()', () => {
    test('returns all experiments with string or null values', () => {
      const experiments = featureFlags.getAllExperiments('user-123');
      expect(experiments).toHaveProperty('recommendation_algorithm');
      expect(experiments).toHaveProperty('dashboard_kpi_layout');
    });

    test('enabled experiments return string variants', () => {
      const experiments = featureFlags.getAllExperiments('user-123');
      expect(typeof experiments.recommendation_algorithm).toBe('string');
      expect(typeof experiments.dashboard_kpi_layout).toBe('string');
    });
  });

  describe('getUserConfig()', () => {
    test('returns both flags and experiments', () => {
      const config = featureFlags.getUserConfig('user-123');
      expect(config).toHaveProperty('flags');
      expect(config).toHaveProperty('experiments');
      expect(typeof config.flags).toBe('object');
      expect(typeof config.experiments).toBe('object');
    });

    test('flags contain expected keys', () => {
      const config = featureFlags.getUserConfig('user-123');
      expect(config.flags).toHaveProperty('new_dashboard_layout');
      expect(config.flags).toHaveProperty('dark_mode_default');
    });

    test('experiments contain expected keys', () => {
      const config = featureFlags.getUserConfig('user-123');
      expect(config.experiments).toHaveProperty('recommendation_algorithm');
      expect(config.experiments).toHaveProperty('dashboard_kpi_layout');
    });
  });
});
