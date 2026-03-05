/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_preferences', (table) => {
    table.uuid('preference_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().unique();
    table.jsonb('dashboard_layout').defaultTo('{}');
    table.jsonb('favorite_widgets').defaultTo('[]');
    table.uuid('default_store_id').nullable();
    table.varchar('default_period', 10).defaultTo('30d');
    table.jsonb('notification_settings').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_preferences');
};
