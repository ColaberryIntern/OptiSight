/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('inventory_alerts', (table) => {
    table.uuid('alert_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('product_id').notNullable();
    table.uuid('store_id').nullable();
    table.varchar('alert_type', 50).notNullable();
    table.integer('current_level').notNullable();
    table.integer('reorder_point').nullable();
    table.integer('optimal_quantity').nullable();
    table.varchar('status', 20).defaultTo('active');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('product_id');
    table.index('store_id');
    table.index('alert_type');
    table.index('status');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('inventory_alerts');
};
