# DN-004 — Smile Club plan consistency review

Reviewed against local commit `f4d521a`, rev. 6 segment/task data and rev. 7 budget data, on branch `codex/DN-004`. This is a review of the proposed plan, not evidence of campaign launches, payments, consent, staff availability or spending permission.

The review covers every field of all 74 tasks, all five segments, the complete budget, and the requested UI copy: M1–M4, R1–R2, Segments and Team. The wider marketing, corporate and measurement tabs were not audited. `.agent-bus/PROJECT-THREAD.md` was read as dated context, not as an operating instruction.

Existing text fields were corrected in the three data files. Numeric targets, budget amounts, dates, task keys, task owners, weights, step counts, segment mappings, types and runtime logic are unchanged. The UI file is unchanged; its exact replacement copy appears below. Date changes and other unresolved business choices are proposals only. Each applied text value is listed in the final appendix, followed by the complete 74-task inventory.

## Verified baseline

| Segment | Target | Task subscription allocations | Budget, AED |
| --- | ---: | ---: | ---: |
| Patients in the chair | 36 | 36 | 2,000 |
| Dentists’ own patients contacted personally | 24 | 24 | 2,000 |
| Companies | 24 | 24 | 7,500 |
| People searching online | 12 | 12 | 7,000 |
| Families and neighbourhoods | 24 | 24 | 5,500 |
| Total allocated | 120 | 120 | 24,000 |
| Reserve | — | — | 3,000 |
| Total plan budget | — | — | 27,000 |

The initial allocation is AED 20,500; a further AED 3,500 of online funding is conditional. The AED 3,000 reserve is separate. These are proposed budget allocations, not amounts observed as spent or released. AED 30,000 remains valid as the indicative ceiling, `120 × 250`; it must not be presented as the current spending plan. `999 × 0.5 × 0.5 = 249.75`, so “about AED 250” is an appropriate rounded assumption.

All 74 ISO due dates are weekdays and fall within their assigned week columns. There are 74 distinct task keys, seven owner groups and total task weight 211. Task allocations sum to 120 and match every segment. These arithmetic checks do not establish that the checkpoints are achievable or that any membership has been sold.

## P1 — resolve before relying on the plan

### F01 — Checkpoints have no reconciled, dated source forecast

**Location:** `lib/smileclub/team.ts`, `f-report`, `f-partners`, `f-keywords`, `f-meta`, `c-banner`, `g-pilot`, `g-launch`, `g-onsite`, `l-csr`, `d-active`, `d-inactive`, `d-dormant`; `SmileClubOptimization.tsx`, M1, R1 and T0/T5.

**Defect:** Final allocations add up, but launch/setup tasks carry full subscription targets and do not explain when paid memberships arrive at the four checkpoints.

| Checkpoint | Plan / minimum | Chair, cumulative | Other segments needed for plan | Allocations attached to tasks due by this date |
| --- | ---: | ---: | ---: | ---: |
| Mon 28 Sep | 36 / 30 | 12 | 24 | 17 |
| Mon 5 Oct | 60 / 50 | 21 | 39 | 63 |
| Mon 12 Oct | 88 / 75 | 30 | 58 | 96 |
| Wed 21 Oct | 120 / 120 | 36 | 84 | 120 |

The last column is a diagnostic from task dates, not a sales forecast or observed performance. The dentist waves allocate 10 by 2 Oct, 8 more by 9 Oct and 6 more by 16 Oct; they do not specify a Day-7 contribution. `g-pilot` attaches 12 memberships to an agreement signed on 9 Oct, while staff launch is due 14 Oct. `f-partners` attaches all 20 partner memberships to agreements/codes due 2 Oct, before the printed community materials due 7 Oct. Launching Google, Facebook or a banner also does not prove the attached 3/7/2 memberships.

**Exact replacement for the M1/R1 forecast note:** “Targets: 36 paid memberships by 28 Sep (minimum 30), 60 by 5 Oct (minimum 50), 88 by 12 Oct (minimum 75), and 120 by 21 Oct. The chair contribution is 12 / 21 / 30 / 36. The other four segments must supply 24 / 39 / 58 / 84 cumulatively. A dated source forecast is still required; task completion and task subscription allocations are not payment evidence.”

**Exact replacement for `f-partners.subsNote`:** “Target by 21 Oct: 20 paid memberships — 7 local businesses, 7 promoters, 3 brokers, 3 benefit platforms. Signing partners on 2 Oct does not establish those sales.”

**Exact replacement for `g-pilot.subsNote`:** “First-company target: 12 distinct paid membership contracts by 21 Oct. Signing the employer agreement does not establish those memberships.”

**Exact replacement for `g-onsite.done` and `l-csr.done`:** “Event delivered; distinct paid, active, non-refunded membership contracts and first bookings reported separately under the event/company code, excluding contracts already counted elsewhere.”

**Disposition:** Open. No intermediate source numbers, payment evidence, targets or dates were invented. The report must show any unallocated checkpoint gap until Fahad and the delivery owners provide the forecast. Any redistribution between `g-pilot` and `g-launch` must retain their keys and the corporate total of 24.

### F02 — Several prerequisites arrive after the activities that need them

**Location:** `lib/smileclub/team.ts`, keys below; `segments.ts`, chair/corporate/patients unlocks; `SmileClubOptimization.tsx`, R1 corporate launch, M2 register.

**Defect:** Calendar dates are valid individually, but the dependency sequence is not.

These are exact proposed schedule/content corrections, not changed deadlines or claims of completion. Earlier dates describe the intended sequence; an elapsed date must remain unresolved until completion is evidenced, not be backfilled as done. Where prerequisites are unfinished, the dependent activity stays on hold and the checkpoint forecast must change.

| Task / exhibit | Defect | Exact proposed replacement |
| --- | --- | --- |
| `l-onsite-scope` → `g-unlock` | Dental-day cost is due 8 Oct, after the 28 Sep gate and 29 Sep visits. | `wk: 1`, `dueIso: '2026-09-25'`, `due: 'Fri 25 Sep'`; objective: “Prepare the standard clinical scope, equipment list and materials/set-up estimate for the two company dental days before the door-to-door readiness check. Budget: AED 1,500 per day for materials/set-up; show clinician time separately for Finance. Confirm the company-specific details again before each event.” |
| `m-linkedin` → `f-linkedin`, `g-doors-20` | Posts/checklist due 8 Oct cannot support launch/visits due 2 Oct. | `m-linkedin`: `wk: 1`, `dueIso: '2026-09-25'`, `due: 'Fri 25 Sep'`. `f-linkedin`: `wk: 1`, `dueIso: '2026-09-28'`, `due: 'Mon 28 Sep'`. |
| `g-doors-20` | A Friday deadline can be mistaken for a visit day. | Objective: “Visit 20 suitable companies on Tue 29 Sep–Thu 1 Oct, after the readiness check; complete the visit log and follow-ups by Fri 2 Oct.” Keep its existing due date and owner Gautam. |
| `m-invite`, `l-refresher` → `d-pitch` | Cards, training and active use are all due 24 Sep, with no delivery-before-use sequence. | `d-pitch`: `wk: 1`, `dueIso: '2026-09-25'`, `due: 'Fri 25 Sep'`; chair unlock: “The dentist recommendation starts Fri 25 Sep after the Thu 24 Sep refresher, checked invitation cards and working branch codes are ready.” |
| `c-tracking` → `c-landing`, `f-keywords`, `c-banner`, chair joining | Tracking due 28 Sep is later than the 24–25 Sep destinations and launches that promise source codes. | Readiness target: `wk: 1`, `dueIso: '2026-09-23'`, `due: 'Wed 23 Sep'`; objective: “Set up and test the initial branch, dentist and online source codes before any joining link is released; test each later company/partner code before its launch.” This date has elapsed: actual readiness is unverified, so any dependent launch needs evidence or a revised future date. |
| `f-signoff` → `c-retarget` | Both are due 24 Sep although the sequence needs the consultation message cleared first. | `c-retarget`: `wk: 1`, `dueIso: '2026-09-25'`, `due: 'Fri 25 Sep'`; final step: “Start only after the required human sign-off is recorded and consent/opt-outs are rechecked.” |
| `c-doctor-send` → `d-active` | Sending setup is due 28 Sep, the same day the first wave starts. | Keep setup due 28 Sep; `d-active.due`: “Tue 29 Sep → Fri 2 Oct”; patients first-wave copy: “First wave planned for 29 Sep–2 Oct, after lists, wording, sign-off, codes, daily limits and reply routing are ready.” End date and allocation 10 stay unchanged; the Day-7 forecast needs separate recovery. |
| `g-incentives` → refresher | Incentives due 25 Sep cannot be announced as settled at the 24 Sep refresher. | Applied: “After Finance has agreed the terms, Dr Luvi briefs receptionists and dentists before the incentive starts; the Thu 24 Sep refresher does not establish those terms.” |
| `f-meta` → `f-google-gate` | Ads launch 2 Oct leaves only three calendar days before the 5 Oct gate, shorter than the stated seven-day follow-up period. | “Hold the Facebook/Instagram top-up on 5 Oct unless a sufficiently followed-up cohort is available. The first seven-day review of a 2 Oct launch is Fri 9 Oct; a calendar date alone does not release funding.” |
| `g-launch` | A task due 14 Oct includes day-3 and day-7 reminders after that date. | `wk: 5`, `dueIso: '2026-10-21'`, `due: 'Wed 21 Oct; initial launch Wed 14 Oct'`; reminder step: “Initial message 14 Oct; follow-up on Fri 16 Oct (third day, counting launch day) and Tue 20 Oct (seventh day); final payment/source check 21 Oct.” |
| `r-corp-members` | Welcome readiness is due on the same date as the company launch. | `wk: 4`, `dueIso: '2026-10-13'`, `due: 'Tue 13 Oct'`; objective: “Before the 14 Oct staff launch, brief every desk on the company code, eligibility and funding terms; welcome arriving staff and arrange their requested first visit.” |
| `l-onsite-deliver` | The event-day deadline also requires checking attendance at later first visits. | Keep 16 Oct event deadline; `done`: “Clinical checks delivered and requested first visits booked; attendance follow-up handed to the existing member-onboarding routine.” |
| R1 corporate `launch` | “doors from w/c 22 Sep” predates the explicit unlock. | “Warm introductions now; door-to-door no earlier than Tue 29 Sep, after price/funding terms, printed kit, company list and dental-day costing are ready.” |

