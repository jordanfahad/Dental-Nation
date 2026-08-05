-- 0027 — The Head of Operations dashboard.
--
-- A block-based, EDITABLE report: the operational-excellence story (from the
-- investor deck) rendered live, with every section stored as a row the
-- Operations Director can edit, add, reorder, hide or delete from the
-- dashboard itself — no engineer in the loop. Read-only tokenised links share
-- it the same way the board report is shared (scope='operations').
--
-- Content is data, not code, because the person who owns this narrative is
-- Ms Shadi, not the repository.

-- 1 ── the sections table ----------------------------------------------------

create table if not exists lane_e.ops_report_sections (
  id          bigint generated always as identity primary key,
  position    numeric not null,
  kind        text not null check (kind in
                ('hero','stats','table','columns','beforeafter','list','quote','text')),
  title       text not null default '',
  subtitle    text not null default '',
  payload     jsonb not null default '{}'::jsonb,
  visible     boolean not null default true,
  updated_by  text,
  updated_at  timestamptz not null default now()
);

comment on table lane_e.ops_report_sections is
  'Editable blocks of the Head of Operations report. Service-role only; edited from the dashboard by admins and users granted the operations tab.';

alter table lane_e.ops_report_sections enable row level security;

-- 2 ── share links: a third scope -------------------------------------------

alter table lane_e.report_share_links
  drop constraint if exists report_share_links_scope_check;
alter table lane_e.report_share_links
  add constraint report_share_links_scope_check
  check (scope in ('growth', 'handover', 'funnel', 'operations'));

-- 3 ── seed: the operational-excellence narrative ----------------------------
-- Seeded ONCE (guarded); after this, the table is Ms Shadi's.

