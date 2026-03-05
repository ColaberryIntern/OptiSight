/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.alterTable('stores', (table) => {
    table.varchar('store_type', 50).defaultTo('retail');
    table.float('lat').nullable();
    table.float('lng').nullable();
    table.uuid('manager_id').nullable();
    table.varchar('phone', 20).nullable();
    table.jsonb('operating_hours').defaultTo('{}');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.alterTable('stores', (table) => {
    table.dropColumn('store_type');
    table.dropColumn('lat');
    table.dropColumn('lng');
    table.dropColumn('manager_id');
    table.dropColumn('phone');
    table.dropColumn('operating_hours');
  });
};
