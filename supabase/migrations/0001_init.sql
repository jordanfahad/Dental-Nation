-- ============================================================================
-- Lane E Daily Control Report — initial schema (§7)
-- Three-layer model: bronze (raw sheet mirrors) → silver (canonical) → gold
-- (precomputed daily snapshot the UI reads). The UI never reads Google directly
-- and never computes heavy aggregates at request time.
--
-- NOTE: this lives in a DEDICATED `lane_e` schema, NOT `public`. The Dental
-- Nation Supabase project's `public` schema already hosts another app (a
-- projects/tasks/components tracker) AND a differently-shaped `daily_snapshot`,
-- so namespacing avoids any collision and leaves existing data untouched. The
-- app's Supabase client sets `db.schema = 'lane_e'`. The schema must also be
-- added to the project's PostgREST "Exposed schemas" (see BUILD_NOTES).
-- ============================================================================

create schema if not exists lane_e;
set search_path = lane_e, public;

-- ===== BRONZE: raw sheet mirrors ==========================================
-- One table per source. Every row stored as jsonb keyed by header so nothing is
-- lost and re-normalisation never needs a re-fetch. Each truncated + reloaded
-- every sync. Column types here are deliberately uniform across sources.

create table if not exists raw_lead_tracker (
  id        bigint generated always as identity primary key,
  row_index int not null,
  data      jsonb not null,
  synced_at timestamptz not null default now()
);
create table if not exists raw_social_pr (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_gmb_form (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_shoot_calendar (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_tasks (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_raw_social (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_performance (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_amc_checklist (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_zavis (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);
create table if not exists raw_captions (
  id bigint generated always as identity primary key,
  row_index int not null, data jsonb not null, synced_at timestamptz not null default now()
);

-- ===== SILVER: canonical entities =========================================

-- The lead/inquiry fact table — the spine of the funnel (§D) and §C tracking.
create table if not exists leads (
  id                  text primary key,
  source_sheet        text not null,
  lane                text default 'Lane E',
  offer               text default 'DN Glow Up',
  cta                 text default 'Book The DN Glow Up',
  clinic              text,
  doctor              text,
  channel_source      text,
  medium              text,
  campaign_name       text,
  creative_id         text,
  utm_source          text,
  utm_medium          text,
  utm_campaign        text,
  utm_content         text,
  utm_term            text,
  landing_page_url    text,
  whatsapp_ref        text,
  call_tracking_no    text,
  inquiry_date        date,
  booking_date        date,
  appointment_date    date,
  pac_owner           text,
  booking_status      text,
  is_qualified        boolean,
  treatment_signal    text,
  proof_captured      boolean,
  review_captured     boolean,
  is_attributed       boolean generated always as (
                        channel_source is not null and channel_source <> ''
                      ) stored,
  raw_row             jsonb,
  synced_at           timestamptz not null default now()
);
create index if not exists leads_inquiry_date_idx on leads (inquiry_date);
create index if not exists leads_channel_source_idx on leads (channel_source);
create index if not exists leads_booking_status_idx on leads (booking_status);

-- Channel activation status (§B) — one row per canonical channel.
create table if not exists channel_status (
  channel             text primary key,
  is_live             boolean,
  content_populated   boolean,
  cta_correct         boolean,
  destination_correct boolean,
  tracking_active     boolean,
  owner               text,
  blocker             text,
  updated_at          timestamptz default now()
);

-- Content / creative performance (§E).
create table if not exists content_items (
  id           text primary key,
  title        text,
  channel      text,
  link         text,
  objective    text,
  content_type text,
  audience     text,
  cta          text,
  perf_note    text,
  issue_note   text,
  status       text,
  synced_at    timestamptz default now()
);

-- PAC / WhatsApp / call feedback (§F).
create table if not exists pac_feedback (
  report_date            date primary key,
  whatsapp_inquiries     int,
  calls                  int,
  avg_response_minutes   numeric,
  missed_inquiries       int,
  bookings_created       int,
  top_questions          text[],
  top_objections         text[],
  main_no_booking_reason text,
  script_issue           text,
  content_needed         text,
  synced_at              timestamptz default now()
);

-- Blockers & fixes (§G).
create table if not exists blockers (
  id        text primary key,
  blocker   text,
  type      text,
  impact    text,
  owner     text,
  fix       text,
  due_time  text,
  status    text,
  synced_at timestamptz default now()
);

-- ===== GOLD: the precomputed daily snapshot the UI reads ==================
create table if not exists daily_snapshot (
  report_date          date primary key,
  -- Executive (§A)
  decision             text,
  decision_reason      text,
  best_channel         text,
  worst_channel        text,
  main_bottleneck      text,
  founder_decision     text,
  -- Funnel (§D) and channel mixes stored as jsonb
  funnel               jsonb,
  inquiries_by_channel jsonb,
  bookings_by_channel  jsonb,
  qualified_by_channel jsonb,
  -- Derived rates
  lead_to_booking_rate numeric,
  cost_per_inquiry     numeric,
  cost_per_booking     numeric,
  show_rate            numeric,
  -- Health
  unattributed_leads   int,
  data_gaps            jsonb,
  computed_at          timestamptz default now()
);

-- ===== Sync health log ====================================================
create table if not exists ingestion_log (
  id            bigint generated always as identity primary key,
  started_at    timestamptz not null,
  finished_at   timestamptz,
  status        text,
  sheets_ok     text[],
  sheets_failed text[],
  rows_ingested int,
  data_gaps     jsonb,
  error         text
);
create index if not exists ingestion_log_finished_at_idx on ingestion_log (finished_at desc);

-- ===== Grants: the app uses the service-role key (bypasses RLS) ============
grant usage on schema lane_e to service_role, anon, authenticated;
grant all privileges on all tables in schema lane_e to service_role;
alter default privileges in schema lane_e grant all on tables to service_role;
