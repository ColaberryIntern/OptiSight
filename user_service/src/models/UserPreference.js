const db = require('../config/db');

const TABLE = 'user_preferences';

const UserPreference = {
  async findByUserId(userId) {
    return db(TABLE).where({ user_id: userId }).first() || null;
  },

  async upsert(userId, preferences) {
    const existing = await this.findByUserId(userId);
    const data = {
      dashboard_layout: JSON.stringify(preferences.dashboard_layout || {}),
      favorite_widgets: JSON.stringify(preferences.favorite_widgets || []),
      default_store_id: preferences.default_store_id || null,
      default_period: preferences.default_period || '30d',
      notification_settings: JSON.stringify(preferences.notification_settings || {}),
      updated_at: new Date(),
    };

    if (existing) {
      const [updated] = await db(TABLE)
        .where({ user_id: userId })
        .update(data)
        .returning('*');
      return updated;
    }

    const [created] = await db(TABLE)
      .insert({ user_id: userId, ...data })
      .returning('*');
    return created;
  },
};

module.exports = UserPreference;
