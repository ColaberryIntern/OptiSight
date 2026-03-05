/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('store_summaries', (table) => {
    table.uuid('summary_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('store_id').notNullable();
    table.text('summary_text').notNullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now());

    table.index('store_id');
  });

  await knex.raw('ALTER TABLE store_summaries ADD COLUMN summary_embedding vector(1536)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('store_summaries');
};
