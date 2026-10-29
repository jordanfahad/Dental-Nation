-- Clinic Activation report sources (Dr Luvi, Oct 2026). NOT applied by the
-- build: apply once before (or right after) deploying the sync change. Until
-- then the sync records a data gap for each source, not a failed source.
-- Aggregates only: no patient names, phone numbers or file numbers are stored.
begin;

-- The "GMB" tab of the Inhouse Lead Tracker is overwritten daily by the front
-- office, so the sync snapshots it: one row per Dubai sync day and clinic,
-- upserted so the latest sync of the day wins.
create table lane_e.gmb_frontoffice_daily (
  snapshot_day date not null,
  clinic text not null check (clinic in ('dental-nation', 'dr-tosun', 'al-maher')),
  branch_label text not null,
  fo_name text,
  reviews_today integer check (reviews_today >= 0),
  reviews_individual integer check (reviews_individual >= 0),
  reviews_total integer check (reviews_total >= 0),
  photos integer check (photos >= 0),
  videos integer check (videos >= 0),
  month_title text,
  source_row integer,
  synced_at timestamptz not null default now(),
  primary key (snapshot_day, clinic)
);

-- Dr Luvi's "Revenue AMC" spreadsheet: one "Report dd.mm.yyyy" tab per day.
-- Null = not in the sheet (never 0). doctors = {"<doctor>": {"invoices": n, "amount": aed}}.
create table lane_e.amc_daily_report (
  report_date date primary key,
  sheet_date date,
  total_appointments integer check (total_appointments >= 0),
  consulted integer check (consulted >= 0),
  invoiced integer check (invoiced >= 0),
  non_invoiced integer check (non_invoiced >= 0),
  cancelled integer check (cancelled >= 0),
  patients_old integer check (patients_old >= 0),
  patients_new integer check (patients_new >= 0),
  invoice_amount_total numeric(14, 2),
  insurance_total numeric(14, 2),
  copay_total numeric(14, 2),
  cash_total numeric(14, 2),
  card_total numeric(14, 2),
  advance_total numeric(14, 2),
  balance_total numeric(14, 2),
  invoice_count integer check (invoice_count >= 0),
  doctors jsonb not null default '{}'::jsonb check (jsonb_typeof(doctors) = 'object'),
  prepared_by text,
  source_tab text not null,
  synced_at timestamptz not null default now()
);

alter table lane_e.gmb_frontoffice_daily enable row level security;
alter table lane_e.amc_daily_report enable row level security;
revoke all on lane_e.gmb_frontoffice_daily, lane_e.amc_daily_report from public, anon, authenticated;
grant select, insert, update, delete on lane_e.gmb_frontoffice_daily, lane_e.amc_daily_report to service_role;
commit;
