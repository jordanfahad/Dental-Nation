-- ============================================================================
-- Tab 2 — Growth Projects: "Growth Builds" showcase (CEO case studies)
-- ============================================================================
set search_path = lane_e, public;

-- Featured = surface this project as a case-study card in the Growth Builds
-- section (top of Overview) for the CEO to review.
alter table lane_e.projects add column if not exists featured boolean not null default false;

-- Narrative blocks for the card: { what, benefits, enhance, growth_impact }.
alter table lane_e.projects add column if not exists showcase jsonb;

-- CEO review / acknowledgement. ceo_ack_* is set by acknowledgeShowcaseAction,
-- which is the ONE write a viewer (the CEO) is allowed to make — scoped to
-- acknowledgement only; everything else stays admin-only.
alter table lane_e.projects add column if not exists ceo_ack_at timestamptz;
alter table lane_e.projects add column if not exists ceo_ack_by text;

create index if not exists projects_featured_idx on lane_e.projects (featured) where featured;