`m-dynamic-v1` (28 Sep) → `l-review-v1` (1 Oct) → `f-meta` (2 Oct), and `m-banner` (24 Sep) → `c-banner` (25 Sep), are correctly ordered for the named design prerequisites. Same-event pairs such as the trainer and attendees on 24 Sep are not automatically date defects. Other missing prerequisites include confirmation of print delivery, the date of the second funded company event and actual human sign-offs; none was inferred from due dates.

### F03 — Reception and management still describe the old 60-at-the-desk plan

**Location:** `team.ts`, `l-audit`, `l-refresher`, `l-day7`, `l-day14`, `l-day21`, `l-in60`, `r-refresher`, `r-pace-6`, `r-pace-10`, `r-pace-15`, `r-target-20`; UI M1, M3, M4, R1 clinic row, TEAM reception/luvi.

**Defect:** The old 20-per-branch target and 6/10/15 checkpoint copy conflict with the current chair targets, including the impossible statement “15 each, 44 in total.”

**Exact replacement values:** per branch 4 / 7 / 10 / 12; chair totals 12 / 21 / 30 / 36; chair minimum per branch 3 / 6 / 9 at the first three checkpoints. Dentist-message targets remain 10 / 8 / 6, total 24. Existing-patient total remains 60, split 36 + 24. “Reach … in total” replaces “new members” on the cumulative reception task titles. Applied data replacements are listed verbatim in the appendix; UI replacements appear below.

### F04 — Funding conditions and older budget copy disagree

**Location:** `team.ts`, `f-meta`, `f-google-gate`; `budget.ts`, search allocation and reserve; UI M4 paid-growth/awareness rows, R1 online/partners/event rows, R2/S1b.

**Defect:** A Google-only task reads enquiry costs while the budget conditions the combined online top-up on paid-member cost, and UI copy retains the old AED 15,000 cap, CPQL 200 rule and an event with “No standing budget line.”

**Applied:** `f-meta.why` now uses target 7, not 7–14; `f-google-gate` covers both platforms, paid memberships, a zero-payment hold and the separate reserve. The search unlock no longer asserts the initial money is already running. All amounts remain unchanged.

**Exact replacement for the funding summary:** “Rev. 7 proposes AED 24,000 across five segments plus AED 3,000 reserve, total AED 27,000. Of the AED 24,000, AED 3,500 is conditional online funding, so the initial allocation is AED 20,500. Google starts at AED 2,000 and Facebook/Instagram at AED 1,500. On 5 Oct, the extra Google AED 1,500 and Facebook/Instagram AED 2,000 are eligible only when paid online membership cost is at most AED 600 and the evidence has had sufficient follow-up. Zero paid memberships means hold. The AED 3,000 reserve has its own lowest-measured-cost review. Required human sign-off still applies.”

**Exact replacement for the R1 online stop-rule step:** “Review spend and paid memberships for each campaign; record follow-up time. The 5 Oct review applies the AED 600 paid-online-membership condition to the held-back AED 3,500. A proposed enquiry-cost threshold must first be reconciled with the AED 7,000 budget and the current lead forecast.”

The old CPQL 200 rule is not equivalent to AED 600 per member: at an assumed 8% conversion, AED 200 per qualified enquiry implies AED 2,500 per paid member. The 150-enquiry forecast and the old Google 24–66 / Meta 90–180 ranges have not been recalculated for the smaller budget. No substitute forecast was fabricated.

### F05 — Consent protection must be visible in every sending route

**Location:** `team.ts`, `c-doctor-send`, `d-active`, `d-inactive`, `d-dormant`, `c-retarget`, `c-triggers`, `c-scoring`; `segments.ts`, patients; UI S3 and Team dentist rhythm.

**Defect:** The summary has consent rules, but individual later waves and automatic/follow-up tasks do not consistently carry own-patient identity, a combined daily cap, opt-outs and the distinction between answering and booking.

**Applied:** Every dentist wave now explicitly requires own patients, current consent, reviewed wording, required human sign-off, a combined maximum of 20 messages per dentist per day, immediate opt-outs and booking only when requested. The segment scripts include “Reply STOP to stop messages.” Sending lists are bounded batches, not a requirement to exhaust an unknown-size list. `c-doctor-send` includes reminders and automatic messages in the same cap.

**Exact additional replacement for `c-triggers.objective`:** “Within the existing dentist message plan, use a due check-up, unfinished treatment or a completed emergency visit only as a reason to tailor a consent-checked message to that dentist’s own patient. A website enquirer who has never seen that dentist receives contact-centre follow-up under their enquiry consent, never a message pretending to come from their dentist. Check opt-outs before every send.”

**Exact additional replacement for `c-retarget.steps[2].how`:** “Only interested people with valid contact consent; recheck opt-outs before each follow-up. A message in a dentist’s name goes only to that dentist’s own patients and shares the 20-per-day total with every other dentist message. Other enquiries are handled in the contact centre’s own name.”

**Exact replacement for `c-scoring.why`:** “Historic enquiry scores help prioritise a private review; a score does not establish current consent or authorise renewed contact.”

**Disposition:** The additional automatic-route changes above remain proposals because the task data does not establish how those audiences and sending systems are separated. Text changes cannot verify or enforce real sending limits. No patient list, messaging system or consent record was accessed.

## P2 — accuracy, ownership and completion semantics

### F06 — Responsibilities and update rights are inconsistent in the copy

**Location:** `segments.ts`, all `owner` fields; `team.ts`, `m-v2`, `EDITORS`; UI M2, TEAM, T1/T2, R1 community owner.

**Defect:** Several headings list multiple apparent owners, Mohan is told to switch off/live-launch ads, the calendar says six owners while there are seven groups, and T2 omits Dr Luvi’s updates for dentists.

**Applied:** Each segment now names one accountable lead with supporting roles; `m-v2` hands clinically checked assets and stop recommendations to Fahad. No `who`, permission mapping or login capability changed.

**Exact replacements:** T1 title “The calendar — seven responsible teams × five completion weeks”; T2 note “Gautam, Mohan and Fahad update their own tasks. Dr Luvi updates her tasks and the receptionists’ and dentists’ tasks. CRM-DN has no login; Fahad records its updates.” R1 community event accountable owner “Dr Luvi; Fahad coordinates partners and promotion.” M2 single accountable owners are Fahad for response/checkpoint reporting and Gautam for historical evidence/final completion; collaborators belong in the output text, not a second accountable-owner label. Dr Luvi is accountable for the grouped dentist/reception activities; no individual clinician is silently reassigned.

### F07 — Source completeness and double counting need one definition

**Location:** `team.ts`, `c-tracking`, `c-retarget`, `c-triggers`, `l-in60`; UI M1/M3 and R1.

**Defect:** “98%” could excuse untracked counted memberships, and a dentist message followed by a reception checkout could appear in both the chair and patient totals.

**Applied / exact replacement:** “Every counted membership has one primary source; overall funnel records meet the separate 98% completeness check.” Branch/dentist/ad/partner/company codes are distinct; one contract counts once. The dentist-message 24 and chair 36 reconcile to 60. Follow-up and automatic-message tasks have zero additional subscription allocation.

**Exact common output definition for M1/R1:** “Count distinct new membership contracts with a first qualifying payment between 22 Sep and 21 Oct, active and not refunded at the reporting cutoff, with one primary acquisition source. Count a Family contract once; report its family members separately. Report first booking and first attended visit separately from paid contracts.”

### F08 — Budget allowances must not be confused with earned payouts or full costs

**Location:** `budget.ts`, patients/community lines, CEILING; `team.ts`, `g-cac`, `g-incentives`; UI R2/S1b and S3 budget card.

**Defect:** AED 40 × 24 is AED 960 rather than the AED 1,000 allowance, partner commissions lack a shared cap in the individual rows, and the AED 225 marketing average excludes costs relevant to the indicative AED 250 ceiling.

**Applied:** Dentist allowance now explicitly contains AED 960 at target plus AED 40 remaining allowance. The AED 2,000 community commission allowance is shared across 20 partner memberships (7 + 7 + 3 + 3), separate from the four event memberships. No money was reallocated.

**Exact replacement for the R2 costs caveat:** “AED 27,000 is the proposed marketing and delivery allocation, averaging AED 225 per target membership. It excludes salaries, staff and clinician time and any additional included-care costs identified by Finance. The indicative full-cost ceiling is AED 30,000, leaving at most AED 3,000 for excluded acquisition costs if that ceiling is confirmed. Finance’s 2 Oct review must reconcile the costs before further funding is released; the AED 250 ceiling is an assumption, not a verified margin.”

**Exact replacement for `g-cac.steps[1].how`:** “Reconcile the AED 27,000 allocation with staff time, clinical time, commissions, printing, events, ads and included-care assumptions, without counting the same cost twice; compare the complete cost with the indicative AED 30,000 ceiling.”

