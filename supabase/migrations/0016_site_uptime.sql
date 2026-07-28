-- Website uptime as its own signal, alongside the booking-widget verdict.
--
-- These answer different questions and a CEO needs them separated:
--   site down            → nobody could reach the clinic at all
--   site up, widget down → people arrived and could not book (the 26 Jul case)
-- Reporting only the widget makes the second look like the first.
--
-- Both come from the SAME run — the robot already loads the page before it
-- touches the widget — so this is one extra measurement, not a second monitor.
-- Nullable throughout: rows written before this migration simply have no site
-- verdict, and must not be counted as either up or down.
alter table lane_e.widget_health
  add column if not exists site_ok     boolean,
  add column if not exists site_status int,
  add column if not exists site_ms     int;

comment on column lane_e.widget_health.site_ok is
  'Did the website itself respond and render? Null = not measured (pre-0016 rows). Independent of the widget verdict.';
comment on column lane_e.widget_health.site_status is 'HTTP status of the page load.';
comment on column lane_e.widget_health.site_ms is 'Page load time in ms — slow-but-up is still up.';
