-- 0034 · ops_form_entries — rows from the watched form tabs (OPS_WATCHED_TABS),
-- mirrored so Clinical Operations can WORK them, not just be emailed about them.
--
-- The watched tabs (config/ops.ts, addressed by gid) previously only produced
-- alert emails; the rows themselves lived nowhere the dashboard could read.
-- The sync now upserts each form row here, keyed by a stable entry id
-- (gid | phone | submitted time), so re-syncs can never duplicate an entry.
-- Fields the UI needs are extracted by header pattern at sync time; the full
-- label→value row is kept in `data` so nothing typed into a form is lost.
--
-- Applied to production via MCP (apply_migration).

create table if not exists lane_e.ops_form_entries (
  entry_id text primary key,
  gid bigint not null,
  tab_title text,
  row_index int,
  submitted_at timestamptz,
  name text,
  phone text,
  phone9 text,            -- last 9 digits, the cross-source match key
  email text,
  treatment text,
  source text,            -- the row's Source/Campaign/UTM cell, verbatim
  lane_key text,          -- ArabyAds lane (glowup/sos/scan) when the source or tab maps to one
  data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now()
);

create index if not exists ops_form_entries_submitted_idx on lane_e.ops_form_entries (submitted_at desc);
create index if not exists ops_form_entries_phone9_idx on lane_e.ops_form_entries (phone9);

-- Service-role access only, like every lane_e table: RLS on, no policies.
alter table lane_e.ops_form_entries enable row level security;
