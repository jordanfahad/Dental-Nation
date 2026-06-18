-- ============================================================================
-- Tab 2 — Growth Manager Impact Dashboard — schema (PORT-PLAN §3)
--
-- Lives in the SAME dedicated `lane_e` schema as the Lane E report (one app,
-- one namespaced schema, one service-role client). This avoids the project's
-- `public` schema, which already hosts unrelated apps AND a stale standalone
-- copy of these very tables — see BUILD_NOTES. The app's Supabase client is
-- already bound to `lane_e` (lib/supabase/server.ts), so every Impact query
-- and the §7 cross-link to lane_e.daily_snapshot resolve through one client.
--
-- daily_snapshot is intentionally OMITTED — Tab 2 READS the existing Lane E
-- snapshot (lane_e.daily_snapshot) for the cross-link; it never duplicates it.
--
-- Security posture matches Lane E: RLS ENABLED with NO policies on every table.
-- The app only ever uses the service-role key server-side (service role bypasses
-- RLS), so anon/authenticated can read nothing. Do NOT add permissive policies.
-- ============================================================================

create schema if not exists lane_e;
set search_path = lane_e, public;

-- updated_at trigger (project/task rows are mutated by CRUD + the review gate).
-- search_path is pinned empty (now() resolves via pg_catalog) to satisfy the
-- function_search_path_mutable advisor and remove the injection surface.
create or replace function lane_e.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== Components — the six fixed swimlanes (seeded below) =================
create table if not exists components (
  id           text primary key,
  name         text not null,
  description  text,
  sort_order   int not null,
  default_role text default 'owner'
);

-- ===== Projects — belong to a component ===================================
create table if not exists projects (
  id            text primary key default gen_random_uuid()::text,
  component_id  text references components(id),
  name          text not null,
  description   text,
  status        text not null default 'not_started',
  ownership     text not null default 'owner',
  progress_pct  int default 0,
  effort_hours  numeric,
  effort_source text,
  impact_summary text,
  priority      text,
  start_date    date,
  target_date   date,
  completed_date date,
  source        text default 'manual',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists projects_component_id_idx on projects (component_id);
create index if not exists projects_status_idx on projects (status);

drop trigger if exists projects_set_updated_at on projects;
create trigger projects_set_updated_at before update on projects
  for each row execute function lane_e.set_updated_at();

-- ===== Tasks — belong to a project; deduped by Zoho external_id ===========
create table if not exists tasks (
  id            text primary key default gen_random_uuid()::text,
  project_id    text references projects(id) on delete cascade,
  external_id   text,
  name          text not null,
  status        text,
  owner         text,
  effort_hours  numeric,
  start_date    date,
  due_date      date,
  completed_date date,
  source        text default 'manual',
  raw           jsonb,
  updated_at    timestamptz default now()
);
-- Partial unique index: re-import dedupes by external_id (NULLs allowed many).
-- NOTE: a partial unique index can't be an ON CONFLICT target — the Zoho import
-- upserts in code (fetch existing ids → update vs insert). See lib/ingest/zoho.ts.
create unique index if not exists tasks_external_id_uniq on tasks (external_id) where external_id is not null;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at before update on tasks
  for each row execute function lane_e.set_updated_at();

-- ===== Project blockers ===================================================
create table if not exists project_blockers (
  id          text primary key default gen_random_uuid()::text,
  project_id  text references projects(id) on delete cascade,
  description text not null,
  severity    text,
  needs       text,
  owner       text,
  raised_date date,
  status      text default 'open',
  resolution  text
);
create index if not exists project_blockers_project_id_idx on project_blockers (project_id);

-- ===== Evidence files — metadata; bytes live in the private `evidence` bucket
create table if not exists evidence_files (
  id            text primary key default gen_random_uuid()::text,
  project_id    text references projects(id) on delete set null,
  component_id  text references components(id),
  filename      text not null,
  storage_path  text not null,
  mime          text,
  size_bytes    bigint,
  description   text,
  visible_to_ceo boolean default true,
  uploaded_at   timestamptz default now()
);
create index if not exists evidence_files_project_id_idx on evidence_files (project_id);

-- ===== Effort log — the canonical, HONEST store of hours (§9) =============
-- Zoho logged hours + manual entries. A project's effort_hours/effort_source is
-- recomputed from these. No logs → effort_hours stays null and the UI shows
-- counts; hours are NEVER invented.
create table if not exists effort_log (
  id         bigint generated always as identity primary key,
  project_id text references projects(id) on delete cascade,
  task_id    text references tasks(id) on delete set null,
  log_date   date not null,
  hours      numeric not null,
  note       text,
  source     text
);
create index if not exists effort_log_project_id_idx on effort_log (project_id);

-- ===== Ingestion jobs — the staging area BEHIND the one human gate ========
-- Every paste/upload lands here as status='pending_review'. The ONLY path from
-- here into projects/tasks is an explicit Approve on /impact/review/[jobId].
create table if not exists ingestion_jobs (
  id          text primary key default gen_random_uuid()::text,
  source_type text not null,
  source_ref  text,
  status      text not null default 'pending_review',
  extracted   jsonb not null,
  storage_path text,
  created_at  timestamptz default now(),
  reviewed_at timestamptz,
  applied_at  timestamptz
);
create index if not exists ingestion_jobs_status_idx on ingestion_jobs (status);

-- ===== RLS: enabled, no policies (service-role-only, matching Lane E) ======
alter table components       enable row level security;
alter table projects         enable row level security;
alter table tasks            enable row level security;
alter table project_blockers enable row level security;
alter table evidence_files   enable row level security;
alter table effort_log       enable row level security;
alter table ingestion_jobs   enable row level security;

-- ===== Grants: the app uses the service-role key (bypasses RLS) ===========
grant usage on schema lane_e to service_role;
grant all privileges on all tables in schema lane_e to service_role;
grant all privileges on all sequences in schema lane_e to service_role;
alter default privileges in schema lane_e grant all on tables to service_role;
alter default privileges in schema lane_e grant all on sequences to service_role;

-- ===== Seed the six fixed components (idempotent) =========================
insert into components (id, name, description, sort_order, default_role) values
  ('online_marketing', 'Online Marketing', 'Paid + organic acquisition across channels', 1, 'owner'),
  ('seo',              'SEO',               'Organic search ranking & visibility',        2, 'owner'),
  ('ai_seo',           'AI SEO',            'Answer-engine / LLM visibility',              3, 'owner'),
  ('website_growth',   'Website Growth',    'Sites, landing pages & conversion',           4, 'owner'),
  ('lead_gen',         'Lead Generation',   'Pipeline & qualified inquiries',              5, 'owner'),
  ('hiring',           'Hiring / Talent',   'Recruiting & team build-out',                 6, 'owner')
on conflict (id) do update
  set name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order;

-- ===== Private Storage bucket for evidence + raw ingest uploads ===========
-- Never public; files are served via short-lived (60s) signed URLs.
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;
