/**
 * Data model for the interactive operating-model reference
 * (/Fahad-know-how/operating-model), populated in full from
 * content/fahad-know-how-operating-model.md (sections 1–8).
 * All copy lives here — components render, never hard-code.
 */

export type Group = 'leadership' | 'commercial' | 'enabling' | 'retail_ops';

export interface Dept {
  id: string;
  name: string;
  /** Healthcare read-across label + what it owns (section 8). */
  dental: { name: string; owns: string };
  parent: string | null;
  group: Group;
  dotted?: boolean;
  subunits?: { name: string; owns: string }[];
  mandate: string;
  owns: string[];
  inputs: { item: string; from: string }[];
  outputs: { item: string; to: string }[];
  kpis: string[];
  talks: { daily: string[]; weekly: string[]; monthly: string[] };
  escalation: string;
}

export const PRINCIPLES: { title: string; text: string }[] = [
  { title: 'One P&L owner', text: 'The VP owns online + omni-channel revenue and margin. Nobody else has a competing target.' },
  { title: 'Revenue and margin owned by different people', text: 'Marketing is paid to grow revenue. Trading is paid to protect margin. They are forced to negotiate every promotion. The single most important design choice.' },
  { title: 'One door in, many doors out', text: 'Buying and Planning decide what comes in. Online, stores, marketplaces and CRM are all channels selling the same stock pool.' },
  { title: 'Stores are a channel and a fulfilment node', text: 'Store teams sell online stock, fulfil online orders, take online returns and feed insight back. Measured on omni-channel contribution, not just till sales.' },
  { title: 'Three sign-offs before anything goes live', text: 'Live and in stock (Content + Planning), margin-approved (Trading), traffic-planned (Marketing).' },
  { title: 'One set of numbers', text: 'Finance publishes the daily and weekly figures. Every meeting argues from the same sheet.' },
  { title: 'Fixed cadence, named owners, written decisions', text: 'Every meeting has an owner, an input pack, a decision log. Anything undecided is escalated to the VP within 24 hours.' },
  { title: 'Tech capacity is a commercial decision', text: 'The trade meeting sets development priority by expected revenue impact.' },
];

