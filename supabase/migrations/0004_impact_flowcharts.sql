-- ============================================================================
-- Tab 2 — Growth Projects: flowcharts (operating architecture + SEO roadmap)
-- Layered node spec rendered by a hand-built McKinsey-style renderer; can be
-- (re)generated from an uploaded report through the review gate (upsert by key).
-- ============================================================================
set search_path = lane_e, public;

create table if not exists flowcharts (
  id         text primary key default gen_random_uuid()::text,
  key        text unique,
  title      text not null,
  subtitle   text,
  spec       jsonb not null,        -- { layers: [ { nodes: [ { label, sublabel?, tone? } ] } ] }
  sort_order int default 100,
  source     text default 'seed',
  updated_at timestamptz default now()
);
alter table flowcharts enable row level security;
grant all privileges on all tables in schema lane_e to service_role;

-- Seed the two reference flowcharts (idempotent upsert by key).
insert into flowcharts (key, title, subtitle, sort_order, source, spec) values
(
  'operating_architecture',
  'Operating architecture — content to channel activation',
  'One content engine feeds organic, paid, WhatsApp, LinkedIn and reporting.',
  1, 'seed',
  '{"layers":[
    {"nodes":[{"label":"Content Engine","tone":"start"}]},
    {"nodes":[{"label":"Patient Segmentation","tone":"accent"}]},
    {"nodes":[{"label":"Organic","tone":"process"},{"label":"Paid","tone":"process"}]},
    {"nodes":[{"label":"Reports"},{"label":"LinkedIn"},{"label":"WhatsApp Broadcast"},{"label":"Performance Ads"}]},
    {"nodes":[{"label":"Content OS / Pipeline","sublabel":"Brief -> produce -> QA -> publish -> measure -> refresh","tone":"end"}]}
  ]}'::jsonb
),
(
  'seo_roadmap',
  'Programmatic SEO & AI SEO roadmap',
  'From infrastructure to indexation, ranking and leads.',
  2, 'seed',
  '{"layers":[
    {"nodes":[{"label":"Programmatic SEO","tone":"start"}]},
    {"nodes":[{"label":"VPS / Azure","tone":"accent"}]},
    {"nodes":[{"label":"Website Migration","tone":"process"}]},
    {"nodes":[{"label":"Keyword Matrix"},{"label":"Templates"},{"label":"Build & Deploy"}]},
    {"nodes":[{"label":"Search Engine Indexation","sublabel":"Indexing -> ranking -> CTR -> leads","tone":"end"}]},
    {"nodes":[{"label":"AI SEO","sublabel":"Begins once page structure & templates are stable","tone":"accent"}]}
  ]}'::jsonb
)
on conflict (key) do update
  set title = excluded.title, subtitle = excluded.subtitle, spec = excluded.spec, sort_order = excluded.sort_order;
