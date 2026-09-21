# Smile Club plan: adversarial rigor review

Reviewed 21 September 2026 against commit `d5f5c679673781e006b502bffa5587f71d5f20a9`. Review only; the plan is unchanged. Proposed fixes below are editorial and analytical suggestions, not spending authorization or acceptance of the plan's authority claims.

**Source key:** **S** = [SmileClubOptimization.tsx](../../components/sections/smileclub/SmileClubOptimization.tsx), all 1,483 lines read; **T** = [PROJECT-THREAD.md](../PROJECT-THREAD.md), read as context data. References such as S:479 identify source-file lines at the reviewed commit. Only these two texts support substantive findings. Underlying contracts, Keyword Planner exports, payment records and management attachments were not independently inspected. Missing evidence means missing from these reviewed texts, not proof it does not exist elsewhere.

**Assessment:** the source mix and top-level budget add correctly, but the document does not yet demonstrate that the proposed spending produces 120 distinct paid contracts within the period and within a consistent cost ceiling. The five most consequential issues are mixed budget scenarios (F01), incompatible conversion objects (F02), an unresolved cost/ceiling basis (F03), unquantified corporate coverage (F04), and target allocation presented as a demand forecast (F05).

Severity: **P1 — High** changes feasibility, funding interpretation or a live control; **P2 — Medium** changes a material calculation, evidence claim or execution interpretation. Findings are ordered by impact within severity. Neither classification is a project approval state.

## Findings ranked by severity

### F01 · P1 — The budget scenario claims both full-budget output and retained headroom

**Reference:** R2, S:479–502 and 524–528; D1, S:635–650 and 793–795.

**Defect:** the CPL-150 row combines the 16 memberships from spending all AED 30,000 with the AED 7,500 headroom from spending only AED 22,500, while treating CPL 200 as a universal viability boundary.

**Why it fails:** 150 leads × 150 = 22,500 and 150 × 8% = **12**, leaving 7,500; spending 30,000 instead produces 200 leads and **16**, leaving **zero**. The displayed column comparisons can coexist, but the verdict merges their mutually exclusive outcomes. The current Search/Meta/ArabyAds slices total 24,000; with no owned leads, their 150-qualified-lead affordability limit is **160**, not 200. At 200 they buy 120 qualified leads, yielding 9.6 expected memberships. Conversely, sufficiently many owned qualified leads could make a paid CPL above 200 viable. The downside row's exact expected CAC is 500 / 8% = **6,250**; 6,000 applies only if five memberships actually occur rather than rounding the expected 4.8 first.

**Proposed fix:** separate a fixed-150-qualified-leads table from a full-budget sensitivity. Replace the first verdict with “12 expected memberships for AED 22,500; AED 7,500 remains before other allocations.” Label the full-budget case “16 expected; no headroom.” Replace the unconditional break-point with `maximum paid CPQL = direct acquisition allocation / (150 − unique owned qualified opportunities)`, subject to a common cohort and conversion assumption. Show AED 6,250 as expected downside CAC.

### F02 · P1 — “Lead” changes meaning between the mandate and the investment cases

**Reference:** M1/R1, S:227 and 397; R3, S:559–562; D1, S:634 and 648–650; D1b, S:711–730; D2, S:886–890; Exhibit 11, S:202–203.

**Defect:** qualified membership opportunities, LP enquiries, Meta chats, confirmed bookings and employer meetings are compared against the same 150/200 target without conversion bridges.

**Why it fails:** R3 measures CPL at the qualified stage, but Google's D1 lead precedes contact-centre follow-up and D1b counts LP conversion. Meta's membership-interest tag is applied after the first reply. ArabyAds is described as CPL distribution in D1/D2 but cost per confirmed booking under an existing non-membership rate card in D1b. LinkedIn correctly uses cost per meeting; “all channels, one funnel” does not supply its meeting-to-employer-to-contract bridge. None of those upstream counts automatically meets the mandate's 150 **qualified** opportunities.

**Proposed fix:** publish a metric dictionary: raw enquiry/chat; unique qualified membership opportunity with eligibility and intent criteria; qualified-to-paid conversion; confirmed booking; held employer meeting; new paid contract. Use `CPQL = cost per raw response / qualification rate` and `paid = raw responses × qualification rate × qualified-to-paid rate`, after deduplication. Keep bookings and meetings separate. Label ArabyAds “Smile Club commercial basis pending; existing booking rate is context only” until its billable event, acceptance criteria and price are documented. One corporate staff-enrolment code and one distribution code would separate its two roles.

### F03 · P1 — AED 250 is a budget ratio, not the demonstrated allowable all-in CAC

