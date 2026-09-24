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

- Practo API credential rotation outstanding (urgent, old).
- Designer hire decision gates smart/dynamic creatives (Smile Club DM plan
  blocker).
- Jawad's P&L ticks + September workbook; Dr Luvi's audit records + sign-offs.
- /impact hero reviews tile still a hardcoded dated fact — switching it to
  the live active count is UNBLOCKED (see DN-001 below) once the owner
  eyeballs the public profile against the reconciled number one time.

## Done via the bus

- DN-001 (19 Sep) — GMB review reconciliation. Astra built (99,917 OpenAI
  tokens; 23 tests), Claude QA'd, migrated, merged, deployed. First prod run
  tripped Astra's strict totalReviewCount==snapshot guard: Google's counter
  is approximate/stale on a healthy profile, so it is now advisory —
  completeness rests on clean pagination + integrity guards (88c6ff2).
  Verified 11:31 UTC sync: 80 rows → 61 active / 19 removed (the spam-sweep
  deletions), matching the public profile. LEARNING for future specs: never
  gate writes on Google's own aggregate counters.

- DN-003 (21 Sep) — adversarial rigor review of the Smile Club plan.
  Astra reviewed as a McKinsey EM would (16 findings F01–F16, 9 P1:
  incompatible scenario-table math, CPL ranges not following from their own
  CPC÷CVR inputs, inverted 98% control, timeline/day-count drift, stale
  62-review count, unlabelled estimates, immature kill rules, unsupported
  banner reach). Claude QA'd each finding against the file, applied all
  factual/arithmetic corrections as plan rev. 3, and relabelled structural
  gaps honestly — the big structural deliverables (demand forecast per
  source, fully loaded cost bridge, sized corporate replacement doors, gate
  register) are assigned to the 23 Sep checkpoint, not faked. Review file:
  .agent-bus/reviews/DN-003-smileclub-rigor.md (on codex/DN-003).

- DN-004 (24 Sep) — Smile Club plan sanitisation. Astra reviewed all 74
  tasks, five segments, the rev. 7 budget and the mandate/delivery copy:
  22 findings, 79 text-only data edits across 29 task keys (keys, numbers
  and dates preserved). Claude QA'd, merged (3 wording conflicts resolved
  in Astra's favour, keeping the corrected Dr Maysoon spelling), then
  applied the proposals Astra could not touch: dependency dates (dental-day
  costing and LinkedIn material before the 29 Sep door unlock; tracking
  before joining links; first dentist wave from 29 Sep), consent
  safeguards on every sending route, the M1–M4 / R1–R2 / Team / Segments
  copy, and "task progress is not paid memberships" labelling.
  OPEN (F01): no dated source forecast yet — chair gives 12/21/30/36 at the
  checkpoints; the other segments must supply 24/39/58/84 and nobody has
  evidenced that. Needs Fahad + owners.

## Current plan (supersedes older dates above)

- Smile Club plan rev. 6 (23 Sep) + budget rev. 7 (24 Sep): 120 paid
  memberships by 21 Oct; checkpoints 28 Sep 36/30, 5 Oct 60/50, 12 Oct
  88/75, 21 Oct 120. Segments: chair 36, dentists' own patients 24,
  companies 24, online 12, families/neighbourhoods 24. Proposed spend AED
  27,000; indicative full-cost ceiling AED 30,000, subject to Finance.

## Pending merge

- codex/DN-002 (Astra's hardening of the Meta ad-level work: range-end-
  anchored recency, persisted RunningMetaAds resilient to live-API failure,
  sanitized errors, 4 test files, ContentOS structural reference — commit
  c248ee5) exists only on Fahad's PC. Needs `git push origin codex/DN-002`
  from him before Claude can cherry-pick and QA.

## Next

- Day-7 mandate checkpoint (23 Sep): first source-coded funnel reads +
  the DN-003 structural deliverables listed above.
- Marketing channel tree shipped 19 Sep (Group > Channel > Partner >
  Campaign type; agencies never channels) — gather Fahad's feedback, then
  consider wiring the Reconciliation lenses into the tree cards.
