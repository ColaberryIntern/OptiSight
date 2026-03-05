/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.uuid('transaction_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').nullable();
    table.uuid('store_id').nullable();
    table.decimal('total_amount', 10, 2).notNullable();
    table.timestamp('transaction_date').defaultTo(knex.fn.now());
    table.jsonb('items').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('store_id');
    table.index('transaction_date');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('transactions');
};