do $$
begin
  if exists (select 1 from lane_e.ops_report_sections) then
    return;
  end if;

  insert into lane_e.ops_report_sections (position, kind, title, subtitle, payload) values

  (10, 'hero',
   'Operational excellence — one platform, three clinics',
   'Operational excellence is now a managed enterprise capability — not a collection of branch practices.',
   '{"stats":[
      {"value":"+7.5%","label":"Like-for-like revenue","note":"FY2024 → FY2025 · Dr Tosun + AMC · AED 6.56M → 7.05M"},
      {"value":"3.0×","label":"Net-margin uplift","note":"Dr Tosun · 4.5% baseline → 13.8% H1 2026 · finance-reported"},
      {"value":"3 / 3","label":"Clinics on one platform","note":"One operating model, repeatable at scale"},
      {"value":"4 mo","label":"AMC to first profit","note":"Acquired Feb 2026 · first profitable month Jun 2026"}
   ]}'),

  (20, 'table',
   'What Dental Nation has built',
   'A group platform engineered to acquire, integrate and scale — repeatably.',
   '{"headers":["Capability","What it delivers"],"rows":[
      ["Leadership & structure","One Operating Company (OpCo) — Clinical Director, Head of Operations and Compliance Officer — running all three clinics as one enterprise, supported by centralized non-medical services (finance, procurement, HR, IT)."],
      ["Systems","Seven shared systems live group-wide — enterprise EMR, AI Contact Center, procurement, IT, PMO, HR, reporting. One orchestration layer."],
      ["Governance","Documented approval hierarchy — 13-chapter corporate policy framework; standardized SOPs across clinical, commercial and financial operations."],
      ["Procurement","Centralized purchasing function — 23% documented group cost reduction. Every new clinic inherits the group''s supplier terms from day one."],
      ["Financial visibility","One consolidated group P&L; branch-level performance measured, reported and actioned monthly — investor-grade reporting infrastructure."],
      ["Clinical standards","Detailed GP/specialist agreements, standardized nursing framework, group-wide KPI scorecards — quality and compliance ready to scale."]
   ]}'),

  (30, 'stats',
   'Operating leverage — every new clinic inherits the group''s cost base',
   'Centralization creates structural operating leverage — quantified.',
   '{"stats":[
      {"value":"AED 888k – 906k","label":"Annual structural saving","note":"vs. the traditional per-branch model"},
      {"value":"≈ AED 2.7M","label":"Three-year value","note":"Cumulative operating leverage at current run-rate"},
      {"value":"≈ 11%","label":"Of FY2025 group revenue","note":"Saved every year without adding revenue"}
   ]}'),

  (40, 'table',
   'Where the leverage comes from',
   'Traditional-model figures are a modeled comparison vs. per-branch staffing; the lab figure is finance-reconciled.',
   '{"headers":["Function","Traditional model — cost avoided","Annual saving","% avoided"],"rows":[
      ["Lab costs — Dr Tosun","FY2024 vs FY2025 · finance-reported, reconciled","AED 185,232 / yr","−49.9%"],
      ["Manager (Patient Experience Lead)","One dedicated role per branch × 3","AED 354,000 / yr","82%"],
      ["Accountant","One dedicated role per branch × 3","AED 138,000 / yr","59%"],
      ["IT support","One dedicated role per branch × 3","AED 90,000 – 108,000 / yr","63 – 67%"],
      ["Procurement — documented","Group cost reduction, run-rate","≈ AED 120,517 / yr","23%"],
      ["Marketing","Fragmented per branch → one centralized Head of Marketing, group-wide","—","—"]
   ]}'),

  (50, 'columns',
   'Documented traction, branch by branch',
   'The model works at the mature branch — and works fast at the newest one.',
   '{"columns":[
      {"title":"Dr Tosun — mature branch","subtitle":"Acquired July 2025","lines":[
        "Net margin (finance-reported): FY2024 4.5% → H1 2026 13.8% — 3.0× since acquisition",
        "Gross margin 38.2% → 42.2%",
        "Lab spend −AED 185,232 (−49.9%)",
        "Admin costs −AED 157,369 (−10.2%)"]},
      {"title":"DN Al Wasl — rebuilt from scratch","subtitle":"Reopened June 2025","lines":[
        "Gross margin (finance-reported): FY2025 11.3% → H1 2026 18.8% — +66% relative uplift",
        "First full year of operation FY2025",
        "H1 2026 already tracking ahead",
        "Rebuild period; ramping to platform performance"]},
      {"title":"AMC — newest branch","subtitle":"Acquired February 2026 — a monthly turnaround","lines":[
        "Monthly net profit: Jan −33,978 (prior owner) · Feb −177,476 (transition) · Mar −61,445 · Apr −19,632 · May −7,832 · Jun +14,586",
        "First profitable month within four months of acquisition",
        "The platform integrates new clinics fast — the newest branch already turned"]}
   ]}'),

  (60, 'list',
   'Institutional know-how & documentation framework',
   'Management has converted operating experience into institutional Dental Nation know-how — an operating IP framework, not a list of documents.',
   '{"numbered":true,"items":[
      "Operating Governance — SOPs Manual; Organizational Structure, Relationships & Communication Manual; Roles, Responsibilities & Accountability Framework; Corporate Policies & Governance Manuals",
      "Performance Management — Reporting & Performance Management Framework; operational KPIs, clinic scorecards & benchmarking; doctor-wise performance management; management review & corrective-action cadence",
      "Automation & Control — Operational Automation Framework; enterprise orchestration layer; centralized management information & reporting; approval hierarchies & authority controls",
      "Functional Policy Manuals — Corporate Policy; Procurement Policy; Infection Prevention & Control; HR Policy; Finance Department Policy",
      "Scale & Replication — end-to-end journey mapping & process design; centralized non-clinical shared services model; New Clinic Integration & Commissioning Framework; repeatable standards for current & future branches"
   ]}'),

  (70, 'columns',
   'End-to-end operating architecture',
   'The operating model now governs every journey from first contact to financial closure.',
   '{"columns":[
      {"title":"Layer 01 — End-to-end journeys","lines":["Patient Journey","Clinician Journey","Regulatory & Compliance"]},
      {"title":"Layer 02 — Clinic operations","lines":["Appointment booking","Check-in & check-out","Reception & patient flow","Treatment coordination","Follow-up & complaints"]},
      {"title":"Layer 03 — Commercial & financial","lines":["New pricing model & framework","Dentists'' payment & compensation","Insurance approvals & claims","Discounts, packages, payment plans","Refund & cancellation management"]},
      {"title":"Layer 04 — Shared services","lines":["Inventory & procurement","Finance","Human resources","IT & data management","Contact centre & patient support"]}
   ]}'),

  (80, 'list',
   'Transition framework — identification to operational launch',
   'A repeatable four-phase model, from target identification to a fully operational Dental Nation clinic.',
   '{"numbered":true,"items":[
      "Identify (pre-acquisition) — de novo: site assessment & feasibility · M&A: due diligence & valuation",
      "Commit (deal) — legal structuring, share purchase or licence acquisition, entity setup and regulatory transfer; ownership transfers to Dental Nation Group",
      "Prepare (pre-operation) — de novo: commissioning & fit-out · M&A: integration into the Dental Nation operating model",
      "Launch (operation) — the clinic becomes fully operational under the Dental Nation brand: patient flow, EMR, governance and reporting all live"
   ]}'),

  (90, 'table',
   'Applied to our three clinics',
   '',
   '{"headers":["Clinic","Integration","Operational launch","Portfolio role"],"rows":[
      ["Dental Nation Al Wasl","Commissioning · Jan – May 2025","June 2025","Operating anchor — operating-model standardization & brand transition; premium Arab & Emirati clientele; orthodontics hub; reference-model site for group build-out"],
      ["Dental Nation Dr Tosun","Integration · Jan – June 2025","July 2025","Clinical anchor — clinical excellence, community reputation & quality leadership; family practice serving the Turkish community; family & general dentistry hub"],
      ["AMC","Integration · Nov 2025 – Jan 2026","February 2026","Growth platform — DN SOS emergency-first practice; emergency & routine volume procedures; headroom to scale doctor count, service lines and patient volume fastest"]
   ]}'),

  (100, 'table',
   'Operational excellence, before and after',
   'From fragmented branch practices to a managed enterprise capability.',
   '{"headers":["Dimension","Before — fragmented","After — managed enterprise capability"],"rows":[
      ["Governance","Informal, individual-dependent decisions","Documented accountability & authority matrices"],
      ["Processes","Variable branch practices","Standardized SOP-led execution"],
      ["People","Duplicated branch resources","Centralized expertise & shared workforce deployment"],
      ["Technology","Disconnected tools","Enterprise orchestration layer"],
      ["Performance","Manual retrospective reports","KPI-led management & intervention"],
      ["Scale","Clinic-specific knowledge","Repeatable integration & commissioning framework"]
   ],"note":"Business impact: consistency · productivity · cost control · risk reduction · management visibility · scalability"}'),

  (110, 'list',
   'Enterprise orchestration layer',
   'A common orchestration layer now connects patients, clinicians, operations and management. Capabilities are named by function; the report deliberately does not display vendor or product names.',
   '{"items":[
      "Clinical — enterprise EMR platform: one longitudinal patient record and common clinical backbone across the group",
      "Patient acquisition — centralized CRM & lead management: one accountable lead-to-appointment pipeline",
      "Patient engagement — AI-enabled contact centre: centralized patient contact, booking & follow-up",
      "Workforce — human capital management: HR, attendance, leave & workforce governance",
      "Delivery — enterprise PMO platform: project timelines, owners & follow-ups",
      "Finance — financial management & consolidated reporting",
      "Supply chain — procurement & supplier governance",
      "Intelligence — BI, KPI & management reporting: a common performance language across every clinic",
      "Orchestrated end-to-end flow: lead → appointment → patient record → treatment → follow-up → payment → performance insight → management action"
   ]}'),

  (120, 'columns',
   'AI-enabled patient journey — lead to post-treatment',
   'One AI-enabled journey, from first touch to post-treatment follow-up. Booking widget, lead management, AI contact center and EMR — fully automated and linked.',
   '{"columns":[
      {"title":"The journey","lines":[
        "01 · Lead sourced — digital, social & referral channels feed one central CRM",
        "02 · AI answers — 24/7 response, qualification, first triage; no missed leads",
        "03 · Booking — appointment booked via WhatsApp, slot confirmed inside the conversation",
        "04 · Reminder — automated pre-visit prompts reduce no-shows",
        "05 · Visit — check-in, consult & treatment plan on one patient record",
        "06 · Post-visit — payment, review request & NPS; automated Google-review capture",
        "07 · Retention — follow-up & reactivation: birthdays, recalls, campaigns — measured to conversion"]},
      {"title":"What this journey delivers","lines":[
        "Zero lead leakage — AI-first response captures leads 24/7",
        "Measurable conversion — lead → appointment → treatment attribution end-to-end, one CRM to one EMR",
        "Lower cost per patient — automation replaces manual outreach",
        "Scales with the group — every new clinic inherits the same AI-enabled journey from day one"]}
   ]}'),

  (130, 'columns',
   'Performance management & management control',
   'Management now operates with one performance language across every clinic — from retrospective reports to a management-control discipline.',
   '{"columns":[
      {"title":"The management-control loop","lines":[
        "01 · Data capture — EMR, financial & operational systems",
        "02 · Standard report — common templates across clinics",
        "03 · KPI comparison — benchmarks and variance analysis",
        "04 · Management review — scheduled review cadence",
        "05 · Corrective action — owner, target, deadline",
        "06 · Accountability follow-up — traceable to closure"]},
      {"title":"The reporting stack we built","lines":[
        "Daily operational control reporting",
        "Weekly clinic and appointment performance",
        "Monthly doctor-wise scorecards",
        "Branch financial and productivity scorecards",
        "Clinic benchmarking & peer comparison",
        "Management dashboards & exception reporting",
        "Weekly clinical, nursing and patient-experience review cadences"]}
   ]}'),

  (140, 'list',
   'Doctor performance — the nine core KPIs',
   'Doctor performance is now measured, reviewed and actively improved. Clinical productivity is a managed KPI, not a downstream outcome.',
   '{"numbered":true,"items":[
      "Unique attended patients — volume of care delivered per doctor, per period",
      "Revenue & revenue growth — financial contribution and trajectory",
      "Average revenue per patient — value density per visit",
      "Consultation-to-treatment conversion — first-visit case-conversion strength",
      "Treatment-plan acceptance & completion — follow-through from plan to delivery",
      "New vs returning patient mix — acquisition vs retention balance",
      "Chair & schedule utilization — asset productivity per doctor and branch",
      "Internal & specialty referrals — group value from cross-doctor pathways",
      "Cancellation & no-show leakage — lost-capacity signal for action"
   ]}'),

  (150, 'beforeafter',
   'Procurement transformation',
   'Centralized procurement has converted fragmented buying into measurable group purchasing leverage: 23% documented reduction — instruments −37.4%, materials −25.6%, consumables −23.3%.',
   '{"beforeTitle":"Before — decentralized","afterTitle":"After — centralized","before":[
      "Decentralized branch purchasing; duplicate contracts & suppliers",
      "Inconsistent quotation and quality comparison",
      "Limited spend and renewal visibility; reactive repairs and maintenance"],
    "after":[
      "Central procurement function; Procurement Policy & SOP; Authority Approval Matrix",
      "Consolidated purchasing volumes; structured price-AND-quality quotation comparison",
      "Central contract, renewal, repair & maintenance management; preferred-supplier governance"],
    "impact":"Stronger buying power · lower unit cost · reduced duplication · cost predictability · standardized quality · better control. Documented reductions are conservative — current reporting captures major and regularly purchased high-value items."}'),

  (160, 'beforeafter',
   'Laboratory centralization',
   'Preferred laboratory partnerships have improved both purchasing economics and clinical consistency.',
   '{"beforeTitle":"Before — fragmented branch arrangements","afterTitle":"After — preferred-lab partnership model","before":[
      "Frequent laboratory switching; fragmented branch-level negotiation",
      "Variable quality and turnaround; limited consolidated feedback",
      "Low corporate purchasing leverage"],
    "after":[
      "Three preferred laboratories shortlisted on doctor feedback, patient experience, quality, turnaround and price",
      "Corporate-level negotiation using consolidated case volumes",
      "More consistent clinical coordination & accountability; better pricing via group purchasing power"],
    "impact":"Improved laboratory pricing · reduced remakes & quality variation · more predictable turnaround · stronger supplier accountability · better margin control on lab-dependent treatments"}'),

  (170, 'beforeafter',
   'Shared services & structural cost optimization',
   'Centralized shared services have reduced duplication and increased productivity across the network.',
   '{"beforeTitle":"Before — each branch its own back office","afterTitle":"After — one shared platform for the network","before":[
      "Separate accountants, IT support and marketing coordination per branch",
      "Reception & patient-support resources working in isolation",
      "Independent procurement, supplier & maintenance handling",
      "Limited ability to redeploy nurses and staff according to demand"],
    "after":[
      "Centralized finance, IT support, marketing coordination & lead management",
      "One Patient Experience leadership structure; shared HR & PMO infrastructure",
      "Central procurement & contract management; common clinical & nursing governance",
      "Cross-branch deployment & workforce optimization"],
    "impact":"Avoided duplication of roles & support contracts · lower overhead per clinic · improved workforce productivity & span of control · better purchasing leverage · scalable central platform"}'),

  (180, 'stats',
   'AMC — a signal of how we think about capital',
   'We converted underutilized space into a productive group asset — one footprint, two productive uses, zero avoidable overhead.',
   '{"stats":[
      {"value":"1 footprint","label":"The asset","note":"Owned clinical space at AMC — previously underutilized"},
      {"value":"2 productive uses","label":"The unlock","note":"Growing clinic operations + a group operational hub in the same footprint"},
      {"value":"0 rent added","label":"The signal","note":"Separate office cost avoided — capital discipline in action"}
   ]}'),

  (190, 'columns',
   'The investor value bridge',
   'Four value drivers, each with finance-reported or documented proof.',
   '{"columns":[
      {"title":"01 · Growth — +7.5%","subtitle":"Like-for-like revenue FY2024 → FY2025 · AED 6.56M → 7.05M","lines":[
        "Three clinics now contributing group revenue",
        "DN Al Wasl reopened Jun 2025 — excluded from LFL (no reliable FY2024 baseline)",
        "Expanding specialty capacity — new pediatric and prosthodontics pathways"]},
      {"title":"02 · Margin — 3.0×","subtitle":"Net-margin uplift at Dr Tosun · 4.5% → 13.8% H1 2026 · finance-reported","lines":[
        "Gross margin 38.2% → 42.2% (finance-reported)",
        "Lab spend −49.9% (AED 185,232 saved) · admin costs −10.2%",
        "Pricing, bundles & commission governance driving realization"]},
      {"title":"03 · Operating leverage — AED 2.7M","subtitle":"Cumulative 3-year structural saving from centralized shared services","lines":[
        "23% documented procurement reduction",
        "Preferred-lab partnerships negotiated at group level",
        "Every new clinic inherits the cost base, not creates its own"]},
      {"title":"04 · Scalability — 4 months","subtitle":"From AMC acquisition to first profitable month · finance-reported","lines":[
        "New-Clinic Integration & Commissioning Framework",
        "Repeatable at each future acquisition",
        "Institutional know-how documented and governed — ready for national expansion"]}
   ]}'),

  (200, 'columns',
   'The next chapter — scale',
   'The platform is built. Ready to scale.',
   '{"columns":[
      {"title":"01 · Same-store growth","lines":[
        "Extend Dr Tosun''s finance-reported margin trajectory (13.8% net · H1 2026)",
        "Bring DN Al Wasl to platform performance (gross 18.8% H1 2026)",
        "Grow AMC beyond monthly break-even",
        "Expand specialty capacity across the network"]},
      {"title":"02 · New clinics — M&A + de novo","lines":[
        "M&A — acquire existing clinics & integrate via the platform",
        "De novo — build new clinics on the platform from day one",
        "Both paths use the New-Clinic Integration & Commissioning Framework and inherit the group''s cost base & supplier terms"]},
      {"title":"03 · Margin expansion","lines":[
        "Deepen the 23% procurement reduction across categories",
        "Extend the AED 185,232/yr lab-cost model group-wide",
        "Full realization of the AED 888k–906k/yr centralization saving",
        "Extend pricing, discount & commission governance to new clinics"]},
      {"title":"04 · Platform depth","lines":[
        "Advance analytics across CRM, EMR & finance",
        "Deepen the AI-enabled patient journey",
        "Institutionalize the know-how framework",
        "Investor-grade reporting as the operating rhythm"]}
   ]}'),

  (210, 'quote',
   '',
   '',
   '{"text":"The platform is built. The proof is documented. The next chapter is scale."}');
end $$;

-- 4 ── Ms Shadi — Operations Director ---------------------------------------
-- Viewer base role + the operations tab grant, which is also the edit right
-- on this report. Password is a starter credential — change it from the
-- Users tab after first login.

insert into lane_e.dashboard_users (name, password, base_role, extra_tabs, active, note)
select 'Ms Shadi', 'DN-Shadi-Ops-2026', 'viewer', array['operations'], true,
       'Operations Director — owns and edits the Head of Operations report'
where not exists (select 1 from lane_e.dashboard_users where name = 'Ms Shadi');
