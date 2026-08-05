-- Command Deck — the wider funnel (Mr. Akbar's sketch, 5 Aug 2026).
--
-- Adds the stage the six-gauge strip was missing at the top: brand VISIBILITY
-- (owned audience and profile visits) ahead of bought REACH. Aggregate-only,
-- like every other surface the board link reads.
--
-- Note on followers: it is a STOCK, not a flow. The reader wants the latest
-- audience size, never a sum of daily snapshots, so the view keeps the daily
-- grain and the read layer takes the newest day in the window.
create or replace view lane_e.board_deck_visibility as
select day,
       channel,
       metric,
       sum(value) as value
  from lane_e.social_insights
 where metric in ('followers', 'profile_views', 'reach', 'impressions')
   and day is not null
 group by 1, 2, 3;

comment on view lane_e.board_deck_visibility is
  'AGGREGATE-ONLY daily social visibility metrics (followers, profile views, reach) for the Command Deck funnel. Followers is a stock: take the latest day, never a window sum.';
