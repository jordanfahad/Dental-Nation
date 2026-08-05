-- Command Deck — Google Ads granularity for the board drawer.
-- AGGREGATE-ONLY: campaign names, dates, spend and counts. Applied 5 Aug 2026.
--
-- Campaign TYPE is derived from the campaign name because the Ads API export
-- we store carries no advertising_channel_type. The rule is stated on the page
-- so nobody mistakes a naming convention for a platform field.
create or replace view lane_e.board_deck_google_campaigns as
select date as day,
       campaign_name,
       case
         when campaign_name ilike '%pmax%'        then 'Performance Max'
         when campaign_name ilike '%brand%'       then 'Brand search'
         when campaign_name ilike '%competitor%'  then 'Competitor search'
         when campaign_name ilike '%search%'
           or campaign_name ilike '%keyword%'
           or campaign_name ilike '%leads |%'     then 'Search'
         else 'Unclassified'
       end as campaign_type,
       sum(spend)       as spend,
       sum(impressions) as impressions,
       sum(clicks)      as clicks,
       sum(conversions) as conversions
  from lane_e.google_ads_insights_raw
 where date is not null
 group by 1, 2, 3;

comment on view lane_e.board_deck_google_campaigns is
  'AGGREGATE-ONLY Google Ads performance per campaign per day, with campaign type derived from the naming convention. Powers the Command Deck Google Ads drawer.';

create or replace view lane_e.board_deck_google_clicktypes as
select date as day, click_type, sum(clicks) as clicks
  from lane_e.google_ads_click_types
 where date is not null
 group by 1, 2;

comment on view lane_e.board_deck_google_clicktypes is
  'AGGREGATE-ONLY Google Ads clicks split by click type (phone calls, directions, headline clicks) — what the spend actually bought.';
