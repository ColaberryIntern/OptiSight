/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.renameTable('complaints', 'issues');

  await knex.schema.alterTable('issues', (table) => {
    table.text('resolution_notes').nullable();
    table.varchar('root_cause', 255).nullable();
    table.integer('escalation_level').defaultTo(1);
    table.uuid('assigned_to').nullable();
  });

  await knex.raw('ALTER TABLE issues ADD COLUMN description_embedding vector(1536)');
  await knex.raw('ALTER TABLE issues ADD COLUMN resolution_embedding vector(1536)');

  // Only create ivfflat index if table has rows (requires training data)
  const result = await knex.raw('SELECT COUNT(*) as count FROM issues');
  const rowCount = parseInt(result.rows[0].count, 10);
  if (rowCount > 0) {
    await knex.raw(
      'CREATE INDEX idx_issues_desc_embedding ON issues USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 10)'
    );
  }
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_issues_desc_embedding');

  await knex.schema.alterTable('issues', (table) => {
    table.dropColumn('resolution_notes');
    table.dropColumn('root_cause');
    table.dropColumn('escalation_level');
    table.dropColumn('assigned_to');
  });

  await knex.raw('ALTER TABLE issues DROP COLUMN IF EXISTS description_embedding');
  await knex.raw('ALTER TABLE issues DROP COLUMN IF EXISTS resolution_embedding');

  await knex.schema.renameTable('issues', 'complaints');
};