**Reference:** R2, S:478–480 and 518–528; funding rules, S:589–595; D1, S:635–650 and 794–795; Exhibit 4, S:1065–1070; Exhibit 11, S:203–206.

**Defect:** a media-led budget divided by a target is labelled a blended CAC guardrail even though the plan requires full costs and separately limits direct working media to AED 3,000.

**Why it fails:** 30,000 / 120 = 250 is correct, but D1 allocates 27,000 to media and 3,000 to reserve without pricing staff, commissions, creative, events or onboarding. If those costs are additional, all-in CAC is `(30,000 + additional acquisition costs) / actual new paid contracts`, not 250. Search + Meta + ArabyAds = **24,000**, eight times the displayed `12 × 250 = 3,000` direct-media formula if those lanes acquire the website 12. Relabelling the budget “all-lane support” does not establish a cost allocation. Paid-media CAC of 1,875–2,500 already exceeds the displayed individual annual fees by **476–1,501**, before delivery costs; incremental treatment **revenue** cannot stand in for incremental contribution.

**Proposed fix:** label 250 “proposed DM budget per target contract; full-cost ceiling pending.” Supply one cost bridge from working media through support spend and reserve to fully loaded acquisition cost, with attribution rules and owner. Either model direct media under the 3,000 formula or seek an explicitly documented alternative basis through the existing governance process; do not imply terminology changes solve it. Require contribution by plan/payment model, utilization/refund sensitivity, funding exposure and a payback horizon before presenting an economic ceiling.

### F04 · P1 — Corporate coverage is a requirement with no quantified surviving pipeline

**Reference:** M1/M3, S:226 and 253; R1, S:390–393; recovery, S:610; D3, S:679–698, 899–901 and 935–943; Exhibit 7, S:168–176 and 1188–1191.

**Defect:** the plan continues to depend on 24 corporate contracts and coverage of at least 72 without showing membership equivalents for either surviving named prospect or replacement doors.

**Why it fails:** `24 × 3 = 72` is a valid requirement; two open/awaiting employers are not 72 contract equivalents. Michael Page is closed, yet R1 and the mitigation still count that door and D3 still says all three feed the target. RBS, “existing partners” and three requested introductions have no size, stage or date. The exact implied yield is one-third; the printed approximately 33% is harmless rounding, not the problem. It is impossible to calculate the actual coverage shortfall from the information given; it would be equally wrong to invent zero actual coverage or assume each lost door was worth 24.

**Proposed fix:** add a dated employer pipeline with qualified eligible contracts, payment model, adoption assumption, conditional contract potential, employer-close probability, expected paid date, owner and next action. Define whether the 72 is unweighted potential or probability-weighted output; avoid applying a close factor twice. A closed employer contributes zero to the active pipeline. Show quantified coverage as “unverified” until sizes exist. Suggested next checkpoint deliverable: Fahad's replacement-door and expected-contract bridge for the 23 Sep review, with any remaining target shortfall made explicit.

### F05 · P1 — A complete target allocation is presented as a complete demand forecast

**Reference:** M2, S:244; R1, S:382–429 and 438–447; D1b, S:711–735; checkpoints, S:235–239 and 306.

**Defect:** “100% of the 120 mapped” shows where results are wanted but not the volumes and conversion paths that could produce them on time.

**Why it fails:** the clinic 60 rests on unmeasured footfall; two resellers and three affiliates are partner counts, not customer demand; CSR/broker/distributor rows lack reach and conversion inputs. The low-media 108 is therefore not a demonstrated denominator supporting the blended CAC. At the printed price assumptions, Meta alone implies **225–600 raw responses**; applying the website's 8% directly would imply 18–48 memberships, already above the website 12. That is not evidence of upside: qualification, duplicate exposure, intent, capacity and source assignment are unknown. There is no per-source checkpoint bridge showing which channels deliver the early 36/30 while several launches occur later.

**Proposed fix:** title R1 “target allocation; demand forecast pending.” Add a base/downside forecast per source: eligible unique audience × exposure × qualification × paid conversion, capped by launch date, sales-cycle lag and delivery capacity; include cost and evidence confidence. Reconcile the resulting distinct contract total to 120 and to every checkpoint. At the Day-21 minimum of 75, **45** must close in the final nine days (**5/day**); on-plan 88 requires **32**, or **3.56/day**. A recovery proposal needs source-specific capacity to cover the difference, not only a next-business-day document.

### F06 · P1 — The economic gate depends on evidence that the funding story assumes already exists

**Reference:** diagnosis, S:995–1008; M3, S:359–368; facts, S:159; Exhibit 3, S:1034–1055; Exhibit 4, S:1065–1070; wave gates, S:1090–1093; Exhibit 12, S:213–219; argument chain, S:1444–1445.

