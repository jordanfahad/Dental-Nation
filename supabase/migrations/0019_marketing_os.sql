-- Marketing OS module (build spec, 31 Jul 2026): report the Zavis-built
-- Marketing OS as five operating pipelines, each in three layers —
-- Built → Activated → Outcome — where ONLY Outcome joins the Benchmark KPIs.
-- Build volume is never presented as performance.
--
-- House deviations from the spec's draft DDL, for consistency with lane_e:
--   - identity bigints instead of uuids (internal surrogate keys);
--   - text slugs as the stable join keys (code + seed reference them);
--   - benchmark_kpi_key TEXT referencing config/kpi-benchmarks.ts keys
--     (the Benchmark tab's KPI ids live in code, not in a table);
--   - the clinical-reviewer rule is ALSO a DB check, not just app logic.

-- ── Pipelines ───────────────────────────────────────────────────────────────
create table if not exists lane_e.mos_pipelines (
  id bigint generated always as identity primary key,
  slug text unique not null,           -- organic | smile-club | creative | crm | infra
  name text not null,
  owner text not null,                 -- DN-Marketing | DN-Clinical | DN-Sales | Zavis
  status text not null default 'amber' check (status in ('green','amber','red')),
  critical_dependency text,
  blocker_owner text,                  -- every red MUST name one (enforced below)
  blocked_since date,
  sort int not null default 0,
  -- Design principle 2: no orphan reds.
  check (status <> 'red' or blocker_owner is not null)
);

-- ── KPI definitions (three layers; thresholds set NOW, per the spec) ────────
create table if not exists lane_e.mos_kpis (
  id bigint generated always as identity primary key,
  pipeline_slug text not null references lane_e.mos_pipelines(slug),
  slug text unique not null,
  layer text not null check (layer in ('built','activation','outcome')),
  metric text not null,
  unit text,                           -- count | pct | aed | days | hours | x | bool
  target numeric,
  threshold_red numeric,
  threshold_green numeric,
  -- Judgement direction: 'higher' = green when value >= threshold_green;
  -- 'lower' = green when value <= threshold_green (cycle times, opt-outs…).
  better text not null default 'higher' check (better in ('higher','lower')),
  -- Design principle 3: no parallel KPI universe — every outcome metric maps
  -- to an existing Benchmark KPI id (config/kpi-benchmarks.ts key).
  benchmark_kpi_key text,
  guard_metric boolean not null default false,
  note text,
  sort int not null default 0,
  check (layer <> 'outcome' or benchmark_kpi_key is not null)
);

-- ── Time series (Phase 1: weekly manual entry via the admin form) ───────────
create table if not exists lane_e.mos_snapshots (
  id bigint generated always as identity primary key,
  kpi_slug text not null references lane_e.mos_kpis(slug),
  date date not null,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (kpi_slug, date)
);

-- ── Approval queue (two-track gate: SEO 3bd / Clinical 5bd) ─────────────────
create table if not exists lane_e.mos_approvals (
  id bigint generated always as identity primary key,
  pipeline_slug text not null references lane_e.mos_pipelines(slug),
  item_title text not null,
  item_url text,
  track text not null check (track in ('seo','clinical')),
  gate text,                           -- e.g. 'Gate 4 — Approve + schedule'
  submitted_at date not null,
  sla_days int not null,               -- 3 seo · 5 clinical
  reviewer_name text,                  -- doubles as the E-E-A-T reviewedBy source
  status text not null default 'pending' check (status in ('pending','approved','rejected','published')),
  decided_at date,
  published_at date,
  note text,
  -- Clinical content cannot be approved/published without a NAMED reviewer.
  check (not (track = 'clinical' and status in ('approved','published')
              and (reviewer_name is null or btrim(reviewer_name) = '')))
);

-- ── Management effort (a cost line, shown next to the Zavis fee) ────────────
create table if not exists lane_e.mos_effort (
  id bigint generated always as identity primary key,
  week_start date unique not null,
  hours_meetings numeric not null default 0,
  hours_reviews numeric not null default 0,
  hours_qa numeric not null default 0,
  rework_items int not null default 0,
  total_items int not null default 0,
  loaded_rate_aed numeric
);

-- ── Vendor + infra cost line ────────────────────────────────────────────────
create table if not exists lane_e.mos_costs (
  id bigint generated always as identity primary key,
  month date unique not null,          -- first of month
  zavis_fee_aed numeric,
  azure_cost_aed numeric,
  other_aed numeric,
  note text
);

alter table lane_e.mos_pipelines enable row level security;  -- service-role only, mirrors lane_e
alter table lane_e.mos_kpis      enable row level security;
alter table lane_e.mos_snapshots enable row level security;
alter table lane_e.mos_approvals enable row level security;
alter table lane_e.mos_effort    enable row level security;
alter table lane_e.mos_costs     enable row level security;

create index if not exists mos_snapshots_kpi_date_idx on lane_e.mos_snapshots (kpi_slug, date desc);
create index if not exists mos_approvals_status_idx on lane_e.mos_approvals (status, submitted_at);

comment on table lane_e.mos_pipelines is
  'Marketing OS pipelines (Organic Engine, Smile Club, Creative, CRM, Infra). Status is RAG; every red names a blocker owner. Powers Group → Marketing OS.';
comment on table lane_e.mos_kpis is
  'Marketing OS KPI definitions in three layers (built/activation/outcome). Outcome rows must reference a Benchmark KPI key — no parallel KPI universe.';
comment on table lane_e.mos_approvals is
  'Two-track content approval queue (SEO 3bd, Clinical 5bd). Clinical items need a named reviewer before approval — stored as the E-E-A-T reviewedBy source.';

-- ═══════════════════════════ Reference seed (from the build spec) ═══════════

insert into lane_e.mos_pipelines (slug, name, owner, status, critical_dependency, blocker_owner, blocked_since, sort) values
  ('organic',    'Organic Engine (pSEO + Content OS)', 'DN-Marketing', 'red',
   'Approval throughput', 'DN-Marketing + DN-Clinical', date '2026-06-12', 1),
  ('smile-club', 'Smile Club',                          'DN-Sales',     'amber',
   'Corporate selling motion', 'DN-Sales', null, 2),
  ('creative',   'Creative Pipeline',                   'DN-Marketing', 'amber',
   'Posting cadence + video hire', 'DN-Marketing', null, 3),
  ('crm',        'CRM & Segments',                      'DN-Marketing', 'amber',
   'Creative plug-in date', 'DN-Marketing', null, 4),
  ('infra',      'Infrastructure & Ownership',          'Zavis',        'amber',
   'Access confirmations', 'Zavis', null, 5)
on conflict (slug) do nothing;

-- KPI definitions. Thresholds are the spec's 90-day bars, set now.
insert into lane_e.mos_kpis
  (pipeline_slug, slug, layer, metric, unit, target, threshold_red, threshold_green, better, benchmark_kpi_key, guard_metric, note, sort) values
  -- Organic Engine — built
  ('organic', 'org.built_pages',        'built', 'pSEO pages generated (claimed)', 'count', null, null, null, 'higher', null, false, 'Claimed by Zavis — unverified in Search Console (standing ask #1)', 1),
  ('organic', 'org.built_runs_active',  'built', 'Content OS runs active', 'count', null, null, null, 'higher', null, false, null, 2),
  ('organic', 'org.built_runs_backlog', 'built', 'Content OS runs in backlog', 'count', null, null, null, 'higher', null, false, '4 series: Protocols, State of Dentistry, Frontiers, Advances', 3),
  -- Organic Engine — activation
  ('organic', 'org.published_week',     'activation', 'Published per week', 'count', 4, 0, 4, 'higher', null, false, 'Target 4/wk editorial by day 30. Zero at day 30 = process failure (owner: DN approval track)', 10),
  ('organic', 'org.cycle_time',         'activation', 'Gate-to-gate cycle time (median days)', 'days', null, null, null, 'lower', null, false, null, 11),
  ('organic', 'org.pseo_indexed_rate',  'activation', 'pSEO indexed ÷ published', 'pct', 0.6, 0.2, 0.4, 'higher', null, false, '≥40% by day 90; <20% = liability, begin prune/noindex', 12),
  ('organic', 'org.pseo_impression28',  'activation', '% indexed pages with ≥1 impression in 28d', 'pct', null, null, null, 'higher', null, false, 'Needs GSC access (standing ask #1)', 13),
  ('organic', 'org.pseo_click28',       'activation', '% indexed pages with ≥1 click in 28d', 'pct', 0.15, null, 0.15, 'higher', null, false, '≥15% of indexed pages with a click by day 90', 14),
  ('organic', 'org.zero_impression90',  'activation', 'Zero-impression pages at 90d (prune queue)', 'count', null, null, null, 'lower', null, false, null, 15),
  ('organic', 'org.clinical_coverage',  'activation', 'Clinical-required pages with named reviewer', 'pct', 1, null, 1, 'higher', null, false, 'The E-E-A-T asset: reviewedBy schema property', 16),
  -- Organic Engine — outcome (joins the Benchmark)
  ('organic', 'org.out_conv',    'outcome', 'Organic session → enquiry', 'pct', null, null, null, 'higher', 'pseo.conv', false, null, 20),
  ('organic', 'org.out_ai_conv', 'outcome', 'AI session → enquiry', 'pct', null, null, null, 'higher', 'aiseo.conv', false, null, 21),
  ('organic', 'org.out_assisted','outcome', 'Assisted conversions from content pages', 'count', null, null, null, 'higher', 'pseo.sessions', false, 'Reports against organic-traffic context — no dedicated benchmark row yet (Phase 2 GA4 feed)', 22),

  -- Smile Club — built
  ('smile-club', 'sc.built_live', 'built', 'Product live (AED 69/mo · AED 799/yr, OTP join flow)', 'bool', 1, null, 1, 'higher', null, false, 'Status corrected: BUILT AND LIVE — the dependency is sales execution', 1),
  -- Smile Club — activation
  ('smile-club', 'sc.corp_contacted', 'activation', 'Corporate: companies contacted (wk)', 'count', null, null, null, 'higher', null, false, null, 10),
  ('smile-club', 'sc.corp_meetings',  'activation', 'Corporate: meetings held (wk)', 'count', null, null, null, 'higher', null, false, null, 11),
  ('smile-club', 'sc.corp_proposals', 'activation', 'Corporate: proposals in market', 'count', 3, null, 3, 'higher', null, false, '≥3 in market by day 30', 12),
  ('smile-club', 'sc.corp_signed',    'activation', 'Corporate accounts signed', 'count', 1, null, 1, 'higher', null, false, 'First corporate account by day 60', 13),
  ('smile-club', 'sc.join_conv',      'activation', 'Join page → OTP completed', 'pct', null, null, null, 'higher', null, false, 'Phase 2: join-funnel events from the Smile Club flow', 14),
  ('smile-club', 'sc.pitch_rate',     'activation', 'Front-desk pitch rate (eligible patients offered)', 'pct', null, null, null, 'higher', null, false, null, 15),
  -- Smile Club — outcome
  ('smile-club', 'sc.out_members',    'outcome', 'Paying members', 'count', 150, 50, 150, 'higher', 'sc10.members', false, '90-day bar: 150 members ≈ AED 10K MRR. <50 = demand/pitch failure, not build failure', 20),
  ('smile-club', 'sc.out_mrr',        'outcome', 'MRR (AED)', 'aed', 10000, null, 10000, 'higher', 'sc10.members', false, null, 21),
  ('smile-club', 'sc.out_retention',  'outcome', 'Annual retention', 'pct', null, null, null, 'higher', 'sc10.retention', false, null, 22),
  ('smile-club', 'sc.out_redemption', 'outcome', 'Benefit redemption rate', 'pct', null, null, null, 'higher', 'sc10.redemption', false, null, 23),
  ('smile-club', 'sc.out_member_show','outcome', 'Member show rate (vs non-member)', 'pct', null, null, null, 'higher', 'sc10.showrate', false, 'Cohort split on Motion 8', 24),
  ('smile-club', 'sc.out_corp',       'outcome', 'Corporate accounts / seats', 'count', null, null, null, 'higher', 'sc10.corp', false, null, 25),

  -- Creative — built
  ('creative', 'cr.built_static', 'built', 'Creative Studio (static from segments) operational', 'bool', 1, null, 1, 'higher', null, false, null, 1),
  ('creative', 'cr.built_video',  'built', 'Video pipeline operational', 'bool', 1, null, 1, 'higher', null, false, 'Not operational — Hashi on trial as Content Creator / Video Editor', 2),
  -- Creative — activation
  ('creative', 'cr.utilization',   'activation', 'Creatives shipped ÷ generated (utilization)', 'pct', 0.5, null, 0.5, 'higher', null, false, 'The honest number — a factory producing faster than we publish', 10),
  ('creative', 'cr.posts_week',    'activation', 'Organic posts/week (all channels vs calendar)', 'count', 5, null, 5, 'higher', null, false, '≥5/week sustained by day 30', 11),
  ('creative', 'cr.video_shipped', 'activation', 'Video assets shipped (cumulative)', 'count', 4, null, 4, 'higher', null, false, 'First 4 videos live by day 45', 12),
  ('creative', 'cr.brief_days',    'activation', 'Brief → publish (days)', 'days', null, null, null, 'lower', null, false, null, 13),
  ('creative', 'cr.hashi_decision','activation', 'Hashi trial decision logged', 'bool', 1, null, 1, 'higher', null, false, 'Keep/release decision must be logged by trial end date', 14),
  -- Creative — outcome
  ('creative', 'cr.out_engage',   'outcome', 'Organic engagement ÷ reach', 'pct', null, null, null, 'higher', 'sg.engage', false, null, 20),
  ('creative', 'cr.out_meta_ctr', 'outcome', 'Meta CTR — creative test cell', 'pct', null, null, null, 'higher', 'so.ctr', false, 'Creative-driven vs generic creative CPA (test cell)', 21),
  ('creative', 'cr.out_meta_cpl', 'outcome', 'Meta CPL — creative test cell', 'aed', null, null, null, 'lower', 'so.cpl', false, null, 22),

  -- CRM & Segments — built
  ('crm', 'crm.built_segments', 'built', 'Segments built (WhatsApp 25 + performance 80)', 'count', null, null, null, 'higher', null, false, null, 1),
  -- CRM & Segments — activation
  ('crm', 'crm.segments_used', 'activation', 'Segments in live use (30d)', 'count', 10, null, 10, 'higher', null, false, '105 built and 3 used is a scoping problem — name it. Target ≥10 by day 45', 10),
  ('crm', 'crm.broadcasts_week','activation', 'Broadcasts sent/week', 'count', null, null, null, 'higher', null, false, null, 11),
  ('crm', 'crm.launch_days',   'activation', 'Campaign launch lead time (days)', 'days', null, null, null, 'lower', null, false, 'Segment selected → live', 12),
  ('crm', 'crm.sync_lag',      'activation', 'PMS → platform sync lag (hours)', 'hours', null, null, null, 'lower', null, false, null, 13),
  ('crm', 'crm.optout_rate',   'activation', 'WhatsApp opt-out rate per broadcast', 'pct', 0.01, 0.02, 0.01, 'lower', null, true, 'KILL-SWITCH: >2% opt-out on any single broadcast pauses the segment', 14),
  -- CRM & Segments — outcome
  ('crm', 'crm.out_react_rev', 'outcome', 'Reactivation revenue (AED)', 'aed', null, null, null, 'higher', 'crm.react.revenue', false, 'First reactivation campaign revenue attributed by day 30', 20),
  ('crm', 'crm.out_cpb',       'outcome', 'Cost per reactivated booking', 'aed', null, null, null, 'lower', 'crm.react.cpb', false, null, 21),
  ('crm', 'crm.out_share',     'outcome', 'CRM share of total bookings', 'pct', null, null, null, 'higher', 'crm.share', false, null, 22),

  -- Infrastructure — built (mostly binary checklist)
  ('infra', 'inf.azure_admin',   'built', 'Azure tenant admin access held by DN', 'bool', 1, null, 1, 'higher', null, false, null, 1),
  ('infra', 'inf.data_ip',       'built', 'Data + IP confirmed in DN tenant (written)', 'bool', 1, null, 1, 'higher', null, false, null, 2),
  ('infra', 'inf.mirror_fixed',  'built', 'Vendor-domain mirror noindexed / sunset agreed', 'bool', 1, null, 1, 'higher', null, false, 'dn-concierge.zavisinternaltools.in currently index,follow with canonical only — mitigated, not fixed', 3),
  ('infra', 'inf.domain_logged', 'built', 'Domain end-state decision logged (.com prod / .ae dev)', 'bool', 1, null, 1, 'higher', null, false, null, 4),
  -- Infrastructure — activation
  ('infra', 'inf.cost_share', 'activation', 'Infra cost as % of marketing spend', 'pct', null, null, null, 'lower', null, false, null, 10),
  ('infra', 'inf.uptime',     'activation', 'Uptime', 'pct', 0.999, null, 0.999, 'higher', null, false, null, 11),
  ('infra', 'inf.cwv_lcp',    'activation', 'LCP on key templates (s)', 'count', 2.5, 4, 2.5, 'lower', null, false, 'Core Web Vitals', 12)
on conflict (slug) do nothing;

-- Confirmed current-state snapshots (provenance in the note — never invented).
insert into lane_e.mos_snapshots (kpi_slug, date, value, note) values
  ('org.built_pages',        date '2026-07-31', 14000, 'Claimed by Zavis; unverified via GSC'),
  ('org.built_runs_active',  date '2026-07-31', 8,     'From Zavis status report'),
  ('org.built_runs_backlog', date '2026-07-31', 37,    'From Zavis status report'),
  ('org.published_week',     date '2026-07-31', 0,     'Zero published to date'),
  ('crm.built_segments',     date '2026-07-31', 105,   '25 WhatsApp + 80 performance segments deployed'),
  ('crm.segments_used',      date '2026-07-31', 3,     'From Zavis status; scoping problem vs 105 built'),
  ('sc.built_live',          date '2026-07-31', 1,     'AED 69/mo · AED 799/yr Essential tier, OTP join flow working'),
  ('cr.built_static',        date '2026-07-31', 1,     'Creative Studio generating static creatives from segments'),
  ('cr.built_video',         date '2026-07-31', 0,     'Video not operational — Hashi on trial'),
  ('inf.mirror_fixed',       date '2026-07-31', 0,     'index,follow with canonical only — mitigated, not fixed'),
  ('inf.domain_logged',      date '2026-07-31', 0,     'dentalnation.com (prod) vs dentalnation.ae (dev) end-state not logged')
on conflict (kpi_slug, date) do nothing;

-- Approval queue — current state. Ages for the six Gate-4 items are counted
-- from spec intake (31 Jul) because Zavis has not confirmed submission dates;
-- the true ages are LONGER, so the queue-age headline understates, honestly.
insert into lane_e.mos_approvals (pipeline_slug, item_title, track, gate, submitted_at, sla_days, status, note) values
  ('organic', 'Content OS run — stuck at Gate 2', 'seo', 'Gate 2', date '2026-06-12', 3, 'pending',
   'Stuck since 12 Jun 2026 (confirmed). Track to be confirmed at review — clinical series need a named clinical reviewer.'),
  ('organic', 'Content OS run 1 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.'),
  ('organic', 'Content OS run 2 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.'),
  ('organic', 'Content OS run 3 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.'),
  ('organic', 'Content OS run 4 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.'),
  ('organic', 'Content OS run 5 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.'),
  ('organic', 'Content OS run 6 (QA passed)', 'seo', 'Gate 4 — Approve + schedule', date '2026-07-31', 3, 'pending',
   'Submitted earlier — age counted from spec intake 31 Jul; Zavis to confirm actual date. Track to be confirmed.')
on conflict do nothing;
