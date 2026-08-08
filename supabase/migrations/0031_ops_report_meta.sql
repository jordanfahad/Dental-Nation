-- 0031 · ops_report_meta — the report's editable masthead (title + intro).
--
-- Ms Shadi asked for the hardcoded header "Head of Operations" to go and for
-- the title to be hers to edit, like every section already is. A single-row
-- table (id = 1, enforced) holds the masthead; the report renders it, the
-- editor view exposes it behind the same editor gate as the sections.
--
-- Applied to production 2026-08-08 via MCP (apply_migration).

create table if not exists lane_e.ops_report_meta (
  id int primary key default 1 check (id = 1),
  title text not null,
  intro text not null default '',
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Service-role access only, like every lane_e table: RLS on, no policies.
alter table lane_e.ops_report_meta enable row level security;

-- Seed with the title Ms Shadi requested.
insert into lane_e.ops_report_meta (id, title, intro, updated_by)
values (
  1,
  'Investor Performance & Operating Platform Report',
  'A live document, maintained by the Operations Director.',
  'Ms Shadi'
)
on conflict (id) do update
  set title = excluded.title,
      updated_by = excluded.updated_by,
      updated_at = now();
