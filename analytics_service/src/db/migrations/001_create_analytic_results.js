/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('analytic_results', (table) => {
    table.uuid('result_id').primary().defaultTo(knex.fn.uuid());
    table.string('metric', 255).notNullable();
    table.decimal('value', 15, 4).nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('calculated_at').defaultTo(knex.fn.now());

    table.index('metric');
    table.index('calculated_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('analytic_results');
};
