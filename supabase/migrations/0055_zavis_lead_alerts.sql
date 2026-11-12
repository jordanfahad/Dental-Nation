-- Zavis new-lead alert (Dr Luvi, 12 Nov 2026). Additive.
-- zavis_webhook_events: every webhook Zavis posts, kept so the ad-detection
-- rule can be checked against real payloads (payloads hold patient contact
-- details: this database only, never the public repo).
-- zavis_lead_alerts: one row per conversation alerted; the primary key is the
-- claim that stops a second email for the same lead.
begin;

create table lane_e.zavis_webhook_events (
  id bigserial primary key,
  received_at timestamptz not null default now(),
  event text not null,
  conversation_id bigint,
  contact_id bigint,
  from_ad boolean,
  ad_detail text,
  payload jsonb not null
);
create index zavis_webhook_events_received_at on lane_e.zavis_webhook_events (received_at desc);

create table lane_e.zavis_lead_alerts (
  conversation_id bigint primary key,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  mode text not null check (mode in ('test', 'live')),
  from_ad boolean,
  ok boolean,
  recipients text[]
);

alter table lane_e.zavis_webhook_events enable row level security;
alter table lane_e.zavis_lead_alerts enable row level security;
grant select, insert, update, delete on lane_e.zavis_webhook_events, lane_e.zavis_lead_alerts to service_role;
grant usage, select on sequence lane_e.zavis_webhook_events_id_seq to service_role;

commit;
