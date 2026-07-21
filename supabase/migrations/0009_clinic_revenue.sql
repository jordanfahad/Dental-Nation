-- Historical revenue for the three group clinics (Dr Tosun, Al Maher / AMC,
-- Dental Nation Al Wasl), imported from each clinic's own PMS export. These are
-- STATIC snapshots (not live feeds). Stored pre-aggregated at
-- clinic x (year, month) x doctor x department x payer x metric grain.
--
-- metric distinguishes what the money means, because the sources differ:
--   'collected' = cash actually received (Dr Tosun payments, Al Wasl receipts)
--   'billed'    = gross charges billed (Al Maher treatments, ~99.8% insurance)
-- period_label carries a human bucket (e.g. '2020-2025') for the one Al Maher
-- file that spans several years with no per-row service date.
--
-- The row data is loaded separately by supabase/seed/clinic_revenue_data.sql.
create table if not exists lane_e.clinic_revenue_raw (
  id             bigint generated always as identity primary key,
  clinic         text    not null,               -- dr-tosun | al-maher | dn-alwasl
  metric         text    not null,               -- collected | billed
  period_label   text,                           -- e.g. '2024' or '2020-2025'
  txn_year       int,                            -- null when undatable (AMC multi-year file)
  txn_month      text,                           -- 'YYYY-MM' when known, else null
  doctor         text,
  department     text,
  payer          text,                           -- CASH/INSURANCE | Cash/Card/Cheque | payment mode
  gross          numeric not null default 0,     -- revenue amount (collected or billed)
  patient_share  numeric,                        -- AMC: patient co-pay portion
  insurance_net  numeric,                        -- AMC: insurer-paid portion
  txn_count      int     not null default 0,     -- transactions/receipts/lines rolled into this row
  patient_count  int,                            -- distinct patients in this group
  loaded_at      timestamptz not null default now()
);

alter table lane_e.clinic_revenue_raw enable row level security;  -- service-role read only, mirrors other lane_e tables

create index if not exists clinic_revenue_raw_clinic_year_idx
  on lane_e.clinic_revenue_raw (clinic, txn_year);

comment on table lane_e.clinic_revenue_raw is
  'Static historical revenue for the three group clinics (Dr Tosun, Al Maher/AMC, Dental Nation Al Wasl), imported from each clinic''s PMS export and pre-aggregated. metric=collected|billed because sources differ.';
