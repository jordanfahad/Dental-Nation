-- 0030 — the Investor Evidence Room: a fourth share scope.
-- One token opens the landing page and every section behind it
-- (growth, operations, finance, live dashboard views).
-- Applied to production 2026-08-08 via MCP (evidence_room_scope).

alter table lane_e.report_share_links
  drop constraint if exists report_share_links_scope_check;
alter table lane_e.report_share_links
  add constraint report_share_links_scope_check
  check (scope in ('growth', 'handover', 'funnel', 'operations', 'room'));
