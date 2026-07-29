-- Google Ads clicks segmented by CLICK TYPE (phone taps, get-directions taps,
-- headline clicks, sitelinks…) per campaign per day. This is the signal the
-- Ads UI hides behind Segment → Click type: for call-first campaigns it is the
-- only measurable phone outcome in the UAE, where Google forwarding numbers
-- (and therefore call CONVERSION counting) are unavailable — both call
-- conversion actions read 0.00 all-time.
--
-- Security posture matches the rest of lane_e: RLS ON, no policies; the app
-- reads via the service role only.
create table if not exists lane_e.google_ads_click_types (
  key           text primary key, -- customer|campaign|date|click_type
  customer_id   text,
  campaign_id   text,
  campaign_name text,
  date          date,
  click_type    text,             -- Google enum verbatim (CALLS, GET_DIRECTIONS, …)
  clicks        numeric,
  fetched_at    timestamptz not null default now()
);
create index if not exists idx_gads_click_types_date on lane_e.google_ads_click_types (date);
alter table lane_e.google_ads_click_types enable row level security;
