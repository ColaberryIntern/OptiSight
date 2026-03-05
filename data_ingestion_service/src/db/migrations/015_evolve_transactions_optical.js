/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('transactions', (table) => {
    table.uuid('customer_id').nullable();
    table.uuid('employee_id').nullable();
    table.uuid('exam_id').nullable();
    table.varchar('insurance_claim_id', 100).nullable();
    table.varchar('payment_method', 50).nullable();
  });

  await knex.raw('CREATE INDEX idx_transactions_customer_id ON transactions(customer_id)');
  await knex.raw('CREATE INDEX idx_transactions_employee_id ON transactions(employee_id)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_transactions_customer_id');
  await knex.raw('DROP INDEX IF EXISTS idx_transactions_employee_id');

  await knex.schema.alterTable('transactions', (table) => {
    table.dropColumn('customer_id');
    table.dropColumn('employee_id');
    table.dropColumn('exam_id');
    table.dropColumn('insurance_claim_id');
    table.dropColumn('payment_method');
  });
};