export const DEPTS: Dept[] = [
  {
    id: 'vp', name: 'VP, E-commerce & Omni-channel',
    dental: { name: 'CEO / COO', owns: 'Group P&L, arbitration' },
    parent: null, group: 'leadership',
    mandate: 'Own the online and omni-channel P&L. Arbitrate between functions on the numbers.',
    owns: ['Revenue', 'Contribution margin', 'Stock health', 'Customer growth', 'Platform stability'],
    inputs: [
      { item: 'Friday flash report', from: 'finance' },
      { item: 'Monday trade pack', from: 'trading' },
      { item: 'Monthly P&L', from: 'finance' },
    ],
    outputs: [
      { item: 'Weekly decision log', to: 'trading' },
      { item: 'Quarterly priorities', to: 'buying' },
      { item: 'Budget & headcount decisions', to: 'finance' },
    ],
    kpis: ['Net revenue vs budget', 'Contribution margin after marketing', 'Stock weeks cover', 'Active customers', 'NPS'],
    talks: { daily: ['trading', 'finance', 'marketing'], weekly: ['buying', 'planning', 'content', 'development', 'retail_ops'], monthly: [] },
    escalation: 'Any cross-team disagreement not resolved in its forum lands with the VP within 24 hours with a one-page brief from each side.',
  },
  {
    id: 'buying', name: 'Buying',
    dental: { name: 'Clinical services & doctor roster', owns: 'Which treatments and specialists each clinic offers, lab and supplier terms, new services' },
    parent: 'vp', group: 'commercial',
    mandate: 'Own the range. Decide what the business sells, from which brands, at what cost.',
    owns: ['Brand relationships', 'Range architecture', 'Cost price & supplier terms', 'Exclusives', 'Launch calendar'],
    inputs: [
      { item: 'OTB budget by category', from: 'planning' },
      { item: 'Sell-through & margin by brand', from: 'trading' },
      { item: 'Search demand & zero-result terms', from: 'marketing' },
      { item: 'Store customer requests', from: 'retail_ops' },
    ],
    outputs: [
      { item: 'Seasonal buy', to: 'planning' },
      { item: 'Rolling 12-week launch calendar', to: 'marketing' },
      { item: 'Supplier funding for promos/markdowns', to: 'trading' },
      { item: 'Product briefs', to: 'content' },
    ],
    kpis: ['Intake vs plan', 'Initial margin', 'Range productivity per brand', 'Exclusives launched', 'Supplier-funded promotion value'],
    talks: { daily: ['planning', 'trading'], weekly: ['marketing', 'content'], monthly: ['retail_ops'] },
    escalation: 'A brand missing sell-through target two seasons running is reviewed for range reduction. Buying cannot overrule without VP sign-off.',
  },
  {
    id: 'planning', name: 'Planning',
    dental: { name: 'Capacity & scheduling', owns: 'Chair utilisation plan, doctor hours vs demand, no-show control, allocation of doctors across clinics' },
    parent: 'vp', group: 'commercial',
    mandate: 'Own stock and cash. Turn the sales plan into an open-to-buy and keep inventory productive.',
    owns: ['Sales/stock/intake plan & OTB', 'Allocation DC vs stores', 'Size & depth ratios', 'Replenishment', 'Forecast'],
    inputs: [
      { item: 'Sales forecast by channel', from: 'marketing' },
      { item: 'Store sell-through', from: 'retail_ops' },
      { item: 'Intake dates', from: 'buying' },
      { item: 'Markdown plan', from: 'trading' },
    ],
    outputs: [
      { item: 'Weekly trade pack (stock section)', to: 'trading' },
      { item: 'Allocation plan', to: 'retail_ops' },
      { item: 'Reorder list', to: 'buying' },
      { item: 'Ageing stock report', to: 'trading' },
    ],
    kpis: ['Stock turn', 'Weeks cover', 'Forecast accuracy', 'Terminal stock', 'Availability of top 200 lines'],
    talks: { daily: ['buying', 'trading', 'retail_ops'], weekly: ['finance'], monthly: [] },
    escalation: 'Any category above target weeks cover for three consecutive weeks triggers a mandatory markdown or transfer decision in the next trade meeting.',
  },
  {
    id: 'marketing', name: 'Marketing',
    dental: { name: 'Growth', owns: 'Digital: leads, bookings, CPA, CRM/WhatsApp, reviews, SEO · Offline: community events, corporate tie-ups, signage, referrals' },
    parent: 'vp', group: 'commercial',
    subunits: [
      { name: 'Digital Marketing', owns: 'Paid, SEO, affiliates, CRM/email, marketplaces, A/B roadmap' },
      { name: 'Offline Marketing', owns: 'Brand, PR, events, mall media, store activation' },
    ],
    mandate: 'Own revenue. Bring the right customers to online and stores at an acceptable cost and convert them.',
    owns: ['Paid search & social, affiliates, programmatic', 'SEO & marketplaces', 'CRM / email / SMS / WhatsApp lifecycle', 'Onsite promotion execution & A/B roadmap', 'Brand, PR, events, store activations'],
    inputs: [
      { item: 'Launch calendar', from: 'buying' },
      { item: 'Promotion approvals', from: 'trading' },
      { item: 'Creative', from: 'content' },
      { item: 'Site changes', from: 'development' },
      { item: 'Spend budget', from: 'finance' },
    ],
    outputs: [
      { item: 'Weekly channel plan & revenue forecast', to: 'trading' },
      { item: 'Daily spend & ROAS report', to: 'finance' },
      { item: 'Email/CRM calendar', to: 'content' },
      { item: 'Promotion proposals', to: 'trading' },
    ],
    kpis: ['Net revenue vs target', 'Traffic & conversion rate', 'AOV', 'CPA & ROAS', 'New vs returning mix', 'Email revenue share', 'Footfall & event ROI'],
    talks: { daily: ['trading', 'content', 'development'], weekly: ['buying', 'retail_ops', 'finance'], monthly: [] },
    escalation: 'No promotion goes live without Trading margin approval logged. A promotion missing forecast by more than 20% is reviewed before any repeat.',
  },
  {
    id: 'trading', name: 'Trading / Merchandising',
    dental: { name: 'Revenue management', owns: 'Treatment-plan conversion, pricing & offer governance, filling empty chair-hours, margin per treatment' },
    parent: 'vp', group: 'commercial',
    mandate: 'Own margin and sell-through. Sell what was bought at the best possible price before it ages.',
    owns: ['Pricing & promotion governance', 'Markdown cadence', 'Onsite merchandising', 'Daily trade review', 'Clearance & store price parity'],
    inputs: [
      { item: 'Daily sales & margin', from: 'finance' },
      { item: 'Stock cover & ageing', from: 'planning' },
      { item: 'Promotion proposals', from: 'marketing' },
      { item: 'Store sell-through & transfers', from: 'retail_ops' },
    ],
    outputs: [
      { item: 'Monday trade pack & decision log', to: 'vp' },
      { item: 'Promotion approval log', to: 'marketing' },
      { item: 'Markdown list & price change file', to: 'retail_ops' },
      { item: 'Category priority list', to: 'content' },
      { item: 'Winners/losers report', to: 'buying' },
    ],
    kpis: ['Achieved margin', 'Full-price sell-through', 'Markdown as % of sales', 'Ageing profile', 'Promotion incremental margin'],
    talks: { daily: ['marketing', 'planning', 'finance'], weekly: ['buying', 'content', 'retail_ops'], monthly: [] },
    escalation: 'Trading can block any promotion on margin grounds. Marketing can escalate to the VP with a revenue case. VP decides same day.',
  },
  {
    id: 'content', name: 'Content',
    dental: { name: 'Patient education & brand', owns: 'Treatment pages, doctor profiles, before/after, bilingual content' },
    parent: 'vp', group: 'enabling',
    mandate: 'Own the product on the page. Nothing sells until it is shot, written, translated and live.',
    owns: ['Studio & retouching', 'Product data quality (PIM)', 'Copy & translation EN/AR', 'Campaign & editorial creative', 'Brand guideline compliance'],
    inputs: [
      { item: 'Intake schedule & product briefs', from: 'buying' },
      { item: 'Priority order by expected sales', from: 'trading' },
      { item: 'Campaign briefs', from: 'marketing' },
      { item: 'Goods-in notification', from: 'retail_ops' },
    ],
    outputs: [
      { item: 'Live products within SLA', to: 'trading' },
      { item: 'Campaign assets', to: 'marketing' },
      { item: 'Homepage & category creative', to: 'development' },
      { item: 'In-store screen content', to: 'retail_ops' },
    ],
    kpis: ['Goods-in to live SLA (48h replen / 5d new)', '% of stock live & shoppable', 'Backlog by value', 'Return rate from poor product info'],
    talks: { daily: ['trading', 'marketing'], weekly: ['buying', 'development', 'retail_ops'], monthly: [] },
    escalation: 'Any stock over the AED value threshold not live within SLA is reported in the Monday trade pack by name.',
  },
  {
    id: 'development', name: 'Development',
    dental: { name: 'Systems', owns: 'HMS, CRM, WhatsApp automation, the reporting platform, integrations' },
    parent: 'vp', group: 'enabling',
    subunits: [
      { name: 'Front-end', owns: 'Site, checkout, mobile, A/B builds' },
      { name: 'Back-end', owns: 'Integrations, OMS, PIM, payments, search' },
      { name: 'QA', owns: 'Release testing, peak readiness, incidents' },
    ],
    mandate: 'Own the platform. Keep it fast, stable and secure and ship what sells more.',
    owns: ['Storefront, checkout, app, search', 'OMS / PIM / payments / loyalty integrations', 'Store systems (endless aisle, ship-from-store)', 'Release management & incident response'],
    inputs: [
      { item: 'Prioritised backlog', from: 'trading' },
      { item: 'Campaign dates & freeze windows', from: 'marketing' },
      { item: 'Content requirements', from: 'content' },
      { item: 'Bugs & checkout issues', from: 'retail_ops' },
    ],
    outputs: [
      { item: 'Release notes & uptime report', to: 'vp' },
      { item: 'A/B test results', to: 'marketing' },
      { item: 'Incident reports with root cause', to: 'trading' },
      { item: 'OMS routing rules', to: 'retail_ops' },
    ],
    kpis: ['Uptime & page speed', 'Checkout error rate', 'Release cadence', 'Defect escape rate', 'Incident time to recovery'],
    talks: { daily: ['marketing', 'content', 'retail_ops'], weekly: ['trading', 'finance'], monthly: [] },
    escalation: 'Revenue-impacting incident: acknowledged within 15 minutes, VP and Trading informed within 30, hourly updates until resolved.',
  },
  {
    id: 'finance', name: 'Finance',
    dental: { name: 'Finance', owns: 'P&L per clinic and per doctor, marketing ROI, one set of numbers' },
    parent: 'vp', group: 'enabling',
    mandate: 'Own the numbers. One truth for the whole operating model.',
    owns: ['Daily & weekly flash', 'Monthly P&L by channel & category', 'Budget control & spend validation', 'Inventory valuation & provisions', 'Reconciliation, refunds, chargebacks', 'Business cases'],
    inputs: [
      { item: 'Sales & orders (OMS)', from: 'development' },
      { item: 'Spend', from: 'marketing' },
      { item: 'Stock', from: 'planning' },
      { item: 'Returns & store omni sales', from: 'retail_ops' },
    ],
    outputs: [
      { item: 'Daily flash by 9am', to: 'trading' },
      { item: 'Friday flash', to: 'vp' },
      { item: 'Monthly P&L & reforecast', to: 'vp' },
      { item: 'Promotion post-mortems', to: 'trading' },
    ],
    kpis: ['Contribution margin after marketing', 'Cost to serve per order', 'Budget adherence', 'Working capital in stock', 'Reconciliation gaps'],
    talks: { daily: ['trading', 'marketing'], weekly: ['buying', 'planning', 'content', 'development', 'retail_ops'], monthly: ['vp'] },
    escalation: 'Any team more than 10% over budget month-to-date is flagged to the VP in the Friday flash.',
  },
  {
    id: 'retail_ops', name: 'Retail Operations',
    dental: { name: 'Clinic operations', owns: 'Clinic managers, front desk & treatment coordination, patient care centre, procurement & lab logistics' },
    parent: 'vp', group: 'retail_ops', dotted: true,
    subunits: [
      { name: 'Store Management', owns: 'Store P&L, staffing, omni-channel targets → Clinic managers' },
      { name: 'Visual Merchandising', owns: 'Windows & floor aligned to online → Clinic experience' },
      { name: 'Store Fulfilment', owns: 'Click & collect, ship-from-store, returns → Front desk / treatment coordination' },
      { name: 'Customer Service', owns: 'Contact centre, chat, WhatsApp → Patient care centre' },
      { name: 'Warehouse & Logistics', owns: 'Receiving, pick/pack, last mile → Procurement & lab logistics' },
    ],
    mandate: 'Run the stores as an omni-channel channel, not a standalone till. Dotted line to Group Retail; inside the operating model and in the Monday trade meeting.',
    owns: ['Store P&L & staffing', 'In-store omni-channel targets', 'Click & collect / ship-from-store / returns', 'Contact centre & complaint escalation', 'Receiving, pick/pack, last mile, stock accuracy'],
    inputs: [
      { item: 'Campaign calendar & event plan', from: 'marketing' },
      { item: 'Stock allocation & transfers', from: 'planning' },
      { item: 'Price changes, same day as online', from: 'trading' },
      { item: 'OMS routing rules & devices', from: 'development' },
    ],
    outputs: [
      { item: 'Weekly store trade report', to: 'trading' },
      { item: 'Customer requests & missed sales log', to: 'buying' },
      { item: 'Fulfilment SLA report', to: 'planning' },
      { item: 'Contact driver & VOC reports', to: 'vp' },
      { item: 'Goods-in report (starts go-live clock)', to: 'content' },
    ],
    kpis: ['Store revenue vs target', 'Omni-channel sales attributed to store', 'Click & collect ready-in-time', 'First response & resolution time', 'Dispatch within SLA', 'Stock accuracy'],
    talks: { daily: ['planning', 'development'], weekly: ['trading', 'marketing', 'finance', 'buying'], monthly: [] },
    escalation: 'Store issues route through the Thursday store ops call; anything cross-functional lands in the Monday trade meeting.',
  },
];

