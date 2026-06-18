-- ============================================================================
-- CRM — Zavis — schema (CRM tab + admin CSV re-ingest)
--
-- Lives in the SAME dedicated `lane_e` schema as the Lane E report (one app,
-- one namespaced schema, one service-role client). NOTE: these tables are
-- ALREADY APPLIED to the live lane_e schema and loaded with data — this file
-- exists only so the schema is version-controlled.
--
-- Security posture matches the rest of Lane E: RLS ENABLED with NO policies.
-- The app only ever uses the service-role key server-side (service role bypasses
-- RLS), so anon/authenticated can read nothing. Do NOT add permissive policies.
-- ============================================================================

create schema if not exists lane_e;
set search_path = lane_e, public;

-- ===== Appointments — one row per Zavis appointment =======================
create table if not exists lane_e.crm_appointments (
  appointment_id        bigint primary key,
  platform_id           text,
  account_id            text,
  status                text,            -- booked|confirmed|completed|cancel|requested
  source                text,            -- platform|widget|crm|aiAgent
  platform              text,
  booking_mode          text,
  timeslot              timestamptz,
  duration_minutes      int,
  services              text,
  complaint             text,
  remarks               text,
  amount                numeric,
  currency              text,
  created_at            timestamptz,
  updated_at            timestamptz,
  patient_id            text,
  patient_platform_id   text,
  patient_name          text,
  patient_gender        text,
  patient_phone         text,
  professional_id       text,
  professional_name     text,
  professional_type     text,
  professional_department text,
  is_test               boolean not null default false,
  ingested_at           timestamptz not null default now()
);
alter table lane_e.crm_appointments enable row level security;

-- ===== Conversation summary — singleton reporting-period rollup ===========
create table if not exists lane_e.crm_conversation_summary (
  id                       int primary key default 1,
  period_start             date,
  period_end               date,
  conversations            int,
  messages_received        int,
  messages_sent            int,
  resolution_count         int,
  avg_first_response_text  text,
  avg_resolution_text      text,
  avg_waiting_text         text,
  avg_first_response_hours numeric,
  avg_resolution_hours     numeric,
  avg_waiting_hours        numeric,
  uploaded_at              timestamptz not null default now(),
  constraint crm_conversation_summary_singleton check (id = 1)
);
alter table lane_e.crm_conversation_summary enable row level security;

-- ===== Conversation traffic — conversations per (date, hour) ==============
create table if not exists lane_e.crm_conversation_traffic (
  date          date not null,
  hour          int not null,
  conversations int,
  uploaded_at   timestamptz not null default now(),
  primary key (date, hour)
);
alter table lane_e.crm_conversation_traffic enable row level security;
