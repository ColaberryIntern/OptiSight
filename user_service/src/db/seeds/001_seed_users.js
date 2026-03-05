const bcrypt = require('bcryptjs');

/**
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('audit_log').del();
  await knex('users').del();

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await knex('users').insert([
    {
      email: 'admin@retailinsight.com',
      password_hash: passwordHash,
      role: 'admin',
      email_verified: true,
      profile_data: JSON.stringify({ firstName: 'System', lastName: 'Admin' }),
    },
    {
      email: 'sarah@retailinsight.com',
      password_hash: passwordHash,
      role: 'executive',
      email_verified: true,
      profile_data: JSON.stringify({
        firstName: 'Sarah',
        lastName: 'Johnson',
        title: 'VP Retail Operations',
      }),
    },
    {
      email: 'tom@retailinsight.com',
      password_hash: passwordHash,
      role: 'executive',
      email_verified: true,
      profile_data: JSON.stringify({
        firstName: 'Tom',
        lastName: 'Williams',
        title: 'Chief Marketing Officer',
      }),
    },
    {
      email: 'lucy@retailinsight.com',
      password_hash: passwordHash,
      role: 'manager',
      email_verified: true,
      profile_data: JSON.stringify({
        firstName: 'Lucy',
        lastName: 'Chen',
        title: 'Store Manager',
      }),
    },
  ]);
};