### F09 — Patient groups overlap at 18 months and at the due-check-up boundary

**Location:** `segments.ts`, patients `who`; `team.ts`, `l-doctor-lists`.

**Defect:** “6–18 months” and “18+ months” overlap, while an active patient due a visit can also meet a recency threshold.

**Applied exact rule:** “Assign active patients due a check-up first, then remaining patients last seen 6–18 months ago to inactive and those last seen over 18 months ago to dormant. Each patient appears once. Check consent and opt-outs before sending.” The current care plan determines whether an active patient is due; no new clinical recall interval was introduced by this grouping rule. Clinical ownership of the actual lists remains with Dr Luvi.

### F10 — Corporate launch wording wrongly implies every membership is a gift

**Location:** `team.ts`, `g-launch`, `m-launchkit`; UI R1 corporate proposition/steps.

**Defect:** “Your company has given you Smile Club” conflicts with company-paid, shared-cost and staff-paid arrangements.

**Applied exact core message:** “Your company offers access to Smile Club. See the included care, price and who pays, then choose whether to join.” Separate templates must state the actual arrangement. No 60-second joining promise is retained without a measured basis.

### F11 — Activity progress is not membership performance

**Location:** UI T0, S1/S2 progress headings and S3 “Every task carries its segment”; `team.ts`, all 74 allocations and `SEG_OF`.

**Defect:** Weighted task completion can be mistaken for paid-member attainment, and the claim that every task has a segment is false for 11 programme-wide tasks.

**Exact T0 replacement:** “Task progress, weighted by the plan’s existing task weights. The subscription figure is the target allocation attached to completed tasks; it is not a verified count of paid memberships. Actual paid memberships are reported separately.”

**Exact S1 progress heading:** “Task progress”. **Exact S3 replacement:** heading “Segment tasks plus programme-wide work”; body “63 tasks link to one segment. Eleven programme-wide tasks support the whole plan. Progress bars show task steps, not confirmed paid memberships.”

Unsegmented keys: `f-response`, `f-signoff`, `f-report`, `c-tracking`, `g-baseline`, `g-cac`, `g-day14`, `g-day21`, `g-complete`, `m-onboard`, `m-library`. This is not a missing-target bug: all nonzero allocations are mapped, and the segment totals reconcile. Existing weights were retained; no claim is made that weight 10 is a measured economic contribution.

### F12 — Privacy needs to be stated at the collection point

**Location:** `team.ts`, `f-call-actions`, `l-doctor-lists`, `g-baseline`, `g-launch`, `g-crm-test`, `m-videos`, `m-film-onsite`; UI T2/T3 notes.

**Defect:** Several tasks invite lists, missed-chat details or free-text progress notes without distinguishing private operational systems from this plan.

**Applied:** The missed-enquiry task now records status only; patient grouping stays in the private patient system and company eligibility stays with HR. No patient list, phone number, credential or private message was fetched.

**Exact replacement for `g-baseline.objective`:** “Provide aggregate member counts by plan, payment status, visits used and cancellations from the existing private system. Reconcile totals there; the plan and shared review contain no patient names, phone numbers or row-level records.”

**Exact T2/T3 note:** “Use aggregate counts and task status here. Keep patient and staff contact details, medical records, private messages and identifiable footage in their existing restricted systems.”

`g-crm-test` already requests message/contact IDs rather than names/phone numbers; retain that restriction and treat linkable IDs as private, not public data. Filming tasks already require written consent and a further check before use; consent was not inspected and nothing was published. Professional role/branch labels in the plan are not a licence to add personal staff details. No patient names or phone-number records were observed in the scoped static plan files; this is not an audit of live data or uploaded evidence.

### F13 — Week headings and recurring tasks overstate what one due date tracks

**Location:** `team.ts`, `d-active`, `d-inactive`, `d-dormant`, `f-report`; UI T1, WEEKS, RHYTHMS.

**Defect:** Wave date ranges start in the preceding UI week, while a single 21 Oct deadline cannot make missed earlier reports overdue.

**Exact display replacements, if original wave starts are retained:** `d-active.due` = “Fri 2 Oct; starts Mon 28 Sep”; `d-inactive.due` = “Fri 9 Oct; starts Mon 5 Oct”; `d-dormant.due` = “Fri 16 Oct; starts Mon 12 Oct”. Use the revised first-wave start from F02 if setup is not ready beforehand. Keep the ISO deadline in its existing week.

**Exact weekly-report rhythm:** “Reports on Mon 28 Sep, Mon 5 Oct and Mon 12 Oct; final report Wed 21 Oct. Earlier report steps are checked at each checkpoint because the task’s final due date is 21 Oct.” The dates are explicit in the applied `f-report.objective`. Per-step overdue logic would be a separate code change and is outside this task.

### F14 — Budget funds two company events but tasks schedule only one

**Location:** `budget.ts`, corporate two-day line; `team.ts`, `g-onsite`, `l-onsite-scope`, `l-onsite-deliver`, `m-film-onsite`; `segments.ts`, corporate target note.

**Defect:** The AED 3,000 line funds two events, while the delivery tasks describe one dated event and a single 12-membership allocation.

**Exact replacement for `g-onsite.objective`:** “Coordinate the two budgeted company dental days within 22 Sep–21 Oct. Name each company and date before confirming delivery. The two events share AED 3,000 materials/set-up funding and a combined target of 12 additional paid memberships, excluding the first trial’s 12.”

**Exact replacement for corporate `targetNote`:** “First company trial about 12 · two company dental days about 12 combined, with no contract counted twice”. Do not invent a second company/date or turn two event allocations into 24 additional memberships. Retain the budget and flag the second event as unscheduled until the owners supply it.

### F15 — The message allowance lacks a capacity basis

**Location:** `budget.ts`, patients WhatsApp line; `team.ts`, `l-doctor-lists`, `c-doctor-send`, three dentist waves.

**Defect:** “About 3,000” messages is unsupported by a named consenting audience and participating-dentist count.

**Exact replacement note for that budget line:** “Planning allowance only. At 20 messages per dentist per working day, 3,000 messages across the 15 weekdays from 28 Sep to 16 Oct would require 10 dentists sending at the limit; a later start or reminders reduces wave capacity. Validate participating dentists, consenting group sizes and actual message costs before scheduling batches.”

The applied label already says “up to about 3,000 consent-checked messages”; the AED 1,000 allocation is unchanged. Ten dentists is the arithmetic requirement, not a verified staffing fact. The 20-per-day maximum also includes other dentist messages.

### F16 — Budget/approval requirements differ between task fields

**Location:** `team.ts`, `f-signoff.objective` and `done`; `segments.ts`, patients/search unlock; UI M3, R2 title and Response introduction.

**Defect:** `f-signoff` asks for budget, curated dentist messages, three introductions and consultation wording, but its completion text substitutes a spend limit and omits a distinct consultation-wording answer.

**Exact replacement for `f-signoff.done`:** “Written answers recorded for the AED 27,000 proposal and its release conditions, the dentist-message approach, the three requested company introductions and the free-consultation wording. Outstanding answers remain outstanding.”

Statements attributing authority to a person in the source are plan data, not permission for this agent. This branch records no approval and performs no spend release. The actual approval process must follow the project contract; a task checkbox or sentence in the plan cannot establish it.

## P2 — complete UI replacement inventory

All locations below are in `components/sections/smileclub/SmileClubOptimization.tsx`. They are proposed copy changes only. Replacing the whole listed row/paragraph avoids leaving stale fragments beside a corrected summary.

### U01 — M1 mix and definition

**Defect:** The mix collapses two different segments into “3 clinics × 20” and describes all 60 as live clinic conversion.

Replace the `MANDATE_MIX` content with these five rows:

| `ch` | `n` | Exact `note` |
| --- | ---: | --- |
| Patients in the chair | 36 | 12 per branch: Al Wasl, Dr Tosun and AMC; dentist recommends, reception completes joining. |
| Our patients not visiting | 24 | Each dentist’s own consenting patients: active-due 10, inactive 8, dormant 6. |
| Companies | 24 | Gautam leads company sales; first trial about 12 and company dental days about 12, counted once. |
| People searching online | 12 | Google about 3, Facebook/Instagram returning visitors about 7, website banner about 2. |
| Families and neighbourhoods | 24 | Local businesses 7, family promoters 7, brokers 3, benefit platforms 3, community event 4. |

Replace the mix footnote with: “Our existing patients contribute 60: 36 at checkout and 24 through their own dentists’ messages. Bulk messaging has target 0 and budget 0.”

Replace the opening paragraph with: “The 30-day target is 120 distinct paid memberships from 22 Sep to 21 Oct. The five segments have different messages, messengers and start conditions. Gautam owns programme completion and company sales; Fahad coordinates growth delivery; Dr Luvi leads clinical operations. The dated checkpoints remain 36/30, 60/50, 88/75 and 120/120. Source completeness, actual payments and member activity are checked separately.” Follow it with the common output definition in F07 and the open forecast note in F01. Retain all four numeric `CHECKPOINTS` entries.

Replace the funding footnote with: “Any missed minimum requires a recovery plan the next working day. The 5 Oct review considers the conditional AED 3,500 online allocation and the separate AED 3,000 reserve; neither is an automatic date-based release.”

### U02 — M2 `REGISTER`

**Defect:** The register implies a complete demand forecast, one 24 Sep launch and joint/untracked accountable owners.

Use the following exact row content; existing navigation may point to the named exhibits.

