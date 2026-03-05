/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('user_id').primary().defaultTo(knex.fn.uuid());
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table
      .enum('role', ['admin', 'executive', 'manager'])
      .notNullable()
      .defaultTo('executive');
    table.jsonb('profile_data').defaultTo('{}');
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users');
};
