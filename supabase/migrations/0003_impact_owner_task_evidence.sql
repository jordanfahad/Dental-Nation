-- ============================================================================
-- Tab 2 — Growth Projects: custom project owner + attach evidence to a task
-- ============================================================================
set search_path = lane_e, public;

-- A custom owner (person's name) per project, editable from the project edit form
-- (the "admin-edit" backend behind the password gate). Free-text so any name can
-- be added; distinct from `ownership` (owner|collaborator), which drives the
-- dashed-border encoding.
alter table lane_e.projects add column if not exists owner text;

-- Evidence files can now be attached to a specific task (in addition to a
-- project/component). on delete set null so removing a task keeps the file.
alter table lane_e.evidence_files add column if not exists task_id text references lane_e.tasks(id) on delete set null;
create index if not exists evidence_files_task_id_idx on lane_e.evidence_files (task_id);
