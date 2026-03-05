/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('regions', (table) => {
    table.uuid('region_id').primary().defaultTo(knex.fn.uuid());
    table.varchar('region_name', 100).unique().notNullable();
    table.uuid('regional_manager_id').nullable();
    table.jsonb('states').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('regions');
};
