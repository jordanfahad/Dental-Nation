-- ============================================================================
-- Tab 2 — Growth Projects: a link field (G-Drive / any URL) on projects + tasks
-- ============================================================================
set search_path = lane_e, public;

-- Free-text URL: a Google Drive folder/doc, a deck, a sheet, a brief, etc.
-- Shown as a clickable link on the dashboard, editable in-app and via the
-- Excel export/import round-trip (the bulk-edit flow).
alter table lane_e.projects add column if not exists link text;
alter table lane_e.tasks add column if not exists link text;