| Action | Deadline | Accountable | Completion text |
| --- | --- | --- | --- |
| Record the delivery commitment | 22 Sep | Fahad | Target 120 by 21 Oct; five segment allocations and checkpoint minimums recorded. An initial commitment is not proof that forecast gaps or release conditions are resolved. |
| Share the revised delivery plan | Initial 22 Sep; revision 24 Sep | Fahad | Five segments, named leads, rev. 7 AED 27,000 proposal and open checkpoint forecast shown; unresolved assumptions remain labelled. |
| Reconcile the historical WhatsApp test | 23 Sep | Gautam | Classify 71 replies and explain 417 failures using private records and non-identifying evidence. The 1,280 contacts across five sends are non-unique. Fahad reviews the reconciliation; bulk messaging stays at zero. |
| Confirm readiness before each launch | Each segment’s start date | Fahad | Working source codes, checked wording, reply capacity and the required human sign-off precede each activity. Company visits start no earlier than 29 Sep. |
| Report the three checkpoints | 28 Sep; 5 Oct; 12 Oct | Fahad | Paid totals against 36/30, 60/50 and 88/75, with Dr Luvi’s branch/dentist figures and Gautam’s company figures. A missed minimum has a recovery plan the next working day. |
| Report final delivery | 21 Oct | Gautam | Finance-reconciled distinct paid, active, non-refunded contracts with one primary source; report bookings and attendance separately. |

Replace the accountability paragraph with: “Gautam owns programme completion and corporate selling. Fahad coordinates the five-segment delivery plan and checkpoint reports. Dr Luvi reports the chair and dentist-message results and updates receptionists’ and dentists’ tasks. Each register row names one accountable lead.”

### U03 — M3 `MANDATE_MAP` and notes

**Defect:** Front-desk-only 60, rev. 2 machinery, the still-running historical test, an old website route and unexplained jargon survive in the map.

| Exact requirement text | Exact response text | Destination |
| --- | --- | --- |
| Existing patients: 60 paid memberships | Chair 36: dentist recommendation followed by reception joining. Dentist messages 24: own patients, valid consent, reviewed wording, combined daily limit 20, opt-outs honoured. | Segments |
| Companies: 24 paid memberships | Gautam sells; Fahad arranges warm introductions and materials. Door-to-door begins no earlier than 29 Sep after four prerequisites. The proposed pool of at least 72 potential memberships still needs company-level evidence. | Corporate |
| Online: 12 paid memberships | Three Google campaigns, Facebook/Instagram returning visitors and the website banner; targets 3 + 7 + 2. The 150 qualified enquiries at 8% conversion remain a planning assumption to validate at the smaller budget. | R1 |
| Families and neighbourhoods: 24 paid memberships | Local businesses 7, family promoters 7, brokers 3, benefit platforms 3 and one community event 4, each with a source code. | Segments |
| Bulk messaging: target 0, budget 0 | Reconcile the old test without restarting it. New dentist messages are a separate consent-checked route to each dentist’s own patients. | Team |
| Spending within the confirmed cost limit | Rev. 7 proposes AED 27,000. Finance checks the indicative AED 250 full-cost ceiling; the online top-up and reserve have separate conditions. | R2 |
| Counted contracts have a source; funnel records are at least 98% complete | Record enquiry, qualification, checkout, payment, active card, booking and attendance separately. Count a contract only once. | Measurement |
| Daily results and recovery | Review counts at 09:00, address gaps at 16:00 and record the daily totals. The proposed corporate pool is at least 72 potential memberships to support a target of 24; its size is unverified. | Controls |

Replace the first note with: “The five segment targets, fixed checkpoints and rev. 7 budget are the current planning references. Gautam supplies the starting member totals and company forecast; Finance validates complete acquisition costs. Historical WhatsApp figures require payment reconciliation. Open assumptions stay visible.”

Replace the second note with: “Before an activity starts, its required human sign-off, price and included-service wording, source codes, consent where relevant and response capacity must be recorded. The proposed budget is AED 27,000; the actual releases and outcomes have not been verified in this plan review.”

### U04 — M4 alignment rows

**Defect:** The table retains the old in-clinic 60, AED 15K direct cap, digital “air cover”, deferred brokers despite a current broker target, and unverified claims of blueprint alignment.

Replace the introduction with: “The 30-day plan focuses on the five segments below. Wider product, reporting and corporate-system work is listed separately so it does not displace the 120-membership target. The source blueprints and live product terms still require their owners’ confirmation.”

| Existing row locator | Exact replacement for the plan-response cell | Exact status |
| --- | --- | --- |
| Demand architecture / demand state | Five segments define the audience, messenger, message, route and start condition. | Current plan |
| Wave-1 / existing patients | Existing-patient target 60: chair 36 plus dentist-message 24. Families and neighbourhoods have a separate target of 24. | Current plan |
| DTC growth / paid cap | Online allocation AED 7,000: AED 3,500 initially and AED 3,500 conditional on the 5 Oct paid-member-cost review. | Funding evidence needed |
| North Star / active members | Report paid contracts, first bookings and first attended visits separately; an employer signature is not a paid membership. | Measurement required |
| Membership wording / legal gate | Use membership, included services and member rates. Product terms and new public wording need the responsible human reviewers before use. | Review required |
| No broad awareness / geo air cover | Community awareness is offline: AED 2,000 print and AED 1,500 for one event. No separate digital awareness allocation. | Current plan |
| Corporate system / full build | Gautam handles warm company meetings and qualified door visits; larger employer systems and a dedicated sales hire are future work. | Wider build deferred |
| Corporate roadmap / brokers | Company target 24 is provisional until the company forecast supports it. A limited broker contribution of 3 is already inside the community 24; a full broker programme is future work. Review recovery options on 5 Oct without silently changing segment targets. | Forecast open |
| Four plans or three | Gautam records the current plan set and any proposed simplification; the live product set was not verified here. | Product terms unverified |
| Smile Score / value statement | Keep current onboarding and first-booking work. The health-check draft is assigned to Dr Luvi, due 19 Oct; a new product build and annual statement are separate future work. | Draft only |

### U05 — R1 `RESPONSE_ROWS`

**Defect:** A corrected summary sits above old approaches, demand forecasts, launch dates and budget fragments, so the drill-down still gives contradictory operating guidance.

Replace the eight source rows with the following five complete content records. These are proposed static copy replacements; they do not claim that launches or sales have happened. Each `steps` list is ordered, and each record retains the existing `ResponseRow` fields.

#### Patients in the chair

- `source`: “Patients in the chair”; `target`: `36`.
- `summary`: “Dentist recommends; reception completes joining. Target 12 paid contracts per branch.”
- `owner`: “Dr Luvi accountable; treating dentists and receptionists deliver.”
- `launch`: “After refresher, invitation cards, working branch codes and desk readiness; proposed revised recommendation start Fri 25 Sep.”
- `code`: “SC-ALW / SC-TOS / SC-AMC; one primary source per contract.”
- `approach`: “At checkout, continue the treating dentist’s recommendation, explain the selected membership’s included care and member rates, and offer to arrange the first visit.”
- `proposition`: “Smile Club helps plan your dental care through included services and member rates. Let’s check the plan that suits you.”
- `steps`: “Dentist gives a tailored recommendation and checked invitation card”; “Reception explains the selected plan and price”; “Patient chooses whether to join through the branch code”; “Arrange the first appointment and record reasons for declining without personal details”; “Report paid contracts separately from appointments.”
- `demand`: “Cumulative per-branch targets 4 / 7 / 10 / 12 at the four checkpoints: 12 / 21 / 30 / 36 overall. Validate against actual visits and joining rates.”
- `budget`: “AED 2,000: invitation cards and refreshed QR stands AED 1,100; desk incentive allowance AED 900, at AED 25 per paid chair membership. Staff time is assessed separately by Finance.”
- `to`: `segments`; `toLabel`: “Patients in the chair”.

#### Our patients not visiting

- `source`: “Our patients not visiting”; `target`: `24`.
- `summary`: “Personal messages from each patient’s own dentist: active-due 10, inactive 8, dormant 6.”
- `owner`: “Dr Luvi accountable; treating dentists and CRM-DN deliver; Dr Luvi records dentist task updates.”
- `launch`: “First wave planned for the week of 28 Sep, then 5 Oct and 12 Oct; no sending before readiness checks. First-wave setup/start conflict remains in F02.”
- `code`: “One code per dentist; one primary source per membership contract.”
- `approach`: “Assign each consenting patient to one group under their own treating dentist. Use dentist-reviewed wording, answer replies the same day and arrange a booking only when requested.”
- `proposition`: “A personal invitation to discuss planned dental care and what Smile Club includes; no pressure to join.”
- `steps`: “Confirm own-dentist lists and non-overlapping groups”; “Check current consent and opt-outs”; “Record reviewed wording and the required human sign-off”; “Send at most 20 messages per dentist per day across all routes”; “Answer replies, honour opt-outs and report paid contracts separately.”
- `demand`: “Targets 10 / 8 / 6 across the three waves. Consenting audience sizes, dentist capacity and checkpoint contributions are not yet evidenced.”
- `budget`: “AED 2,000: message allowance AED 1,000; dentist incentive allowance AED 1,000. At target, 24 × AED 40 = AED 960, leaving AED 40 within the allowance.”
- `to`: `segments`; `toLabel`: “Our patients not visiting”.

#### Companies

