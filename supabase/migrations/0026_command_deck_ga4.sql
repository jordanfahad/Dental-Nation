-- Command Deck — GA4 surface for the Website drawer and the modelled
-- channel-contribution view. AGGREGATE-ONLY. Applied 5 Aug 2026.
--
-- LIMITATION carried onto the page: ga4_summary is a single rolling snapshot
-- (~28 days), not a daily history. Anything read from it describes that
-- snapshot window regardless of the deck's date filter, and the page says so
-- wherever these figures appear.
create or replace view lane_e.board_deck_ga4 as
select period_start, period_end, sessions, users, new_users,
       engaged_sessions, conversions, channels, onsite_funnel, computed_at
  from lane_e.ga4_summary
 where id = 1;

comment on view lane_e.board_deck_ga4 is
  'AGGREGATE-ONLY GA4 snapshot (rolling ~28 days): sessions, users, conversions, channel mix and the on-site booking-widget event funnel. Not a daily history — the deck labels these figures with the snapshot window.';