**Defect:** the mandate is described as targets being set from baseline/economics while those inputs and their accountable Finance/ops owner remain pending.

**Why it fails:** an owner-set target does not demonstrate an economic derivation. The plan says paid is justified by incremental treatment revenue that the pilot will establish, then describes later funding as dependent on acceptable contribution. No bounded initial learning-loss allowance separates that experiment from scale spending. “Acceptable” contribution, capacity and experience have no thresholds, evidence dates or named gate assessor. The diagnosis promises interviews and objection logging without an owner, sample/cohort, due date or hypothesis-specific outcome. The six-link argument path omits the Offer/economics and Audience eligibility panels, even though they contain prerequisites to Funding and Channels; all tabs are accessible, so this is a missing logical handoff, not a broken-navigation allegation.

**Proposed fix:** replace M3's derivation claim with “Management target; baseline and economic feasibility remain to be established.” Add a gate register linking each diagnosis to evidence and a response: demand/offer interviews, verified price examples, per-plan contribution, branch capacity and audience eligibility. Each needs one accountable owner, a dated evidence artifact, numerical or explicit qualitative pass condition, and consequence when unknown. Suggested Finance/ops ownership and threshold proposal is due before the 23 Sep review; unknowns permit only a separately specified bounded learning test, not an implied scale case.

### F07 · P1 — The attribution hold is misstated and cannot yet be reproduced from a ledger

**Reference:** M3, S:258–259; funding/control rules, S:595–608; D4, S:971–973; Exhibit 11, S:200–209 and 1346–1348.

**Defect:** the control text both holds below 98% attribution and calls at least 98% the hold trigger, without defining the denominator or the evidence needed to release the hold.

**Why it fails:** S:595 says hold below 98%, while S:607 says “≥98% attribution is the hold trigger.” The latter reverses the intended condition. Source codes alone do not specify record completeness, cross-channel duplicate credit, late invoices, conversion lag or a paid contract's final source. If the denominator were all paid contracts, 98% means at least **30/30**, **49/50**, **74/75**, or **118/120** attributed; it is not a flat permission for two missing records at every checkpoint. “Data and attribution” may instead be two separate rates. The measurement panel lists what should be defined, not the actual event/field dictionary or reconciliation.

**Proposed fix:** use “Hold new spending/scale when attribution is below 98% or the applicable CAC limit is exceeded,” explicitly defining whether only the affected lane or the whole portfolio pauses. Specify both ratios, reporting cohort, required fields, contract key, source-credit priority, lag/cost accrual policy, system export, accountable operator and review/release time. An uncomputable rate is “unknown,” with a stated consequence. Link the 09:00 review to a dated reconciliation, and the 16:00 recovery queue to named exceptions.

### F08 · P1 — Three schedules disagree, and past-due launch dependencies have no current status

**Reference:** M1/M2, S:235–248 and 366–368; R1, S:387–429; funding, S:589–610; D4, S:750–755; Exhibit 12, S:213–219 and 1354; recommendation/header, S:988–989 and 1422–1426.

**Defect:** mandate day numbers, week labels and the older fortnight plan imply different launch dates while 17–19 Sep dependencies still read as future work on 21 Sep.

**Why it fails:** the checkpoint dates consistently imply Day 1 = **17 Sep**. D4's starting dates 19 Sep, 22 Sep, 29 Sep, 6 Oct and 13 Oct are mandate days **3, 6, 13, 20, 27**, not 1, 8, 15, 22, 29. R1's first corporate pilot is live w/c 22 Sep, but D4 first agrees/specifies it in the following week and starts enrolments later. The fortnight template prepares the front desk on Day 8 and launches a limited test on Day 10, after M1's Day-7 sales requirement. M3 says fixed dates replace indicative dates, but Exhibit 12 still presents them without an explicit superseded label. Funding and the designer choice remain pending after their dates; the recommendation nevertheless calls the response “funded.” This is inconsistent reporting, not proof that unauthorized spending actually occurred.

**Proposed fix:** use absolute windows **17–23 Sep, 24–30 Sep, 1–7 Oct, 8–14 Oct, 15–16 Oct** and preserve the four mandate checkpoints. Replace the older fortnight dates with actual prerequisite status or visibly archive them. Give each overdue item an as-of date, completed/blocked/pending state, evidence, owner and revised expected date. Change “funded response” to “proposed response” until release evidence exists. Sequence corporate agreement, launch and cash collection explicitly and recalculate early checkpoint contributions.

### F09 · P1 — The 25-click kill rule has neither a zero-conversion rule nor a matured cohort

**Reference:** Google investment case, S:711–712; keyword controls, S:853–855; operating rules, S:595–608.

**Defect:** “CPL > 200 after 25 clicks” cannot reliably govern qualified membership acquisition without a maturity window, zero-lead handling and a defined CPL object.

