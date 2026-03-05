/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_behavior_events', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable();
    table.varchar('event_type', 100).notNullable();
    table.jsonb('event_data').defaultTo('{}');
    table.varchar('page', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['user_id', 'event_type']);
    table.index('created_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_behavior_events');
};