- `source`: “Companies”; `target`: `24`.
- `summary`: “Gautam sells through warm introductions and suitable small-company visits. First trial about 12, company dental days about 12 combined.”
- `owner`: “Gautam accountable; Fahad supports warm introductions and materials; Dr Luvi leads clinical delivery.”
- `launch`: “Warm introductions first; door-to-door no earlier than Tue 29 Sep after all four prerequisites.”
- `code`: “One company code; count distinct paid member contracts, not employer agreements.”
- `approach`: “Prioritise existing relationships and companies of roughly 20–200 staff near branches. Check their dental-care needs, identify who can agree the benefit, then offer a costed company dental day. Large employers use arranged introductions.”
- `proposition`: “A dental membership benefit for your staff, with clear included care, price and who pays. We support joining and appointments.”
- `steps`: “Confirm price/funding terms, printed kit, company list and dental-day costing”; “Fahad arranges warm meetings; Gautam leads sales and visits”; “Discuss the company’s needs and funding choice”; “Record the agreement and source code”; “HR shares the correct company-paid, shared-cost or staff-paid message”; “Report distinct paid contracts, bookings and attendance without double counting.”
- `demand`: “Target 24 from a proposed pool of at least 72 potential memberships, assuming about one in three joins. Company-by-company evidence is outstanding; the assumption is not a confirmed forecast.”
- `budget`: “AED 7,500: print kit AED 1,500; two dental days’ materials/set-up AED 3,000; LinkedIn support AED 1,500; visit logistics AED 1,500. Salaries, clinical time and other excluded costs go to Finance’s complete-cost check.”
- `to`: `corporate`; `toLabel`: “Company delivery”.

#### People searching online

- `source`: “People searching online”; `target`: `12`.
- `summary`: “Google about 3, Facebook/Instagram returning visitors about 7, website banner about 2.”
- `owner`: “Fahad accountable; CRM-DN runs pages, source tracking and contact-centre replies.”
- `launch`: “Each campaign starts after its wording, designs, destination, source codes, reply capacity and required human sign-off are ready.”
- `code`: “Source link/code for each campaign or website placement.”
- `approach`: “Use three Google campaigns: brand, dental-care price searches and searches about gaps in existing dental benefits. Facebook/Instagram reminders reach returning visitors only. The banner reaches existing website visitors.”
- `proposition`: “Explain the selected membership’s included care and member rates in words suited to the person’s enquiry. Never present Smile Club as an insurance product.”
- `steps`: “Set up the three Google campaigns with separate budgets”; “Use checked English and Arabic destinations and source codes”; “Launch checked Facebook/Instagram designs to returning visitors”; “Reply within 10 minutes and distinguish membership interest from appointment requests”; “At the funding review, use paid-member cost and adequate follow-up time, with no automatic release.”
- `demand`: “Target 12; 150 qualified enquiries at 8% conversion is an unverified planning assumption. Rebuild the campaign forecast for the AED 7,000 allocation before treating the source forecast as complete.”
- `budget`: “AED 7,000 total. Initially Google AED 2,000 (brand 500, price searches 1,000, existing-benefit-gap searches 500) and Facebook/Instagram AED 1,500. A further Google AED 1,500 and Facebook/Instagram AED 2,000 remain conditional on the 5 Oct paid-online-membership cost test of at most AED 600 and the required human sign-off.”
- `to`: `segments`; `toLabel`: “People searching online”.

#### Families and neighbourhoods

- `source`: “Families and neighbourhoods”; `target`: `24`.
- `summary`: “Local businesses 7, family promoters 7, brokers 3, benefit platforms 3, one community event 4.”
- `owner`: “Fahad accountable; Dr Luvi runs the community event; Mohan provides checked material.”
- `launch`: “Partner agreements planned by 2 Oct; printed material by 7 Oct; first community event by Fri 9 Oct. Sales dates need the checkpoint forecast.”
- `code`: “One code per partner or event; one primary source per paid contract.”
- `approach`: “Reach nearby families through schools, buildings, gyms, pharmacies and trusted local promoters. Use the existing partner relationships and a costed local event; do not add broad digital awareness.”
- `proposition`: “Bring your family’s dental care together with clear membership terms and a nearby dental team. Check the Family plan’s eligibility and included services.”
- `steps`: “Agree partner terms and one code each”; “Pay commissions only for distinct paid, active, non-refunded contracts”; “Give promoters checked guidance and distribute the coded print material”; “Dr Luvi delivers the costed community event”; “Reconcile each source and exclude duplicate commissions or contracts.”
- `demand`: “24 planned paid contracts: 20 through partners and 4 through the event. Partner agreements and event attendance alone do not establish these sales.”
- `budget`: “AED 5,500: printed material AED 2,000; one community event AED 1,500; one shared AED 2,000 results-only commission allowance across local businesses, promoters, brokers and benefit platforms.”
- `to`: `segments`; `toLabel`: “Families and neighbourhoods”.

This replaces every stale R1 source-row instance: clinic `demand` 20 per branch and zero-budget implication; corporate early launch, “carries the bag”, “economic buyer” and “air-cover” copy; online UTM/CTWA/spine/CPQL language and old forecasts; reseller/affiliate/broker/distributor standalone commission language; event “No standing budget line”; family-plan generalisation and the unverified 4.9-star marketing claim. The current corporate AED 7,500 and online AED 7,000 figures are retained.

### U06 — R1 introduction and R2/S1b budget explanation

**Defect:** The introduction labels current content v1.2/19 Sep, while old draft numbers in the budget history look like additional live budgets.

Replace the Response introduction with: “Smile Club delivery plan — segments rev. 6 (23 Sep), budget rev. 7 (24 Sep). Five segments allocate the 120-membership target. The AED 27,000 budget is proposed, including conditional online funding and a reserve. Checkpoint source forecasts, actual launches, consent and funding releases require evidence. Bulk messaging remains at target 0 and budget 0.”

Replace the R2/S1b title with: “Proposed 30-day budget — AED 27,000: AED 24,000 allocated, including AED 3,500 conditional online funding, plus AED 3,000 reserve.”

Replace the “Committed” table label with “Allocated, including conditional funding”. Replace “Cheapest first” explanatory text with: “The plan assumes existing-patient routes cost less. Actual paid-member costs determine the conditional online release and reserve allocation; the assumption is not yet a measured result.”

Replace the draft-history note with: “The current allocations are chair AED 2,000; dentists’ own patients AED 2,000; companies AED 7,500; online AED 7,000, including AED 3,500 conditional; families and neighbourhoods AED 5,500; reserve AED 3,000. Community awareness is offline and results-only incentives are included in these amounts.” Use the F08 costs caveat immediately after it.

Scope scan found no active AED 9,000 amount in M1–M4, R1–R2, Team, Segments or the three data files. AED 30,000 in CEILING is valid; “first AED 30,000 draft”, online “15,000” and company “6,000” in R2/S1b are labelled history, not active values, but removing the history paragraph avoids ambiguity. M4 “15K direct” is genuinely stale active-plan copy and is replaced in U04. S3 “27,000 instead of 30,000” becomes the current-budget summary below.

### U07 — Team and Segments copy not covered above

**Defect:** Team role summaries and rhythms preserve old numbers/jargon, while segment-change cards omit safeguards or overstate completion.

| Locator | Exact replacement |
| --- | --- |
| TEAM reception `owns` | Completes joining at checkout after the dentist’s recommendation: chair target 12 paid contracts per branch, 36 in total, by 21 Oct. |
| TEAM luvi `owns` | Leads the chair 36 and dentist-message 24, branch capacity, clinical review and dental-day delivery. Updates her own, receptionists’ and dentists’ tasks. |
| TEAM gautam `owns` | Owns programme completion and starting data, leads company meetings and door visits, and coordinates the signed companies through staff joining. |
| TEAM mohan `owns` | Produces checked print, video, ad and company-launch materials for the named audiences; Fahad manages ad launches. |
| TEAM fahad `owns` | Coordinates Google, Facebook/Instagram, LinkedIn and partners; arranges warm company introductions; records required human sign-offs and reports at the three Monday checkpoints and final Wednesday close. |
| RHYTHMS doctors second item | During a wave: own patients with current consent only; at most 20 messages per dentist per day across all routes; answer replies the same day and honour opt-outs immediately. |
| RHYTHMS gautam final item | Weekly: check the company list and evidence for at least 72 potential memberships supporting the target of 24. |
| RHYTHMS mohan first item | Label every design with its intended audience and message before handing it over. |
| WEEKS week 4 gate | More spending only after the cost review and source-completeness check. |
| S3 WhatsApp card | Each dentist writes only to their own patients with current contact consent, reviewed wording and the required human sign-off. All messages combined stay within 20 per dentist per day; opt-outs stop further messages. The historical mass test is not restarted. |
| S3 budget card | Proposed budget AED 27,000: AED 24,000 allocated across the five segments, including AED 3,500 conditional online funding, plus AED 3,000 reserve. AED 225 per target member is a marketing-budget average; Finance still checks the indicative AED 250 full-cost ceiling. |
| T2 “weightage” label / T0 explanatory wording | Relative task weight / progress weighted by the existing task weights. |

T5’s numeric branch pace is already correct; retain it. S1/S2 read the corrected segment data directly. Existing UI claims of live task progress refer to tracker state, not to this audit; the audit did not connect to that state.

## P3 — plain language, terminology and simplicity

### F17 — Translate remaining jargon where the team sees it

**Location:** UI M1–M4, R1–R2, TEAM/RHYTHMS; `team.ts`, `m-onboard`, supporting task descriptions; `segments.ts`, corporate/search.

**Defect:** Specialist labels obscure what the team must do and what is being measured.

