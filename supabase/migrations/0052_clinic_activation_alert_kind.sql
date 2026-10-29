-- Clinic Activation daily 09:00 email (Dr Luvi's daily report): the new kind
-- 'am:clinic-activation' takes the same once-a-day claim as the other four
-- daily emails (claim acquired before transport, at most one send per kind per
-- day). NOT applied by the build. The email is gated in code
-- (CLINIC_ACTIVATION_LIVE_FROM in lib/alerts/registry.ts is null), so the cron
-- never claims it until it is switched on; apply this before switching it on,
-- otherwise the claim fails closed (nothing sent). Previews to Fahad do not
-- claim and do not need it. Idempotent: safe to run more than once.
alter table lane_e.performance_email_claims drop constraint if exists performance_email_claims_kind_check;
alter table lane_e.performance_email_claims add constraint performance_email_claims_kind_check
  check (kind in ('am:gbp-daily', 'am:akbar-perf', 'am:sc-daily', 'am:ortho-daily', 'am:clinic-activation'));
