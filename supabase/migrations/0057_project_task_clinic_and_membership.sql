-- Ms Shadi (17 Nov 2026): follow each plan clinic by clinic, and count Smile
-- Club members from the membership admin, not the lead tracker.
--
-- 1. lane_e.project_tasks.clinic: which clinic a task belongs to (null = all
--    clinics). Lets the Google Business Profile page filter Ms Shadi's GBP
--    plan by clinic.
-- 2. lane_e.sc_membership_snapshots: one row per day read from the Smile Club
--    membership admin (smileclub.dentalnation.com/admin): totals and a
--    members list WITHOUT names, phones or emails (member ID, plan, amount,
--    partner code, dates only). The admin has no export or API yet, so rows
--    are entered from a read of the page.
-- Additive and idempotent.
alter table lane_e.project_tasks add column if not exists clinic text
  check (clinic is null or clinic in ('dental-nation', 'dr-tosun', 'al-maher'));

create table if not exists lane_e.sc_membership_snapshots (
  day date primary key,
  active_members int,
  monthly_revenue_aed numeric,
  incomplete_applications int,
  upcoming_appointments int,
  members jsonb not null default '[]'::jsonb,
  source text not null default 'membership admin',
  created_at timestamptz not null default now()
);
alter table lane_e.sc_membership_snapshots enable row level security;
grant select, insert, update, delete on lane_e.sc_membership_snapshots to service_role;
