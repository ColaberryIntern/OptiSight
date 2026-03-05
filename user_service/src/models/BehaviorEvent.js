const db = require('../config/db');

const TABLE = 'user_behavior_events';

const BehaviorEvent = {
  async create({ user_id, event_type, event_data, page }) {
    const [event] = await db(TABLE)
      .insert({
        user_id,
        event_type,
        event_data: JSON.stringify(event_data || {}),
        page,
      })
      .returning('*');
    return event;
  },

  async findByUserId(userId, { limit = 50, event_type } = {}) {
    let query = db(TABLE)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    if (event_type) {
      query = query.where({ event_type });
    }

    return query;
  },
};

module.exports = BehaviorEvent;
