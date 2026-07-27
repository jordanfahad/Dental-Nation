-- Call dispositions for the unverified-lead worklist (Clinical Operations).
--
-- raw_dn_leads is a truncate-and-reload bronze mirror, so nothing about a lead
-- row is stable across syncs — we cannot store the outcome on the lead itself.
-- This table records what reception DID about a lead, keyed by a stable
-- reference derived from the sheet: the widget's own "Lead ID" when present,
-- otherwise `<last 9 digits of phone>|<submitted ISO>` (see leadRefOf() in
-- lib/ops/unverifiedLeads.ts).
--
-- Append-only: a lead can be called several times (no answer → call back →
-- booked), and the attempt history is the point. The read layer takes the most
-- recent row per lead_ref and counts the rest as attempts.
--
-- Terminal outcomes (booked / notinterested / wrongnumber) drop a lead out of
-- "Needs a call". noanswer + callback deliberately do NOT — those still need
-- working; they just show how many times we've tried.
create table if not exists lane_e.lead_call_log (
  id         bigint generated always as identity primary key,
  lead_ref   text not null,
  outcome    text not null check (outcome in ('booked','callback','noanswer','notinterested','wrongnumber')),
  note       text,
  logged_by  text,          -- dashboard_users.name at the time of logging (kept even if the user is later deleted)
  logged_uid text,          -- dashboard_users.id as text; null for env-configured admin/viewer logins
  created_at timestamptz not null default now()
);

alter table lane_e.lead_call_log enable row level security;  -- service-role only, mirrors other lane_e tables

-- The read layer fetches the newest row per lead_ref.
create index if not exists lead_call_log_ref_idx on lane_e.lead_call_log (lead_ref, created_at desc);

comment on table lane_e.lead_call_log is
  'Call outcomes for unverified website enquiries (lane_e.raw_dn_leads). Append-only attempt log keyed by a stable lead_ref, because the bronze lead table is truncate-and-reloaded each sync.';
