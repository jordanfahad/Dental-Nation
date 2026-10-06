create table if not exists lane_e.ad_creatives (
  platform text not null check (platform in ('meta', 'google')),
  ad_id text not null,
  campaign_name text not null default '',
  ad_name text not null default '',
  creative_id text,
  thumbnail_url text,
  image_url text,
  video_id text,
  body text not null default '',
  title text not null default '',
  cta text not null default '',
  link_url text,
  headlines text[] not null default '{}',
  descriptions text[] not null default '{}',
  fetched_at timestamptz not null default now(),
  primary key (platform, ad_id)
);
-- Daily Google ad costs let creative previews obey the selected report period.
-- Meta costs/chats continue to use the existing ad/day insight mirror.
create table if not exists lane_e.ad_creative_daily (
  platform text not null check (platform = 'google'),
  ad_id text not null,
  day date not null,
  spend numeric not null default 0 check (spend >= 0),
  fetched_at timestamptz not null default now(),
  primary key (platform, ad_id, day)
);
alter table lane_e.ad_creatives enable row level security;
alter table lane_e.ad_creative_daily enable row level security;
revoke all on lane_e.ad_creatives, lane_e.ad_creative_daily from anon, authenticated;
grant all on lane_e.ad_creatives, lane_e.ad_creative_daily to service_role;
