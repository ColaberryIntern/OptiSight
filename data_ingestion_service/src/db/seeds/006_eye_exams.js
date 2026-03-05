/**
 * Eye exam seed data — 200 exams spanning 6 months.
 * Exam distribution: 60% comprehensive, 25% contact_lens, 15% follow_up
 * Store weighting: Dallas 30%, Plano 20%, Houston 15%, rest distributed.
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('eye_exams').del();

  const stores = await knex('stores').select('store_id', 'store_name');
  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.store_name] = s.store_id;
  });

  const customers = await knex('customers').select('customer_id');
  const optometrists = await knex('employees')
    .select('employee_id', 'store_id')
    .where('role', 'optometrist');

  if (customers.length === 0 || optometrists.length === 0) {
    console.log('Skipping eye_exams seed: no customers or optometrists found.');
    return;
  }

  // Store weighting for exam distribution
  const storeWeights = [
    { name: 'OptiSight Vision Center - Dallas', weight: 0.30 },
    { name: 'Plano Eye Gallery', weight: 0.20 },
    { name: 'Houston Optical Hub', weight: 0.15 },
    { name: 'Phoenix LensCraft', weight: 0.08 },
    { name: 'Austin Vision Lab', weight: 0.08 },
    { name: 'San Antonio EyeCare', weight: 0.07 },
    { name: 'Scottsdale Optical Boutique', weight: 0.06 },
    { name: 'Fort Worth Eye Center', weight: 0.06 },
  ];

  // Build cumulative weight array for weighted random selection
  const cumulativeWeights = [];
  let cumulative = 0;
  for (const sw of storeWeights) {
    cumulative += sw.weight;
    cumulativeWeights.push({ storeId: storeMap[sw.name], cumulative });
  }

  function pickWeightedStore() {
    const r = Math.random();
    for (const cw of cumulativeWeights) {
      if (r <= cw.cumulative) return cw.storeId;
    }
    return cumulativeWeights[cumulativeWeights.length - 1].storeId;
  }

  // Map optometrists to their stores; for stores without optometrist, pick nearest
  const optometristByStore = {};
  optometrists.forEach((o) => {
    optometristByStore[o.store_id] = o.employee_id;
  });

  function pickOptometrist(storeId) {
    if (optometristByStore[storeId]) return optometristByStore[storeId];
    // Fallback: pick a random optometrist
    return optometrists[Math.floor(Math.random() * optometrists.length)].employee_id;
  }

  // Exam type distribution: 60% comprehensive, 25% contact_lens, 15% follow_up
  function pickExamType() {
    const r = Math.random();
    if (r < 0.60) return 'comprehensive';
    if (r < 0.85) return 'contact_lens';
    return 'follow_up';
  }

  // Generate realistic prescription data
  function generatePrescription(examType) {
    const sphereRange = [-6.0, 4.0];
    const cylinderRange = [-3.0, 0];

    function randRange(min, max, step) {
      const steps = Math.round((max - min) / step);
      return min + Math.round(Math.random() * steps) * step;
    }

    const rightSphere = parseFloat(randRange(sphereRange[0], sphereRange[1], 0.25).toFixed(2));
    const leftSphere = parseFloat((rightSphere + randRange(-0.50, 0.50, 0.25)).toFixed(2));
    const rightCylinder = parseFloat(randRange(cylinderRange[0], 0, 0.25).toFixed(2));
    const leftCylinder = parseFloat(randRange(cylinderRange[0], 0, 0.25).toFixed(2));
    const rightAxis = Math.floor(Math.random() * 180) + 1;
    const leftAxis = Math.max(1, Math.min(180, rightAxis + Math.floor(Math.random() * 11) - 5));
    const pd = parseFloat((29 + Math.random() * 5).toFixed(1));

    const addPower = examType === 'follow_up' ? parseFloat(randRange(0.75, 2.50, 0.25).toFixed(2)) : 0;

    return {
      right_eye: { sphere: rightSphere, cylinder: rightCylinder, axis: rightAxis, add: addPower, pd },
      left_eye: { sphere: leftSphere, cylinder: leftCylinder, axis: leftAxis, add: addPower, pd },
    };
  }

  // Realistic findings based on prescription
  const findingsPool = {
    comprehensive: [
      'Mild myopia, stable from last visit. No signs of retinal changes.',
      'Moderate myopia with mild astigmatism. Recommend updated lenses.',
      'Early signs of presbyopia noted. Discussed progressive lens options.',
      'Hyperopia with astigmatism correction needed. Corneal topography normal.',
      'Stable prescription. No changes recommended at this time.',
      'Mild dry eye syndrome noted. Recommended artificial tears and omega-3 supplements.',
      'Slight increase in myopia since last exam. Monitor for progression.',
      'All within normal limits. Healthy retina and optic nerve.',
      'Mild cataract formation beginning in right eye. Monitor at next visit.',
      'Elevated IOP noted. Scheduled follow-up for glaucoma screening.',
      'Diabetic screening normal. No signs of retinopathy.',
      'Astigmatism correction needed. Previous correction was under-prescribed.',
    ],
    contact_lens: [
      'Fit assessment for daily disposables. Good corneal health. Acuvue Oasys recommended.',
      'Contact lens refitting due to comfort issues. Switched to silicone hydrogel material.',
      'Toric lens fitting for astigmatism correction. Biofinity Toric prescribed.',
      'Annual contact lens evaluation. Current lenses performing well. Renewed prescription.',
      'First-time contact lens fitting. Patient educated on insertion, removal, and care.',
      'Multifocal contact lens trial. Patient adapting well to monovision approach.',
    ],
    follow_up: [
      'Follow-up for elevated IOP. Pressure normalized. Continue monitoring.',
      'Post-surgical follow-up after LASIK consultation referral. Healing well.',
      'Dry eye follow-up. Symptoms improving with prescribed regimen.',
      'Progressive lens adaptation check. Patient reports improved comfort.',
      'Follow-up on prescription change. New lenses working well.',
      'Corneal abrasion healing check. Fully resolved. No scarring.',
    ],
  };

  function pickFindings(examType) {
    const pool = findingsPool[examType];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Generate 200 exams across 6 months
  const exams = [];
  const now = new Date();

  for (let i = 0; i < 200; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const examDate = new Date(now);
    examDate.setDate(examDate.getDate() - daysAgo);
    examDate.setHours(
      8 + Math.floor(Math.random() * 9), // 8 AM to 5 PM
      Math.floor(Math.random() * 4) * 15, // quarter-hour slots
      0,
    );

    const storeId = pickWeightedStore();
    const examType = pickExamType();
    const customer = customers[Math.floor(Math.random() * customers.length)];

    // Next exam date is typically 12 months out, or 6 months for follow-ups
    const nextExamDate = new Date(examDate);
    nextExamDate.setMonth(nextExamDate.getMonth() + (examType === 'follow_up' ? 6 : 12));

    exams.push({
      customer_id: customer.customer_id,
      store_id: storeId,
      optometrist_id: pickOptometrist(storeId),
      exam_date: examDate.toISOString(),
      exam_type: examType,
      prescription_data: JSON.stringify(generatePrescription(examType)),
      findings: pickFindings(examType),
      next_exam_date: nextExamDate.toISOString().split('T')[0],
    });
  }

  // Insert in batches of 50
  for (let i = 0; i < exams.length; i += 50) {
    await knex('eye_exams').insert(exams.slice(i, i + 50));
  }

  console.log(`Seeded ${exams.length} eye exams`);
};
