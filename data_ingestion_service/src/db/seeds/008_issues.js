/**
 * Issues seed data — 60 optical-specific complaints with rich free-text descriptions.
 *
 * Categories & counts:
 *   Anti-glare coating complaints (12) — concentrated in Dallas/Plano
 *   Wait time issues (8)
 *   Insurance billing problems (10)
 *   Prescription accuracy (8)
 *   Product quality (7)
 *   Customer service (8)
 *   Inventory/availability (7)
 *
 * Statuses: open (25), in_progress (15), resolved (20)
 * Escalation levels: 1 (35), 2 (15), 3 (8), 4 (2)
 * Anti-glare complaints are concentrated in Dallas and Plano (deliberate pattern).
 * Increasing complaint velocity in recent 30 days.
 *
 * @param {import('knex').Knex} knex
 */
exports.seed = async function (knex) {
  await knex('issues').del();

  const stores = await knex('stores').select('store_id', 'store_name', 'region');
  const storeMap = {};
  stores.forEach((s) => {
    storeMap[s.store_name] = { id: s.store_id, region: s.region };
  });

  const customers = await knex('customers').select('customer_id');
  const employees = await knex('employees').select('employee_id', 'store_id', 'role');

  const s = (name) => storeMap[name] || { id: null, region: 'Unknown' };

  // Helper to create a date N days ago
  const now = new Date();
  function daysAgo(n) {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0);
    return d;
  }

  // Helper to create resolved_at a few days after created_at
  function resolvedAfter(createdAt, days) {
    const d = new Date(createdAt);
    d.setDate(d.getDate() + days);
    return d;
  }

  // Pick a random customer for user_id
  function randomCustomer() {
    if (customers.length === 0) return null;
    return customers[Math.floor(Math.random() * customers.length)].customer_id;
  }

  // Pick an employee to assign to
  function randomEmployee(storeId) {
    const storeEmps = employees.filter((e) => e.store_id === storeId);
    if (storeEmps.length === 0) return null;
    return storeEmps[Math.floor(Math.random() * storeEmps.length)].employee_id;
  }

  const issues = [];

  // ── Anti-Glare Coating Complaints (12) — Concentrated in Dallas/Plano ──

  // Dallas (7)
  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'The anti-glare coating on my progressive lenses started peeling after just 3 weeks of use. The coating appears to have bubbles forming near the edges of both lenses. I paid extra for the premium Crizal coating and expected much better quality. This is my second pair from this location with the same issue.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(5),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'My anti-glare coated lenses are showing a rainbow-colored sheen that was not there when I first got them. The coating is degrading rapidly. I have only had these glasses for 6 weeks. The lenses look terrible and the glare is actually worse now than without the coating.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(8),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'I am extremely frustrated with the anti-reflective coating on my new glasses. After just two weeks, there are visible scratches and the coating is flaking off. I was told this was a premium anti-glare coating that would last at least a year. Requesting a full refund or replacement.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 3,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(12),
    resolution_notes: 'Customer requesting escalation. Awaiting supplier quality report on batch B2025-Q4-112.',
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  const ag4Created = daysAgo(45);
  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'The anti-glare coating on my bifocal lenses has started to crack and peel. Small circular patches of the coating are lifting off, creating distortion in my vision. This happened within the first month of receiving my glasses.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: ag4Created,
    resolved_at: resolvedAfter(ag4Created, 7),
    resolution_notes: 'Replaced lenses with new coating from different batch. Applied rush processing. Customer satisfied with replacement.',
    root_cause: 'Defective coating batch B2025-Q4-112 from supplier. Quality control missed during application.',
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'Anti-glare coating issue — the coating on the back surface of my lenses appears to be crazing. There are tiny spider-web like cracks visible under light. My optician said this should not happen with normal use. These lenses are only one month old.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(3),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-118' }),
  });

  const ag6Created = daysAgo(60);
  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'Premium anti-glare coating is bubbling on both lenses. The bubbles appeared gradually over 3 weeks. At first I thought it was dirt but cleaning made it clear the coating itself is defective. Very disappointed with quality for the price paid.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: ag6Created,
    resolved_at: resolvedAfter(ag6Created, 5),
    resolution_notes: 'Full lens replacement at no charge. Applied coating from newer batch. Issue documented for supplier complaint.',
    root_cause: 'Coating application temperature was too high during batch processing.',
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-108' }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'The anti-glare coating is peeling from the edges of my lenses inward. I handle my glasses carefully and use the microfiber cloth provided. This is clearly a manufacturing defect. I need this resolved immediately as these are my only pair.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(2),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-118' }),
  });

  // Plano (5)
  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Quality',
    description: 'The anti-glare coating on my glasses from Plano Eye Gallery is showing signs of delamination. There are white hazy spots appearing on both lenses that cannot be cleaned off. I specifically chose the premium anti-reflective option. Very unsatisfied.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(7),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Quality',
    description: 'Anti-glare coating issue on new progressive lenses. The coating has developed a cloudy, milky appearance in the center of both lenses after only 4 weeks. This makes driving at night dangerous as I see halos around every light source. Need immediate attention.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 3,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Plano Eye Gallery').id),
    created_at: daysAgo(10),
    resolution_notes: 'Safety concern flagged. Expedited replacement ordered. Temporary loaner pair provided.',
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-112' }),
  });

  const ag10Created = daysAgo(90);
  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Quality',
    description: 'The anti-reflective coating on my single vision lenses from Plano is chipping. Small flakes of coating are coming off, especially around the nose pad area. My previous pair from a different provider lasted 2 years without this issue.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: ag10Created,
    resolved_at: resolvedAfter(ag10Created, 10),
    resolution_notes: 'Coating reapplied from new batch. Added complimentary scratch-resistant coating as goodwill gesture.',
    root_cause: 'Same batch issue as Dallas reports. Supplier notified.',
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-108' }),
  });

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Quality',
    description: 'The anti-glare treatment on my lenses is wearing off unevenly. The right lens still looks fine but the left lens has significant coating deterioration. Both lenses were treated at the same time so this inconsistency points to a quality control issue.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(4),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-118' }),
  });

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Quality',
    description: 'I purchased premium anti-glare coated lenses three weeks ago and the coating is already developing micro-cracks visible under direct light. The staff acknowledged the problem but said I would need to wait 2 weeks for replacement. This is unacceptable turnaround for a defective product.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Plano Eye Gallery').id),
    created_at: daysAgo(6),
    metadata: JSON.stringify({ product_sku: 'CTG-AG-PRM-001', batch: 'B2025-Q4-118' }),
  });

  // ── Wait Time Issues (8) ──────────────────────────────────

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Customer Service',
    description: 'Had to wait over 45 minutes past my scheduled exam time at the Plano location. No one informed me of the delay. When I asked the receptionist, she seemed unaware that I was even waiting. The exam itself was fine but the wait was completely unacceptable for a scheduled appointment.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(14),
  });

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Customer Service',
    description: 'Waited 35 minutes for my contact lens fitting appointment despite arriving 10 minutes early. The optometrist appeared to be running behind schedule with no effort to communicate delays. Other patients in the waiting area were equally frustrated.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(20),
  });

  const wt3Created = daysAgo(75);
  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Customer Service',
    description: 'My appointment was at 2:00 PM but I was not seen until 3:15 PM. That is over an hour late. When I complained, the manager apologized but offered no compensation for my wasted time. I had to leave work early for this appointment.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: wt3Created,
    resolved_at: resolvedAfter(wt3Created, 3),
    resolution_notes: 'Manager called customer to apologize. Offered 15% discount on next purchase. Reviewed scheduling process.',
    root_cause: 'Overbooking of afternoon slots. Scheduling template updated.',
  });

  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Customer Service',
    description: 'The wait at the Austin location was absurd. I waited over an hour for a simple glasses adjustment. There was only one optician working the entire optical counter. I saw three customers leave without being helped.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Austin Vision Lab').id),
    created_at: daysAgo(9),
    resolution_notes: 'Staffing review in progress. Weekend coverage being added.',
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Customer Service',
    description: 'I brought my child for an eye exam and we waited 40 minutes past the appointment time. Trying to keep a 6-year-old patient in a waiting room for that long is extremely difficult. The staff needs to manage the schedule better or at least warn parents about delays.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(11),
  });

  const wt6Created = daysAgo(100);
  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Customer Service',
    description: 'Appointment was scheduled for 10 AM, did not get seen until 10:50 AM. The front desk said the doctor was with an emergency patient. I understand emergencies happen but 50 minutes is excessive and no one offered to reschedule.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: wt6Created,
    resolved_at: resolvedAfter(wt6Created, 5),
    resolution_notes: 'Implemented emergency appointment buffer slots. Customer received complimentary cleaning kit.',
  });

  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Customer Service',
    description: 'Unacceptable wait times at Scottsdale. I waited 30 minutes just to pick up my completed glasses. The store was not busy — only two other customers were there. Staff seemed more interested in their personal conversations than helping customers.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(18),
  });

  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Customer Service',
    description: 'I had a 3:00 PM follow-up appointment and was not called back until 3:45 PM. The waiting room was overcrowded and uncomfortable. Several chairs were broken. The entire experience felt unprofessional for a medical office.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Fort Worth Eye Center').id),
    created_at: daysAgo(15),
  });

  // ── Insurance Billing Problems (10) ──────────────────────

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Billing',
    description: 'My VSP insurance was supposed to cover the frame allowance up to $200 but I was charged full price of $329.99 for my Tom Ford frames. The billing department said my insurance had not been verified, even though I provided my insurance card at check-in two weeks prior.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(13),
    resolution_notes: 'Insurance verification failure identified. Resubmitting claim to VSP.',
    metadata: JSON.stringify({ insurance_provider: 'VSP', claim_amount: 329.99 }),
  });

  const ib2Created = daysAgo(55);
  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Billing',
    description: 'I was told my EyeMed plan covers an annual exam and one pair of glasses. After my visit, I received a bill for $245 that my insurance allegedly did not cover. When I called EyeMed directly, they said the claim was never submitted by Plano Eye Gallery.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: ib2Created,
    resolved_at: resolvedAfter(ib2Created, 14),
    resolution_notes: 'Claim resubmitted to EyeMed. Patient balance adjusted to $0 after insurance payment received.',
    root_cause: 'Billing staff error. Claim was saved as draft but never submitted electronically.',
    metadata: JSON.stringify({ insurance_provider: 'EyeMed', claim_amount: 245.00 }),
  });

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Billing',
    description: 'I have Davis Vision insurance with a $150 lens allowance. The store charged me for the full lens cost without applying any insurance benefit. I have been trying to get a refund for 3 weeks with no resolution. Each time I call, I am told someone will call me back but no one does.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 3,
    user_id: randomCustomer(),
    created_at: daysAgo(21),
    metadata: JSON.stringify({ insurance_provider: 'Davis Vision', claim_amount: 299.99 }),
  });

  const ib4Created = daysAgo(40);
  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Billing',
    description: 'I was double-charged for my anti-glare coating. The receipt shows two line items for "Anti-Glare Premium" at $79.99 each. I only got one pair of lenses with one coating. I noticed this on my credit card statement a week later.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: ib4Created,
    resolved_at: resolvedAfter(ib4Created, 3),
    resolution_notes: 'Duplicate charge confirmed and refunded. Billing system bug reported to IT team.',
    root_cause: 'POS system registered coating twice when cashier modified order after initial ring-up.',
  });

  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Billing',
    description: 'My insurance covers a comprehensive eye exam annually. I was charged a $75 co-pay that should not apply based on my VSP plan tier. When I raised this at checkout, the staff said they could not verify my benefits and asked me to pay and submit for reimbursement myself.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(16),
    metadata: JSON.stringify({ insurance_provider: 'VSP', claim_amount: 75.00 }),
  });

  const ib6Created = daysAgo(85);
  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Billing',
    description: 'I paid $349.99 for Digital Progressive lenses and was told my insurance would reimburse me directly. It has been over 6 weeks and I have received nothing. The store cannot provide a claim number or proof of submission.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: ib6Created,
    resolved_at: resolvedAfter(ib6Created, 21),
    resolution_notes: 'Claim resubmitted with correct codes. Insurance reimbursement of $280 processed to patient.',
    root_cause: 'Incorrect procedure codes used on initial submission. Staff retrained on billing codes.',
    metadata: JSON.stringify({ insurance_provider: 'EyeMed', claim_amount: 349.99 }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Billing',
    description: 'My VSP benefits reset in January but I was told at my February appointment that I had no remaining benefits. After calling VSP, they confirmed my benefits were active. The store was using my previous year eligibility dates. This caused me to pay out of pocket unnecessarily.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(25),
    resolution_notes: 'Benefit eligibility verification system being checked. Working with VSP to confirm renewal dates.',
    metadata: JSON.stringify({ insurance_provider: 'VSP', claim_amount: 489.98 }),
  });

  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Billing',
    description: 'I received a surprise balance bill of $189 three weeks after my visit. The original quote was $150 out of pocket after insurance. No one explained the additional charges. The itemized bill shows charges for services I do not recall authorizing.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(8),
    metadata: JSON.stringify({ insurance_provider: 'EyeMed', claim_amount: 189.00 }),
  });

  const ib9Created = daysAgo(70);
  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Billing',
    description: 'The Fort Worth location ran my insurance through the wrong provider. They billed EyeMed but I have Davis Vision. Now I am stuck with a $312 bill because the claim was denied. I gave them the correct insurance card at registration.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: ib9Created,
    resolved_at: resolvedAfter(ib9Created, 10),
    resolution_notes: 'Claim voided with EyeMed and resubmitted to Davis Vision. Patient balance cleared after correct processing.',
    root_cause: 'Data entry error during patient registration. Insurance card was scanned but wrong carrier selected from dropdown.',
    metadata: JSON.stringify({ insurance_provider: 'Davis Vision', claim_amount: 312.00 }),
  });

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Billing',
    description: 'My contact lens fitting fee was supposed to be covered under my comprehensive exam benefit per VSP guidelines. The store charged me a separate $85 fitting fee claiming it is not part of the exam. VSP says otherwise. I want a refund.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(5),
    metadata: JSON.stringify({ insurance_provider: 'VSP', claim_amount: 85.00 }),
  });

  // ── Prescription Accuracy Issues (8) ──────────────────────

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Clinical',
    description: 'My new progressive lenses make me dizzy when I walk. The reading zone seems too narrow and I have to tilt my head at an awkward angle to see my computer screen. I have been wearing progressives for 5 years with my previous provider and never had this problem. I think the prescription or the lens fitting measurements may be wrong.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(7),
    resolution_notes: 'Patient scheduled for re-measurement. Checking PD and fitting height measurements.',
  });

  const pa2Created = daysAgo(50);
  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Clinical',
    description: 'After getting new glasses with my updated prescription, I am experiencing constant headaches. My previous prescription was -2.50/-2.25 and the new one is -3.00/-2.75. That seems like a large jump. I want a second opinion on whether this prescription is accurate.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: pa2Created,
    resolved_at: resolvedAfter(pa2Created, 7),
    resolution_notes: 'Re-examination confirmed prescription was accurate. Patient was undercorrected previously. Recommended gradual adaptation. Headaches resolved after 10 days.',
    root_cause: 'Previous prescription was significantly undercorrected. Large correction delta caused expected adaptation period.',
  });

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Clinical',
    description: 'The bifocal line in my new glasses seems to be at the wrong height. I have to look too far down to use the reading portion. When I hold a book at normal reading distance, I am looking through the distance portion instead. The lenses need to be remade.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(12),
  });

  const pa4Created = daysAgo(35);
  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Clinical',
    description: 'My new single vision lenses seem to have the axis for my astigmatism correction rotated. Everything looks slightly tilted and I feel disoriented. My prescription says axis 180 but the tilting suggests the lens may have been cut incorrectly.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: pa4Created,
    resolved_at: resolvedAfter(pa4Created, 5),
    resolution_notes: 'Lensometer check confirmed axis was off by 15 degrees. Lenses remade with correct axis alignment. Lab notified of quality issue.',
    root_cause: 'Lens cutting error at external lab. Axis orientation was 165 instead of specified 180.',
  });

  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Clinical',
    description: 'I was prescribed contact lenses for the first time but the power seems too strong. Everything up close is blurry with the contacts in, even though my glasses prescription works fine. The contact lens prescription should be different from my glasses prescription, right?',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Austin Vision Lab').id),
    created_at: daysAgo(9),
    resolution_notes: 'Vertex distance adjustment was not applied to contact lens prescription. Re-calculating Rx.',
  });

  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Clinical',
    description: 'Received my new glasses and the right lens seems completely wrong. I cannot see clearly out of it at all. Double-checking the order, my right eye prescription should be -1.75 but the lens feels much stronger. Please verify the lenses match my prescription.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(3),
  });

  const pa7Created = daysAgo(65);
  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Clinical',
    description: 'My progressive lenses have a very narrow corridor of clear vision. When I move my eyes to the side, everything is blurry. My previous progressives had a much wider field of view. I think the lens design chosen is not appropriate for my prescription.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: pa7Created,
    resolved_at: resolvedAfter(pa7Created, 12),
    resolution_notes: 'Upgraded to Digital Progressive lens design with wider corridor. Customer reports significant improvement.',
    root_cause: 'Standard progressive design was insufficient for patients high cylinder correction. Digital design accommodates better.',
  });

  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Clinical',
    description: 'The prism correction in my new lenses does not feel right. I still see double images at certain distances. My neuro-ophthalmologist prescribed 2 prism diopters base out in each eye but the glasses do not seem to fully correct the issue.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 3,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Scottsdale Optical Boutique').id),
    created_at: daysAgo(6),
    resolution_notes: 'Consulting with neuro-ophthalmologist on whether prism adjustment needed. Lensometer verification pending.',
  });

  // ── Product Quality (non-coating) Issues (7) ─────────────

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Product Quality',
    description: 'The Oakley Half Jacket frames broke at the hinge after just one month of normal use. The screw fell out and the temple arm completely separated. I expected much better build quality from a $160 frame. The store says this is not covered under their warranty.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(11),
    metadata: JSON.stringify({ product_sku: 'FRM-OAK-HJ2-002' }),
  });

  const pq2Created = daysAgo(80);
  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Product Quality',
    description: 'The nose pads on my Coach frames keep falling off. This is the third time in two months. The pads seem to be a poor fit for the frame. Each time I bring them in for repair, they charge me $15 for replacement nose pads.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: pq2Created,
    resolved_at: resolvedAfter(pq2Created, 4),
    resolution_notes: 'Replaced with universal silicone nose pads at no charge. Waived previous repair charges as goodwill.',
    root_cause: 'Factory nose pads were incorrect size for frame model. Known issue with this batch.',
    metadata: JSON.stringify({ product_sku: 'FRM-COA-6065-005' }),
  });

  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Product Quality',
    description: 'My Acuvue Oasys contact lenses are consistently uncomfortable in my right eye. Every lens from this box causes irritation within 2 hours. My left eye is fine with the same brand. I suspect a defective batch or incorrect base curve.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Austin Vision Lab').id),
    created_at: daysAgo(8),
    resolution_notes: 'Checking base curve fit. Trial pair of different base curve ordered.',
    metadata: JSON.stringify({ product_sku: 'CL-ACV-OAS-001' }),
  });

  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Product Quality',
    description: 'The Gucci frame I purchased is already showing discoloration on the temple arms after 6 weeks. The gold color is turning greenish. For a $350 frame I expect the finish to hold up much longer than this. This looks like a counterfeit product.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 3,
    user_id: randomCustomer(),
    created_at: daysAgo(4),
    metadata: JSON.stringify({ product_sku: 'FRM-GUC-0010-009' }),
  });

  const pq5Created = daysAgo(95);
  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Product Quality',
    description: 'The Flexon frame was marketed as being nearly indestructible and flexible. The bridge snapped when I was adjusting them normally. The titanium memory metal is supposed to flex, not break. Very misleading product claims.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: pq5Created,
    resolved_at: resolvedAfter(pq5Created, 6),
    resolution_notes: 'Manufacturer warranty claim processed. Replacement frame shipped directly. Customer satisfied.',
    root_cause: 'Manufacturing defect in bridge. Flexon warranty covered replacement.',
    metadata: JSON.stringify({ product_sku: 'FRM-FLX-1110-010' }),
  });

  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Product Quality',
    description: 'The lens cleaning solution sold at the store left a residue on my lenses that is very difficult to remove. It made my anti-reflective coating look smudgy. I used the product exactly as directed on the bottle.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(17),
    metadata: JSON.stringify({ product_sku: 'ACC-OS-LCS-003' }),
  });

  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Product Quality',
    description: 'The Warby Parker Durand frames I purchased feel very flimsy compared to the try-on pair in the store. The hinges are loose and the frame sits unevenly on my face. The display model felt much sturdier. I think the production quality differs from the showroom samples.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('OptiSight Vision Center - Dallas').id),
    created_at: daysAgo(10),
    metadata: JSON.stringify({ product_sku: 'FRM-WP-DUR-007' }),
  });

  // ── Customer Service Issues (8) ───────────────────────────

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Customer Service',
    description: 'The sales associate was extremely pushy about lens upgrades and coatings. I clearly stated my budget was $300 total but he kept recommending options that would bring the total over $600. When I declined, his attitude became dismissive and he rushed through the rest of the fitting.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(19),
  });

  const cs2Created = daysAgo(72);
  issues.push({
    store_id: s('OptiSight Vision Center - Dallas').id,
    region: s('OptiSight Vision Center - Dallas').region,
    category: 'Customer Service',
    description: 'I called the Dallas store three times over two weeks trying to get the status of my ordered glasses. Each time I was told someone would call me back. No one ever did. When I finally visited in person, my glasses had been ready for 5 days and no one had notified me.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: cs2Created,
    resolved_at: resolvedAfter(cs2Created, 3),
    resolution_notes: 'Implemented automated SMS notification when orders are ready. Staff counseled on callback policy.',
  });

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Customer Service',
    description: 'The optician at Plano was condescending when I asked questions about lens types. I am not an expert — that is why I am asking. When I asked for a simpler explanation of progressive vs bifocal, she sighed and said she already explained it. I felt talked down to and unwelcome.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(22),
  });

  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Customer Service',
    description: 'I requested a specific frame adjustment and the optician made it worse. The frames now sit crooked on my face. When I pointed this out, he said my ears are uneven, not the glasses. That was rude and unhelpful. I want a different technician to fix them.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Phoenix LensCraft').id),
    created_at: daysAgo(6),
  });

  const cs5Created = daysAgo(110);
  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Customer Service',
    description: 'The front desk staff at Austin Vision Lab was rude when I arrived 5 minutes late for my appointment. They refused to see me and said I would need to reschedule, which would be a 3-week wait. I have never been treated this way at any medical office.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: cs5Created,
    resolved_at: resolvedAfter(cs5Created, 2),
    resolution_notes: 'Customer rescheduled to next available slot within 3 days. Policy reviewed — 10-minute grace period for appointments now standard.',
    root_cause: 'Overly strict late arrival policy. Updated to include 10-minute grace window.',
  });

  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Customer Service',
    description: 'I tried to return a pair of glasses within the 30-day return window and was told returns are only for store credit. The return policy posted online says full refunds are available within 30 days. The store manager was not available and the staff could not resolve this.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: daysAgo(4),
  });

  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Customer Service',
    description: 'I asked for help selecting frames for my face shape and the associate immediately steered me toward the most expensive options. When I pointed to more affordable frames, she said those would not look as good. I felt like I was being judged for my budget.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(13),
  });

  const cs8Created = daysAgo(45);
  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Customer Service',
    description: 'My elderly mother needed help choosing frames and the staff was impatient with her. She takes longer to make decisions due to her age. The associate kept sighing and checking her phone. I expect compassionate service, especially for senior customers.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 2,
    user_id: randomCustomer(),
    created_at: cs8Created,
    resolved_at: resolvedAfter(cs8Created, 5),
    resolution_notes: 'Staff member received additional customer service training. Manager personally called customer to apologize and invite them back.',
    root_cause: 'Inadequate training on serving elderly and special-needs customers.',
  });

  // ── Inventory / Availability Issues (7) ──────────────────

  issues.push({
    store_id: s('Plano Eye Gallery').id,
    region: s('Plano Eye Gallery').region,
    category: 'Product Availability',
    description: 'The specific Gucci GG0010O frame I wanted in gold has been out of stock at three different locations for over a month. The website shows it as available but when I call or visit, they never have it. I was told it would be 6-8 weeks for a special order. That is way too long.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(15),
    metadata: JSON.stringify({ product_sku: 'FRM-GUC-0010-009' }),
  });

  issues.push({
    store_id: s('Houston Optical Hub').id,
    region: s('Houston Optical Hub').region,
    category: 'Product Availability',
    description: 'Acuvue Oasys Daily contacts in my prescription (-3.25) have been on backorder for 3 weeks. I only have a 2-week supply left. The store cannot tell me when they will be back in stock. They suggested switching brands but I have tried others and they are not comfortable.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 2,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('Houston Optical Hub').id),
    created_at: daysAgo(9),
    resolution_notes: 'Expedited order placed with Acuvue distributor. Expected arrival in 5 business days.',
    metadata: JSON.stringify({ product_sku: 'CL-ACV-OAS-001' }),
  });

  const ia3Created = daysAgo(60);
  issues.push({
    store_id: s('Phoenix LensCraft').id,
    region: s('Phoenix LensCraft').region,
    category: 'Product Availability',
    description: 'I drove 30 minutes to Phoenix LensCraft because the website showed the Prada Linea Rossa frames were in stock. When I arrived, they said they had none and the website was not updated. This is a waste of my time and gas.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: ia3Created,
    resolved_at: resolvedAfter(ia3Created, 8),
    resolution_notes: 'Transferred frame from Dallas inventory. Customer picked up within 3 days. Website inventory sync issue reported to IT.',
    root_cause: 'Real-time inventory sync between POS and website had a 24-hour lag.',
    metadata: JSON.stringify({ product_sku: 'FRM-PRA-LRS-003' }),
  });

  issues.push({
    store_id: s('Austin Vision Lab').id,
    region: s('Austin Vision Lab').region,
    category: 'Product Availability',
    description: 'The Austin store has a very limited selection of mens frames compared to womens. Out of maybe 200 frames on display, only about 40 were mens styles. I ended up having to order online because nothing in-store appealed to me.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(20),
  });

  issues.push({
    store_id: s('San Antonio EyeCare').id,
    region: s('San Antonio EyeCare').region,
    category: 'Product Availability',
    description: 'I need High-Index 1.67 lenses for my strong prescription but the San Antonio store said they do not carry them and would need to special order. It would take 2 weeks. Every other optical store I have been to stocks these as they are a common lens type.',
    sentiment: 'negative',
    status: 'in_progress',
    escalation_level: 1,
    user_id: randomCustomer(),
    assigned_to: randomEmployee(s('San Antonio EyeCare').id),
    created_at: daysAgo(7),
    resolution_notes: 'Special order placed. Reviewing standard inventory list for this location.',
    metadata: JSON.stringify({ product_sku: 'LNS-HI-167-004' }),
  });

  const ia6Created = daysAgo(88);
  issues.push({
    store_id: s('Scottsdale Optical Boutique').id,
    region: s('Scottsdale Optical Boutique').region,
    category: 'Product Availability',
    description: 'Scottsdale never seems to have Transitions lenses in stock. I have asked twice over three months and both times was told they needed to be ordered. This should be a standard inventory item for any optical store.',
    sentiment: 'negative',
    status: 'resolved',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: ia6Created,
    resolved_at: resolvedAfter(ia6Created, 14),
    resolution_notes: 'Added Transitions lenses to standard reorder list for Scottsdale. Initial stock of 50 units delivered.',
    root_cause: 'Product was not included in automatic reorder configuration for this location.',
    metadata: JSON.stringify({ product_sku: 'LNS-PHT-TRN-008' }),
  });

  issues.push({
    store_id: s('Fort Worth Eye Center').id,
    region: s('Fort Worth Eye Center').region,
    category: 'Product Availability',
    description: 'I wanted to buy a replacement Oakley Hard Case but the Fort Worth store was sold out and said they did not know when they would get more. For a $30 accessory, it should not be this difficult to keep in stock.',
    sentiment: 'negative',
    status: 'open',
    escalation_level: 1,
    user_id: randomCustomer(),
    created_at: daysAgo(10),
    metadata: JSON.stringify({ product_sku: 'ACC-OAK-HC-001' }),
  });

  // Insert in batches
  for (let i = 0; i < issues.length; i += 20) {
    await knex('issues').insert(issues.slice(i, i + 20));
  }

  console.log(`Seeded ${issues.length} issues`);
};
