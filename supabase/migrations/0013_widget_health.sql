-- Synthetic "robot patient" checks against the live booking widget.
--
-- Why a browser check and not an HTTP ping: when Practo Insta stops returning
-- availability the site still answers 200 and the widget still renders — only
-- the SELECT TIME dropdown comes back empty ("No slots available"), and the
-- patient is stuck. A ping-based monitor would report 100% uptime through the
-- whole outage, which is worse than no monitor at all.
--
-- One row per check. `ok=false` with slots_found=0 is the real failure we care
-- about; `stage` records how far the robot got, so a widget that breaks earlier
-- (dropdown never populates, page won't load) is distinguishable from one that
-- reaches the slot step and finds it empty.
create table if not exists lane_e.widget_health (
  id          bigint generated always as identity primary key,
  checked_at  timestamptz not null default now(),
  ok          boolean not null,
  slots_found int,
  -- how far the robot patient got: loaded | condition | treatment | date | slots
  stage       text,
  -- failure reason, or a short note on success
  detail      text,
  duration_ms int
);

alter table lane_e.widget_health enable row level security;  -- service-role only, mirrors other lane_e tables

-- The panel reads "latest first" and scans a window to compute uptime.
create index if not exists widget_health_checked_idx on lane_e.widget_health (checked_at desc);

comment on table lane_e.widget_health is
  'Synthetic booking-widget checks (GitHub Actions robot patient). ok=false means a real patient could not have booked at that moment. Powers the uptime % and incident timeline on Clinical Operations.';
