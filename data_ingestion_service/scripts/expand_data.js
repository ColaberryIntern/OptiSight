#!/usr/bin/env node
/**
 * Data Expansion Script — Adds significant volume to the OptiSight database.
 *
 * Adds:
 *   +16 stores (24 total, across all 6 regions)
 *   +20 products (50 total)
 *   +24 employees (36 total)
 *   +200 customers (250 total)
 *   +1800 eye_exams (2000 total)
 *   +3200 transactions (4000 total)
 *   +240 issues (300 total)
 *
 * Run: node scripts/expand_data.js
 * Requires DATABASE_URL env var.
 */

const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgres://retail_insight:changeme@postgres:5432/retail_insight',
  pool: { min: 1, max: 5 },
});

// ─── Helpers ─────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return +(min + Math.random() * (max - min)).toFixed(dec); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(8, 18), randInt(0, 59), 0, 0);
  return d;
}

function weightedPick(items, weights) {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r <= cum) return items[i];
  }
  return items[items.length - 1];
}

// ─── Main ────────────────────────────────────────────────────────

async function run() {
  console.log('Starting data expansion...');

  // ── 1. NEW STORES (16) ──────────────────────────────────────
  const newStores = [
    // Southeast (4)
    { store_name: 'Atlanta Vision Center', region: 'Southeast', address: '3393 Peachtree Rd NE', city: 'Atlanta', state: 'GA', store_type: 'hybrid', lat: 33.8468, lng: -84.3626, phone: '404-555-0201', is_active: true },
    { store_name: 'Miami Optical Studio', region: 'Southeast', address: '1111 Brickell Ave', city: 'Miami', state: 'FL', store_type: 'retail', lat: 25.7617, lng: -80.1918, phone: '305-555-0202', is_active: true },
    { store_name: 'Charlotte EyeWorks', region: 'Southeast', address: '200 S Tryon St', city: 'Charlotte', state: 'NC', store_type: 'hybrid', lat: 35.2271, lng: -80.8431, phone: '704-555-0203', is_active: true },
    { store_name: 'Raleigh Vision Gallery', region: 'Southeast', address: '421 Fayetteville St', city: 'Raleigh', state: 'NC', store_type: 'clinic', lat: 35.7796, lng: -78.6382, phone: '919-555-0204', is_active: true },
    // Northeast (4)
    { store_name: 'NYC Premier Optical', region: 'Northeast', address: '350 Fifth Ave', city: 'New York', state: 'NY', store_type: 'retail', lat: 40.7484, lng: -73.9857, phone: '212-555-0301', is_active: true },
    { store_name: 'Boston Eye Institute', region: 'Northeast', address: '100 Newbury St', city: 'Boston', state: 'MA', store_type: 'clinic', lat: 42.3510, lng: -71.0760, phone: '617-555-0302', is_active: true },
    { store_name: 'Philadelphia LensHub', region: 'Northeast', address: '1500 Market St', city: 'Philadelphia', state: 'PA', store_type: 'hybrid', lat: 39.9526, lng: -75.1652, phone: '215-555-0303', is_active: true },
    { store_name: 'Hartford Vision Center', region: 'Northeast', address: '75 Pearl St', city: 'Hartford', state: 'CT', store_type: 'retail', lat: 41.7637, lng: -72.6851, phone: '860-555-0304', is_active: true },
    // West Coast (4)
    { store_name: 'LA EyeStyle Boutique', region: 'West Coast', address: '9601 Wilshire Blvd', city: 'Los Angeles', state: 'CA', store_type: 'retail', lat: 34.0696, lng: -118.4009, phone: '310-555-0401', is_active: true },
    { store_name: 'San Francisco Optical', region: 'West Coast', address: '865 Market St', city: 'San Francisco', state: 'CA', store_type: 'hybrid', lat: 37.7850, lng: -122.4069, phone: '415-555-0402', is_active: true },
    { store_name: 'Portland Vision Lab', region: 'West Coast', address: '1120 NW Couch St', city: 'Portland', state: 'OR', store_type: 'clinic', lat: 45.5235, lng: -122.6830, phone: '503-555-0403', is_active: true },
    { store_name: 'Seattle EyeCraft', region: 'West Coast', address: '600 Pine St', city: 'Seattle', state: 'WA', store_type: 'hybrid', lat: 47.6131, lng: -122.3362, phone: '206-555-0404', is_active: true },
    // Midwest (4)
    { store_name: 'Chicago LensMasters', region: 'Midwest', address: '111 N State St', city: 'Chicago', state: 'IL', store_type: 'retail', lat: 41.8837, lng: -87.6278, phone: '312-555-0501', is_active: true },
    { store_name: 'Columbus Vision Center', region: 'Midwest', address: '50 W Broad St', city: 'Columbus', state: 'OH', store_type: 'hybrid', lat: 39.9612, lng: -82.9988, phone: '614-555-0502', is_active: true },
    { store_name: 'Detroit Optical Studio', region: 'Midwest', address: '1001 Woodward Ave', city: 'Detroit', state: 'MI', store_type: 'hybrid', lat: 42.3314, lng: -83.0458, phone: '313-555-0503', is_active: true },
    { store_name: 'Indianapolis EyeCare Plus', region: 'Midwest', address: '200 S Meridian St', city: 'Indianapolis', state: 'IN', store_type: 'clinic', lat: 39.7656, lng: -86.1580, phone: '317-555-0504', is_active: true },
  ];

  // Check which stores already exist to avoid duplicates
  const existingStores = await db('stores').select('store_name');
  const existingNames = new Set(existingStores.map(s => s.store_name));
  const storesToInsert = newStores.filter(s => !existingNames.has(s.store_name));

  if (storesToInsert.length > 0) {
    await db('stores').insert(storesToInsert);
    console.log(`Inserted ${storesToInsert.length} new stores.`);
  } else {
    console.log('All expansion stores already exist, skipping.');
  }

  // ── 2. NEW PRODUCTS (20) ───────────────────────────────────
  const newProducts = [
    // More frames
    { product_name: 'Versace VE3186', category: 'Eyewear', product_type: 'frame', brand: 'Versace', sku: 'FRM-VRS-3186-011', price: 289.99, inventory_count: 25, attributes: JSON.stringify({ frame_material: 'acetate', frame_shape: 'cat_eye', gender: 'female', prescription_compatible: true }) },
    { product_name: 'Michael Kors MK3032', category: 'Eyewear', product_type: 'frame', brand: 'Michael Kors', sku: 'FRM-MK-3032-012', price: 159.99, inventory_count: 60, attributes: JSON.stringify({ frame_material: 'metal', frame_shape: 'rectangular', gender: 'female', prescription_compatible: true }) },
    { product_name: 'Under Armour UA 5000', category: 'Eyewear', product_type: 'frame', brand: 'Under Armour', sku: 'FRM-UA-5000-013', price: 119.99, inventory_count: 80, attributes: JSON.stringify({ frame_material: 'plastic', frame_shape: 'rectangular', gender: 'male', prescription_compatible: true }) },
    { product_name: 'Tiffany TF2109', category: 'Eyewear', product_type: 'frame', brand: 'Tiffany', sku: 'FRM-TIF-2109-014', price: 359.99, inventory_count: 15, attributes: JSON.stringify({ frame_material: 'acetate', frame_shape: 'cat_eye', gender: 'female', prescription_compatible: true }) },
    { product_name: 'Persol PO3007V', category: 'Eyewear', product_type: 'frame', brand: 'Persol', sku: 'FRM-PRS-3007-015', price: 245.99, inventory_count: 28, attributes: JSON.stringify({ frame_material: 'acetate', frame_shape: 'round', gender: 'unisex', prescription_compatible: true }) },
    { product_name: 'Maui Jim MJ-257', category: 'Eyewear', product_type: 'frame', brand: 'Maui Jim', sku: 'FRM-MJ-257-016', price: 299.99, inventory_count: 35, attributes: JSON.stringify({ frame_material: 'titanium', frame_shape: 'aviator', gender: 'unisex', prescription_compatible: true }) },
    // More lenses
    { product_name: 'Ultra-Thin 1.74 High Index', category: 'Lenses', product_type: 'lens', brand: 'Essilor', sku: 'LNS-UT-174-009', price: 399.99, inventory_count: 60, attributes: JSON.stringify({ lens_type: 'single_vision', material: 'high_index', index: 1.74 }) },
    { product_name: 'Office Progressive', category: 'Lenses', product_type: 'lens', brand: 'Zeiss', sku: 'LNS-OFF-PRG-010', price: 279.99, inventory_count: 90, attributes: JSON.stringify({ lens_type: 'progressive', material: 'high_index', index: 1.60 }) },
    { product_name: 'Kids Polycarbonate', category: 'Lenses', product_type: 'lens', brand: 'Hoya', sku: 'LNS-KID-PC-011', price: 79.99, inventory_count: 200, attributes: JSON.stringify({ lens_type: 'single_vision', material: 'polycarbonate', index: 1.59 }) },
    // More coatings
    { product_name: 'Anti-Fog Coating', category: 'Coatings', product_type: 'coating', brand: 'Crizal', sku: 'CTG-AF-PRM-006', price: 54.99, inventory_count: 350, attributes: JSON.stringify({ coating_type: 'anti_fog', compatible_lens_types: ['single_vision', 'progressive', 'bifocal'] }) },
    { product_name: 'Mirror Tint Coating', category: 'Coatings', product_type: 'coating', brand: 'Essilor', sku: 'CTG-MIR-STD-007', price: 44.99, inventory_count: 280, attributes: JSON.stringify({ coating_type: 'mirror_tint', compatible_lens_types: ['single_vision'] }) },
    // More contacts
    { product_name: 'Acuvue Oasys Multifocal', category: 'Contact Lenses', product_type: 'contact_lens', brand: 'Acuvue', sku: 'CL-ACV-MF-005', price: 65.99, inventory_count: 100, attributes: JSON.stringify({ wear_type: 'daily', toric: false, multifocal: true, pack_size: 30 }) },
    { product_name: 'Air Optix Colors', category: 'Contact Lenses', product_type: 'contact_lens', brand: 'Alcon', sku: 'CL-ALN-CLR-006', price: 42.99, inventory_count: 120, attributes: JSON.stringify({ wear_type: 'monthly', toric: false, multifocal: false, pack_size: 6 }) },
    { product_name: 'Proclear Toric', category: 'Contact Lenses', product_type: 'contact_lens', brand: 'CooperVision', sku: 'CL-CV-PCT-007', price: 55.99, inventory_count: 90, attributes: JSON.stringify({ wear_type: 'monthly', toric: true, multifocal: false, pack_size: 6 }) },
    // More accessories
    { product_name: 'Retainer Sport Strap', category: 'Accessories', product_type: 'accessory', brand: 'Croakies', sku: 'ACC-CRK-RS-004', price: 14.99, inventory_count: 300, attributes: JSON.stringify({ accessory_type: 'strap', fits: 'all_standard_frames' }) },
    { product_name: 'Anti-Fog Wipes (30pk)', category: 'Accessories', product_type: 'accessory', brand: 'OptiSight', sku: 'ACC-OS-AFW-005', price: 9.99, inventory_count: 600, attributes: JSON.stringify({ accessory_type: 'cleaning_wipes', pack_size: 30 }) },
    { product_name: 'Blue Light Clip-On', category: 'Accessories', product_type: 'accessory', brand: 'OptiSight', sku: 'ACC-OS-BLC-006', price: 24.99, inventory_count: 200, attributes: JSON.stringify({ accessory_type: 'clip_on', filter: 'blue_light' }) },
    { product_name: 'Polarized Clip-On', category: 'Accessories', product_type: 'accessory', brand: 'OptiSight', sku: 'ACC-OS-PLC-007', price: 34.99, inventory_count: 180, attributes: JSON.stringify({ accessory_type: 'clip_on', filter: 'polarized' }) },
    { product_name: 'Kids Frame Adjuster Kit', category: 'Accessories', product_type: 'accessory', brand: 'OptiSight', sku: 'ACC-OS-KFA-008', price: 16.99, inventory_count: 250, attributes: JSON.stringify({ accessory_type: 'adjustment_kit', target: 'kids' }) },
    { product_name: 'Premium Leather Case', category: 'Accessories', product_type: 'accessory', brand: 'Ray-Ban', sku: 'ACC-RB-PLC-009', price: 39.99, inventory_count: 150, attributes: JSON.stringify({ accessory_type: 'case', material: 'leather' }) },
  ];

  const existingSkus = new Set((await db('products').select('sku')).map(p => p.sku));
  const prodsToInsert = newProducts.filter(p => !existingSkus.has(p.sku));
  if (prodsToInsert.length > 0) {
    await db('products').insert(prodsToInsert);
    console.log(`Inserted ${prodsToInsert.length} new products.`);
  } else {
    console.log('All expansion products already exist, skipping.');
  }

  // Reload full data for FK references
  const allStores = await db('stores').select('store_id', 'store_name', 'region');
  const allProducts = await db('products').select('product_id', 'product_name', 'product_type', 'price');
  const storeMap = {};
  allStores.forEach(s => { storeMap[s.store_name] = s; });
  const storeIds = allStores.map(s => s.store_id);

  const frames = allProducts.filter(p => p.product_type === 'frame');
  const lenses = allProducts.filter(p => p.product_type === 'lens');
  const coatings = allProducts.filter(p => p.product_type === 'coating');
  const contacts = allProducts.filter(p => p.product_type === 'contact_lens');
  const accessories = allProducts.filter(p => p.product_type === 'accessory');

  // ── 3. NEW EMPLOYEES (24) ──────────────────────────────────
  const rolePool = ['optometrist', 'optician', 'sales_associate', 'manager'];
  const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Avery', 'Riley', 'Quinn', 'Peyton', 'Drew', 'Hayden', 'Blake', 'Reese', 'Cameron', 'Sage', 'Dakota', 'Skyler', 'Rowan', 'Emery', 'Finley', 'Harper', 'Logan', 'Parker', 'Addison'];
  const lastNames = ['Foster', 'Reed', 'Morales', 'Nguyen', 'Baker', 'Sullivan', 'Cruz', 'Powell', 'Jenkins', 'Burns', 'Hayes', 'Simmons', 'Russell', 'Griffin', 'Long', 'Bryant', 'Coleman', 'Butler', 'Barnes', 'Murphy', 'Rivera', 'Cooper', 'Ward', 'Singh'];

  const existingEmpCount = await db('employees').count('* as c').first();
  if (parseInt(existingEmpCount.c) < 30) {
    const newEmployees = [];
    // Add 1 optometrist, 1 optician, 0-1 sales_associate per new store
    const newStoreNames = newStores.map(s => s.store_name);
    let nameIdx = 0;
    for (const storeName of newStoreNames) {
      const store = storeMap[storeName];
      if (!store) continue;
      // Optometrist
      newEmployees.push({
        store_id: store.store_id,
        first_name: firstNames[nameIdx % firstNames.length],
        last_name: lastNames[nameIdx % lastNames.length],
        role: 'optometrist',
        hire_date: `2024-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,
        is_active: true,
        performance_data: JSON.stringify({ sales_total: randInt(80000, 250000), exams_conducted: randInt(400, 1200), customer_satisfaction_score: randFloat(4.0, 5.0, 1) }),
      });
      nameIdx++;
      // Optician
      newEmployees.push({
        store_id: store.store_id,
        first_name: firstNames[nameIdx % firstNames.length],
        last_name: lastNames[nameIdx % lastNames.length],
        role: 'optician',
        hire_date: `2024-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,
        is_active: true,
        performance_data: JSON.stringify({ sales_total: randInt(50000, 150000), exams_conducted: 0, customer_satisfaction_score: randFloat(3.8, 4.9, 1) }),
      });
      nameIdx++;
    }
    // Batch insert
    for (let i = 0; i < newEmployees.length; i += 25) {
      await db('employees').insert(newEmployees.slice(i, i + 25));
    }
    console.log(`Inserted ${newEmployees.length} new employees.`);
  } else {
    console.log('Employee count already >= 30, skipping expansion.');
  }

  // ── 4. NEW CUSTOMERS (200) ─────────────────────────────────
  const custFirst = ['Olivia','Liam','Emma','Noah','Ava','Elijah','Sophia','William','Isabella','James','Mia','Oliver','Charlotte','Benjamin','Amelia','Lucas','Harper','Mason','Evelyn','Logan','Abigail','Alexander','Ella','Ethan','Elizabeth','Jacob','Camila','Michael','Luna','Daniel','Grace','Henry','Chloe','Jackson','Penelope','Sebastian','Layla','Aiden','Riley','Matthew','Zoey','Samuel','Nora','David','Lily','Joseph','Eleanor','Carter','Hannah','Owen','Lillian','Wyatt','Addison','John','Aubrey','Jack','Ellie','Luke','Stella','Jayden','Natalie','Dylan','Zoe','Grayson','Leah','Levi','Hazel','Isaac','Violet','Gabriel','Aurora','Julian','Savannah','Mateo','Audrey','Anthony','Brooklyn','Jaxon','Bella','Lincoln','Claire','Joshua','Skylar','Christopher','Lucy','Andrew','Paisley','Theodore','Everly','Caleb','Anna','Ryan','Caroline','Asher','Nova','Nathan','Genesis','Thomas','Emilia','Leo','Kennedy','Isaiah','Maya','Charles','Willow','Josiah','Kinsley','Hudson','Naomi','Christian','Aaliyah','Hunter','Elena','Connor','Sarah','Eli','Ariana','Ezra','Allison','Aaron','Gabriella','Landon','Alice','Adrian','Madelyn','Jonathan','Cora','Nolan','Ruby','Jeremiah','Eva','Easton','Serenity','Elias','Autumn','Colton','Adeline','Cameron','Hailey','Carson','Gianna','Robert','Valentina','Angel','Isla','Maverick','Eliana','Nicholas','Quinn','Dominic','Nevaeh','Jace','Ivy','Cooper','Sadie','Ian','Piper','Austin','Lydia','Jason','Alexa','Miles','Josephine','Ezekiel','Emery','Declan','Julia','Greyson','Delilah','Weston','Arianna','Santiago','Vivian','Harrison','Kaylee','Brandon','Sophie','Kai','Brielle','Ryder','Madeline','Bennett','Peyton','George','Rylee','Wesley','Clara','Rowan','Hadley','Beau','Melody','Cole','Iris','Damian','Norah','Vincent','Rose','Sawyer','Cecilia','Diego','Daisy','Axel','Keira','Silas','Brooke','Braxton','Jade','Myles','Mila'];
  const custLast = ['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez','Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Perez','Hall','Young','Allen','Sanchez','Wright','King','Scott','Green','Baker','Adams','Nelson','Hill','Ramirez','Campbell','Mitchell','Roberts','Carter','Phillips','Evans','Turner','Torres','Parker','Collins','Edwards','Stewart','Flores','Morris','Nguyen','Murphy','Rivera','Cook','Rogers','Morgan','Peterson','Cooper','Reed','Bailey','Bell','Gomez','Kelly','Howard','Ward','Cox','Diaz','Richardson','Wood','Watson','Brooks','Bennett','Gray','James','Reyes','Cruz','Hughes','Price','Myers','Long','Foster','Sanders','Ross','Morales','Powell','Sullivan','Russell','Ortiz','Jenkins','Gutierrez','Perry','Butler','Barnes','Fisher'];

  const insuranceMix = [
    ...Array(40).fill('VSP'),
    ...Array(30).fill('EyeMed'),
    ...Array(20).fill('Davis Vision'),
    ...Array(10).fill(null),
  ];

  const existingCustCount = await db('customers').count('* as c').first();
  if (parseInt(existingCustCount.c) < 200) {
    const target = 200 - parseInt(existingCustCount.c);
    const newCustomers = [];
    const existingEmails = new Set((await db('customers').select('email')).map(c => c.email));

    for (let i = 0; i < target; i++) {
      const fn = pick(custFirst);
      const ln = pick(custLast);
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${randInt(100,999)}@email.com`;
      if (existingEmails.has(email)) continue;
      existingEmails.add(email);

      const ins = pick(insuranceMix);
      newCustomers.push({
        first_name: fn,
        last_name: ln,
        email,
        phone: `${pick(['214','713','602','512','210','480','817','404','305','212','617','310','415','312','614'])}‑555-${String(randInt(1000,9999))}`,
        date_of_birth: `${randInt(1960,2002)}-${String(randInt(1,12)).padStart(2,'0')}-${String(randInt(1,28)).padStart(2,'0')}`,
        insurance_provider: ins,
        insurance_id: ins ? `${ins === 'VSP' ? 'VSP' : ins === 'EyeMed' ? 'EM' : 'DV'}-${randInt(10000,99999)}` : null,
        preferred_store_id: pick(storeIds),
      });
    }

    for (let i = 0; i < newCustomers.length; i += 50) {
      await db('customers').insert(newCustomers.slice(i, i + 50));
    }
    console.log(`Inserted ${newCustomers.length} new customers.`);
  } else {
    console.log('Customer count already >= 200, skipping expansion.');
  }

  // Reload employees and customers for FK references
  const allEmployees = await db('employees').select('employee_id', 'store_id', 'role');
  const allCustomers = await db('customers').select('customer_id', 'insurance_provider');
  const optometrists = allEmployees.filter(e => e.role === 'optometrist');
  const empByStore = {};
  allEmployees.forEach(e => {
    if (!empByStore[e.store_id]) empByStore[e.store_id] = [];
    empByStore[e.store_id].push(e);
  });

  // ── 5. NEW EYE EXAMS (expand to ~2000) ─────────────────────
  const examTypes = ['comprehensive', 'contact_lens', 'follow_up'];
  const examWeights = [0.60, 0.25, 0.15];
  const findingsPool = {
    comprehensive: [
      'Mild myopia progression noted. Updated Rx recommended.',
      'No significant changes from prior exam. Healthy retinal appearance.',
      'Early signs of dry eye syndrome. Recommend artificial tears.',
      'Slight astigmatism increase in right eye. New correction prescribed.',
      'Intraocular pressures within normal limits. Optic nerve healthy.',
      'Trace nuclear sclerosis noted. Discussed with patient, no treatment needed at this time.',
      'Anterior segment unremarkable. Dilated fundus exam shows healthy periphery.',
      'Patient reports occasional headaches. Moderate hyperopic shift detected.',
      'Corneal topography within normal limits. Good tear film stability.',
      'Macular OCT scan normal. No signs of degeneration.',
    ],
    contact_lens: [
      'Corneal curvature suitable for daily disposable lenses.',
      'Trial lenses fitted well. Patient comfortable after 20 min wear test.',
      'Recommend toric lenses for astigmatism correction.',
      'Multifocal contact lens evaluation. Patient adapting well.',
      'Scleral lens fit assessment. Good centration and comfort reported.',
    ],
    follow_up: [
      'Follow-up on progressive lens adaptation. Patient adjusting well.',
      'Post-cataract surgery check. Visual acuity 20/25 improving.',
      'Glaucoma suspect monitoring. No progression detected.',
      'Dry eye treatment follow-up. Symptoms improved with therapy.',
      'Contact lens aftercare. No corneal complications detected.',
    ],
  };

  function genPrescription() {
    const eye = () => ({
      sphere: +(Math.round((Math.random() * 10 - 6) * 4) / 4).toFixed(2),
      cylinder: +(Math.round((Math.random() * -3) * 4) / 4).toFixed(2),
      axis: randInt(1, 180),
      add: Math.random() > 0.6 ? +(Math.round(Math.random() * 3 * 4) / 4).toFixed(2) : null,
      pd: randFloat(28, 36, 1),
    });
    return { right_eye: eye(), left_eye: eye() };
  }

  const existingExamCount = await db('eye_exams').count('* as c').first();
  const examTarget = 2000 - parseInt(existingExamCount.c);

  if (examTarget > 0) {
    const newExams = [];
    for (let i = 0; i < examTarget; i++) {
      const storeId = pick(storeIds);
      const customerId = pick(allCustomers).customer_id;
      const optometrist = optometrists.find(o => o.store_id === storeId) || pick(optometrists);
      const examType = weightedPick(examTypes, examWeights);

      newExams.push({
        customer_id: customerId,
        store_id: storeId,
        optometrist_id: optometrist.employee_id,
        exam_date: daysAgo(randInt(1, 365)),
        exam_type: examType,
        prescription_data: JSON.stringify(genPrescription()),
        findings: pick(findingsPool[examType]),
        next_exam_date: daysAgo(-randInt(180, 365)).toISOString().split('T')[0],
      });
    }

    for (let i = 0; i < newExams.length; i += 100) {
      await db('eye_exams').insert(newExams.slice(i, i + 100));
    }
    console.log(`Inserted ${newExams.length} new eye exams.`);
  }

  // ── 6. NEW TRANSACTIONS (expand to ~4000) ──────────────────
  const allExams = await db('eye_exams').select('exam_id', 'customer_id', 'store_id');
  const examByCustomer = {};
  allExams.forEach(e => {
    if (!examByCustomer[e.customer_id]) examByCustomer[e.customer_id] = [];
    examByCustomer[e.customer_id].push(e);
  });

  const paymentMethods = ['insurance', 'insurance', 'insurance', 'insurance', 'insurance', 'insurance', 'credit_card', 'credit_card', 'credit_card', 'cash', 'cash', 'financing'];

  // Store weights — Dallas deliberately low in recent 30 days
  const dallasStore = allStores.find(s => s.store_name.includes('Dallas'));

  const existingTxnCount = await db('transactions').count('* as c').first();
  const txnTarget = 4000 - parseInt(existingTxnCount.c);

  if (txnTarget > 0) {
    const newTxns = [];

    for (let i = 0; i < txnTarget; i++) {
      const dayOffset = randInt(1, 365);
      const isRecent = dayOffset <= 30;
      // Dallas gets fewer transactions recently (revenue dip pattern)
      let storeId;
      if (isRecent && dallasStore && Math.random() < 0.9) {
        // 90% chance: pick non-Dallas store
        const nonDallas = storeIds.filter(id => id !== dallasStore.store_id);
        storeId = pick(nonDallas);
      } else {
        storeId = pick(storeIds);
      }

      const customer = pick(allCustomers);
      const custExams = examByCustomer[customer.customer_id];
      const examId = custExams ? pick(custExams).exam_id : null;
      const storeEmps = empByStore[storeId];
      const employee = storeEmps ? pick(storeEmps) : pick(allEmployees);
      const payment = pick(paymentMethods);

      // Build items
      const txnType = Math.random();
      let items = [];
      let total = 0;

      if (txnType < 0.65) {
        // Frame + lens + optional coatings
        const frame = pick(frames);
        const lens = pick(lenses);
        items.push({ product_id: frame.product_id, product_name: frame.product_name, quantity: 1, unit_price: +frame.price, line_total: +frame.price });
        items.push({ product_id: lens.product_id, product_name: lens.product_name, quantity: 1, unit_price: +lens.price, line_total: +lens.price });
        total = +frame.price + +lens.price;

        if (Math.random() < 0.80) {
          const coat = pick(coatings);
          items.push({ product_id: coat.product_id, product_name: coat.product_name, quantity: 1, unit_price: +coat.price, line_total: +coat.price });
          total += +coat.price;
        }
        if (Math.random() < 0.35) {
          const coat2 = pick(coatings);
          items.push({ product_id: coat2.product_id, product_name: coat2.product_name, quantity: 1, unit_price: +coat2.price, line_total: +coat2.price });
          total += +coat2.price;
        }
      } else if (txnType < 0.85) {
        // Contacts only
        const cl = pick(contacts);
        const qty = pick([1, 2, 4]);
        items.push({ product_id: cl.product_id, product_name: cl.product_name, quantity: qty, unit_price: +cl.price, line_total: +(cl.price * qty).toFixed(2) });
        total = +(cl.price * qty).toFixed(2);
      } else if (txnType < 0.95) {
        // Accessories
        const acc = pick(accessories);
        items.push({ product_id: acc.product_id, product_name: acc.product_name, quantity: 1, unit_price: +acc.price, line_total: +acc.price });
        total = +acc.price;
      } else {
        // Lens upgrade (lens + coatings)
        const lens = pick(lenses);
        const coat = pick(coatings);
        items.push({ product_id: lens.product_id, product_name: lens.product_name, quantity: 1, unit_price: +lens.price, line_total: +lens.price });
        items.push({ product_id: coat.product_id, product_name: coat.product_name, quantity: 1, unit_price: +coat.price, line_total: +coat.price });
        total = +lens.price + +coat.price;
      }

      newTxns.push({
        store_id: storeId,
        customer_id: customer.customer_id,
        employee_id: employee.employee_id,
        exam_id: examId,
        total_amount: total.toFixed(2),
        transaction_date: daysAgo(dayOffset),
        payment_method: payment,
        insurance_claim_id: payment === 'insurance' ? `CLM-${randInt(100000, 999999)}` : null,
        items: JSON.stringify(items),
      });
    }

    for (let i = 0; i < newTxns.length; i += 100) {
      await db('transactions').insert(newTxns.slice(i, i + 100));
    }
    console.log(`Inserted ${newTxns.length} new transactions.`);
  }

  // ── 7. NEW ISSUES (expand to ~300) ─────────────────────────
  const categories = ['Product Quality', 'Customer Service', 'Billing', 'Wait Time', 'Prescription Accuracy', 'Inventory', 'Insurance Processing'];
  const sentiments = ['negative', 'negative', 'negative', 'neutral'];
  const statuses = ['open', 'open', 'in_progress', 'in_progress', 'resolved', 'resolved', 'resolved'];

  const descriptionPool = {
    'Product Quality': [
      'The anti-glare coating on my new lenses has started to crack and peel within 2 weeks. Very disappointed with the quality.',
      'Frame broke at the temple hinge after only 3 months of normal use. Expected better durability for the price.',
      'Lens scratches appeared after regular cleaning with the provided microfiber cloth. Scratch-resistant coating seems ineffective.',
      'The progressive lenses have significant distortion at the edges making it difficult to read when looking down.',
      'Coating appears to have manufacturing defects - small bubbles visible when looking at light sources.',
      'Tint on photochromic lenses is uneven - one lens darkens faster than the other in sunlight.',
      'Contact lenses dried out faster than expected. Comfort decreased significantly after 6 hours of wear.',
      'Frame color is fading at the nose pads and temple tips after only 2 months of regular wear.',
      'Anti-reflective coating creates a purple tint that is visible and distracting in certain lighting conditions.',
      'Lens material appears to have stress fractures radiating from the drill points on rimless frame.',
    ],
    'Customer Service': [
      'Staff seemed disinterested and rushed during my frame fitting. Had to ask multiple times for assistance.',
      'Waited 20 minutes at the counter before anyone acknowledged my presence. Only one staff member was helping customers.',
      'The optician did not explain the different lens options clearly. Felt pressured into the most expensive option.',
      'Called to reschedule appointment but was put on hold for 15 minutes before the call was answered.',
      'Staff was unable to answer questions about my insurance coverage and told me to call my insurance directly.',
      'Frame adjustment was done hastily. Glasses still sit crooked on my face after the adjustment.',
      'Received no follow-up call after ordering new glasses despite being told I would be contacted within a week.',
      'The team member helping me seemed unfamiliar with the product line and had to repeatedly check with a colleague.',
    ],
    'Billing': [
      'Charged for premium coating I did not request. The optician added it without my explicit approval.',
      'Insurance claim was submitted incorrectly causing a denial. Now facing out-of-pocket costs that should be covered.',
      'Duplicate charge appeared on my credit card statement for the same transaction. Still waiting for refund.',
      'The quoted price did not include coating fees which were added at checkout without prior notice.',
      'Was told my insurance would cover the exam fully but received a bill for $85 afterward.',
      'Financing plan terms were different from what was discussed in store. Monthly payments are higher than agreed.',
      'Paid for expedited lens processing but received them in the standard timeframe. No refund offered.',
      'Receipt shows different prices than what was displayed on the product tags in the store.',
    ],
    'Wait Time': [
      'Appointment was scheduled for 2:00 PM but I wasn\'t seen until 2:45 PM. No explanation for the delay.',
      'Glasses were promised in 7-10 business days but took over 3 weeks with no proactive communication about the delay.',
      'Spent 90 minutes in the store for what should have been a simple frame adjustment.',
      'Online ordering process indicated 5-day shipping but glasses arrived after 12 days.',
      'Walk-in wait was over an hour despite the store appearing relatively empty.',
      'Lab turnaround for progressive lenses was 3 weeks instead of the quoted 10 days.',
    ],
    'Prescription Accuracy': [
      'New prescription makes everything blurry at distance. Old glasses provide better clarity.',
      'Pupillary distance measurement seems incorrect - getting headaches when wearing new glasses.',
      'Progressive lens zones don\'t align with my natural eye movement. Reading area is too narrow.',
      'Contact lens prescription feels over-corrected. Getting eye strain after 2 hours of screen time.',
      'The prescription change from my previous glasses seems too drastic. Experiencing dizziness.',
      'Bifocal line placement is too high - interferes with my intermediate vision at the computer.',
    ],
    'Inventory': [
      'Frame I selected was out of stock. Had to wait 3 weeks for reorder with no loaner offered.',
      'Wanted specific lens brand but was told they only carry one supplier. Limited options.',
      'Contact lens brand I use was unavailable. Was pushed toward a different brand I haven\'t tried.',
      'Display model was the only one available in my color choice. No new stock expected for a month.',
      'Accessory I wanted to purchase was listed on the website but not available in store.',
    ],
    'Insurance Processing': [
      'Pre-authorization was not obtained before my exam. Now insurance is refusing to cover the visit.',
      'Staff submitted claim to wrong insurance plan. Had to follow up multiple times to get it corrected.',
      'Was told my insurance covers new frames annually but claim was denied. Staff misinformed me about coverage.',
      'Insurance discount was not applied at checkout. Had to return to store to get price adjustment.',
      'Secondary insurance was not billed after primary processed. Left with balance I shouldn\'t owe.',
      'Out-of-network benefits were quoted higher than actual. Expected $0 copay but owe $120.',
    ],
  };

  const existingIssueCount = await db('issues').count('* as c').first();
  const issueTarget = 300 - parseInt(existingIssueCount.c);

  if (issueTarget > 0) {
    const newIssues = [];
    const batchIds = ['B2025-Q4-112', 'B2025-Q4-115', 'B2025-Q3-098', 'B2026-Q1-001', 'B2026-Q1-005', 'B2026-Q1-010'];

    for (let i = 0; i < issueTarget; i++) {
      const category = pick(categories);
      const descriptions = descriptionPool[category] || descriptionPool['Product Quality'];
      const description = pick(descriptions);
      const store = pick(allStores);
      const status = pick(statuses);
      const createdAt = daysAgo(randInt(1, 180));
      const escalation = weightedPick([1, 2, 3, 4], [0.55, 0.25, 0.15, 0.05]);

      // Anti-glare complaints concentrated in Dallas/Plano (deliberate pattern)
      let targetStore = store;
      if (category === 'Product Quality' && description.includes('anti-glare') && Math.random() < 0.6) {
        targetStore = allStores.find(s => s.store_name.includes('Dallas')) || store;
      }

      const issue = {
        store_id: targetStore.store_id,
        region: targetStore.region,
        category,
        description,
        sentiment: pick(sentiments),
        status,
        escalation_level: escalation,
        user_id: pick(allCustomers).customer_id,
        created_at: createdAt,
        metadata: category === 'Product Quality'
          ? JSON.stringify({ product_sku: pick(['CTG-AG-PRM-001', 'CTG-SCR-STD-003', 'CTG-BLF-STD-002', 'FRM-RB-AVI-001', 'LNS-PRG-PRM-002']), batch: pick(batchIds) })
          : JSON.stringify({ source: pick(['phone', 'email', 'in_store', 'website', 'survey']) }),
      };

      if (status === 'resolved') {
        issue.resolved_at = new Date(createdAt.getTime() + randInt(1, 14) * 86400000);
        issue.resolution_notes = pick([
          'Replaced lenses with new coating batch. Customer satisfied.',
          'Issued full refund and complimentary replacement pair.',
          'Re-fitted frames. Customer confirmed improved comfort.',
          'Corrected billing. Applied proper insurance adjustment.',
          'Expedited reorder. Offered discount on next visit.',
          'Optometrist re-examined. Adjusted prescription.',
          'Escalated to manufacturer. Warranty replacement provided.',
          'Store credit issued. Customer accepted resolution.',
        ]);
        issue.root_cause = pick([
          'Defective coating batch',
          'Staff training gap',
          'System error in billing',
          'Scheduling conflict',
          'Measurement error',
          'Supply chain delay',
          'Insurance data mismatch',
          'Manufacturing defect',
        ]);
      }

      newIssues.push(issue);
    }

    // Insert in batches
    for (let i = 0; i < newIssues.length; i += 50) {
      await db('issues').insert(newIssues.slice(i, i + 50));
    }
    console.log(`Inserted ${newIssues.length} new issues.`);
  }

  // ── Summary ────────────────────────────────────────────────
  const counts = await Promise.all([
    db('stores').count('* as c').first(),
    db('products').count('* as c').first(),
    db('employees').count('* as c').first(),
    db('customers').count('* as c').first(),
    db('eye_exams').count('* as c').first(),
    db('transactions').count('* as c').first(),
    db('issues').count('* as c').first(),
  ]);

  console.log('\nFinal data volumes:');
  console.log(`  Stores:       ${counts[0].c}`);
  console.log(`  Products:     ${counts[1].c}`);
  console.log(`  Employees:    ${counts[2].c}`);
  console.log(`  Customers:    ${counts[3].c}`);
  console.log(`  Eye Exams:    ${counts[4].c}`);
  console.log(`  Transactions: ${counts[5].c}`);
  console.log(`  Issues:       ${counts[6].c}`);
  console.log('\nData expansion complete!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Data expansion failed:', err);
    process.exit(1);
  });