export const INTERACTIONS: { from: string; to: string; what: string; artefact: string; cadence: string }[] = [
  { from: 'buying', to: 'planning', what: 'Proposed buy, supplier intake dates', artefact: 'Buy sheet', cadence: 'Seasonal + weekly' },
  { from: 'planning', to: 'buying', what: 'OTB approval, reorder triggers', artefact: 'OTB sheet', cadence: 'Weekly' },
  { from: 'buying', to: 'marketing', what: 'Launch calendar, hero products, exclusives, brand funding', artefact: 'Rolling 12-week launch calendar', cadence: 'Weekly' },
  { from: 'buying', to: 'content', what: 'Product briefs, brand assets, arrival dates', artefact: 'Product brief in PIM', cadence: 'Per intake' },
  { from: 'trading', to: 'buying', what: 'Winners, losers, slow lines, range gaps', artefact: 'Winners/losers report', cadence: 'Weekly' },
  { from: 'marketing', to: 'trading', what: 'Promotion proposals with revenue forecast', artefact: 'Promotion request form', cadence: 'Min 5 days before live' },
  { from: 'trading', to: 'marketing', what: 'Approve / block / amend promotion with margin impact', artefact: 'Promotion approval log', cadence: 'Within 48h' },
  { from: 'trading', to: 'content', what: 'Priority order for photography and go-live', artefact: 'Priority list', cadence: 'Weekly' },
  { from: 'trading', to: 'development', what: 'Merchandising tool needs, sort rules, backlog priority', artefact: 'Trade meeting decision log', cadence: 'Weekly' },
  { from: 'content', to: 'marketing', what: 'Campaign assets, email creative', artefact: 'Asset library', cadence: 'Per campaign' },
  { from: 'content', to: 'retail_ops', what: 'Campaign creative for in-store screens and windows', artefact: 'Shared campaign kit', cadence: 'Per campaign' },
  { from: 'retail_ops', to: 'content', what: 'Goods-in notification (starts the go-live clock)', artefact: 'Goods-in report', cadence: 'Daily' },
  { from: 'retail_ops', to: 'planning', what: 'Stock accuracy, receipt status, ship-from-store movements', artefact: 'Receiving / fulfilment SLA reports', cadence: 'Daily' },
  { from: 'marketing', to: 'development', what: 'Site changes, landing pages, tests, freeze windows', artefact: 'Sprint tickets', cadence: 'Weekly + campaign' },
  { from: 'retail_ops', to: 'development', what: 'Bugs and checkout issues (Customer Service)', artefact: 'Incident ticket', cadence: 'Real time' },
  { from: 'retail_ops', to: 'buying', what: 'Product complaints, sizing errors, customer requests, missed sales', artefact: 'Product issue / missed sales log', cadence: 'Weekly' },
  { from: 'retail_ops', to: 'vp', what: 'Voice of customer summary', artefact: 'VOC report', cadence: 'Weekly' },
  { from: 'planning', to: 'retail_ops', what: 'Allocation, transfers, replenishment', artefact: 'Allocation plan', cadence: 'Weekly' },
  { from: 'retail_ops', to: 'trading', what: 'Store sell-through, price feedback', artefact: 'Store trade report', cadence: 'Weekly' },
  { from: 'trading', to: 'retail_ops', what: 'Price changes and markdowns, same day as online', artefact: 'Price change file', cadence: 'Same day' },
  { from: 'marketing', to: 'retail_ops', what: 'Event plan, activation briefs, campaign calendar', artefact: 'Event calendar', cadence: 'Monthly' },
  { from: 'development', to: 'retail_ops', what: 'OMS routing rules, device support', artefact: 'Store ops runbook', cadence: 'On change' },
  { from: 'finance', to: 'vp', what: 'Daily flash, weekly flash, budget vs actual', artefact: 'Flash report', cadence: 'Daily / Friday' },
  { from: 'finance', to: 'marketing', what: 'Spend validation, invoice approval, ROI review', artefact: 'Spend tracker', cadence: 'Weekly' },
  { from: 'finance', to: 'planning', what: 'Inventory valuation, provisions', artefact: 'Stock valuation', cadence: 'Monthly' },
  { from: 'vp', to: 'trading', what: 'Decisions, priorities, escalation rulings', artefact: 'Decision log', cadence: 'Weekly' },
];

