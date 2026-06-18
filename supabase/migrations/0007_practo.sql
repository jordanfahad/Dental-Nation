-- Practo Insta (HMS) live API. Token is short-lived (~21 days): we cache it and
-- re-login only on expiry / code 1001. Bills land in a shape-agnostic bronze
-- table first (the real response shape is confirmed via /api/practo/probe, then
-- amount/date are normalized). Read via the service role (RLS on; bypassed).
create table if not exists lane_e.practo_token (
  id           integer primary key default 1,
  token        text,
  obtained_at  timestamptz,
  expires_at   timestamptz,
  constraint practo_token_singleton check (id = 1)
);

create table if not exists lane_e.practo_bills_raw (
  bill_key     text primary key,
  bill_date    date,
  amount       numeric,
  data         jsonb not null,
  fetched_at   timestamptz not null default now()
);
create index if not exists idx_practo_bills_date on lane_e.practo_bills_raw (bill_date);

alter table lane_e.practo_token     enable row level security;
alter table lane_e.practo_bills_raw enable row level security;
