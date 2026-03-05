exports.up = function(knex) {
  return knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_user_preferences_layout ON user_preferences USING GIN (dashboard_layout);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_widgets ON user_preferences USING GIN (favorite_widgets);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_notifications ON user_preferences USING GIN (notification_settings);
    CREATE INDEX IF NOT EXISTS idx_behavior_events_data ON user_behavior_events USING GIN (event_data);
    CREATE INDEX IF NOT EXISTS idx_onboarding_steps ON onboarding_progress USING GIN (steps_completed);
  `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
    DROP INDEX IF EXISTS idx_user_preferences_layout;
    DROP INDEX IF EXISTS idx_user_preferences_widgets;
    DROP INDEX IF EXISTS idx_user_preferences_notifications;
    DROP INDEX IF EXISTS idx_behavior_events_data;
    DROP INDEX IF EXISTS idx_onboarding_steps;
  `);
};