export const CADENCE: { when: string; slot: string; forum: string; owner: string; attendees: string; pack: string; decisions: string; key?: boolean }[] = [
  { when: 'Daily 9:00', slot: 'daily', forum: 'Daily flash', owner: 'Finance', attendees: 'Trading, Marketing, Planning, CS, Warehouse (async)', pack: "Yesterday's revenue, margin, orders, traffic, dispatch, contact rate", decisions: 'Same-day fixes only: spend shifts, site issues, stock issues' },
  { when: 'Monday 10:00', slot: 'mon', forum: 'Trade meeting (60 min)', owner: 'Trading', attendees: 'VP, all heads, Head of Retail', pack: 'Trade pack (Planning + Trading + Finance)', decisions: 'Winners pushed, losers marked down, promotions approved, dev priority set, store transfers agreed', key: true },
  { when: 'Tuesday', slot: 'tue', forum: 'Marketing + Content sync', owner: 'Marketing', attendees: 'Digital, Offline, Content, VM', pack: 'Campaign calendar, asset status, backlog', decisions: "This week's campaign, email plan, assets, store roll-out" },
  { when: 'Wednesday', slot: 'wed', forum: 'Buying + Planning review', owner: 'Planning', attendees: 'Buying, Trading, Warehouse', pack: 'OTB, intake status, ageing report', decisions: 'Reorders, cancellations, transfers, markdown proposals for Monday' },
  { when: 'Thursday', slot: 'thu', forum: 'Product + Tech stand-up', owner: 'Development', attendees: 'Marketing, Content, CS, Store Fulfilment', pack: 'Release plan, incident log, test results', decisions: 'Release go/no-go, bug priority, freeze windows' },
  { when: 'Thursday', slot: 'thu', forum: 'Store ops call', owner: 'Store Management', attendees: 'Planning, Trading, Store Fulfilment, CS', pack: 'Store trade report, fulfilment SLA', decisions: 'Staffing for campaigns, stock moves, price compliance' },
  { when: 'Friday 15:00', slot: 'fri', forum: 'VP flash', owner: 'Finance', attendees: 'VP, Group leadership', pack: 'One-page flash', decisions: 'Escalations, spend approvals' },
  { when: 'Monthly', slot: 'monthly', forum: 'P&L and reforecast', owner: 'Finance', attendees: 'VP, all heads', pack: 'P&L by channel and category', decisions: 'Budget moves, headcount, reforecast' },
  { when: 'Quarterly', slot: 'quarterly', forum: 'Range and strategy review', owner: 'VP', attendees: 'Buying, Planning, Marketing, Head of Retail', pack: 'Season review, customer data', decisions: 'Range architecture, brand exits, channel investment' },
];

