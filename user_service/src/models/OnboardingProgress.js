const db = require('../config/db');

const TABLE = 'onboarding_progress';

const OnboardingProgress = {
  async findByUserId(userId) {
    return db(TABLE).where({ user_id: userId }).first() || null;
  },

  async create(userId) {
    const [progress] = await db(TABLE)
      .insert({ user_id: userId, started_at: new Date() })
      .returning('*');
    return progress;
  },

  async update(userId, updates) {
    const data = { ...updates };
    if (data.steps_completed) {
      data.steps_completed = JSON.stringify(data.steps_completed);
    }
    if (data.is_complete) {
      data.completed_at = new Date();
    }
    const [progress] = await db(TABLE)
      .where({ user_id: userId })
      .update(data)
      .returning('*');
    return progress;
  },

  async getOrCreate(userId) {
    let progress = await this.findByUserId(userId);
    if (!progress) {
      progress = await this.create(userId);
    }
    return progress;
  },
};

module.exports = OnboardingProgress;
