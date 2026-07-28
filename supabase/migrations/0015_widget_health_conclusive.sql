-- Separate "the widget failed" from "the monitor failed".
--
-- The very first live check recorded ok=false with "Check errored: locator
-- timeout" — that was a bug in the CHECK, not an outage of the widget, yet it
-- rendered as DOWN with 0% uptime across three tabs. An uptime figure that
-- counts the monitor's own failures as downtime is not a true figure.
--
-- conclusive=false means the run could not determine the widget's state at all
-- (browser crash, script exception, site unreachable from the runner). Those
-- rows are kept — silently dropping them would hide a broken monitor — but they
-- are excluded from uptime and from the outage timeline, and surfaced on their
-- own so a persistently failing monitor is visible rather than invisible.
--
-- Genuine patient-facing failures stay conclusive: "no slots offered" and
-- "widget never rendered" both mean a real person could not book.
alter table lane_e.widget_health
  add column if not exists conclusive boolean not null default true;

comment on column lane_e.widget_health.conclusive is
  'False when the check could not determine the widget state (monitor/browser/network error). Excluded from uptime and outages so a broken monitor never reads as a widget outage.';