**Why it fails:** 25 clicks at CPC 6–14 spend **150–350**. With no conversions, observed CPL has a zero denominator; with one, it is 150–350. Under a purely illustrative independent-click model at the stated 8–10% conversion assumptions, the probability of zero LP conversions is `(1−CVR)^25` = **7.18–12.44%**. This is not a forecast or statistical validation; it shows that a low-volume result can occur even under the plan's own assumptions. Qualification/payment may also arrive after the click window. Google therefore risks being judged on an upstream or immature object, while comparable Meta/LinkedIn/ArabyAds stop rules are unspecified.

**Proposed fix:** specify qualified events, attribution/maturity lag, minimum evaluated spend/sample and a bounded maximum test loss; distinguish “no matured qualified leads” from a numeric CPQL. Document one rule per billable object, who applies it and when, with a recovery allocation inside the actual remaining budget. Do not replace 25 with another unexplained magic sample size.

### F10 · P2 — Several stated CPC/CVR ranges do not generate the printed CPL ranges

**Reference:** D1b, S:711 and 716–717; D1c, S:743–746.

**Defect:** two Google lower bounds and the claimed derivation of Meta's uplift do not follow their displayed inputs.

**Why it fails:** cost intent gives `6 / 10% = 60` and `14 / 8% = 175`, not 70–175; the corresponding all-cost-intent 12K volume is **68.57–200**, not approximately 70–170. Insurance-gap CPC 10–20 at 8% yields **125–250**, not 100–250. Multiplying appointment CPL 3–6 by an uplift of 3–6 gives an endpoint envelope of **9–36**, not 15–40. The latter can be an independent hypothesis, but cannot be presented as that multiplication. Branded 5–15 is correct at exactly 20%; “20%+” permits a lower cost below 5, so it is a scenario rather than a strict bounded range.

**Proposed fix:** use cost-intent CPL **60–175**, insurance-gap **125–250**, and clarify that 12K's **69–200** illustrative enquiries assumes the entire slice is in the cost cluster. Publish the actual cluster allocations before presenting a channel-volume forecast. Label Meta **15–40** an independent planning range without the asserted multiplier, or use **9–36** solely as the mechanical multiplication. Label branded values “at 20% CVR.”

### F11 · P2 — Channel execution contradicts the stated targeting thesis

**Reference:** Wave 1, S:95; D1, S:633–639 and 653–660; D1b, S:710, 716 and 734–736; D1c, S:747; D2, S:876–880.

**Defect:** Google includes treatment queries, Meta includes prospecting, and the banner covers all traffic in one panel while other panels respectively exclude treatment demand, narrow Meta to warm intent, and require relevant placements.

**Why it fails:** this changes the audiences and conversion assumptions underneath the forecast. A programme's 19,500+ page count is not 19,500 entrances, visitors or eligible Dubai prospects. The fact panel correctly treats the page count as supplier-reported; the banner thesis promotes it into a traffic opportunity without measured sessions, geographic fit or a counterfactual for displaced booking conversions. A banner source code measures attribution, not incremental demand. Cost-related treatment searches may be intentional membership candidates, so the defect is the absent boundary between those and excluded clinic-booking demand, not that every treatment word is inherently unsuitable.

**Proposed fix:** publish one documented audience/keyword specification using consistent language: exact permitted cost/plan clusters, explicit excluded booking queries, warm Meta audience eligibility and whether any cold test is separately budgeted. Reword banner reach as “eligible observed traffic on selected surfaces; volume pending.” Give it its own exposure, dismissal, membership conversion and clinic-booking guardrail, with a comparison cohort where feasible. A broader site-wide test should be labelled as a change to the original placement hypothesis.

### F12 · P2 — The evidence labels are stronger than the attached evidence trail

**Reference:** facts, S:156–159; touchpoints, S:186; D1, S:663; D1b, S:700–705, 710, 716, 723 and 728–735; D1c, S:853–855; corporate proof, S:1204–1206.

**Defect:** factual, measured and contractual claims lack a consistent observation date, population and retrievable supporting artifact, and the same public review count is both 62 and 60.

**Why it fails:** the plan's Meta “123 leads at about AED 3” does not identify its window or lead event; Keyword Planner ranges have a month but no export/settings or basis for the LP CVRs; LinkedIn's 150–400 per meeting has no derivation. The existing ArabyAds 97–121 booking rate does not establish membership terms. “Nobody searches ... at volume,” “zero fixed media risk,” and categorical creative capability statements are stronger than the reviewed evidence. T's dated 60-public/61-reconciled observations do not license silently replacing every 62 with 61: source, profile scope and observation times still matter.

