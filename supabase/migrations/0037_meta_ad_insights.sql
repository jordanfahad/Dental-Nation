-- Ad-level Meta insights (bronze): the feed for the "Running ads" view.
-- One row per account|ad|day, upserted by key like the campaign table.
create table if not exists lane_e.meta_ad_insights_raw (
  key text primary key,
  account_id text,
  ad_id text,
  ad_name text,
  adset_name text,
  campaign_id text,
  campaign_name text,
  date date,
  spend numeric,
  impressions integer,
  clicks integer,
  leads integer,
  data jsonb,
  fetched_at timestamptz
);

create index if not exists meta_ad_insights_raw_date_idx
  on lane_e.meta_ad_insights_raw (date);