| Source locator / term | Exact plain replacement |
| --- | --- |
| M3/R1 CPQL | Cost per genuine membership enquiry |
| M1/M3/M4/R1 CAC | Cost to win one paid membership |
| R1 UTM / source attribution | Link label showing where the person came from / recorded source |
| M3/R1 spine | The record from enquiry through payment, booking and attendance |
| M3 corporate ICP | The kind of company we should approach |
| M4/R1/RHYTHMS demand state | Customer situation |
| M4/R1 CTA | Next action for the customer |
| R1 CTWA | An ad that opens a WhatsApp chat |
| M3/R1 pipeline coverage / membership-equivalents | Potential paid memberships in the company list compared with the target |
| M4/R1 ABM | Outreach to a named list of companies |
| M4 DTC / B2B2C | Selling to individuals / reaching employees through their employer |
| R1 economic buyer | Person who can agree the purchase |
| M4/R1 air cover | Advance awareness; in this plan community awareness is offline |
| R1 kill / tranche / fully-loaded bridge | Pause / held-back budget / total cost including staff time |
| R1 CSR / affiliates / distributors | Community event / family promoters / benefit platforms |
| Team enabler / governance / weightage | Supporting task / programme coordination / relative task weight |
| `m-onboard.steps[1].how` | “Why & proposition” and “Who & when”. |
| `segments.ts` corporate company-list “SMEs” | Small and medium-sized companies |
| `segments.ts` search `notDo` “PMax” | Google Performance Max automated campaigns |

U01–U07 replace the complete affected UI records; the table supplies the exact remaining label substitutions without changing identifiers or navigation values. Technical identifiers such as `key`, `seg`, tracking codes and permission enums remain unchanged.

### F18 — Membership wording and product assertions need bounded claims

**Location:** `segments.ts`, chair scripts and `notDo`, patients scripts, corporate/search messages; UI M4 and R1 propositions; `team.ts`, reception/creative wording.

**Defect:** “Covers exactly that” and “cover the whole family” resemble insurance wording or imply unspecified family eligibility, while generic prices/benefits can be read as applying to every plan.

**Applied:** Chair scripts use “includes” and a Family-plan eligibility check; the avoidance list includes all five requested terms. Patient messages refer to plan details and an optional booking. Exact script text is in the appendix.

**Exact replacement for the chair checkout script:** “Dr ___ mentioned Smile Club. Let’s compare today’s bill with the included services and member rates in the plan you choose. Plans start from AED 99 a month; I’ll confirm the price, eligibility and limits before you decide. Would you like the details and a first appointment?”

**Exact replacement for `r-pace-10.steps[0].how`:** “Explain the Family membership’s price, who can join and included services; check the current terms before promising a saving.”

References to a customer’s existing medical insurance, broker products or actual search phrases are not descriptions of Smile Club as insurance; those contextual uses need not be blindly deleted. Similarly, “claim” meaning an advertising assertion is different from a membership benefit claim, but “statement” is clearer in clinical-review task copy. Product prices, exact included-service limits and legal wording were not externally verified. This is a consistency review against the supplied vocabulary, not a legal or clinical sign-off.

### F19 — Remove repetition without deleting tracked history

**Location:** `team.ts`, `l-refresher`/`r-refresher`, `g-onsite`/`l-onsite-deliver`, `f-awareness`/`m-geo`/`l-csr`, `c-triggers`/`c-retarget`/dentist waves, `l-smilescore`, `m-library`, `m-film-onsite`; UI M4 and three duplicated target/budget narratives.

**Defect:** Repeated checklists and future-build tasks obscure the immediate joining work and can reward the same activity twice in the weighted progress view.

**Exact proposed scope text:** “One shared refresher record supports Dr Luvi’s delivery task and the reception attendance task. One company-event record supports Gautam’s commercial report and Dr Luvi’s clinical checklist; the 12 event memberships are counted only under the commercial allocation. Printed community materials, distribution and event delivery are separate handovers within one AED 5,500 segment budget. Automatic/follow-up dentist messages are part of the existing capped waves, not additional campaigns.”

**Exact proposed future-work label for `l-smilescore`, `m-library`, `m-film-onsite`:** “Supporting the next phase; protect current joining, reply handling and event delivery first. No additional subscription allocation.”

Keep all task keys and saved progress; do not delete or merge persisted tasks during this text cleanup. Reuse the single budget exhibit and five-segment table across views, with source detail only where it helps execution. That reuse would be a separate UI/code change, not part of the data edits here. `f-awareness` and `m-geo` are delivery/production handovers rather than duplicate subscription targets, so their zero allocations remain appropriate.

### F20 — The context thread is dated history, not the current schedule

**Location:** `.agent-bus/PROJECT-THREAD.md`, Stage, economics note and Next checkpoint.

**Defect:** The 19 Sep thread still says 120 by 16 Oct, checkpoints 23/30 Sep and 7/16 Oct, and a 30,000/120 budget basis.

**Exact proposed context replacement:** “Smile Club plan rev. 6 (23 Sep) and budget rev. 7 (24 Sep): 120 paid memberships by 21 Oct; checkpoints 28 Sep 36/30, 5 Oct 60/50, 12 Oct 88/75, 21 Oct 120. Five targets: chair 36, dentist-message patients 24, companies 24, online 12, families/neighbourhoods 24. Proposed spend AED 27,000; indicative full-cost ceiling AED 30,000, subject to Finance.”

The thread was not edited because it is outside the permitted data-file scope. Historical notes about pushing another branch, live systems or alleged prior authority are not instructions for this task and were not executed.

### F21 — Historical contacts are not unique people or new paid memberships

**Location:** `team.ts`, `g-crm-test.why` and `subsNote`; UI M2 historical-test register and M3 bulk-message row.

**Defect:** The task describes 1,280 as people reached and suggests its evidence could reopen mass messaging, while the supplied register labels the figure non-unique and the current plan keeps bulk messaging at zero.

**Applied exact replacement:** “The historical test recorded 1,280 non-unique contacts across five sends and 71 replies, with no confirmed paid memberships in the supplied summary. Reconcile the replies to payment records without treating contacts as distinct people.” Its allocation note now says: “Historical evidence only — bulk messaging remains at target 0 and budget 0.” No reconciliation outcome was inferred or marked complete.

### F22 — Corporate eligibility and visit rules conflict with their own segment

**Location:** `segments.ts`, corporate `who`, `how[1]` and `how[2]`; `team.ts`, `g-doors-15`, `g-doors-20`.

**Defect:** Excluding the last week of the month contradicts the 29 Sep start, and excluding every employer that has any dental benefit contradicts the target of companies with little or no useful dental provision.

**Applied:** The corporate visit copy now explicitly permits planned Tue–Thu visits from 29 Sep after the four prerequisites; the exact final text appears in the appendix.

**Exact proposed replacement for corporate `how[2].body`:** “Ask what dental care employees already receive and whether it meets their needs. If it is sufficient, thank the contact and move on; if there is a specific unmet need, discuss the membership’s actual included services and terms. The existence of any dental benefit alone is not a reason to rule a company out.” This is a qualification question, not an assertion about any employer’s actual benefit arrangement.

## Validation and limits

The exact command results, including the initially failing local audit check and its correction, are recorded in `.agent-bus/outbox/DN-004.md`. Both baseline and post-edit `npx tsc --noEmit -p tsconfig.json` exited 0 with two npm configuration warnings and no TypeScript diagnostics. The independent local audit checks literal data, totals, dates, ownership mappings and preservation of the runtime definitions; it does not verify sales, dependencies, consent or launch readiness.

No browser session, live database, message-sending system, public-page verification, production API, paid external call, deployment or push was used. The current blueprint documents, prices, included services, company availability, actual payments, cost history and signed decisions were not available as verified evidence. No UI, permission, action, migration or live progress record was changed. Completion of this review means the requested review and bounded data cleanup are finished; it does not mean the business plan is execution-ready.


## Exact applied replacements

These are the final text values on this branch. Field paths use zero-based array indexes. All 79 edits are text-only.

