/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('onboarding_progress', (table) => {
    table.uuid('progress_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable().unique();
    table.jsonb('steps_completed').defaultTo('[]');
    table.integer('current_step').defaultTo(0);
    table.boolean('is_complete').defaultTo(false);
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('onboarding_progress');
};
