-- 0028 — Head of Operations report: full 25-slide alignment + editor links.
--
-- (a) The 0027 seed condensed deck slides 2, 9, 10, 13, 17, 18 and 19 into
--     neighbouring sections; this adds each as its own section, positioned in
--     deck order. Guarded per-title so it never duplicates and never touches
--     sections the Operations Director may already have edited.
-- (b) report_share_links.can_edit — an operations link minted as an EDITOR
--     link lets its holder edit the report straight from the link, no login.
--     Applied to production 2026-08-05 via MCP (ops_report_full_deck_alignment).

do $$
begin

if not exists (select 1 from lane_e.ops_report_sections where title = 'Why Dental Nation, why now') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (15, 'columns',
   'Why Dental Nation, why now',
   'A UAE dental platform with documented traction and a repeatable expansion playbook.',
   '{"columns":[
      {"title":"01 · Proven model","lines":["Dr Tosun — net profit uplift from 4.5% to 13.8% under Dental Nation ownership","The operating model works at scale"]},
      {"title":"02 · Repeatable playbook","lines":["Institutional know-how framework","Orchestration platform","New-Clinic Integration & Commissioning Framework — engineered for expansion"]},
      {"title":"03 · Operating leverage","lines":["Centralized shared services","23% documented procurement reduction","Every new clinic added inherits the group''s cost base, not its own"]},
      {"title":"04 · Fast integration","lines":["AMC acquired Feb 2026 — first profitable month within four months","New clinics reach performance faster inside the platform"]}
   ]}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'Three clinics, one portfolio strategy') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (95, 'columns',
   'Three clinics, one portfolio strategy',
   'Each clinic has a defined community, specialty hub and role within one group platform.',
   '{"columns":[
      {"title":"Dental Nation Al Wasl — operating anchor","subtitle":"Operating-model standardization & brand transition","lines":[
        "Community: Arab & local Emirati clientele — premium, luxury-positioned practice",
        "Specialty hub: Orthodontics",
        "Planned capacity: reference-model site for group build-out",
        "Focus: full rebuild on the group operating model; reference implementation for every future integration; premium-experience standard-setter across the network"]},
      {"title":"Dental Nation Dr Tosun — clinical anchor","subtitle":"Clinical excellence, community reputation & quality leadership","lines":[
        "Community: family-based community practice, primarily serving the Turkish community",
        "Specialty hub: family & general dentistry",
        "Planned capacity: mature, steady-state — capacity for measured specialist growth",
        "Focus: preserve clinical heritage & community goodwill; overlay professional infrastructure for scale; add measured specialty depth on the community base"]},
      {"title":"AMC — growth platform","subtitle":"The branch with headroom to scale doctor count, service lines and patient volume fastest","lines":[
        "Community: DN SOS emergency-first practice — walk-in, urgent-care and Arab community patients",
        "Specialty hub: emergency & routine, volume-based procedures",
        "Planned capacity: growth platform & network expansion — capacity to absorb new patient volume and specialties"]}
   ]}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'OpCo organizational structure & operating governance') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (105, 'columns',
   'OpCo organizational structure & operating governance',
   'Integrated accountability for non-clinical operations, clinical governance and regulatory compliance across three branches. Solid lines = direct reporting; dotted = functional/dual accountability.',
   '{"columns":[
      {"title":"Operations pillar — Head of Operations","subtitle":"Non-clinical operations & patient experience","lines":[
        "A · Patient Experience — patient experience & front office: receptionists & front-office team across three branches",
        "B · Procurement — centralized procurement: instruments · materials · consumables · contracts",
        "C · HR & Admin — workforce management · attendance · policy",
        "D · IT & Facilities — systems · housekeeping · clinic support"]},
      {"title":"Clinical pillar — Clinical Director","subtitle":"Clinical governance, quality & performance","lines":[
        "A · Compliance — Clinical Compliance Lead: DHA readiness · clinical SOPs · audit",
        "B · Nursing — Master Nurse-in-Charge: group nursing standards · training · protocols",
        "C · Branch NIC — Nurses-in-Charge per branch: branch-level nursing execution & team lead",
        "D · Doctors — GPs · specialists · visiting · rotating"]},
      {"title":"Governance cadence & dual accountability","lines":[
        "Weekly Operations Review — led by the Head of Operations",
        "Recurring clinical, nursing and patient-experience review cadences",
        "Dual accountability (dotted line): Doctors & Specialists → Head of Operations for schedules, patient flow and non-clinical coordination"]}
   ]}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'Group-wide enterprise EMR') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (115, 'beforeafter',
   'Group-wide enterprise EMR',
   'An enterprise-grade, internationally recognized dental EMR platform, live across DN Al Wasl, Dr Tosun and AMC — the orchestration layer''s clinical foundation; every downstream workflow references it.',
   '{"beforeTitle":"Before","afterTitle":"After — one clinical data backbone","before":[
      "Separate records, fragmented documentation, difficult group reporting",
      "Limited cross-branch visibility; clinical history did not follow the patient",
      "No consolidated view of the group''s clinical activity"],
    "after":[
      "One longitudinal patient record across branches; consistent clinical documentation & treatment history",
      "Cross-branch continuity & internal specialty referrals; centralized scheduling, clinical visibility & reporting",
      "Improved audit readiness, governance & data quality; reduced duplication and information loss"],
    "impact":"The EMR does not just record clinical care — it makes the group visible, comparable and controllable as one clinical enterprise."}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'Clinical governance, specialty growth & credibility') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (145, 'table',
   'Clinical governance, specialty growth & credibility',
   'The platform now supports clinical governance and multidisciplinary growth at group level.',
   '{"headers":["Dimension","Before","After"],"rows":[
      ["Clinical governance","Clinic-dependent practices and limited group oversight","Named Clinical Director, Compliance & Regulatory Lead, branch nurse in-charges, group training capability, recurring clinical review and SOP governance"],
      ["Specialty development","Limited specialty mix and referral pathways","Pediatric Dentistry and Prosthodontics introduced; additional GPs and specialists onboarded; internal and external referral pathways being developed"],
      ["Clinical credibility","Doctor experience, cases, awards and credentials not systematically presented","Clinical portfolios, case experience, certifications, studies and achievements collated to build patient confidence, referrals, goodwill and doctor attraction"]
   ]}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'Human capital management') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (175, 'columns',
   'Human capital management',
   'People management has moved from local administration to a governed group-wide workforce model.',
   '{"columns":[
      {"title":"Before","subtitle":"Local, individual-dependent people administration","lines":[
        "Inconsistent branch practices",
        "Limited attendance and leave visibility",
        "Informal onboarding",
        "Variable uniforms and workplace standards",
        "Individual-dependent approvals"]},
      {"title":"What we built","subtitle":"A governed group-wide human capital model","lines":[
        "Human Capital Management Platform",
        "Group HR policies — attendance, leave, working standards, conduct",
        "Standard onboarding policy & role-specific checklists",
        "Professional agreements for GPs and specialists",
        "Standardized scrubs and patient-facing uniforms",
        "Workforce attendance & leave controls; defined approval hierarchy",
        "Training and cross-branch workforce development"]},
      {"title":"Impact","subtitle":"A consistent, controlled, deployable workforce","lines":[
        "Consistency and professionalism",
        "Better workforce visibility; reduced administrative leakage",
        "Faster onboarding",
        "Stronger compliance and employee accountability",
        "Ability to deploy shared teams across branches"]}
   ]}');