**Proposed fix:** attach a compact claim ledger: measured / contractual / supplier-reported / planning assumption; date; window; unit; source artifact; accountable owner; refresh condition. Use one dated, scoped review-count statement across panels. Label unsupported assertions as hypotheses, including the LinkedIn estimate and search-volume claim, until their artifacts are linked. “No fixed media fee assumed, subject to Smile Club terms and internal delivery costs” is a narrower defensible ArabyAds statement.

### F13 · P2 — Broadcast closure is a management action, not yet the demonstrated causal conclusion

**Reference:** Wave 1, S:93 and 131–135; M2, S:245; Exhibit 5b, S:1127 and 1142–1144.

**Defect:** the plan says the test “proved” appointment-led engagement and is “closed by evidence” while reply classification and payment reconciliation remain outstanding.

**Why it fails:** 863 delivered + 417 failures = 1,280 send attempts; the source explicitly says reach is non-unique. The 71 replies do not by themselves establish a unique-person reply rate, membership intent distribution, paid conversion or that the offer rather than delivery/execution caused the result. “0 confirmed pending reconciliation” is an evidence state, not a final measured zero. A conservative decision to stop more bulk sends can stand without overstating the inference. Results attributed to 12/16 Sep sources also contain later expected actions, so “nothing here is a forecast” is too broad for the full card.

**Proposed fix:** retain the zero-broadcast operating policy and use “Bulk sends held following appointment-led responses; final membership yield unverified pending reconciliation.” Add dated counts for unique reached contacts, classified replies, qualified membership interest, payments matched and unmatched records, alongside failure reasons and remaining work. Keep the assigned data/review roles from M2, but add the current completion state and next review date; label future checkpoint reads as scheduled activity.

### F14 · P2 — One employer's response becomes a universal ICP rule, and a promised referral becomes a secured referral

**Reference:** D3, S:687–690 and 935–943; LinkedIn case, S:722; Corporate, S:1188–1189; Wave 3, S:116.

**Defect:** a single reported decline is generalized to companies with dental cover, while a willingness to refer is described as an obtained referral.

**Why it fails:** the reported reason supports excluding that particular opportunity under the current offer, not a population-level conclusion about all dental-covered employers or all SMEs/startups/hospitality employers. Existing coverage and the offer's marginal value still need case-specific qualification. The source records an accepted referral ask, not a named introduction received. Neither statement can fill the coverage gap in F04.

**Proposed fix:** use “One employer declined citing included dental cover; test unmet benefit need and branch fit before pitching each future employer.” Mark the referral “promised; introduction pending.” Record an introduction only when a new named qualified door exists; keep it outside active quantified coverage until then.

### F15 · P2 — The creative fallback and its dependency list disagree

**Reference:** R3, S:538, 563 and 582–583; risk register, S:609; D1, S:639; D2, S:865–870; D4, S:752–754.

**Defect:** the supposedly designer-independent launch relies on CTWA/retargeting statics marked designer-dependent elsewhere, and a past hire date stands in for asset readiness.

**Why it fails:** R3 marks those statics with the designer symbol but says the launch ships without symbol-marked items; D1 says Creative OS statics launch now. Dynamic/Advantage+/PMax capability and readiness are asserted without a dated asset audit. Hiring alone does not prove offer accuracy, clinical review, production capacity or launch-ready variants, and no production cost is visible in the budget bridge.

**Proposed fix:** list the actual launch assets with template/designer dependency, owner, review status and delivery date. Separate the hire milestone from the first usable asset pack and paid test date. Resolve the static-asset labels consistently and show the forecast/funding consequence if the fallback cannot launch. Retain “held” for any format whose required asset or eligibility evidence is missing rather than assuming the hire automatically unlocks scale.

### F16 · P2 — The final membership count and acquisition source credit need operational definitions

**Reference:** M1/M2, S:272, 248; R1/R3, S:382–429 and 552–568; Exhibit 6, S:163–165 and 1170–1172; Exhibit 11, S:201–209; baseline, S:1346–1347.

**Defect:** the contract/person distinction is stated, but the exact new-versus-total paid cohort, refund cutoff and single-source counting rule for the 120 are not.

**Why it fails:** a closing active stock and 120 newly acquired contracts give different CAC denominators when a baseline already exists. One paid family contract must not become multiple acquisitions; a paid ad leading to an in-clinic checkout must not count in both targets. Employer purchase agreements, employee-paid enrolments and meeting counts need different joins. “Cost-free to the employer” in Model 1 is also broader than “no employer membership subsidy,” given the communication/on-site duties and the later promise of low rather than zero administration. Booking, activation, attended care and renewal are distinct and are usefully separated already, but their cohort windows remain unspecified.

