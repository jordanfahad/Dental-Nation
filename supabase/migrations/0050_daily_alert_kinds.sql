-- Daily 09:00 alert emails (owner approval, 24 Oct 2026): the Smile Club and
-- DN Ortho emails take the same once-a-day claim as the GBP and performance
-- emails (claim acquired before transport, at most one send per kind per day).
-- Apply before LIVE_FROM (25 Oct 2026, 09:00 Dubai); until then those two kinds
-- fail closed (no claim, nothing sent). Idempotent: safe to run more than once.
alter table lane_e.performance_email_claims drop constraint if exists performance_email_claims_kind_check;
alter table lane_e.performance_email_claims add constraint performance_email_claims_kind_check
  check (kind in ('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily'));
