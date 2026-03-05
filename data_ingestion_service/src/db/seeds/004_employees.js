/**
 * Employee seed data — 12 employees across 8 optical stores.
 *   3 optometrists, 4 opticians, 3 sales associates, 2 managers
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('employees').del();

  const stores = await knex('stores').select('store_id', 'store_name');
  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.store_name] = s.store_id;
  });

  const sid = (name) => storeMap[name] || null;

  await knex('employees').insert([
    // ── Optometrists (3) ──────────────────────────────────
    {
      store_id: sid('OptiSight Vision Center - Dallas'),
      first_name: 'Sarah',
      last_name: 'Chen',
      role: 'optometrist',
      hire_date: '2023-03-15',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 284500,
        exams_conducted: 1420,
        customer_satisfaction_score: 4.8,
      }),
    },
    {
      store_id: sid('Plano Eye Gallery'),
      first_name: 'James',
      last_name: 'Wilson',
      role: 'optometrist',
      hire_date: '2023-06-01',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 215800,
        exams_conducted: 1180,
        customer_satisfaction_score: 4.6,
      }),
    },
    {
      store_id: sid('Houston Optical Hub'),
      first_name: 'Maria',
      last_name: 'Garcia',
      role: 'optometrist',
      hire_date: '2024-01-10',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 178200,
        exams_conducted: 890,
        customer_satisfaction_score: 4.7,
      }),
    },

    // ── Opticians (4) ─────────────────────────────────────
    {
      store_id: sid('OptiSight Vision Center - Dallas'),
      first_name: 'Kevin',
      last_name: 'Patel',
      role: 'optician',
      hire_date: '2023-08-20',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 156300,
        exams_conducted: 0,
        customer_satisfaction_score: 4.5,
      }),
    },
    {
      store_id: sid('Phoenix LensCraft'),
      first_name: 'Amanda',
      last_name: 'Brooks',
      role: 'optician',
      hire_date: '2024-03-05',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 98700,
        exams_conducted: 0,
        customer_satisfaction_score: 4.4,
      }),
    },
    {
      store_id: sid('Scottsdale Optical Boutique'),
      first_name: 'Tyler',
      last_name: 'Nguyen',
      role: 'optician',
      hire_date: '2024-06-15',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 72400,
        exams_conducted: 0,
        customer_satisfaction_score: 4.3,
      }),
    },
    {
      store_id: sid('Fort Worth Eye Center'),
      first_name: 'Lisa',
      last_name: 'Martinez',
      role: 'optician',
      hire_date: '2023-11-01',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 134800,
        exams_conducted: 0,
        customer_satisfaction_score: 4.6,
      }),
    },

    // ── Sales Associates (3) ──────────────────────────────
    {
      store_id: sid('Austin Vision Lab'),
      first_name: 'Marcus',
      last_name: 'Johnson',
      role: 'sales_associate',
      hire_date: '2024-09-01',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 45200,
        exams_conducted: 0,
        customer_satisfaction_score: 4.2,
      }),
    },
    {
      store_id: sid('San Antonio EyeCare'),
      first_name: 'Emily',
      last_name: 'Thompson',
      role: 'sales_associate',
      hire_date: '2025-01-15',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 22100,
        exams_conducted: 0,
        customer_satisfaction_score: 4.1,
      }),
    },
    {
      store_id: sid('Houston Optical Hub'),
      first_name: 'Daniel',
      last_name: 'Rivera',
      role: 'sales_associate',
      hire_date: '2024-05-20',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 67800,
        exams_conducted: 0,
        customer_satisfaction_score: 4.3,
      }),
    },

    // ── Managers (2) ──────────────────────────────────────
    {
      store_id: sid('OptiSight Vision Center - Dallas'),
      first_name: 'Rachel',
      last_name: 'Torres',
      role: 'manager',
      hire_date: '2023-01-05',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 0,
        exams_conducted: 0,
        customer_satisfaction_score: 4.9,
      }),
    },
    {
      store_id: sid('Phoenix LensCraft'),
      first_name: 'David',
      last_name: 'Kim',
      role: 'manager',
      hire_date: '2023-04-10',
      is_active: true,
      performance_data: JSON.stringify({
        sales_total: 0,
        exams_conducted: 0,
        customer_satisfaction_score: 4.7,
      }),
    },
  ]);
};