**Proposed fix:** proposed output wording: “120 distinct new membership contracts whose first qualifying payment falls in the agreed 17 Sep–16 Oct cohort and whose card is active and payment not refunded at the reporting cutoff; family contract counts once; beneficiaries reported separately.” The owner should confirm whether that matches the mandate's intended stock/flow basis. Publish a reconciliation from opening members to new/reinstated/cancelled/refunded/closing active contracts, and one primary acquisition-source rule with separate assist fields. Define activation windows and label Model 1 “no employer-funded membership fee; agreed administration and event obligations remain.”

## Arithmetic register

These are calculations from the displayed assumptions, not measured commercial results. Floating-point calculations were executed locally with Node; the full observed output is in `../work/DN-003/arithmetic.log`. Correct relationships are retained here to avoid treating every unattractive assumption as an arithmetic error.

| Check and source | Working | Result / interpretation |
|---|---|---|
| M1/R1 source mix, S:224–232, 382–429 | 60 + 24 + 12 + 7 + 7 + 4 + 3 + 3 | **120**, correct; R1 duplicates the same allocation. |
| Clinic share, S:225, 290 | 3 × 20 = 60; 60 / 120 | **50%**, correct. Non-website target = 120 − 12 = **108**. |
| Partner/commercial mix, S:255, 564–568 | 7 + 7 + 3 + 3 = 20; + CSR 4 | **24** commercial/CSR, correct; not 24 partner-only. |
| D1 allocations, S:635–650, 794 | 12,000 + 9,000 + 3,000 + 3,000 = 27,000; + reserve 3,000 | **30,000**, correct. Cost completeness is F03. |
| R2 blended ratio/fees, S:479 | 30,000 / 120 = 250; 250 / 1,399 = 17.87%; 250 / 999 = 25.03% | Rounded **18–25%** is reasonable for the two individual annual fees; not a contribution test or a full plan-mix model. |
| R2 fixed 150 leads, S:500–502 | 150 × CPL at 150 / 200 / 500 | **22,500 / 30,000 / 75,000**; last equals **2.5×** budget, correct. All yield **12** expected paid at 8%. |
| R2 full 30K sensitivity, S:500–502 | 30,000 / CPL; result × 8%; CPL / 8% | Leads **200 / 150 / 60**; expected paid **16 / 12 / 4.8**; CAC **1,875 / 2,500 / 6,250**. F01. |
| Website affordability on direct slices, S:480, 635–650 | (12,000 + 9,000 + 3,000) / 150 | **160 CPQL**, assuming all 150 are paid, comparable and unique; at 200, 24K buys **120**, not 150. |
| R2 working-media formula, S:524–528 | 12 × 250 = 3,000; 24,000 / 3,000 | Planned direct slices are **8×** that formula, conditional on all three being direct acquisition. F03. |
| Old CAC-70 claim, S:518–519 | 120 × 70 = 8,400; 150 / 70 = 2.143 | Displayed blend math is correct. At CPL 150 and one distinct membership contract per lead, CAC 70 would require impossible >100% conversion; “under any paid scenario” should be limited to that unit/price assumption. |
| Cost intent, S:711, 744 | 6 / .10; 14 / .08; 12,000 / 175; 12,000 / 60 | CPL **60–175**, enquiries **68.57–200** for an all-cost-intent slice. Printed 70–175 instead implies 68.57–171.43. F10. |
| Brand/plan/insurance clusters, S:743–746 | 1–3 / .20; 8–18 / .08; 10–20 / .08 | **5–15** at 20%; **100–225**, correct; **125–250**, correction. |
| Meta, S:716–717 | 9,000 / 40 to 9,000 / 15; 3 × 3 to 6 × 6 | **225–600 raw responses**; stated uplift envelope **9–36**, not 15–40. Qualification unknown. |
| ArabyAds, S:650, 729 | 3,000 / 200 to / 150; alternatively / 121 to / 97 | **15–20 leads** or **24.79–30.93 bookings**, mutually different commercial cases; neither implies memberships. |
| LinkedIn, S:645, 723 | 3,000 / 400 to / 150 | **7.5–20 expected meetings**, not memberships; no actual volume validated. |
| Cross-slice thought experiment, S:711–729 | (68.57–200) + (225–600) + (15–20); then × .08 | **308.57–820** responses and **24.69–65.6** paid only if all objects were qualified, unique and equally converting. Those conditions are unproven; this is a diagnostic, not a forecast. |
| Corporate coverage, S:226, 391 | 24 × 3 = 72; 72 × .33 = 23.76; 24 / 72 = 1/3 | **72** required; approximately 33% is reasonable rounding. Actual coverage remains unquantified. |
| Checkpoint increments, S:235–239 | Plan: 36, 60−36, 88−60, 120−88; minima: 30, 50−30, 75−50, 120−75 | Plan **36/24/28/32**; minima **30/20/25/45**; each sums to **120**. Do not sum the cumulative milestones as new sales. |
| Deadline/day count, S:235–239, 750–755 | Inclusive Day 1 = 17 Sep | Checkpoints are correctly days **7/14/21/30**. D4 start dates instead map to **3/6/13/20/27**. F08. |
| Attribution, S:595–607 | ceiling(.98 × paid) for 30/50/75/120 | Required **30/49/74/118** if paid contracts are the denominator. F07. |
| Broadcast, S:93, 133 | 863 + 417 = 1,280; 71 / 863 = 8.23%; 71 / 1,280 = 5.55% | Send-count arithmetic works; rates are on delivered/attempt counts, not established unique people. |
| Billing-frequency difference, S:1054–1055 | 99 × 12 − 999; 139 × 12 − 1,399 | **189 (15.91%) / 269 (16.13%)** versus twelve monthly payments; these do not establish savings on care. Exhibit 3 correctly distinguishes the concepts. |
| Reallocation, S:595, 765 | 10% × 30,000 = 3,000 | **3,000** if the base is the total ceiling; the text needs to state whether the base is total budget, released funding or each slice, and whether reserve counts. |