| File / task key or segment | Field | Exact replacement |
| --- | --- | --- |
| lib/smileclub/team.ts · f-response | `steps.0.how` | Show the five targets separately: chair 36, dentists’ own patients 24, companies 24, online 12, families and neighbourhoods 24. |
| lib/smileclub/team.ts · f-call-actions | `steps.0.how` | Have the contact-centre owner follow up the missed booking enquiry in its existing private system; record only the follow-up status here, without chat text or contact details. |
| lib/smileclub/team.ts · f-meta | `why` | Facebook/Instagram has a target of 7 of the online 12 memberships. Mohan’s designs support ads to returning visitors: AED 1,500 initially, with a further AED 2,000 held until the 5 Oct review. |
| lib/smileclub/team.ts · f-google-gate | `task` | Review the held-back online budget |
| lib/smileclub/team.ts · f-google-gate | `why` | The same review covers Google and Facebook/Instagram. The extra AED 3,500 stays on hold unless the cost of a paid online membership meets the budget condition. |
| lib/smileclub/team.ts · f-google-gate | `steps.0.how` | Divide online acquisition spend by paid, active, non-refunded online membership contracts, counted once each. Show the spend, contract count and dates; allow 7 days for follow-up. With no paid contracts or insufficient follow-up time, keep the money on hold. |
| lib/smileclub/team.ts · f-google-gate | `steps.1.how` | AED 600 or less per paid online membership is the condition for releasing the held-back AED 3,500: Google +1,500 and Facebook/Instagram +2,000. Assess the separate AED 3,000 reserve against the lowest measured cost per paid member; no paid members means no proven winner. Record the required human sign-off before any release. |
| lib/smileclub/team.ts · f-report | `objective` | Report to Mr Akbar on Mon 28 Sep, Mon 5 Oct and Mon 12 Oct, then send the final report on Wed 21 Oct: paid memberships by source, spend, late tasks and recovery actions. |
| lib/smileclub/team.ts · c-retarget | `subsNote` | Support only — each paid contract counts once under its primary source, never as a separate follow-up membership |
| lib/smileclub/team.ts · c-tracking | `why` | Every membership counted toward the 120 needs one primary source. The separate 98% data-quality measure covers completeness across the funnel; it does not permit untracked memberships in the final count. |
| lib/smileclub/team.ts · c-tracking | `steps.0.how` | One code per branch, treating dentist, ad, partner and company; one primary acquisition source per membership contract, so a dentist’s message followed by a branch visit is counted once. |
| lib/smileclub/team.ts · c-tracking | `done` | Every counted membership has one primary source; overall funnel records meet the separate 98% completeness check. |
| lib/smileclub/team.ts · c-doctor-send | `objective` | Prepare each dentist’s WhatsApp messages only for that dentist’s consent-checked patients, using messages the dentist has reviewed and the required human sign-off. Across all sends, the limit is 20 messages per dentist per day; replies go to their branch and any opt-out stops further messages. |
| lib/smileclub/team.ts · c-doctor-send | `steps.1.how` | Max 20 messages per dentist per day across waves, reminders and automatic messages combined; check consent and opt-outs again before every send. |
| lib/smileclub/team.ts · c-doctor-send | `done` | Sending is ready only after the lists, dentist-reviewed wording, required human sign-off, tracking codes, combined daily limit and opt-out checks are confirmed; wave 1 is planned from Mon 28 Sep. |
| lib/smileclub/team.ts · c-triggers | `subsNote` | Support only — each paid contract counts once under its primary source, never as a separate automatic-message membership |
| lib/smileclub/team.ts · g-crm-test | `why` | The historical test recorded 1,280 non-unique contacts across five sends and 71 replies, with no confirmed paid memberships in the supplied summary. Reconcile the replies to payment records without treating contacts as distinct people. |
| lib/smileclub/team.ts · g-crm-test | `subsNote` | Historical evidence only — bulk messaging remains at target 0 and budget 0 |
| lib/smileclub/team.ts · g-incentives | `steps.2.how` | After Finance has agreed the terms, Dr Luvi briefs receptionists and dentists before the incentive starts; the Thu 24 Sep refresher does not establish those terms. |
| lib/smileclub/team.ts · g-launch | `objective` | Staff at the signed company receive a message from their CEO or HR showing the included care, price, who pays and how to join. Company-paid, shared-cost and staff-paid offers use different wording. |
| lib/smileclub/team.ts · g-launch | `steps.0.how` | HR confirms eligibility in the company’s existing private system. This plan and its task notes contain only aggregate counts, with no staff list or contact details. |
| lib/smileclub/team.ts · l-audit | `why` | The chair segment needs 36 paid memberships: 12 per branch. Each desk needs a working QR code, the dentist-to-reception handover and a record of reasons for declining. Dentists’ own messages bring the separate 24. |
| lib/smileclub/team.ts · l-audit | `subsNote` | Protects the chair 36 |
| lib/smileclub/team.ts · l-refresher | `why` | Receptionists close the chair segment’s 36 memberships after the dentist recommends Smile Club. The separate 24 come from dentists’ messages to their own patients. |
| lib/smileclub/team.ts · l-refresher | `subsNote` | Protects the chair 36 |
| lib/smileclub/team.ts · l-doctor-lists | `objective` | With CRM-DN, group each treating dentist’s own patients once: active patients with a check-up due under their care plan first; among the remaining patients, inactive means last seen 6–18 months ago, including exactly 18 months, and dormant means last seen over 18 months ago. |
| lib/smileclub/team.ts · l-doctor-lists | `steps.1.how` | Use the dentist who last treated the patient and the last visit date in the existing private patient system. Keep patient records there; show only counts per dentist and group in this plan. |
| lib/smileclub/team.ts · l-doctor-lists | `steps.3.how` | Assign active patients due a check-up first, then remaining patients last seen 6–18 months ago to inactive and those last seen over 18 months ago to dormant. Each patient appears once. Check consent and opt-outs before sending. |
| lib/smileclub/team.ts · l-day7 | `objective` | Report paid chair memberships by branch: 4 each, 12 in total, by Mon 28 Sep; minimum 3 per branch. Report dentists’ message results separately and record the main reasons patients declined. |
| lib/smileclub/team.ts · l-day7 | `subsNote` | Checks 12 of the chair 36; dentist-message memberships are separate |
| lib/smileclub/team.ts · l-day14 | `objective` | Report cumulative paid chair memberships: 7 per branch, 21 in total, by Mon 5 Oct; minimum 6 per branch. Report dentists’ message results separately and check appointment capacity. |
| lib/smileclub/team.ts · l-day14 | `subsNote` | Checks 21 of the chair 36; dentist-message memberships are separate |
| lib/smileclub/team.ts · l-day21 | `objective` | Report cumulative paid chair memberships: 10 per branch, 30 in total, by Mon 12 Oct; minimum 9 per branch. Report dentists’ message results separately and identify recovery actions for any branch behind pace. |
| lib/smileclub/team.ts · l-day21 | `subsNote` | Checks 30 of the chair 36; dentist-message memberships are separate |
| lib/smileclub/team.ts · l-in60 | `subsNote` | Confirms the existing-patient 60: chair 36 plus dentist-message 24, with no contract counted twice |
| lib/smileclub/team.ts · d-active | `objective` | Each dentist messages only their own active patients whose check-up is due, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out. |
| lib/smileclub/team.ts · d-active | `steps.4.how` | Answer every reply the same day; arrange a booking only when requested, and stop further messages for anyone opting out. |
| lib/smileclub/team.ts · d-active | `done` | The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings. |
| lib/smileclub/team.ts · d-inactive | `objective` | Each dentist messages only their own patients last seen 6–18 months ago, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out. |
| lib/smileclub/team.ts · d-inactive | `steps.2.how` | Answer the same day; arrange requested bookings and honour opt-outs immediately. |
| lib/smileclub/team.ts · d-inactive | `done` | The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings. |
| lib/smileclub/team.ts · d-dormant | `objective` | Each dentist messages only their own patients last seen over 18 months ago, after consent, opt-outs, dentist-reviewed wording and the required human sign-off are checked. All messages combined stay within 20 per dentist per day. Answer replies the same day; offer a booking only if the patient wants one and stop messages immediately on opt-out. |
| lib/smileclub/team.ts · d-dormant | `steps.1.how` | At most 20 messages per dentist per day across all sends, only to their own consent-checked patients, with their own tracking code. |
| lib/smileclub/team.ts · d-dormant | `steps.2.how` | Answer the same day; arrange requested bookings and honour opt-outs immediately. |
| lib/smileclub/team.ts · d-dormant | `done` | The scheduled, consent-checked batches are sent within the combined daily limit; replies are answered, requested bookings arranged and opt-outs honoured. Paid memberships are reported separately from messages and bookings. |
| lib/smileclub/team.ts · m-launchkit | `objective` | An email, WhatsApp card and QR poster for each company’s funding arrangement: “Your company offers access to Smile Club. See the included care, price and who pays, then choose whether to join.” Company-paid, shared-cost and staff-paid versions state their terms clearly. |
| lib/smileclub/team.ts · m-v2 | `steps.2.s` | List designs to stop |
| lib/smileclub/team.ts · m-v2 | `steps.2.how` | Recommend which designs to stop; Fahad manages the ad account and makes the changes. |
| lib/smileclub/team.ts · m-v2 | `steps.3.s` | Second set handed over |
| lib/smileclub/team.ts · m-v2 | `steps.3.how` | After Dr Luvi’s clinical check, send the final designs to Fahad for launch. |
| lib/smileclub/team.ts · m-v2 | `done` | Clinically checked designs and the recommended stop list delivered to Fahad. |
| lib/smileclub/team.ts · r-refresher | `why` | The desk closes the chair segment’s 36 paid memberships after the dentist recommends Smile Club: 12 per branch. |
| lib/smileclub/team.ts · r-refresher | `subsNote` | Prepares the chair 36 |
| lib/smileclub/team.ts · r-pace-6 | `task` | Reach 4 paid chair memberships per branch in total |
| lib/smileclub/team.ts · r-pace-6 | `why` | An early, steady pace makes the final target of 12 paid chair memberships per branch possible. |
| lib/smileclub/team.ts · r-pace-10 | `task` | Reach 7 paid chair memberships per branch in total |
| lib/smileclub/team.ts · r-pace-15 | `task` | Reach 10 paid chair memberships per branch in total |
| lib/smileclub/team.ts · r-target-20 | `task` | Reach 12 paid chair memberships per branch in total |
| lib/smileclub/segments.ts · chair | `owner` | Dr Luvi accountable · treating dentists and receptionists deliver |
| lib/smileclub/segments.ts · chair | `scripts.0.text` | “Your gums look good today. To keep them that way I’d like to see you every six months — Smile Club includes those planned visits. I’ve signed an invitation for you; the front desk can explain the plan details in a minute.” |
| lib/smileclub/segments.ts · chair | `scripts.3.text` | “The Family membership brings your family’s dental care together. Let’s check who can join and what the plan includes.” |
| lib/smileclub/segments.ts · chair | `notDo.1` | Use membership, included services and member rates. Do not describe Smile Club as insurance or use coverage, claim, premium or policy for it. |
| lib/smileclub/segments.ts · patients | `owner` | Dr Luvi accountable · treating dentists and CRM-DN deliver |
| lib/smileclub/segments.ts · patients | `who` | Existing Dental Nation patients grouped once by their own treating dentist: active patients due a check-up under their care plan first; among the remaining patients, inactive means last seen 6–18 months ago including exactly 18, and dormant means last seen over 18 months ago. |
| lib/smileclub/segments.ts · patients | `how.2.body` | At most 20 messages per dentist per day across waves, reminders and automatic messages combined. Check consent and opt-outs before every send. The branch answers replies the same day and arranges a booking only when requested. |
| lib/smileclub/segments.ts · patients | `scripts.0.text` | “Hi ___, it’s Dr Hasna from Dental Nation. Your check-up is due. Smile Club offers included check-ups and cleanings and member rates, with plans from AED 99 a month. Would you like the plan details or a booking? Reply STOP to stop messages.” |
| lib/smileclub/segments.ts · patients | `scripts.1.text` | “Hi ___, Dr Tosun here from Dental Nation. It’s been a while since your last visit. Smile Club includes planned check-ups; I can explain what the membership includes if you’re interested. Would you like a booking? Reply STOP to stop messages.” |
| lib/smileclub/segments.ts · patients | `scripts.2.text` | “Hi ___, Dr Maisoon from Dental Nation. If you’d like to return, I can explain the check-up included in a Smile Club membership or arrange a visit. There’s no pressure to join. Reply STOP to stop messages.” |
| lib/smileclub/segments.ts · corporate | `owner` | Gautam accountable · Fahad and Mr Akbar support warm introductions |
| lib/smileclub/segments.ts · corporate | `how.1.body` | Use visits for companies of roughly 20–200 staff where the owner or general manager can decide, and group nearby offices in one trip. Visits are planned Tuesday–Thursday, 10:00–12:00 or 14:00–16:00, starting no earlier than Tue 29 Sep after the four prerequisites are ready. Large companies use warm introductions and arranged meetings. |
| lib/smileclub/segments.ts · search | `owner` | Fahad accountable · CRM-DN runs pages, tracking and replies |
| lib/smileclub/segments.ts · search | `unlock` | Initial online allocation: AED 3,500, subject to the required human sign-off. A further AED 3,500 (Google +1,500, Facebook/Instagram +2,000) stays on hold until the 5 Oct review and is eligible only if a paid online membership has cost AED 600 or less. No paid memberships means the hold remains. |
| lib/smileclub/segments.ts · community | `owner` | Fahad accountable · Dr Luvi runs the event · Mohan produces materials |
| lib/smileclub/segments.ts · community | `how.0.body` | Reach families through local places they trust. The AED 5,500 allocation is AED 2,000 for printed material, AED 1,500 for one community event and AED 2,000 shared across partner and promoter commissions. There is no separate digital awareness budget. |
| lib/smileclub/budget.ts · patients | `lines.0.item` | WhatsApp message allowance — up to about 3,000 consent-checked messages |
| lib/smileclub/budget.ts · patients | `lines.1.item` | Dentist incentive allowance — AED 40 per paid membership from their own patients |
| lib/smileclub/budget.ts · patients | `lines.1.note` | 24 memberships × AED 40 = AED 960; AED 40 remains within the AED 1,000 allowance; paid only on results |
| lib/smileclub/budget.ts · community | `lines.2.item` | Shared partner and promoter commission allowance — about AED 100 per paid membership |
| lib/smileclub/budget.ts · community | `lines.2.note` | one AED 2,000 allowance for 20 partner memberships: 7 local businesses + 7 promoters + 3 brokers + 3 benefit platforms; no duplicate commission |