export interface ScenarioStep { n: number; dept: string; action: string; artefact: string; timing: string }
export interface Scenario { id: string; title: string; summary: string; steps: ScenarioStep[] }

export const SCENARIOS: Scenario[] = [
  {
    id: 'brand_launch', title: 'New brand launch', summary: '12 weeks out to day 1 — how a new range enters through one door and launches through every channel on the same morning.',
    steps: [
      { n: 1, dept: 'buying', action: 'Signs brand, agrees exclusivity, launch date, marketing funding', artefact: 'Supplier agreement', timing: 'W-12' },
      { n: 2, dept: 'planning', action: 'Approves buy against OTB, sets depth, allocates DC vs 3 flagship stores', artefact: 'OTB sheet, allocation plan', timing: 'W-11' },
      { n: 3, dept: 'buying', action: 'Adds launch to rolling calendar; briefs Marketing, Content, Store Management', artefact: 'Launch calendar entry', timing: 'W-10' },
      { n: 4, dept: 'marketing', action: 'Builds launch plan: paid, email, affiliates, PR, store event', artefact: 'Campaign brief', timing: 'W-8' },
      { n: 5, dept: 'trading', action: 'Approves launch pricing, confirms no conflicting promotion, sets placement', artefact: 'Promotion approval log', timing: 'W-8' },
      { n: 6, dept: 'content', action: 'Receives samples early, shoots campaign and product, writes EN/AR copy', artefact: 'Asset library, PIM records', timing: 'W-6 to W-2' },
      { n: 7, dept: 'development', action: 'Builds landing page, adds brand to navigation, schedules release', artefact: 'Sprint ticket', timing: 'W-4' },
      { n: 8, dept: 'marketing', action: 'Offline Marketing + VM plan window, floor set, launch event in flagship', artefact: 'Event brief, floor set plan', timing: 'W-4' },
      { n: 9, dept: 'retail_ops', action: 'Warehouse receives stock, confirms goods-in; Content flags products live', artefact: 'Goods-in report', timing: 'W-1' },
      { n: 10, dept: 'retail_ops', action: 'Store stock landed; endless aisle enabled for non-stocked stores', artefact: 'Store readiness check', timing: 'W-1' },
      { n: 11, dept: 'finance', action: 'Loads launch budget and revenue target into flash', artefact: 'Budget line', timing: 'W-1' },
      { n: 12, dept: 'vp', action: 'Go-live: site, email, paid, window, event on the same morning', artefact: 'Launch checklist signed by Trading, Content, Marketing', timing: 'Day 0' },
      { n: 13, dept: 'trading', action: 'Day 3 and day 7 read: sell-through by SKU, online vs store', artefact: 'Launch read', timing: 'Day 3–7' },
      { n: 14, dept: 'buying', action: 'Reorder decision on winners with Planning; feedback to brand', artefact: 'Reorder sheet', timing: 'Day 10' },
    ],
  },
  {
    id: 'weekly_trade', title: 'Weekly trade cycle', summary: 'Monday to Friday — the rhythm that turns one report into one set of decisions, executed everywhere the same week.',
    steps: [
      { n: 1, dept: 'finance', action: 'Publishes weekly figures Sunday night', artefact: 'Trade pack, finance section', timing: 'Sun' },
      { n: 2, dept: 'planning', action: 'Adds stock cover, ageing, intake status', artefact: 'Trade pack, stock section', timing: 'Sun' },
      { n: 3, dept: 'trading', action: 'Adds winners/losers, margin, promotion results, proposals', artefact: 'Trade pack, trade section', timing: 'Mon 8:00' },
      { n: 4, dept: 'vp', action: 'Trade meeting: push list, markdown list, promotions approved, dev priorities, transfers', artefact: 'Decision log', timing: 'Mon 10:00' },
      { n: 5, dept: 'marketing', action: 'Reweights spend to push list, updates email plan, briefs affiliates', artefact: 'Channel plan', timing: 'Mon pm' },
      { n: 6, dept: 'content', action: 'Reprioritises backlog to push list', artefact: 'Priority list', timing: 'Mon pm' },
      { n: 7, dept: 'trading', action: 'Executes price changes online; sends store price file for same-day change', artefact: 'Price change file', timing: 'Mon pm' },
      { n: 8, dept: 'retail_ops', action: 'Applies price changes, moves markdown stock, updates VM', artefact: 'Compliance photos', timing: 'Tue am' },
      { n: 9, dept: 'development', action: 'Pulls Monday priorities into sprint', artefact: 'Sprint board', timing: 'Tue' },
      { n: 10, dept: 'planning', action: 'Wednesday review with Buying: cancel, reorder, transfer', artefact: 'OTB decisions', timing: 'Wed' },
      { n: 11, dept: 'retail_ops', action: 'Store ops call: trade report, missed sales log to Buying, fulfilment SLA', artefact: 'Store report', timing: 'Thu' },
      { n: 12, dept: 'finance', action: 'Friday flash: how the week landed vs Monday decisions', artefact: 'Flash', timing: 'Fri' },
    ],
  },
  {
    id: 'promotion', title: 'A promotion, request to post-mortem', summary: 'The forced negotiation in action — revenue asks, margin approves, everyone executes, finance closes the loop.',
    steps: [
      { n: 1, dept: 'marketing', action: 'Submits promotion request: mechanic, categories, forecast, spend, channels', artefact: 'Promotion request form', timing: 'D-10' },
      { n: 2, dept: 'trading', action: 'Models margin impact, checks stock cover and calendar conflicts; approves, amends or blocks', artefact: 'Promotion approval log', timing: 'D-8' },
      { n: 3, dept: 'planning', action: 'Confirms stock depth can support forecast; allocates extra to stores', artefact: 'Stock check', timing: 'D-7' },
      { n: 4, dept: 'buying', action: 'Secures supplier funding where available', artefact: 'Funding confirmation', timing: 'D-7' },
      { n: 5, dept: 'finance', action: 'Validates spend against budget, loads target', artefact: 'Budget line', timing: 'D-6' },
      { n: 6, dept: 'content', action: 'Produces creative, badges, email, in-store collateral with VM', artefact: 'Asset kit', timing: 'D-5' },
      { n: 7, dept: 'development', action: 'Configures promotion engine, tests in QA, confirms store POS parity', artefact: 'Release ticket', timing: 'D-3' },
      { n: 8, dept: 'retail_ops', action: 'Customer Service briefed on terms; store staff briefed, collateral live, POS tested', artefact: 'CS brief, store readiness', timing: 'D-2 to D-1' },
      { n: 9, dept: 'vp', action: 'Go-live, same time online and in store', artefact: 'Checklist', timing: 'D0' },
      { n: 10, dept: 'finance', action: 'Daily read with Trading: revenue, margin, cannibalisation', artefact: 'Daily flash', timing: 'D1 to end' },
      { n: 11, dept: 'trading', action: 'Post-mortem with Marketing and Finance: incremental revenue and margin; repeat or retire', artefact: 'Post-mortem in trade pack', timing: 'D+7' },
    ],
  },
  {
    id: 'slow_line', title: 'A slow line (stock problem)', summary: 'The ageing report flags it Wednesday; by Monday it is diagnosed, actioned or marked down — nothing sits.',
    steps: [
      { n: 1, dept: 'planning', action: 'Ageing report flags category at 18 weeks cover vs 10 target', artefact: 'Ageing report', timing: 'Wed' },
      { n: 2, dept: 'trading', action: 'Diagnoses: price, placement, content, or demand; checks store vs online sell-through', artefact: 'Diagnosis note', timing: 'Wed' },
      { n: 3, dept: 'content', action: 'If content issue: reshoot or rewrite within 48h', artefact: 'Priority list', timing: 'Thu' },
      { n: 4, dept: 'marketing', action: 'If demand issue: targeted push via email and paid to brand customers', artefact: 'Channel plan', timing: 'Thu' },
      { n: 5, dept: 'retail_ops', action: 'If channel issue: transfer from weak store to online or strong store', artefact: 'Transfer request', timing: 'Thu' },
      { n: 6, dept: 'buying', action: 'Asks supplier for markdown support or return-to-vendor', artefact: 'Supplier note', timing: 'Fri' },
      { n: 7, dept: 'trading', action: 'Monday: markdown depth decided if still above target', artefact: 'Markdown list', timing: 'Mon' },
      { n: 8, dept: 'finance', action: 'Provision updated, margin impact logged', artefact: 'Stock valuation', timing: 'Month end' },
    ],
  },
  {
    id: 'incident', title: 'Site incident during peak', summary: 'Checkout failing — 15-minute acknowledgement, 30-minute leadership loop, stores as the fallback channel.',
    steps: [
      { n: 1, dept: 'retail_ops', action: 'Customer Service sees checkout complaint spike; raises P1', artefact: 'Incident ticket', timing: 'T+0' },
      { n: 2, dept: 'development', action: 'Acknowledges, starts incident channel, confirms scope', artefact: 'Incident channel', timing: 'T+15 min' },
      { n: 3, dept: 'development', action: 'Informs VP, Trading, Marketing', artefact: 'Incident update', timing: 'T+30 min' },
      { n: 4, dept: 'marketing', action: 'Pauses paid spend to affected journeys, holds email send', artefact: 'Spend log', timing: 'T+30 min' },
      { n: 5, dept: 'retail_ops', action: 'CS publishes holding message; stores use endless aisle as fallback', artefact: 'CS macro, store note', timing: 'T+45 min' },
      { n: 6, dept: 'development', action: 'Fix deployed, QA verified', artefact: 'Release note', timing: 'T+resolution' },
      { n: 7, dept: 'marketing', action: 'Resumes spend, sends recovery email if needed', artefact: 'Channel plan', timing: 'After fix' },
      { n: 8, dept: 'development', action: 'Root cause report within 48h; added to peak-readiness checklist', artefact: 'Incident report', timing: 'T+48h' },
      { n: 9, dept: 'finance', action: 'Revenue loss estimate in Friday flash', artefact: 'Flash', timing: 'Fri' },
    ],
  },
  {
    id: 'omni_journeys', title: 'Omni-channel order journeys', summary: 'Four journeys that make every store a stock node: click & collect, ship-from-store, in-store returns, endless aisle.',
    steps: [
      { n: 1, dept: 'development', action: 'Click & collect: customer orders online, OMS reserves at store or routes from DC', artefact: 'OMS routing', timing: 'F1' },
      { n: 2, dept: 'retail_ops', action: 'Store picks, confirms ready within SLA; associate offers related items on collection (attach rate)', artefact: 'Ready notification', timing: 'F1' },
      { n: 3, dept: 'finance', action: 'Store credited with omni-channel contribution in the flash', artefact: 'Flash', timing: 'F1' },
      { n: 4, dept: 'development', action: 'Ship-from-store: item out of stock at DC → OMS routes to nearest store with stock', artefact: 'OMS routing', timing: 'F2' },
      { n: 5, dept: 'retail_ops', action: 'Store picks, packs, hands to carrier within SLA', artefact: 'Fulfilment SLA report', timing: 'F2' },
      { n: 6, dept: 'planning', action: 'Sees movement in daily report; replenishes the store', artefact: 'Replenishment', timing: 'F2' },
      { n: 7, dept: 'retail_ops', action: 'In-store return of online order: refund via OMS; reason captured to Buying and Content weekly', artefact: 'Returns report', timing: 'F3' },
      { n: 8, dept: 'retail_ops', action: 'Endless aisle: associate orders from online stock on the shop floor; sale attributed to store, fulfilled by DC', artefact: 'Endless aisle order', timing: 'F4' },
      { n: 9, dept: 'buying', action: 'Uses endless aisle data to see which stores miss which ranges', artefact: 'Range gap analysis', timing: 'F4' },
    ],
  },
  {
    id: 'store_activation', title: 'Store activation aligned with online', summary: 'One campaign, one creative kit, one week — window, homepage, email and event moving together.',
    steps: [
      { n: 1, dept: 'marketing', action: 'Offline plans flagship event; agreed in Tuesday sync with Digital campaign calendar', artefact: 'Event brief', timing: 'Plan' },
      { n: 2, dept: 'buying', action: 'Secures brand funding and gifting stock; Planning allocates event stock', artefact: 'Funding + allocation', timing: 'Plan' },
      { n: 3, dept: 'content', action: 'Produces one creative kit: site, email, window, in-store screens', artefact: 'Campaign kit', timing: 'Build' },
      { n: 4, dept: 'marketing', action: 'Digital runs geo-targeted paid and email to drive RSVP; CRM captures attendees', artefact: 'Channel plan', timing: 'Build' },
      { n: 5, dept: 'trading', action: 'Approves the event-only offer and confirms online parity', artefact: 'Approval log', timing: 'Build' },
      { n: 6, dept: 'retail_ops', action: 'Store staffs the event; VM sets window the same week the homepage changes', artefact: 'Floor set', timing: 'Live' },
      { n: 7, dept: 'finance', action: 'Event ROI: store sales during event, online uplift in catchment, new customers', artefact: 'ROI report', timing: 'Close' },
    ],
  },
];

