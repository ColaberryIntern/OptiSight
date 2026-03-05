/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('forecast_results', (table) => {
    table.uuid('forecast_id').primary().defaultTo(knex.fn.uuid());
    table.varchar('metric', 100).notNullable();
    table.uuid('store_id').nullable();
    table.date('forecast_date').notNullable();
    table.decimal('predicted_value', 14, 2).notNullable();
    table.decimal('confidence_lower', 14, 2).nullable();
    table.decimal('confidence_upper', 14, 2).nullable();
    table.varchar('model_type', 50).defaultTo('arima');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['metric', 'store_id']);
    table.index('forecast_date');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('forecast_results');
};
