exports.up = function(knex) {
  return knex.schema.raw(`
    CREATE INDEX IF NOT EXISTS idx_forecast_metadata ON forecast_results USING GIN (metadata);
  `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
    DROP INDEX IF EXISTS idx_forecast_metadata;
  `);
};
