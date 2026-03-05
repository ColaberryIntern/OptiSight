/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('complaints', (table) => {
    table.uuid('complaint_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').nullable();
    table.uuid('store_id').nullable();
    table.varchar('category', 100).notNullable();
    table.text('description').notNullable();
    table.varchar('region', 100).nullable();
    table.varchar('sentiment', 20).nullable();
    table.varchar('status', 20).defaultTo('open');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at').nullable();

    table.index('store_id');
    table.index('region');
    table.index('category');
    table.index('created_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('complaints');
};
