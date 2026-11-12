-- Daily snapshot for Ms Shadi (12 Nov 2026): one short email with every
-- project's status, linking to /next/projects for the detail.
--
-- 1. lane_e.project_tasks: the execution plan's tasks (the CEO's 5 Nov plan),
--    one row per task, so their status is kept current in the database
--    (the daily project update writes here) without a deploy. Task text,
--    owner roles and dates only: no patient data, no contact details.
-- 2. The once-a-day claim accepts the new kind 'am:snapshot'.
-- Additive and idempotent.
create table if not exists lane_e.project_tasks (
  id text primary key,
  project text not null check (project in ('clinic-activation', 'gbp', 'ortho', 'smile-club')),
  channel text not null,
  task text not null,
  owner text not null,
  due date,
  status text not null default 'Not started'
    check (status in ('Not started', 'In progress', 'Done', 'Blocked', 'On hold')),
  note text,
  completed_on date,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
alter table lane_e.project_tasks enable row level security;
grant select, insert, update, delete on lane_e.project_tasks to service_role;

alter table lane_e.performance_email_claims drop constraint if exists performance_email_claims_kind_check;
alter table lane_e.performance_email_claims add constraint performance_email_claims_kind_check
  check (kind in ('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily', 'am:clinic-activation', 'am:ortho-weekly', 'am:snapshot'));
