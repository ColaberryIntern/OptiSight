/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('products', (table) => {
    table.varchar('product_type', 50).nullable();
    table.varchar('brand', 100).nullable();
    table.varchar('sku', 50).nullable().unique();
    table.jsonb('attributes').defaultTo('{}');
  });

  await knex.raw('CREATE INDEX idx_products_product_type ON products(product_type)');
  await knex.raw('CREATE INDEX idx_products_brand ON products(brand)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_products_product_type');
  await knex.raw('DROP INDEX IF EXISTS idx_products_brand');

  await knex.schema.alterTable('products', (table) => {
    table.dropColumn('product_type');
    table.dropColumn('brand');
    table.dropColumn('sku');
    table.dropColumn('attributes');
  });
};