end if;

if not exists (select 1 from lane_e.ops_report_sections where title = 'Commercial & financial governance') then
  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values
  (178, 'beforeafter',
   'Commercial & financial governance',
   'Pricing, discounts and clinician compensation are now governed at group level.',
   '{"beforeTitle":"Before — inconsistent commercial practices","afterTitle":"After — centralized pricing, discount & compensation architecture","before":[
      "Inconsistent pricing; informal discounts",
      "One-page doctor offers",
      "Unstructured or incomplete commission calculations",
      "Limited visibility of major consumables and diagnostics"],
    "after":[
      "Fixed bundle pricing across major service categories; VIP packages and governed patient propositions",
      "Tiered discount authority and documented approval",
      "Detailed GP- and specialist-specific professional agreements; standardized clinician compensation framework",
      "Defined treatment, diagnostic and major-consumable inputs; refund, cancellation, payment-plan & insurance process governance"],
    "impact":"Improved price realization · reduced margin leakage · more consistent patient conversion · better commission accuracy · greater transparency & control"}');
end if;

end $$;

-- Editor links: a share link that may also EDIT the operations report.
alter table lane_e.report_share_links
  add column if not exists can_edit boolean not null default false;

comment on column lane_e.report_share_links.can_edit is
  'Operations scope only: the link holder may edit the Head of Operations report. Minted deliberately; revocable like any link.';
