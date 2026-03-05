/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').then(() => {
    return knex.schema.createTable('notifications', (table) => {
      table.uuid('notification_id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
      table.uuid('user_id').notNullable();
      table.string('type', 50).notNullable();
      table.string('title', 255).notNullable();
      table.text('message').notNullable();
      table.jsonb('metadata').defaultTo('{}');
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    });
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('notifications');
};
