/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('eye_exams', (table) => {
    table.uuid('exam_id').primary().defaultTo(knex.fn.uuid());
    table.uuid('customer_id').notNullable();
    table.uuid('store_id').notNullable();
    table.uuid('optometrist_id').notNullable();
    table.timestamp('exam_date').notNullable();
    table.varchar('exam_type', 50).notNullable();
    table.jsonb('prescription_data').defaultTo('{}');
    table.text('findings');
    table.date('next_exam_date').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw('CREATE INDEX idx_eye_exams_customer_id ON eye_exams(customer_id)');
  await knex.raw('CREATE INDEX idx_eye_exams_store_id ON eye_exams(store_id)');
  await knex.raw('CREATE INDEX idx_eye_exams_optometrist_id ON eye_exams(optometrist_id)');
  await knex.raw('CREATE INDEX idx_eye_exams_exam_date ON eye_exams(exam_date)');
  await knex.raw('CREATE INDEX idx_eye_exams_store_date ON eye_exams(store_id, exam_date)');
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('eye_exams');
};
