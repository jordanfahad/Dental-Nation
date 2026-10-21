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

- 15 Oct 2026 (owner): scheduled team emails RESUMED (app_secrets alerts_paused set to 'false'). The switch remains in place for future pauses. The performance brief is still in template review (to Fahad, cc Dr Luvi and Ms Shadi; Mr Akbar excluded until approval).
- 15 Oct 2026 (owner): ALL scheduled team emails PAUSED until the owner approves - morning briefings, evening updates, shoot schedule, the performance brief and GBP daily. Switch: lane_e.app_secrets key alerts_paused = 'true' (set by Claude); runSmileClubAlerts sends nothing while it is on, and a failed read also sends nothing. To resume: set it to 'false' or delete the row. NOT paused (operational, would lose patients or hide outages): website new-lead alerts to clinic desks, website-down alerts, watched-tab alerts.
- 13 Oct 2026 (owner, via PRs #13 and #14 while Claude was offline): the daily performance brief stays in TEMPLATE REVIEW - To Fahad, cc Dr Luvi and Ms Shadi; Mr Akbar receives nothing until Fahad explicitly approves the template (no expiry, no date-based fallback; delivery guard refuses to send if Akbar's address appears). GBP daily now also cc's Dr Luvi. Caps: Akbar 0, Dr Luvi 3 (GBP cc + review cc + shoot), Shadi 2, Fahad 4. Reviewed and re-verified by Claude 15 Oct: tsc clean, 203 tests pass.

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

- DN-018 (15 Oct 2026, built by Claude at the owner's request instead of Astra): lead-tracker reading cleanup. New lib/lead-tracker/branch.ts maps every observed branch spelling to its owner-confirmed branch (exact matches only, addresses never matched; TDC Al wasl 4 Jumeirah and its tab are the Dental Nation main branch, Al Wasl / Al Maher is AMC); header-echo rows excluded and counted; readOutcome reads the free-text outcome columns without classifying them as bookings. Performance gross parser now uses it: Al Wasl gross 431 -> 461 (last 30 days) and 176 -> 190 (month to date), all from the TDC rows that previously fell to no branch. WEBSTE counts as website (performance only). Unclassified funnel rows show Unavailable outcomes instead of 0. One old test asserted TDC = Dr Tosun; updated to the owner's correction. Growth, Executive and Smile Club untouched. QA: tsc clean, 213 tests pass.

- DN-016 (13 Oct 2026): performance-email attribution honesty. Gross tracker rows with no explicit source rule now land in a new Unclassified group instead of defaulting into Organic digital (Growth's own numbers untouched; snapshot test guards leadTrackerChannel). The funnel column is labelled Billed patients (Growth), a Patients by billing file column shows the billing-file population per clinic, and a data note states the difference when the two counts disagree. QA: tsc clean, 201 tests re-run by Claude. The 13 Oct hold on am:gbp-daily and am:akbar-perf stays until Fahad approves the re-rendered previews.

- DN-015 (12 Oct 2026): GBP 30-day plan tracker and the two new 9am emails. Daily-log CSV template (owner pastes as a tab named exactly "Daily log" in the plan sheet 142joaIN0oEPt3hfUmcrQlxmWaLdhNduV5b0UB_D9Rnk), Sheets sync into lane_e.raw_gbp_daily_log, operations sub-tab otab=gbp (plan progress, log table, GBP results vs pre-plan baseline, On track / Watch / Off track), am:gbp-daily to Ms Shadi (cc Fahad) and am:akbar-perf to Mr Akbar (cc Fahad) in the 09:00-10:59 window, both capped at 1/day and excluded from Smile Club loops. QA: tsc clean, 195 tests re-run by Claude. Migration 0047 applied to prod by Claude in pieces; NOTE the deployed replace_gbp_daily_log is a single-statement SQL (CTE) variant of the repo's plpgsql body (MCP runner cannot ship plpgsql bodies: its splitter cuts on the semicolons inside), same behaviour, negative invalid_count enforced by check constraint gbp_sync_invalid_nonneg instead of a raise. Leftover: lane_e.t_probe() (harmless `select 1` probe, execute revoked) — drop it from the SQL editor some day; the MCP layer stalls on drop statements.

- DN-014 (12 Oct 2026): Google Business Profile per branch. Sync writes each location under its own clinic key (dental-nation / dr-tosun / al-maher); branch picker on the Social view; admin-only dated backfill; discovery endpoint made read-only (store=1 no longer writes) and suggests only dental-group listings. Growth: Dr Tosun view shows its own GMB reach; all other numbers unchanged (regression-tested). QA: tsc clean, 170 tests re-run by Claude. Config: the three aligned app_secrets set by Claude after deploy.

- DN-013 (12 Oct 2026): Ms Shadi's four questions from the clinics' own exports (Al Wasl register, visits and receipts from 2023; Dr Tosun payment ledger 2017 to Jul 2026; Al Maher register and last-visit snapshot) plus live feeds and Dr Luvi's portal. Aggregates only in out/results.md; patient files stay on the owner's PC. Still missing: Treatment_Dr's wise.zip and the Dr Tosun demographic register (so Dr Tosun new vs returning after the July move stays unmeasurable). QA: identifier scan clean; spend, Executive new files and portal/Zoho revenue re-checked.

- DN-012 (11 Oct 2026): Marketing performance 2025 and 2026 by branch for Ms Shadi, under Head of Operations (otab=marketing) and the internal room tier only (/share/room/<token>/marketing, 404 when sections.dash is false). Reuses the Executive new-patient rule and the Growth attribution verdicts. QA: tsc clean, 147 tests pass, June cohort re-derived in SQL (23 patients, AED 110,399 to date, median 580, 8 billed again). 2025 patient metrics, Dr Tosun new vs returning and LTV beyond early cohorts are shown as not available, with reasons.

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

- Dentist scripts rev. 25 Sep: WhatsApp goes to patient groups (active /
  inactive / dormant), never addressed by name; every filming appointment
  gives two videos (Smile Club + the dentist's lane campaign). Languages:
  Dr. Tosun Dental Clinic TR + EN; Al Wasl and AMC AR + EN (AMC confirmed by
  Fahad 25 Sep). TR/AR are drafts under review in DN-005.

## Open via the bus

- DN-029 SHIPPED 21 Oct (merge 1c77d73, deploy dpl_DdBDZEmp, live on
  reports.dentalnation.com). Website enquiries mirror to the Inhouse Lead
  Tracker tabs "Website Enquiries (auto)" and "Website Summary"; team review
  read back to lane_e.website_review_snapshot (migration 0049 applied, lease
  functions as single-statement SQL). First production sync 19:47 UTC: 2
  website enquiries mirrored (12 and 15 Oct), snapshot available. QA: own
  review + two adversarial multi-agent reviews + final gate; all confirmed
  findings fixed (cross-channel double count, drift halting the mirror,
  billed not counted as booked, sync banner, sort race, tagged phones).
  Landmines: website = one enquiry per phone per day; a campaign-tagged phone
  (any time) is never website and its website-labelled enquiries go to the
  tagged channel; mirrored rows are never deleted, only marked "no longer
  counted as website".
- OPEN (needs spec): Growth's dated ranges have never included booking-widget
  enquiries, because widget Timestamps are US format ("08/09/2026, ...") and
  the range check compares ISO strings. Fixing it changes historical Growth
  numbers (Feb to Aug), so it needs an owner decision.
- OPEN (owner): every website enquiry feed is stale: widget last row 9 Aug,
  offer forms 1 Sep, incomplete bookings 30 Jul. Check with Zavis/Seyed
  whether website forms still deliver, or whether the feed sheet changed.

- DN Ortho (17 Oct): DN-024 QA'd DN-021's keywords/negatives (v2: 176
  keywords, 338 shared + 280 cross negatives, 19 held with
  recommendations). Owner decided: Al Wasl only, no Arabic now, Invisalign
  by name, budgets not a gate. DN-025 builds the final paused import
  package from those decisions.
- DN-017 MERGED 17 Oct (owner approved): Reception desk section in the
  daily brief; WhatsApp lead alert merged OFF (no recipient). Before ever
  switching it on: apply migration 0048, then set mode and recipient in
  config/lead-alerts.ts. DN-021/024/025 closed: final paused Al Wasl
  Search package is on Fahad's PC (.agent-bus/work/DN-025/out/).

- DN-019 MERGED 17 Oct (owner approved) after DN-022 QA (fix-first) and
  DN-023 fixes. Claude re-verified: tsc clean, 236/236 tests, no real
  staff name in the new fixtures. Benchmark ratings: no null writes
  (social_insights.value is NOT NULL), stars only from the same day as
  the latest review count, GBP snapshot only before the first stored
  observation. GBP vs clinic table shows Unavailable for an empty feed.
  Watch the first weekly benchmark refresh for stored `benchmark` rows.
  Next in order: DN-017 (precondition DN-016 met).

- DN-021 (17 Oct, draft mode): DN Ortho Search build S1-01/S2-01/S3-01
  (keywords, negatives, RSAs, Ads Editor CSVs, all PAUSED) plus the data
  standards SH-03 to SH-06, landing page brief for Seyed and launch batch
  brief. Outputs stay git-ignored on Fahad's PC; Claude QAs from the xlsx
  he shares. Landmine: fees and credit terms stay placeholders until Dr
  Hasna and Jawad approve; nothing goes live before the pilot Go. Side
  finding: the weekly UAE keyword cache has stored zero keywords since
  7 Oct (expansion over 10,000 terms) while still spending about USD 1.5
  a week; needs its own spec.

- DN-006 and DN-007 closed 6 Oct: QA'd by Claude (tsc clean, 88/88 tests),
  merged and deployed. Marketing > Demand to desk is live; the UAE keyword
  cache (competitor_snapshots domain market:uae-dental) refreshes weekly.



- None. DN-005 closed 25 Sep: Turkish/Arabic reviewed and merged; English
  source softened (no whitening safety/result promise, no "see you today",
  cleaning "depending on the plan", check-up booked only if the patient wants).
  Arabic names/titles live as per-dentist drafts (Dentist.ar). Still open:
  native-speaker sign-off per language; each dentist confirms their Arabic
  name/title; RTL display of Latin brand names inside Arabic to eyeball.

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