export const RACI: { decision: string; roles: Record<string, string> }[] = [
  { decision: 'What to buy', roles: { vp: 'A', buying: 'R', planning: 'C', marketing: 'C', trading: 'C', content: 'I', finance: 'I', retail_ops: 'C' } },
  { decision: 'How much to buy', roles: { vp: 'A', buying: 'C', planning: 'R', marketing: 'I', trading: 'C', finance: 'C', retail_ops: 'I' } },
  { decision: 'Launch date', roles: { vp: 'I', buying: 'R', planning: 'C', marketing: 'A', trading: 'C', content: 'C', development: 'C', retail_ops: 'C' } },
  { decision: 'Promotion go/no-go', roles: { vp: 'esc.', buying: 'C', planning: 'C', marketing: 'R', trading: 'A', content: 'I', development: 'I', finance: 'C', retail_ops: 'I' } },
  { decision: 'Price and markdown', roles: { vp: 'I', buying: 'C', planning: 'C', marketing: 'I', trading: 'A/R', finance: 'C', retail_ops: 'I' } },
  { decision: 'Which products get shot first', roles: { buying: 'C', marketing: 'C', trading: 'A', content: 'R' } },
  { decision: 'Dev priority', roles: { vp: 'A', marketing: 'C', trading: 'R', content: 'C', development: 'R', retail_ops: 'C' } },
  { decision: 'Marketing spend allocation', roles: { vp: 'A', marketing: 'R', trading: 'C', finance: 'C' } },
  { decision: 'Store stock transfers', roles: { buying: 'I', planning: 'R', trading: 'A', retail_ops: 'C' } },
  { decision: 'Site incident response', roles: { vp: 'I', marketing: 'C', trading: 'C', development: 'A/R', retail_ops: 'C' } },
  { decision: 'Budget and headcount', roles: { vp: 'A', buying: 'C', planning: 'C', marketing: 'C', trading: 'C', content: 'C', development: 'C', finance: 'R', retail_ops: 'C' } },
];

export const deptById = (id: string) => DEPTS.find((d) => d.id === id);
