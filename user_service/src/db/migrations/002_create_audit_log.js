/**
 * @param {import('knex').Knex} knex
 */
exports.up = function (knex) {
  return knex.schema.createTable('audit_log', (table) => {
    table.uuid('log_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('user_id').nullable();
    table.string('action', 255).notNullable();
    table.string('status', 50).nullable();
    table.string('ip_address', 45).nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('user_id');
    table.index('created_at');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_log');
};
