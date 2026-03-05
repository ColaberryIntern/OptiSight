/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('customers', (table) => {
    table.uuid('customer_id').primary().defaultTo(knex.fn.uuid());
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.string('email', 255).unique();
    table.string('phone', 20);
    table.date('date_of_birth');
    table.string('insurance_provider', 100);
    table.string('insurance_id', 100);
    table.uuid('preferred_store_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_customers_insurance ON customers(insurance_provider)');
  await knex.raw('CREATE INDEX idx_customers_store ON customers(preferred_store_id)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('customers');
};
