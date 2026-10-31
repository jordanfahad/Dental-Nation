-- DN Ortho weekly email (Dr Luvi, 30 Oct 2026): the new kind 'am:ortho-weekly'
-- takes the same once-a-day claim as the daily emails. It is sent on Mondays
-- only, from ORTHO_WEEKLY_LIVE_FROM (lib/alerts/registry.ts). Apply before the
-- first live Monday, otherwise the claim fails closed (nothing sent).
-- Idempotent: safe to run more than once.
alter table lane_e.performance_email_claims drop constraint if exists performance_email_claims_kind_check;
alter table lane_e.performance_email_claims add constraint performance_email_claims_kind_check
  check (kind in ('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily', 'am:clinic-activation', 'am:ortho-weekly'));
