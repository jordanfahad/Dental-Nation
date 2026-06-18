-- GA4 website summary (single-row, current "last N days" rolling window).
-- Decoupled from the per-date paid daily_snapshot because GA4 is current
-- through today while the paid sheet is stale. Applied to the live lane_e schema.
create table if not exists lane_e.ga4_summary (
  id               int primary key default 1,
  period_start     date,
  period_end       date,
  sessions         int,
  users            int,
  new_users        int,
  conversions      int,
  engaged_sessions int,
  leads            int,                                   -- on-site generate_lead conversions
  channels         jsonb not null default '[]'::jsonb,   -- [{channel, sessions, conversions}]
  onsite_funnel    jsonb not null default '[]'::jsonb,   -- [{key, label, count, conversionFromPrev}]
  computed_at      timestamptz not null default now(),
  constraint ga4_summary_singleton check (id = 1)
);
alter table lane_e.ga4_summary enable row level security;
