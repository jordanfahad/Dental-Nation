-- Smile Club corporate pipeline (25 Sep): Gautam's company list and the
-- follow-ups imported from his calendar file. Only calendar entries named
-- "SC – Company – …" or naming a pipeline company are stored — never the rest
-- of his calendar, attendees or descriptions.
create table if not exists lane_e.sc_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'unsorted',
  area text,
  staff_band text,
  source text,
  stage text not null default 'target',
  next_step text,
  next_date date,
  members integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
create unique index if not exists sc_companies_name_idx on lane_e.sc_companies (lower(name));

create table if not exists lane_e.sc_calendar_events (
  id bigserial primary key,
  uid text not null unique,
  owner text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  title text not null,
  location text,
  company_id uuid references lane_e.sc_companies(id) on delete set null,
  kind text not null default 'other',
  task_key text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by text
);
create index if not exists sc_calendar_events_start_idx on lane_e.sc_calendar_events (starts_at);

alter table lane_e.sc_companies enable row level security;
alter table lane_e.sc_calendar_events enable row level security;
