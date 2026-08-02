-- Board Growth Report + share links (build spec, 2 Aug 2026).
--
-- Two deliverables share one table: a tokenized, read-only link the CEO can
-- open in a board meeting (`scope='growth'`) and a separate, independently
-- revocable link carrying the leave handover (`scope='handover'`). Separate
-- tokens by design — revoking the board link must never kill the handover
-- link, and vice versa.
--
-- House conventions (matching 0019): identity bigints for surrogate keys,
-- text slugs / uuids as the stable external keys, RLS on (every read in this
-- app goes through the service role, never the anon key).

-- ── Share links ─────────────────────────────────────────────────────────────
create table if not exists lane_e.report_share_links (
  id bigint generated always as identity primary key,
  token uuid not null unique default gen_random_uuid(),
  scope text not null check (scope in ('growth', 'handover')),
  label text not null default '',
  created_by text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,                 -- null = never expires
  revoked boolean not null default false,
  view_count integer not null default 0,
  last_viewed_at timestamptz
);

-- The public route looks a link up by token alone; keep that read on an index.
create index if not exists report_share_links_token_idx
  on lane_e.report_share_links (token);
create index if not exists report_share_links_scope_idx
  on lane_e.report_share_links (scope, created_at desc);

alter table lane_e.report_share_links enable row level security;

-- Atomic view counter. Doing this as a single UPDATE (rather than read-then-
-- write in the app) keeps the count honest when two board members open the
-- same link at once.
create or replace function lane_e.bump_share_link_view(p_token uuid)
returns void
language sql
security definer
set search_path = lane_e, pg_catalog
as $$
  update lane_e.report_share_links
     set view_count = view_count + 1,
         last_viewed_at = now()
   where token = p_token
     and revoked = false
     and (expires_at is null or expires_at > now());
$$;

-- ── Manual metric fallback ──────────────────────────────────────────────────
-- Numbers that are NOT yet piped from a live source (GSC exports, Smile Club
-- membership, WhatsApp volumes). The report renders a visible "Data pending"
-- state until a row exists here — never an invented number. `source_note` is
-- shown on the card as the data-source label, so a manually-entered figure can
-- never masquerade as a live one.
create table if not exists lane_e.growth_report_metrics (
  metric_key text not null,
  period_start date not null,
  period_end date not null,
  value numeric,
  unit text,                              -- aed | count | pct | null
  source_note text not null default 'Entered manually',
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (metric_key, period_start, period_end)
);

alter table lane_e.growth_report_metrics enable row level security;

comment on table lane_e.report_share_links is
  'Tokenized read-only links for the board growth report (scope=growth) and the leave handover (scope=handover). Revoke per-link; no auth cookie required on /share/*.';
comment on table lane_e.growth_report_metrics is
  'Manually-entered Part 1 metrics that have no live feed yet (GSC, Smile Club, WhatsApp). Absent row = the card renders "Data pending", never a fabricated figure.';