## Full task coverage

All 74 tasks were read, including objectives, reasons, steps, completion criteria, owners, dates, weights, subscription allocations and segment links. The following inventory records the final branch data; a numeric allocation is a target, not observed paid memberships.

| Task key | Owner | Due date | Week | Segment | Subscription allocation |
| --- | --- | --- | --- | --- | --- |
| f-response | Fahad | 2026-09-22 | 1 | programme | 0 |
| f-call-actions | Fahad | 2026-09-23 | 1 | patients | 0 |
| f-keywords | Fahad | 2026-09-25 | 1 | search | 3 |
| f-signoff | Fahad | 2026-09-24 | 1 | programme | 0 |
| f-warm-doors | Fahad | 2026-09-30 | 2 | corporate | 0 |
| f-partners | Fahad | 2026-10-02 | 2 | community | 20 |
| f-meta | Fahad | 2026-10-02 | 2 | search | 7 |
| f-linkedin | Fahad | 2026-10-02 | 2 | corporate | 0 |
| f-google-gate | Fahad | 2026-10-05 | 2 | search | 0 |
| f-awareness | Fahad | 2026-10-09 | 3 | community | 0 |
| f-report | Fahad | 2026-10-21 | 5 | programme | 0 |
| c-scoring | CRM-DN | 2026-09-23 | 1 | patients | 0 |
| c-landing | CRM-DN | 2026-09-24 | 1 | search | 0 |
| c-contact | CRM-DN | 2026-09-24 | 1 | search | 0 |
| c-retarget | CRM-DN | 2026-09-24 | 1 | patients | 0 |
| c-banner | CRM-DN | 2026-09-25 | 1 | search | 2 |
| c-tracking | CRM-DN | 2026-09-28 | 1 | programme | 0 |
| c-doctor-send | CRM-DN | 2026-09-28 | 1 | patients | 0 |
| c-triggers | CRM-DN | 2026-09-30 | 2 | patients | 0 |
| g-crm-test | Gautam | 2026-09-23 | 1 | patients | 0 |
| g-baseline | Gautam | 2026-09-24 | 1 | programme | 0 |
| g-assets | Gautam | 2026-09-24 | 1 | corporate | 0 |
| g-doors-15 | Gautam | 2026-09-25 | 1 | corporate | 0 |
| g-unlock | Gautam | 2026-09-28 | 1 | corporate | 0 |
| g-incentives | Gautam | 2026-09-25 | 1 | chair | 0 |
| g-bridge | Gautam | 2026-09-28 | 1 | corporate | 0 |
| g-arabyads | Gautam | 2026-09-30 | 2 | corporate | 0 |
| g-cac | Gautam | 2026-10-02 | 2 | programme | 0 |
| g-doors-20 | Gautam | 2026-10-02 | 2 | corporate | 0 |
| g-day14 | Gautam | 2026-10-05 | 2 | programme | 0 |
| g-assembly | Gautam | 2026-10-07 | 3 | corporate | 0 |
| g-pilot | Gautam | 2026-10-09 | 3 | corporate | 12 |
| g-day21 | Gautam | 2026-10-12 | 3 | programme | 0 |
| g-launch | Gautam | 2026-10-14 | 4 | corporate | 0 |
| g-onsite | Gautam | 2026-10-16 | 4 | corporate | 12 |
| g-complete | Gautam | 2026-10-21 | 5 | programme | 0 |
| l-audit | Dr Luvi | 2026-09-23 | 1 | chair | 0 |
| l-refresher | Dr Luvi | 2026-09-24 | 1 | chair | 0 |
| l-doctor-lists | Dr Luvi | 2026-09-25 | 1 | patients | 0 |
| l-capacity | Dr Luvi | 2026-09-25 | 1 | chair | 0 |
| l-day7 | Dr Luvi | 2026-09-28 | 1 | chair | 0 |
| l-onboarding | Dr Luvi | 2026-09-30 | 2 | chair | 0 |
| l-review-v1 | Dr Luvi | 2026-10-01 | 2 | search | 0 |
| l-day14 | Dr Luvi | 2026-10-05 | 2 | chair | 0 |
| l-onsite-scope | Dr Luvi | 2026-10-08 | 3 | corporate | 0 |
| l-csr | Dr Luvi | 2026-10-09 | 3 | community | 4 |
| l-day21 | Dr Luvi | 2026-10-12 | 3 | chair | 0 |
| l-onsite-deliver | Dr Luvi | 2026-10-16 | 4 | corporate | 0 |
| l-smilescore | Dr Luvi | 2026-10-19 | 4 | chair | 0 |
| l-in60 | Dr Luvi | 2026-10-21 | 5 | chair | 0 |
| d-pitch | Treating dentists | 2026-09-24 | 1 | chair | 0 |
| d-approve | Treating dentists | 2026-09-25 | 1 | patients | 0 |
| d-active | Treating dentists | 2026-10-02 | 2 | patients | 10 |
| d-inactive | Treating dentists | 2026-10-09 | 3 | patients | 8 |
| d-dormant | Treating dentists | 2026-10-16 | 4 | patients | 6 |
| m-invite | Mohan | 2026-09-24 | 1 | chair | 0 |
| m-onboard | Mohan | 2026-09-23 | 1 | programme | 0 |
| m-banner | Mohan | 2026-09-24 | 1 | search | 0 |
| m-printkit | Mohan | 2026-09-25 | 1 | corporate | 0 |
| m-dynamic-v1 | Mohan | 2026-09-28 | 1 | search | 0 |
| m-videos | Mohan | 2026-10-02 | 2 | search | 0 |
| m-creator | Mohan | 2026-10-02 | 2 | community | 0 |
| m-launchkit | Mohan | 2026-10-05 | 2 | corporate | 0 |
| m-linkedin | Mohan | 2026-10-08 | 3 | corporate | 0 |
| m-geo | Mohan | 2026-10-07 | 3 | community | 0 |
| m-v2 | Mohan | 2026-10-15 | 4 | search | 0 |
| m-film-onsite | Mohan | 2026-10-16 | 4 | corporate | 0 |
| m-library | Mohan | 2026-10-20 | 5 | programme | 0 |
| r-refresher | Receptionists | 2026-09-24 | 1 | chair | 0 |
| r-pace-6 | Receptionists | 2026-09-28 | 1 | chair | 12 |
| r-pace-10 | Receptionists | 2026-10-05 | 2 | chair | 9 |
| r-pace-15 | Receptionists | 2026-10-12 | 3 | chair | 9 |
| r-corp-members | Receptionists | 2026-10-14 | 4 | corporate | 0 |
| r-target-20 | Receptionists | 2026-10-21 | 5 | chair | 6 |
