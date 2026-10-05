-- GA4 by device (5 Oct): day × operating system × device × channel × source/medium,
-- with sessions, users, key events and generate_lead counts. Lets the team check
-- which phones the website's visitors and leads come from (e.g. the iOS-only Meta
-- targeting) and what sits behind "(not set)". Aggregate only; refreshed by the
-- sync cron over a trailing window.
create table if not exists lane_e.ga4_device_daily (
  day date not null,
  os text not null,
  device text not null,
  channel text not null,
  source_medium text not null,
  sessions integer not null default 0,
  users integer not null default 0,
  key_events integer not null default 0,
  leads integer not null default 0,
  fetched_at timestamptz not null default now(),
  primary key (day, os, device, channel, source_medium)
);

alter table lane_e.ga4_device_daily enable row level security;
