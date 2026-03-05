require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgres://retail_insight:changeme@localhost:5432/retail_insight',
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations_user_service',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
  test: {
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://retail_insight:changeme@localhost:5432/retail_insight_test',
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations_user_service',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './src/db/migrations',
      tableName: 'knex_migrations_user_service',
    },
    seeds: {
      directory: './src/db/seeds',
    },
  },
};