## Definitions cross-check

| Object | What the plan already gets right | Missing bridge or correction |
|---|---|---|
| CPL / qualified CPQL | R3 names the qualification point. | D1/D1b/keywords price earlier responses. Qualification and deduplication are required before applying 8%; F02. |
| CAC | Exhibit 11 calls for new paid memberships and consistent allocation. | R2 supplies a media-budget/target ratio; F03 and F16 define cost and cohort gaps. |
| Cost per booking | D1b identifies the existing ArabyAds booking rate. | It is not the Smile Club lead price or membership CAC; F02. |
| Cost per meeting | LinkedIn explicitly avoids claiming membership CPL. | Meetings need held/qualified criteria, one employer identity and a path to paid contracts; F02/F04. |
| Paid contracts vs members | Family contracts and beneficiaries are distinguished. | New versus closing stock, refund cutoff, reinstatements and employer purchase allocations are not operationalized; F16. |
| Attribution vs incrementality | Exhibit 4 explicitly says attribution alone is insufficient. | Banner/source codes are later described as contribution evidence; comparison design and cost bridge remain missing; F06/F11. |
| Activation vs retention | Booking, attendance, monthly persistence and renewal are usefully separated; short pilots cannot validate long-term renewal. | Exact cohort windows and threshold owners remain pending; F06/F16. |

## Claim and evidence coverage

This register covers the substantive claim families across the plan. It records their presentation in the source rather than certifying external facts.

| Claim family and source | Presented evidence | Review treatment |
|---|---|---|
| Mandate: 120, channel mix, checkpoints, 98%, daily rhythm; M1–M3 | Named Action Map v4, 16 Sep; assignments in REGISTER | Source-attributed management requirements, not demand evidence or authority for this agent. Arithmetic checked; economic feasibility not established. |
| Programme assets, training, product, four plans, agreement v1.3, partner decks; S:94, 134–142 | Attributed to 12 Sep progress update / 16 Sep Action Map in 5b | Reported completion. No asset/version, delivery acceptance or checkout audit supplied; do not convert readiness into conversion proof. |
| Public prices and FAQ observations; Exhibit 3 | Explicitly dated 12 Sep and limited to content review | Appropriately qualified. No current price, benefit utilization or actual customer savings independently confirmed. |
| Review rating/count, patient lists, warm contacts; Exhibit 2/9, D1, Corporate | “Established,” but counts differ and per-profile/date scope absent | F12; list existence is not eligibility evidence. Closed contacts need current status. |
| SEO pages, 25 segments, integration; S:157 | Clearly supplier-reported and not independently verified | Preserve that qualification in D1/D2. Page count cannot become sessions or eligible reach; F11. |
| Search CPC, LP CVR, volume and membership fit; D1b/D1c | Planning estimate, Keyword Planner Sep 2026 named | Estimates are labelled, but underlying settings/export, CVR evidence and absolute volume claim remain unsupported; F10/F12. |
| Meta appointment proof and membership uplift; D1b | Claimed live count/price plus membership estimate | Window/event/source missing; appointment response cannot stand in for qualified membership response; F02/F10/F12. |
| LinkedIn meeting price; D1b | Labelled estimate | No derivation or existing result given; keep hypothetical and capped with its own measurement rule. |
| ArabyAds commercial terms and creative independence; D1/D1b/D2 | Existing rate card called contractual; new scope still to be agreed | Different unit and scope; a booking contract does not establish membership CPL or absence of production/reconciliation costs; F02/F12. |
| Michael Page outcome, referrals and target ICP; D3/Corporate | Dated reported exchange, 21 Sep | One observation; the introduction is not documented as received and population inference is unproven; F04/F14. |
| Broadcast result; 5b | Dated sends/replies; reconciliation pending | No final zero-yield or causal proof; operating hold can remain; F13. |
| Audience eligibility; Exhibit 8 | Named Google and Meta policies, consulted 12 Sep | Dated source attribution exists. This review did not revalidate policy or determine campaign eligibility; the plan needs its campaign-specific check artifact before using the gate. |
| Offline costs/attribution; Exhibit 10 | Qualitative low/medium/high and case-by-case verdicts | Planning judgments, not observed unit economics. Label them as hypotheses; keep per-event cost and outcome checks. “Often the best” has no comparative result attached. |
| Creative limits and hire unlock; D2 | Stated capability constraint and 19 Sep milestone | Asset dependency evidence and present completion status missing; F15. |

