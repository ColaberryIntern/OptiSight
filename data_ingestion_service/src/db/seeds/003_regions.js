/**
 * Region seed data — 6 geographic regions for the optical retail network.
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('regions').del();

  await knex('regions').insert([
    {
      region_name: 'Texas',
      states: JSON.stringify(['TX']),
      regional_manager_id: null,
    },
    {
      region_name: 'Southwest',
      states: JSON.stringify(['AZ', 'NM', 'NV']),
      regional_manager_id: null,
    },
    {
      region_name: 'Southeast',
      states: JSON.stringify(['FL', 'GA', 'SC', 'NC']),
      regional_manager_id: null,
    },
    {
      region_name: 'Northeast',
      states: JSON.stringify(['NY', 'NJ', 'CT', 'MA']),
      regional_manager_id: null,
    },
    {
      region_name: 'West Coast',
      states: JSON.stringify(['CA', 'OR', 'WA']),
      regional_manager_id: null,
    },
    {
      region_name: 'Midwest',
      states: JSON.stringify(['IL', 'OH', 'MI', 'IN']),
      regional_manager_id: null,
    },
  ]);
};
