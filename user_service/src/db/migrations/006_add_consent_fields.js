/**
 * @param {import('knex').Knex} knex
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.jsonb('consent').defaultTo(JSON.stringify({
      analytics: false,
      marketing: false,
      data_sharing: false,
    }));
    table.timestamp('consent_updated_at');
    table.timestamp('data_export_requested_at');
    table.timestamp('deletion_requested_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('consent');
    table.dropColumn('consent_updated_at');
    table.dropColumn('data_export_requested_at');
    table.dropColumn('deletion_requested_at');
  });
};
