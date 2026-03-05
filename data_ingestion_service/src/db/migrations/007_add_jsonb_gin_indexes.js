exports.up = function(knex) {
  return knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_complaints_metadata ON complaints USING GIN (metadata);
    CREATE INDEX IF NOT EXISTS idx_inventory_alerts_metadata ON inventory_alerts USING GIN (metadata);
  `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
    DROP INDEX IF EXISTS idx_complaints_metadata;
    DROP INDEX IF EXISTS idx_inventory_alerts_metadata;
  `);
};
