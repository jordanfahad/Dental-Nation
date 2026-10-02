-- Competitor analysis (2 Oct): one snapshot per competitor domain per refresh,
-- built from DataForSEO (search traffic by market, branded search, backlinks).
-- Refreshed weekly by the sync cron; the Digital & SEO › Competitor analysis
-- sub-tab reads the latest row per domain.
create table if not exists lane_e.competitor_snapshots (
  id bigserial primary key,
  domain text not null,
  fetched_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists competitor_snapshots_domain_idx on lane_e.competitor_snapshots (domain, fetched_at desc);

alter table lane_e.competitor_snapshots enable row level security;
