-- Al Maher (AMC) month-to-date files from Dr Luvi (30 Oct 2026). Daily
-- "Report dd.mm.yyyy" tabs only start in November, so October arrives as one
-- month-to-date file. Additive: the reader treats a missing table as no file.
-- Totals per doctor only: no patient names, phone numbers or file numbers.
-- doctors = {"<doctor>": {"patients": n, "amount": aed}}.
begin;

create table lane_e.amc_month_report (
  covers_from date primary key,
  covers_to date not null check (covers_to >= covers_from),
  patients integer check (patients >= 0),
  patients_old integer check (patients_old >= 0),
  patients_new integer check (patients_new >= 0),
  amount_total numeric(14, 2),
  doctors jsonb not null default '{}'::jsonb,
  source text not null,
  loaded_at timestamptz not null default now()
);

alter table lane_e.amc_month_report enable row level security;
grant select, insert, update, delete on lane_e.amc_month_report to service_role;

commit;
