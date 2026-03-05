/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('employees', (table) => {
    table.uuid('employee_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('store_id').notNullable();
    table.string('first_name', 100).notNullable();
    table.string('last_name', 100).notNullable();
    table.varchar('role', 50).notNullable();
    table.date('hire_date');
    table.boolean('is_active').defaultTo(true);
    table.jsonb('performance_data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_employees_store_id ON employees(store_id)');
  await knex.raw('CREATE INDEX idx_employees_role ON employees(role)');
  await knex.raw('CREATE INDEX idx_employees_store_role ON employees(store_id, role)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('employees');
};
