exports.up = function(knex) {
  return knex.schema
    // Transactions: composite indexes for common queries
    .alterTable('transactions', (table) => {
      table.index(['store_id', 'transaction_date'], 'idx_transactions_store_date');
      table.index(['user_id', 'transaction_date'], 'idx_transactions_user_date');
    })
    // Complaints: composite indexes for region + category queries
    .alterTable('complaints', (table) => {
      table.index(['region', 'category'], 'idx_complaints_region_category');
      table.index(['status', 'created_at'], 'idx_complaints_status_date');
    })
    // Inventory alerts: composite for active alerts by store
    .alterTable('inventory_alerts', (table) => {
      table.index(['store_id', 'status'], 'idx_inventory_alerts_store_status');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('transactions', (table) => {
      table.dropIndex(null, 'idx_transactions_store_date');
      table.dropIndex(null, 'idx_transactions_user_date');
    })
    .alterTable('complaints', (table) => {
      table.dropIndex(null, 'idx_complaints_region_category');
      table.dropIndex(null, 'idx_complaints_status_date');
    })
    .alterTable('inventory_alerts', (table) => {
      table.dropIndex(null, 'idx_inventory_alerts_store_status');
    });
};
