const db = require('../config/db');

const TABLE = 'users';

/**
 * Data access layer for the users table.
 * All database interactions for user records go through this module.
 */
const User = {
  /**
   * Find a user by email address.
   * Returns the full user row (including password_hash) for auth checks.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const user = await db(TABLE).where({ email }).first();
    return user || null;
  },

  /**
   * Find a user by ID.
   * Returns the user without password_hash (safe for API responses).
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async findById(userId) {
    const user = await db(TABLE)
      .select(
        'user_id',
        'email',
        'role',
        'profile_data',
        'email_verified',
        'created_at',
        'updated_at'
      )
      .where({ user_id: userId })
      .first();
    return user || null;
  },

  /**
   * Create a new user record.
   * @param {{ email: string, passwordHash: string, role: string }} data
   * @returns {Promise<object>} The created user (without password_hash)
   */
  async create({ email, passwordHash, role }) {
    const [user] = await db(TABLE)
      .insert({
        email,
        password_hash: passwordHash,
        role: role || 'executive',
      })
      .returning([
        'user_id',
        'email',
        'role',
        'profile_data',
        'email_verified',
        'created_at',
        'updated_at',
      ]);
    return user;
  },

  /**
   * Mark a user's email as verified.
   * @param {string} userId
   * @returns {Promise<number>} Number of rows updated
   */
  async updateEmailVerified(userId) {
    const count = await db(TABLE)
      .where({ user_id: userId })
      .update({ email_verified: true, updated_at: db.fn.now() });
    return count;
  },
};

module.exports = User;
