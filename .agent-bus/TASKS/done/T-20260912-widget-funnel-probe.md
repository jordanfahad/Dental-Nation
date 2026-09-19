# T-20260912-widget-funnel-probe — Full-funnel booking-widget probe (desktop + mobile)

**Mode:** repo (branch `codex/T-20260912-widget-funnel-probe` — NEVER commit to main)
**Priority:** urgent — paid traffic is landing on a funnel that has produced ~2 completed
bookings in 4 weeks (GA4: 628 booking_flow_started → 2 booking_completed since 2026-08-17,
vs ~20-25% completion before that date).

## Context (verified today, do not re-litigate)

- The live site www.dentalnation.com is Next.js on an EXTERNAL VPS. We do NOT have its
  source. Nothing in this task touches or deploys the site itself.
- This repo (Dental Nation dashboard) owns the monitoring: a 15-min Vercel cron runs an
  API-level availability check (`lib/ops/slotsMonitor.ts` → `lane_e.widget_health`), and
  a LEGACY Playwright "robot patient" exists at `scripts/widget-check.mjs`, runnable via
  `.github/workflows/widget-health.yml` (currently workflow_dispatch only).
- Manual desktop walk today (2026-09-12) PASSED through: condition "Aesthetic & Cosmetic
  Concerns" → treatment "I don't know / Other" → visit type "Normal" → date (Mon Sep 14)
  → time 9:00 AM → Continue → doctor cards rendered (3 doctors, AED 550) → select doctor
  → Personal Information form rendered (name + phone + "Send OTP"). Stopped there.
- The API-level monitor only sees hard availability outages (it caught HTTP 500s on
  Sep 4-6). The month-long soft failure (users dying between flow start and completion)
  is invisible to it. Mobile (where nearly all paid traffic lands) has never been probed.
- GA4 shows the widget's `booking_error` event has NEVER fired — failures are silent.

## Goal

Extend `scripts/widget-check.mjs` (or add a sibling script it invokes) into a
FULL-FUNNEL probe that walks the exact steps above on BOTH:
  1. desktop viewport (existing behaviour), and
  2. a mobile device profile (Playwright `devices['iPhone 14']` or similar),
and reports the deepest stage reached per viewport to the dashboard's existing
widget-health ingestion (same env contract the script already uses:
`SITE_URL`, `DASHBOARD_URL`, `WIDGET_HEALTH_SECRET`).

## Hard rules

1. 🔴 NEVER submit the Personal Information form, never click "Send OTP", never enter a
   phone number into the OTP field. The probe STOPS when the personal-info form (name +
   phone inputs + Send OTP button) is VISIBLE. Creating fake leads/OTP requests is the
   one thing this probe must never do (the existing script's comments carry the same rule).
2. Additive only: do not modify `lib/ops/slotsMonitor.ts` or the Vercel cron path; do not
   remove the existing API-level check. The two monitors complement each other.
3. Do not add new npm production dependencies to package.json (playwright is installed
   ad-hoc in the workflow, keep it that way).
4. Branch only. No pushes to main, no deploys, no schedule ENABLED without approval —
   add the cron schedule to the workflow file in the branch, commented, with a note
   (enabling the schedule = Claude/Fahad decision at merge time).

## Deliverables

1. Updated probe script: per-stage walk with stages named exactly:
   `load, widget_visible, condition, treatment, visit_type, date, time, doctors,
   personal_info` — reporting `{viewport: desktop|mobile, stage_reached, ok, detail,
   duration_ms}` per viewport, plus a failure screenshot per failed viewport
   (`widget-failure-<viewport>.png`).
2. Posting: reuse the script's existing POST-to-dashboard mechanism; one health row per
   viewport per run. If the ingestion endpoint needs a new field (`viewport` or a
   stage-prefixed detail string), prefer encoding in the existing `stage`/`detail`
   columns (e.g. stage `mobile:time`) — do NOT run DB migrations.
3. Workflow: update `.github/workflows/widget-health.yml` so the Playwright full-funnel
   probe is a first-class job (not only the no-secret fallback), still
   workflow_dispatch, with the cron schedule line present but commented out.
4. A short runbook section appended to the script header: how to run locally
   (`node scripts/widget-check.mjs` with env), what each stage means, and the hard rule.

## Acceptance criteria (Claude will re-run these)

- `node scripts/widget-check.mjs` run locally (Playwright installed ad-hoc) against
  https://www.dentalnation.com/en/ completes BOTH viewports and prints/returns
  stage_reached = `personal_info` (or a deeper diagnosis of where mobile actually
  fails, with screenshot) — with zero OTP requests sent.
- The run posts (or with DASHBOARD_URL unset, logs the exact payloads of) two
  widget_health rows, one per viewport.
- `pnpm build` (or tsc) still passes; diff contains no changes outside
  `scripts/`, `.github/workflows/widget-health.yml`.
- No commits on main; everything on `codex/T-20260912-widget-funnel-probe`.

## Handoff

Write `.agent-bus/outbox/T-20260912-widget-funnel-probe.md` with: what was built, exact
local-run output for both viewports (stage reached + timings), screenshot paths if any
stage failed, and any observations about WHERE the mobile funnel differs from desktop
(that observation is the actual prize of this task).
