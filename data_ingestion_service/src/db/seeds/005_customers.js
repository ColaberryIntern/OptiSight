/**
 * Customer seed data — 50 optical patients/customers.
 * Insurance mix: VSP (20), EyeMed (15), Davis Vision (10), None (5)
 * Preferred stores weighted toward Dallas/Plano/Houston.
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('customers').del();

  const stores = await knex('stores').select('store_id', 'store_name');
  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.store_name] = s.store_id;
  });

  const sid = (name) => storeMap[name] || null;

  // Shorthand store references for weighting
  const DALLAS = sid('OptiSight Vision Center - Dallas');
  const PLANO = sid('Plano Eye Gallery');
  const HOUSTON = sid('Houston Optical Hub');
  const PHOENIX = sid('Phoenix LensCraft');
  const AUSTIN = sid('Austin Vision Lab');
  const SANANTONIO = sid('San Antonio EyeCare');
  const SCOTTSDALE = sid('Scottsdale Optical Boutique');
  const FORTWORTH = sid('Fort Worth Eye Center');

  const customers = [
    // VSP Insurance (20 customers)
    { first_name: 'Jennifer', last_name: 'Anderson', email: 'j.anderson@email.com', phone: '214-555-1001', date_of_birth: '1985-03-12', insurance_provider: 'VSP', insurance_id: 'VSP-9001', preferred_store_id: DALLAS },
    { first_name: 'Michael', last_name: 'Thompson', email: 'm.thompson@email.com', phone: '214-555-1002', date_of_birth: '1972-07-22', insurance_provider: 'VSP', insurance_id: 'VSP-9002', preferred_store_id: DALLAS },
    { first_name: 'Sarah', last_name: 'Mitchell', email: 's.mitchell@email.com', phone: '972-555-1003', date_of_birth: '1990-11-05', insurance_provider: 'VSP', insurance_id: 'VSP-9003', preferred_store_id: PLANO },
    { first_name: 'Robert', last_name: 'Williams', email: 'r.williams@email.com', phone: '972-555-1004', date_of_birth: '1968-01-30', insurance_provider: 'VSP', insurance_id: 'VSP-9004', preferred_store_id: PLANO },
    { first_name: 'Emily', last_name: 'Davis', email: 'e.davis@email.com', phone: '713-555-1005', date_of_birth: '1995-05-18', insurance_provider: 'VSP', insurance_id: 'VSP-9005', preferred_store_id: HOUSTON },
    { first_name: 'Christopher', last_name: 'Brown', email: 'c.brown@email.com', phone: '713-555-1006', date_of_birth: '1982-09-14', insurance_provider: 'VSP', insurance_id: 'VSP-9006', preferred_store_id: HOUSTON },
    { first_name: 'Amanda', last_name: 'Garcia', email: 'a.garcia@email.com', phone: '602-555-1007', date_of_birth: '1978-12-03', insurance_provider: 'VSP', insurance_id: 'VSP-9007', preferred_store_id: PHOENIX },
    { first_name: 'David', last_name: 'Martinez', email: 'd.martinez@email.com', phone: '512-555-1008', date_of_birth: '1988-04-25', insurance_provider: 'VSP', insurance_id: 'VSP-9008', preferred_store_id: AUSTIN },
    { first_name: 'Jessica', last_name: 'Wilson', email: 'j.wilson@email.com', phone: '210-555-1009', date_of_birth: '1993-08-07', insurance_provider: 'VSP', insurance_id: 'VSP-9009', preferred_store_id: SANANTONIO },
    { first_name: 'Daniel', last_name: 'Taylor', email: 'd.taylor@email.com', phone: '480-555-1010', date_of_birth: '1975-02-19', insurance_provider: 'VSP', insurance_id: 'VSP-9010', preferred_store_id: SCOTTSDALE },
    { first_name: 'Lauren', last_name: 'Moore', email: 'l.moore@email.com', phone: '817-555-1011', date_of_birth: '1991-06-11', insurance_provider: 'VSP', insurance_id: 'VSP-9011', preferred_store_id: FORTWORTH },
    { first_name: 'Andrew', last_name: 'Jackson', email: 'a.jackson@email.com', phone: '214-555-1012', date_of_birth: '1965-10-28', insurance_provider: 'VSP', insurance_id: 'VSP-9012', preferred_store_id: DALLAS },
    { first_name: 'Melissa', last_name: 'White', email: 'm.white@email.com', phone: '214-555-1013', date_of_birth: '1987-01-16', insurance_provider: 'VSP', insurance_id: 'VSP-9013', preferred_store_id: DALLAS },
    { first_name: 'Joshua', last_name: 'Harris', email: 'j.harris@email.com', phone: '972-555-1014', date_of_birth: '1979-03-22', insurance_provider: 'VSP', insurance_id: 'VSP-9014', preferred_store_id: PLANO },
    { first_name: 'Stephanie', last_name: 'Clark', email: 's.clark@email.com', phone: '713-555-1015', date_of_birth: '1996-07-09', insurance_provider: 'VSP', insurance_id: 'VSP-9015', preferred_store_id: HOUSTON },
    { first_name: 'Kevin', last_name: 'Lewis', email: 'k.lewis@email.com', phone: '214-555-1016', date_of_birth: '1970-11-13', insurance_provider: 'VSP', insurance_id: 'VSP-9016', preferred_store_id: DALLAS },
    { first_name: 'Rachel', last_name: 'Robinson', email: 'r.robinson@email.com', phone: '972-555-1017', date_of_birth: '1984-05-27', insurance_provider: 'VSP', insurance_id: 'VSP-9017', preferred_store_id: PLANO },
    { first_name: 'Brian', last_name: 'Walker', email: 'b.walker@email.com', phone: '602-555-1018', date_of_birth: '1992-08-04', insurance_provider: 'VSP', insurance_id: 'VSP-9018', preferred_store_id: PHOENIX },
    { first_name: 'Nicole', last_name: 'Hall', email: 'n.hall@email.com', phone: '512-555-1019', date_of_birth: '1977-12-21', insurance_provider: 'VSP', insurance_id: 'VSP-9019', preferred_store_id: AUSTIN },
    { first_name: 'Timothy', last_name: 'Allen', email: 't.allen@email.com', phone: '817-555-1020', date_of_birth: '1989-02-14', insurance_provider: 'VSP', insurance_id: 'VSP-9020', preferred_store_id: FORTWORTH },

    // EyeMed Insurance (15 customers)
    { first_name: 'Patricia', last_name: 'Young', email: 'p.young@email.com', phone: '214-555-2001', date_of_birth: '1973-04-08', insurance_provider: 'EyeMed', insurance_id: 'EM-5001', preferred_store_id: DALLAS },
    { first_name: 'Thomas', last_name: 'King', email: 't.king@email.com', phone: '214-555-2002', date_of_birth: '1981-09-17', insurance_provider: 'EyeMed', insurance_id: 'EM-5002', preferred_store_id: DALLAS },
    { first_name: 'Lisa', last_name: 'Wright', email: 'l.wright@email.com', phone: '972-555-2003', date_of_birth: '1986-06-30', insurance_provider: 'EyeMed', insurance_id: 'EM-5003', preferred_store_id: PLANO },
    { first_name: 'Mark', last_name: 'Lopez', email: 'm.lopez@email.com', phone: '713-555-2004', date_of_birth: '1974-01-25', insurance_provider: 'EyeMed', insurance_id: 'EM-5004', preferred_store_id: HOUSTON },
    { first_name: 'Sandra', last_name: 'Hill', email: 's.hill@email.com', phone: '713-555-2005', date_of_birth: '1994-10-12', insurance_provider: 'EyeMed', insurance_id: 'EM-5005', preferred_store_id: HOUSTON },
    { first_name: 'Steven', last_name: 'Scott', email: 's.scott@email.com', phone: '602-555-2006', date_of_birth: '1967-07-03', insurance_provider: 'EyeMed', insurance_id: 'EM-5006', preferred_store_id: PHOENIX },
    { first_name: 'Karen', last_name: 'Green', email: 'k.green@email.com', phone: '512-555-2007', date_of_birth: '1983-03-19', insurance_provider: 'EyeMed', insurance_id: 'EM-5007', preferred_store_id: AUSTIN },
    { first_name: 'Jason', last_name: 'Adams', email: 'j.adams@email.com', phone: '210-555-2008', date_of_birth: '1990-12-06', insurance_provider: 'EyeMed', insurance_id: 'EM-5008', preferred_store_id: SANANTONIO },
    { first_name: 'Michelle', last_name: 'Nelson', email: 'm.nelson@email.com', phone: '480-555-2009', date_of_birth: '1976-08-23', insurance_provider: 'EyeMed', insurance_id: 'EM-5009', preferred_store_id: SCOTTSDALE },
    { first_name: 'Jeffrey', last_name: 'Carter', email: 'j.carter@email.com', phone: '817-555-2010', date_of_birth: '1998-05-14', insurance_provider: 'EyeMed', insurance_id: 'EM-5010', preferred_store_id: FORTWORTH },
    { first_name: 'Angela', last_name: 'Mitchell', email: 'a.mitchell2@email.com', phone: '214-555-2011', date_of_birth: '1969-11-09', insurance_provider: 'EyeMed', insurance_id: 'EM-5011', preferred_store_id: DALLAS },
    { first_name: 'Ryan', last_name: 'Perez', email: 'r.perez@email.com', phone: '972-555-2012', date_of_birth: '1988-02-28', insurance_provider: 'EyeMed', insurance_id: 'EM-5012', preferred_store_id: PLANO },
    { first_name: 'Heather', last_name: 'Roberts', email: 'h.roberts@email.com', phone: '713-555-2013', date_of_birth: '1980-07-15', insurance_provider: 'EyeMed', insurance_id: 'EM-5013', preferred_store_id: HOUSTON },
    { first_name: 'Gary', last_name: 'Turner', email: 'g.turner@email.com', phone: '512-555-2014', date_of_birth: '1971-04-02', insurance_provider: 'EyeMed', insurance_id: 'EM-5014', preferred_store_id: AUSTIN },
    { first_name: 'Donna', last_name: 'Phillips', email: 'd.phillips@email.com', phone: '210-555-2015', date_of_birth: '1997-09-21', insurance_provider: 'EyeMed', insurance_id: 'EM-5015', preferred_store_id: SANANTONIO },

    // Davis Vision Insurance (10 customers)
    { first_name: 'Kenneth', last_name: 'Campbell', email: 'k.campbell@email.com', phone: '214-555-3001', date_of_birth: '1966-05-11', insurance_provider: 'Davis Vision', insurance_id: 'DV-7001', preferred_store_id: DALLAS },
    { first_name: 'Laura', last_name: 'Parker', email: 'l.parker@email.com', phone: '972-555-3002', date_of_birth: '1985-08-27', insurance_provider: 'Davis Vision', insurance_id: 'DV-7002', preferred_store_id: PLANO },
    { first_name: 'Gregory', last_name: 'Evans', email: 'g.evans@email.com', phone: '713-555-3003', date_of_birth: '1978-01-14', insurance_provider: 'Davis Vision', insurance_id: 'DV-7003', preferred_store_id: HOUSTON },
    { first_name: 'Carol', last_name: 'Edwards', email: 'c.edwards@email.com', phone: '602-555-3004', date_of_birth: '1992-06-05', insurance_provider: 'Davis Vision', insurance_id: 'DV-7004', preferred_store_id: PHOENIX },
    { first_name: 'Frank', last_name: 'Collins', email: 'f.collins@email.com', phone: '512-555-3005', date_of_birth: '1974-10-30', insurance_provider: 'Davis Vision', insurance_id: 'DV-7005', preferred_store_id: AUSTIN },
    { first_name: 'Sharon', last_name: 'Stewart', email: 's.stewart@email.com', phone: '210-555-3006', date_of_birth: '1989-03-18', insurance_provider: 'Davis Vision', insurance_id: 'DV-7006', preferred_store_id: SANANTONIO },
    { first_name: 'Raymond', last_name: 'Sanchez', email: 'r.sanchez@email.com', phone: '480-555-3007', date_of_birth: '1981-12-09', insurance_provider: 'Davis Vision', insurance_id: 'DV-7007', preferred_store_id: SCOTTSDALE },
    { first_name: 'Dorothy', last_name: 'Morris', email: 'd.morris@email.com', phone: '817-555-3008', date_of_birth: '1970-07-24', insurance_provider: 'Davis Vision', insurance_id: 'DV-7008', preferred_store_id: FORTWORTH },
    { first_name: 'Henry', last_name: 'Rogers', email: 'h.rogers@email.com', phone: '214-555-3009', date_of_birth: '1994-04-16', insurance_provider: 'Davis Vision', insurance_id: 'DV-7009', preferred_store_id: DALLAS },
    { first_name: 'Marie', last_name: 'Reed', email: 'm.reed@email.com', phone: '972-555-3010', date_of_birth: '1987-11-02', insurance_provider: 'Davis Vision', insurance_id: 'DV-7010', preferred_store_id: PLANO },

    // No Insurance (5 customers)
    { first_name: 'Victor', last_name: 'Cooper', email: 'v.cooper@email.com', phone: '214-555-4001', date_of_birth: '1999-02-08', insurance_provider: null, insurance_id: null, preferred_store_id: DALLAS },
    { first_name: 'Samantha', last_name: 'Richardson', email: 's.richardson@email.com', phone: '713-555-4002', date_of_birth: '1983-06-19', insurance_provider: null, insurance_id: null, preferred_store_id: HOUSTON },
    { first_name: 'Paul', last_name: 'Cox', email: 'p.cox@email.com', phone: '602-555-4003', date_of_birth: '1976-09-25', insurance_provider: null, insurance_id: null, preferred_store_id: PHOENIX },
    { first_name: 'Natalie', last_name: 'Howard', email: 'n.howard@email.com', phone: '512-555-4004', date_of_birth: '1995-01-31', insurance_provider: null, insurance_id: null, preferred_store_id: AUSTIN },
    { first_name: 'George', last_name: 'Ward', email: 'g.ward@email.com', phone: '210-555-4005', date_of_birth: '1968-08-13', insurance_provider: null, insurance_id: null, preferred_store_id: SANANTONIO },
  ];

  // Insert in batches to avoid parameter limits
  for (let i = 0; i < customers.length; i += 25) {
    await knex('customers').insert(customers.slice(i, i + 25));
  }
};
