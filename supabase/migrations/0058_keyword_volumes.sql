-- Google Ads Keyword Planner results (UAE search volumes and bid ranges) for
-- the lead-magnet site research (Fahad, 20 Nov 2026). Additive only.
create table if not exists lane_e.keyword_volumes (
  keyword text not null,
  geo text not null default 'AE',
  language text not null default 'en',
  source text not null check (source in ('historical', 'idea')),
  seed text,
  avg_monthly_searches integer,
  competition text,
  competition_index integer,
  low_bid numeric,
  high_bid numeric,
  monthly jsonb,
  fetched_at timestamptz not null default now(),
  primary key (keyword, geo, language, source)
);
alter table lane_e.keyword_volumes enable row level security;
