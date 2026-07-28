-- One-off diagnostic captures from the booking widget, used to harden the
-- synthetic check in scripts/widget-check.mjs.
--
-- The check was written from a STATIC copy of the widget's HTML, which cannot
-- show what the date picker renders when opened, what the time dropdown looks
-- like once populated, or which network call actually fetches availability from
-- Practo Insta. The discovery run captures those from the live page and parks
-- the result here, where it can be read and reasoned about.
--
-- Deliberately a free-form jsonb blob: this is diagnostic output whose shape we
-- are still learning, not a modelled domain table. Rows are disposable — drop
-- them once the check is hardened.
create table if not exists lane_e.widget_probe (
  id        bigint generated always as identity primary key,
  probed_at timestamptz not null default now(),
  payload   jsonb not null
);

alter table lane_e.widget_probe enable row level security;  -- service-role only, mirrors other lane_e tables

create index if not exists widget_probe_probed_idx on lane_e.widget_probe (probed_at desc);

comment on table lane_e.widget_probe is
  'Diagnostic captures from the live booking widget (network calls, rendered markup per stage). Feeds the hardening of the synthetic widget check; safe to truncate.';
