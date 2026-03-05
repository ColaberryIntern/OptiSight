exports.up = function(knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.index(['user_id', 'is_read'], 'idx_notifications_user_read');
    table.index(['user_id', 'created_at'], 'idx_notifications_user_date');
    table.index(['type'], 'idx_notifications_type');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('notifications', (table) => {
    table.dropIndex(null, 'idx_notifications_user_read');
    table.dropIndex(null, 'idx_notifications_user_date');
    table.dropIndex(null, 'idx_notifications_type');
  });
};
