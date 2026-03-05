/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('products', (table) => {
    table.uuid('product_id').primary().defaultTo(knex.fn.uuid());
    table.string('product_name', 255).notNullable();
    table.string('category', 100).nullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('inventory_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('category');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};
