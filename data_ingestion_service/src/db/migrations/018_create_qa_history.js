/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('qa_history', (table) => {
    table.uuid('qa_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').notNullable();
    table.text('question').notNullable();
    table.text('answer').notNullable();
    table.varchar('execution_path', 255);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('ALTER TABLE qa_history ADD COLUMN question_embedding vector(1536)');
  await knex.raw('CREATE INDEX idx_qa_history_user_id ON qa_history(user_id)');
  await knex.raw('CREATE INDEX idx_qa_history_created_at ON qa_history(created_at)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('qa_history');
};
