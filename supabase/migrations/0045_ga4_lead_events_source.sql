create table if not exists lane_e.ga4_lead_events_source (
  day date not null,
  event_name text not null,
  source_medium text not null,
  campaign text not null default '(not set)',
  event_count integer not null default 0 check (event_count >= 0),
  fetched_at timestamptz not null default now(),
  primary key (day, event_name, source_medium, campaign)
);
alter table lane_e.ga4_lead_events_source enable row level security;
revoke all on lane_e.ga4_lead_events_source from anon, authenticated;
grant all on lane_e.ga4_lead_events_source to service_role;
