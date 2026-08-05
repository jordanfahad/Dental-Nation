-- 0029 — Head of Operations report: infographics.
--
-- The deck the board saw is visual — stat callouts, a monthly-turnaround
-- chart, procurement bars, journey flows — and the first render of this
-- report kept the words but dropped the pictures. Adds two chart kinds
-- (bars, flow), converts the seeded sections that were born as walls of
-- text, and inserts the three charts the numbers deserve. Every conversion
-- is guarded on updated_by IS NULL so a section the Operations Director has
-- already edited is never overwritten.
-- Applied to production 2026-08-05 via MCP (ops_report_infographics).

alter table lane_e.ops_report_sections
  drop constraint if exists ops_report_sections_kind_check;
alter table lane_e.ops_report_sections
  add constraint ops_report_sections_kind_check
  check (kind in ('hero','stats','table','columns','beforeafter','list','bars','flow','quote','text'));

-- Transition framework: four phases read as a flow, not a list.
update lane_e.ops_report_sections
set kind = 'flow',
    payload = '{"steps":[
      {"label":"Identify","note":"Pre-acquisition. De novo: site assessment & feasibility · M&A: due diligence & valuation"},
      {"label":"Commit","note":"Deal: legal structuring, share purchase or licence acquisition, entity setup, regulatory transfer — ownership moves to Dental Nation Group"},
      {"label":"Prepare","note":"Pre-operation. De novo: commissioning & fit-out · M&A: integration into the operating model"},
      {"label":"Launch","note":"Fully operational under the Dental Nation brand — patient flow, EMR, governance and reporting all live"}
    ]}'::jsonb
where title = 'Transition framework — identification to operational launch'
  and updated_by is null;

-- AI patient journey: the seven steps as an arrow flow + delivers as a list.
update lane_e.ops_report_sections
set kind = 'flow',
    payload = '{"steps":[
      {"label":"Lead sourced","note":"Digital, social & referral channels feed one central CRM"},
      {"label":"AI answers","note":"24/7 response, qualification, first triage — no missed leads"},
      {"label":"Booking","note":"Appointment booked via WhatsApp, confirmed in the same conversation"},
      {"label":"Reminder","note":"Automated pre-visit prompts reduce no-shows"},
      {"label":"Visit","note":"Check-in, consult & treatment plan on one patient record"},
      {"label":"Post-visit","note":"Payment, review request & NPS — automated Google-review capture"},
      {"label":"Retention","note":"Birthdays, recalls, campaigns — measured to conversion"}
    ]}'::jsonb
where title = 'AI-enabled patient journey — lead to post-treatment'
  and updated_by is null;

insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload)
select 122, 'list', 'What the AI journey delivers', '',
  '{"numbered":true,"items":[
     "Zero lead leakage — AI-first response captures leads 24/7; no lead waits for a human",
     "Measurable conversion — lead → appointment → treatment attribution end-to-end, one CRM to one EMR",
     "Lower cost per patient — automation replaces manual outreach",
     "Scales with the group — every new clinic inherits the same AI-enabled journey from day one"
  ]}'::jsonb
where not exists (select 1 from lane_e.ops_report_sections where title = 'What the AI journey delivers');

-- Management-control loop as a flow + the reporting stack as its own list.
update lane_e.ops_report_sections
set kind = 'flow',
    payload = '{"steps":[
      {"label":"Data capture","note":"EMR, financial & operational systems"},
      {"label":"Standard report","note":"Common templates across clinics"},
      {"label":"KPI comparison","note":"Benchmarks and variance analysis"},
      {"label":"Management review","note":"Scheduled review cadence"},
      {"label":"Corrective action","note":"Owner, target, deadline"},
      {"label":"Follow-up","note":"Accountability traceable to closure"}
    ]}'::jsonb
where title = 'Performance management & management control'
  and updated_by is null;

insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload)
select 132, 'list', 'The reporting stack we built', '',
  '{"items":[
     "Daily operational control reporting",
     "Weekly clinic and appointment performance",
     "Monthly doctor-wise scorecards",
     "Branch financial and productivity scorecards",
     "Clinic benchmarking & peer comparison",
     "Management dashboards & exception reporting",
     "Weekly clinical, nursing and patient-experience review cadences"
  ]}'::jsonb
where not exists (select 1 from lane_e.ops_report_sections where title = 'The reporting stack we built');

-- The three charts.
insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload)
select 45, 'bars', 'Operating leverage — annual savings by function',
  'Structural cost avoided every year vs. the traditional per-branch model. IT support shown at the midpoint of its AED 90–108k range.',
  '{"unit":"aed","bars":[
     {"label":"Manager (Patient Experience Lead)","value":354000,"note":"one role per branch × 3 avoided · 82%"},
     {"label":"Lab costs — Dr Tosun","value":185232,"note":"FY2024 vs FY2025 · finance-reported · −49.9%"},
     {"label":"Accountant","value":138000,"note":"one role per branch × 3 avoided · 59%"},
     {"label":"Procurement","value":120517,"note":"documented run-rate · 23%"},
     {"label":"IT support","value":99000,"note":"one role per branch × 3 avoided · 63–67%"}
  ]}'::jsonb
where not exists (select 1 from lane_e.ops_report_sections where title = 'Operating leverage — annual savings by function');

insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload)
select 55, 'bars', 'AMC — the monthly turnaround',
  'Monthly net profit, AED. Acquired February 2026; first profitable month within four months.',
  '{"unit":"aed","bars":[
     {"label":"January","value":-33978,"note":"prior owner"},
     {"label":"February","value":-177476,"note":"transition month"},
     {"label":"March","value":-61445},
     {"label":"April","value":-19632},
     {"label":"May","value":-7832},
     {"label":"June","value":14586,"note":"first profit"}
  ]}'::jsonb
where not exists (select 1 from lane_e.ops_report_sections where title = 'AMC — the monthly turnaround');

insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload)
select 148, 'bars', 'Where the procurement reduction came from',
  'Documented reduction against comparable prior spend, group-wide. Contract & laboratory centralization created further savings — quantification underway as full-year data matures.',
  '{"unit":"pct","bars":[
     {"label":"Instruments","value":37.4},
     {"label":"Materials","value":25.6},
     {"label":"Consumables","value":23.3},
     {"label":"Overall — group-wide","value":23,"note":"the headline figure"}
  ]}'::jsonb
where not exists (select 1 from lane_e.ops_report_sections where title = 'Where the procurement reduction came from');