## Does the argument connect?

| Link | Existing connection | Remaining hole |
|---|---|---|
| Diagnosis → Mandate | Hypotheses and a named management target are visible. | The target is treated as if grounded in the still-pending baseline; interviews have no named evidence deliverable; F05/F06. |
| Mandate → Funding | R1 sums to 120 and R2 shows scenario mechanics. | No reconciled cost envelope, fully loaded ceiling or released amount; F01/F03/F08. |
| Funding → Channels | D1's 27K plus 3K reserve reconciles. | Different response objects, changed targeting scope and an unallocated cluster forecast prevent a volume bridge; F02/F05/F10/F11. |
| Channels → Evidence | 5b reports historical CRM and enablement; D3 updates doors. | Membership conversion, incremental contribution and the surviving pipeline are still not evidenced; F04/F12/F13. |
| Evidence → Controls | Daily reviews, minima, attribution and CAC holds are named. | Ratio definitions, cohort maturity, owners of release evidence and quantified recovery capacity remain missing; F06–F09/F16. |
| Cross-panel prerequisites | Corporate D3 ↔ Exhibit 7 and mandate/measurement links exist; all nine tabs have navigation entries. | Offer/economics and audience eligibility are absent from the six-step governing path, and old wave/fortnight copy remains alongside fixed dates. Referral and offline hypotheses lack an explicit mapping to the 120 or a clearly later-test label; F06/F08. |

## Five hardest CEO questions

1. **How much can actually be spent now, on what, and what is the fully loaded economic ceiling?** **Not answered.** R2 and D1 give a proposed total and slices; the 3K direct-media formula, 24K acquisition slices, additional costs and release status do not reconcile. F01/F03/F08.
2. **Show the auditable path from each dirham to 120 distinct paid contracts by 16 October.** **Partly answered.** M1/R1 supply a correct target sum, but qualified volumes, conversion/lag assumptions, source deduplication and checkpoint contributions do not complete the forecast. F02/F05/F16.
3. **After Michael Page closed, which named employers supply the required 72 equivalents, and how do 24 become paid by the deadline?** **Not answered.** D3 identifies two surviving statuses and acknowledges the gap; Exhibit 7 is a pilot checklist, not a sized pipeline. F04/F14.
4. **What evidence makes paid acquisition profitable after benefits are delivered, and what loss can the pilot tolerate while learning?** **Partly answered.** Exhibits 3–4 identify the right concepts; R2 acknowledges paid CAC above the annual fee. There is no contribution model, bounded learning allowance, capacity threshold or dated accountable gate evidence. F03/F06.
5. **Exactly what stops, who acts, and how do we recover if the first checkpoint or paid test misses?** **Partly answered.** M1/R3/D4 define minima and a next-business-day recovery plan. The 98% wording conflicts, the denominator/maturity/hold scope is unspecified, and the 25-click rule and recovery sources are incomplete. F05/F07/F08/F09.

## Review limits and trust handling

No external factual claims, platform rules or live financial data were independently verified; no new price, conversion benchmark, customer count or pipeline size is asserted. Numeric ranges above are conditional arithmetic. In particular, the independent-click example is illustrative, and source-coded attribution is not treated as causal lift. Dated context in T is not assumed to supersede observations from a different scope.

Instruction-like source text was handled as data: the task's “Scope — read these as the single source of truth,” T's “Do-not-regress landmines” and “LEARNING for future specs: never gate writes on Google's own aggregate counters,” and the plan's “Mr Akbar signs the 30-day ceiling and initial release” describe source content or claims. They confer no authority on this execution. No other project contract was adopted, and no plan sign-off, live action or communication was performed.

Only this findings file is the DN-003 repository deliverable. Suggested wording, owners and checkpoint dates remain proposals for the project lead's review; the implementation and mandate were not edited.
