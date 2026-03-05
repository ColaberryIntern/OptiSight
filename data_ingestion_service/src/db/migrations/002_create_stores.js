/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('stores', (table) => {
    table.uuid('store_id').primary().defaultTo(knex.fn.uuid());
    table.string('store_name', 255).notNullable();
    table.string('region', 100).nullable();
    table.string('address', 500).nullable();
    table.string('city', 100).nullable();
    table.string('state', 50).nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('region');
    table.index('is_active');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('stores');
};
