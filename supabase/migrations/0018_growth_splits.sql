-- Growth Platform splits (CEO request, 29 Jul):
--  1. ga4_summary.sources — sessions by sessionSource × sessionMedium, so the
--     Organic row can split into Organic SEO / AI Chat (ChatGPT, Claude,
--     Perplexity…) / Direct at the reach level.
--  2. meta_platform_insights_raw — Meta daily insights broken down by
--     publisher_platform (instagram / facebook / audience_network), so Paid
--     Social can split Meta into Instagram vs Facebook with real delivery
--     data instead of campaign-name guesses.
-- Both additive; existing rows and syncs are untouched.

alter table lane_e.ga4_summary
  add column if not exists sources jsonb not null default '[]'::jsonb; -- [{source, medium, sessions}]

create table if not exists lane_e.meta_platform_insights_raw (
  key           text primary key,   -- account|campaign|date|platform
  account_id    text,
  campaign_id   text,
  campaign_name text,
  date          date,
  platform      text,               -- publisher_platform: instagram / facebook / …
  spend         numeric,
  impressions   bigint,
  clicks        bigint,
  leads         int,
  data          jsonb,
  fetched_at    timestamptz not null default now()
);
create index if not exists meta_platform_insights_date_idx on lane_e.meta_platform_insights_raw (date);
alter table lane_e.meta_platform_insights_raw enable row level security;
