/**
 * Transaction seed data — 800 optical transactions spanning 6 months.
 * Typical combos: frame + lens + coatings ($200-800), contacts-only ($45-60),
 * accessories-only ($8-30).
 *
 * Payment mix: insurance 60%, credit_card 25%, cash 10%, financing 5%.
 * Dallas store gets 25% of transactions but with declining recent-30-day revenue.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('transactions').del();

  const stores = await knex('stores').select('store_id', 'store_name');
  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.store_name] = s.store_id;
  });

  const products = await knex('products').select('product_id', 'product_name', 'product_type', 'price');
  const customers = await knex('customers').select('customer_id', 'insurance_provider');
  const employees = await knex('employees').select('employee_id', 'store_id', 'role');
  const exams = await knex('eye_exams').select('exam_id', 'customer_id', 'store_id');

  if (stores.length === 0 || products.length === 0 || customers.length === 0) {
    console.log('Skipping transactions seed: prerequisite data missing.');
    return;
  }

  // Index products by type
  const frames = products.filter((p) => p.product_type === 'frame');
  const lenses = products.filter((p) => p.product_type === 'lens');
  const coatings = products.filter((p) => p.product_type === 'coating');
  const contacts = products.filter((p) => p.product_type === 'contact_lens');
  const accessories = products.filter((p) => p.product_type === 'accessory');

  // Index employees by store
  const employeesByStore = {};
  employees.forEach((e) => {
    if (!employeesByStore[e.store_id]) employeesByStore[e.store_id] = [];
    employeesByStore[e.store_id].push(e);
  });

  // Index exams by customer+store for linking
  const examsByCustomer = {};
  exams.forEach((e) => {
    if (!examsByCustomer[e.customer_id]) examsByCustomer[e.customer_id] = [];
    examsByCustomer[e.customer_id].push(e);
  });

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // Store weighting — Dallas gets 25% normally, lower in last 30 days
  const DALLAS = storeMap['OptiSight Vision Center - Dallas'];
  const storeWeightsNormal = [
    { storeId: storeMap['OptiSight Vision Center - Dallas'], weight: 0.25 },
    { storeId: storeMap['Plano Eye Gallery'], weight: 0.16 },
    { storeId: storeMap['Houston Optical Hub'], weight: 0.14 },
    { storeId: storeMap['Phoenix LensCraft'], weight: 0.10 },
    { storeId: storeMap['Austin Vision Lab'], weight: 0.10 },
    { storeId: storeMap['San Antonio EyeCare'], weight: 0.09 },
    { storeId: storeMap['Scottsdale Optical Boutique'], weight: 0.08 },
    { storeId: storeMap['Fort Worth Eye Center'], weight: 0.08 },
  ];

  // Last 30 days: Dallas drops significantly to show revenue dip
  const storeWeightsRecent = [
    { storeId: storeMap['OptiSight Vision Center - Dallas'], weight: 0.10 },
    { storeId: storeMap['Plano Eye Gallery'], weight: 0.18 },
    { storeId: storeMap['Houston Optical Hub'], weight: 0.16 },
    { storeId: storeMap['Phoenix LensCraft'], weight: 0.13 },
    { storeId: storeMap['Austin Vision Lab'], weight: 0.12 },
    { storeId: storeMap['San Antonio EyeCare'], weight: 0.11 },
    { storeId: storeMap['Scottsdale Optical Boutique'], weight: 0.10 },
    { storeId: storeMap['Fort Worth Eye Center'], weight: 0.10 },
  ];

  function buildCumulative(weights) {
    const cw = [];
    let cum = 0;
    for (const w of weights) {
      cum += w.weight;
      cw.push({ storeId: w.storeId, cumulative: cum });
    }
    return cw;
  }

  const cwNormal = buildCumulative(storeWeightsNormal);
  const cwRecent = buildCumulative(storeWeightsRecent);

  function pickStore(isRecent) {
    const cw = isRecent ? cwRecent : cwNormal;
    const r = Math.random();
    for (const c of cw) {
      if (r <= c.cumulative) return c.storeId;
    }
    return cw[cw.length - 1].storeId;
  }

  // Payment method distribution
  function pickPayment(customer) {
    const r = Math.random();
    if (r < 0.60 && customer.insurance_provider) return 'insurance';
    if (r < 0.85) return 'credit_card';
    if (r < 0.95) return 'cash';
    return 'financing';
  }

  // Insurance claim ID generator
  let claimCounter = 10000;
  function makeClaimId(provider) {
    claimCounter++;
    const prefix = provider === 'VSP' ? 'VSP' : provider === 'EyeMed' ? 'EM' : 'DV';
    return `${prefix}-2025-${String(claimCounter).padStart(5, '0')}`;
  }

  // Transaction type distribution: 65% frame+lens combo, 20% contacts, 10% accessories, 5% lens-only upgrade
  function pickTransactionType() {
    const r = Math.random();
    if (r < 0.65) return 'frame_lens_combo';
    if (r < 0.85) return 'contacts';
    if (r < 0.95) return 'accessories';
    return 'lens_upgrade';
  }

  function buildItems(txnType) {
    const items = [];
    let total = 0;

    if (txnType === 'frame_lens_combo') {
      // 1 frame
      const frame = pickRandom(frames);
      items.push({
        product_id: frame.product_id,
        product_name: frame.product_name,
        quantity: 1,
        unit_price: parseFloat(frame.price),
        line_total: parseFloat(frame.price),
      });
      total += parseFloat(frame.price);

      // 1 lens pair
      const lens = pickRandom(lenses);
      const lensPairPrice = parseFloat(lens.price);
      items.push({
        product_id: lens.product_id,
        product_name: lens.product_name,
        quantity: 1,
        unit_price: lensPairPrice,
        line_total: lensPairPrice,
      });
      total += lensPairPrice;

      // 1-2 coatings (80% get at least one coating)
      if (Math.random() < 0.80) {
        const coating1 = pickRandom(coatings);
        items.push({
          product_id: coating1.product_id,
          product_name: coating1.product_name,
          quantity: 1,
          unit_price: parseFloat(coating1.price),
          line_total: parseFloat(coating1.price),
        });
        total += parseFloat(coating1.price);

        // 40% chance of a second coating
        if (Math.random() < 0.40) {
          const remainingCoatings = coatings.filter((c) => c.product_id !== coating1.product_id);
          if (remainingCoatings.length > 0) {
            const coating2 = pickRandom(remainingCoatings);
            items.push({
              product_id: coating2.product_id,
              product_name: coating2.product_name,
              quantity: 1,
              unit_price: parseFloat(coating2.price),
              line_total: parseFloat(coating2.price),
            });
            total += parseFloat(coating2.price);
          }
        }
      }
    } else if (txnType === 'contacts') {
      // 1-2 boxes of contacts
      const cl = pickRandom(contacts);
      const qty = Math.random() < 0.6 ? 2 : 1;
      const lineTotal = parseFloat(cl.price) * qty;
      items.push({
        product_id: cl.product_id,
        product_name: cl.product_name,
        quantity: qty,
        unit_price: parseFloat(cl.price),
        line_total: parseFloat(lineTotal.toFixed(2)),
      });
      total += lineTotal;
    } else if (txnType === 'accessories') {
      // 1-3 accessories
      const numItems = 1 + Math.floor(Math.random() * 3);
      const usedIds = new Set();
      for (let i = 0; i < numItems && i < accessories.length; i++) {
        const acc = accessories.filter((a) => !usedIds.has(a.product_id));
        if (acc.length === 0) break;
        const item = pickRandom(acc);
        usedIds.add(item.product_id);
        items.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: 1,
          unit_price: parseFloat(item.price),
          line_total: parseFloat(item.price),
        });
        total += parseFloat(item.price);
      }
    } else {
      // lens_upgrade: just lenses + coatings
      const lens = pickRandom(lenses);
      items.push({
        product_id: lens.product_id,
        product_name: lens.product_name,
        quantity: 1,
        unit_price: parseFloat(lens.price),
        line_total: parseFloat(lens.price),
      });
      total += parseFloat(lens.price);

      const coating = pickRandom(coatings);
      items.push({
        product_id: coating.product_id,
        product_name: coating.product_name,
        quantity: 1,
        unit_price: parseFloat(coating.price),
        line_total: parseFloat(coating.price),
      });
      total += parseFloat(coating.price);
    }

    return { items, total: parseFloat(total.toFixed(2)) };
  }

  // Generate 800 transactions across 6 months
  const transactions = [];
  const now = new Date();

  for (let i = 0; i < 800; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const isRecent = daysAgo <= 30;

    const txnDate = new Date(now);
    txnDate.setDate(txnDate.getDate() - daysAgo);
    txnDate.setHours(
      9 + Math.floor(Math.random() * 10), // 9 AM to 7 PM
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 60),
    );

    const storeId = pickStore(isRecent);
    const customer = pickRandom(customers);
    const txnType = pickTransactionType();
    const { items, total } = buildItems(txnType);
    const paymentMethod = pickPayment(customer);

    // For Dallas store in last 30 days, reduce transaction values by ~30%
    let finalTotal = total;
    if (isRecent && storeId === DALLAS) {
      finalTotal = parseFloat((total * 0.70).toFixed(2));
      items.forEach((item) => {
        item.line_total = parseFloat((item.line_total * 0.70).toFixed(2));
      });
    }

    // Find an employee at this store
    const storeEmployees = employeesByStore[storeId] || employees;
    const employee = pickRandom(storeEmployees);

    // Optionally link to an exam (60% of frame combos)
    let examId = null;
    if (txnType === 'frame_lens_combo' && Math.random() < 0.60) {
      const customerExams = examsByCustomer[customer.customer_id];
      if (customerExams && customerExams.length > 0) {
        examId = pickRandom(customerExams).exam_id;
      }
    }

    // Insurance claim ID
    let insuranceClaimId = null;
    if (paymentMethod === 'insurance' && customer.insurance_provider) {
      insuranceClaimId = makeClaimId(customer.insurance_provider);
    }

    transactions.push({
      store_id: storeId,
      customer_id: customer.customer_id,
      employee_id: employee.employee_id,
      exam_id: examId,
      total_amount: finalTotal,
      transaction_date: txnDate.toISOString(),
      items: JSON.stringify(items),
      payment_method: paymentMethod,
      insurance_claim_id: insuranceClaimId,
    });
  }

  // Insert in batches of 100
  for (let i = 0; i < transactions.length; i += 100) {
    await knex('transactions').insert(transactions.slice(i, i + 100));
  }

  console.log(`Seeded ${transactions.length} transactions`);
};
