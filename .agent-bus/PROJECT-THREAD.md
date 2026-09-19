# PROJECT-THREAD — Dental Nation growth platform

Goal: the group's single reporting + growth-operations surface
(reports.dentalnation.com) — performance dashboard, Growth Projects (/impact),
investor Evidence Room, Smile Club growth programme — trusted by the CEO,
operations, finance and investors because every number on it is real, dated
and attributable.

Stage (19 Sep 2026): platform live in production with daily executive use.
Smile Club 30-day mandate in execution (120 paid memberships by 16 Oct;
checkpoints 23/30 Sep, 7/16 Oct). Three-tier investor room links live.
P&L pathway block complete on all 24 capabilities, pending finance ticks.

## Dated decisions

- 2026-09-19 · Agent bus installed in REMOTE MODE (cloud Claude ↔ PC Codex,
  git as transport). See AGENT-BUS.md.
- 2026-09-19 · Smile Club plan grantable as per-user dashboard tab
  (`smileclub`, adminOnly+extra_tabs) so staff-role reviewers see ONLY it,
  never /impact.
- 2026-09-17..19 · Smile Club economics decomposed honestly: blended CAC 250
  = 30,000/120; CPL 150 target / 200 break-point; CAC-70 dropped as
  impossible; broadcast CRM closed by evidence (71 replies, appointment-led)
  → triggered 1-to-1 contact only.
- 2026-09-14 · Google reviews reported as the dated public fact (60 visible,
  verified 14 Sep), NOT the synced table count — the sync appends and never
  reconciles Google's removals (19 deleted in a spam sweep).
- 2026-09 · Lead alerts run on a 1-minute fast lane
  (/api/cron/lead-alerts) refreshing only the booking-widget source; full
  sync stays at */15.

## Do-not-regress landmines

- `lane_e.dashboard_users.extra_tabs` is Postgres **text[]**, NOT jsonb —
  use array functions, never `|| jsonb`.
- `UNGRANTABLE_TABS` (users, status) must stay ungrantable — granting Users
  would let a non-admin escalate their own access.
- Room links: three token tiers with different `sections` toggles; the
  `dash`/`kpis` gates in app/share/room/** must hold on every new room page.
  Tokens are credentials — never in the repo.
- The reviews hero tile is a hardcoded dated fact by design; do not "fix" it
  back to the live gmb_reviews count until the sync reconciles deletions.
- Middleware `canSeeGrowthProjects` = admin||viewer only; staff-based roles
  must stay blocked from /impact.
- The empty-sheet guard in the lead-alert pulse: an empty read must never
  wipe raw_zavis.
- Production system with real users — schema changes need migration thinking;
  no patient names / staff personal data anywhere in the repo or UI.

## Open problems

- GMB sync reconciliation (deleted reviews never removed) — first bus task
  candidate (DN-001).
- Practo API credential rotation outstanding (urgent, old).
- Designer hire decision gates smart/dynamic creatives (Smile Club DM plan
  blocker).
- Jawad's P&L ticks + September workbook; Dr Luvi's audit records + sign-offs.

## Next

- Run DN-001 through the bus end-to-end as the pilot of remote mode.
- Day-7 mandate checkpoint (23 Sep): first source-coded funnel reads.
