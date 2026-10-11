| Question | Al Wasl 2025 | Al Wasl 2026 to date | Dr Tosun 2025 | Dr Tosun 2026 to date | Al Maher 2025 | Al Maher 2026 to date |
| --- | --- | --- | --- | --- | --- | --- |
| Marketing spend recorded (AED) | 7,209.59 | 108,452.29 | not available: no campaign record | 2,843.26 | not available: no spend recorded | not available: no spend recorded |
| Unique patients acquired through marketing | not available: historical source-linked patients missing | not available for full year: old exports missing; measured Practo subset below | not available: register and source history missing | not available: migration register missing | not available: patient/source history missing | not available: patient/source history missing |
| Mean collected lifetime value per patient (AED) | not available: linked receipt and registration history missing | not available: linked receipt and registration history missing | not available: linked receipt and registration history missing | not available: linked receipt and registration history missing | not available: linked receipt and registration history missing | not available: linked receipt and registration history missing |
| Retained unique patients / annual retention | not available: linked annual activity history missing | not available: linked annual activity history missing | not available: linked annual activity history missing | not available: migration and annual activity history missing | not available: created/last-visit export missing | not available: created/last-visit export missing |

# DN-013: Ms Shadi's four questions

Prepared on 11 October 2026 from the supplied files and aggregate-only, SELECT-only checks of `lane_e` in Supabase project `wfsovcbyexqnswgrchxh`. Both task addenda are applied. All amounts are AED. A missing figure means unmeasurable from these inputs, not zero.

The spend cells show recorded amounts, not a completeness claim: Al Wasl 2025 begins on 24 November; 2026 uses Meta through 11 October and Google through 8 October. Dr Tosun is the separate manual Meta campaign from 26 February to 3 March, with its external Google account **to be added**. Portal revenue covers January to September; live bills reach 10 October; October portal encounters cover 1 to 8 October. These windows are kept separate.

The named Al Wasl 2013 to 2026 exports, Dr Tosun pre-migration register and Al Maher last-visit file are absent from both the data folder and source archive. The available archive contains recent collection workbooks, overlapping revenue snapshots, appointments and targets. It does not establish the requested complete patient history. The report therefore answers the available measures and stops at the missing inputs rather than estimating them.

## 1. Marketing spend

Definition: sum recorded Meta and Google campaign spend assigned to Al Wasl under DN-012, and show the explicit Dr Tosun manual campaign separately, without duplicating manual rows already represented in an ad account.

| Year | Al Wasl recorded AED | Dr Tosun recorded AED | Al Maher |
| --- | --- | --- | --- |
| 2023 | not available: no account/manual evidence | not available: no campaign record | not available: no spend recorded |
| 2024 | not available: no account/manual evidence | not available: no campaign record | not available: no spend recorded |
| 2025 | 7,209.59 (24 November to December) | not available: no campaign record | not available: no spend recorded |
| 2026 to source cutoffs | 108,452.29 | 2,843.26 (26 February to 3 March only) | not available: no spend recorded |

| Month | Al Wasl Meta AED | Al Wasl Google AED | Al Wasl recorded sum AED | Dr Tosun manual AED | Al Maher |
| --- | --- | --- | --- | --- | --- |
| 2023 January to 2025 October | not available | not available | not available: no observed account records | not available: no campaign record | not available: no record |
| 2025-11 | 1,217.43 | 86.02 | 1,303.45 | not available: no campaign record | not available: no record |
| 2025-12 | 2,345.87 | 3,560.27 | 5,906.14 | not available: no campaign record | not available: no record |
| 2026-01 | 10,101.40 | 11,572.11 | 21,673.51 | not available: no campaign record | not available: no record |
| 2026-02 | 4,695.52 | 19,942.38 | 24,637.90 | 1,426.82 | not available: no record |
| 2026-03 | 5,062.10 | 6,948.11 | 12,010.21 | 1,416.44 | not available: no record |
| 2026-04 | 1,832.44 | 5,922.23 | 7,754.67 | not available: no campaign record | not available: no record |
| 2026-05 | not available | 6,854.54 | 6,854.54 | not available: no campaign record | not available: no record |
| 2026-06 | not available | 6,954.18 | 6,954.18 | not available: no campaign record | not available: no record |
| 2026-07 | not available | 6,996.89 | 6,996.89 | not available: no campaign record | not available: no record |
| 2026-08 | not available | 6,964.93 | 6,964.93 | not available: no campaign record | not available: no record |
| 2026-09 | 5,953.82 | 5,393.14 | 11,346.96 | not available: no campaign record | not available: no record |
| 2026-10 | 2,918.51 | 339.98 | 3,258.49 | not available: no campaign record | not available: no record |

Sources: `meta_insights_raw` and `google_ads_insights_raw` campaign/date rows; `raw_raw_social.data` fields Date, Clinic, Channel and Spend, interpreted with month/day/year dates and AED/dh prefixes as in DN-012. One account per platform is present. No duplicate source keys or negative/missing spend amounts were found. Google retains six decimal places until final rounding.

Al Wasl January to September recorded spend is AED 105,193.79. Its matched 1 to 8 October amount is AED 2,400.39. The full October source-cutoff amount is AED 3,258.49 because Meta extends three days further. Meta has no May to August rows; DN-012 describes a pause, but absence of rows alone does not prove zero expenditure. Other gaps include Meta 24 to 28 February and 1 to 4 March. The summed amounts do not fill missing days.

The manual Al Wasl Google amount for 1 to 3 March overlaps the live account and is excluded. Manual records without a clinic cannot be assigned reliably and are not added to live totals. Dr Tosun's missing Google account is not treated as zero. No paid campaign expenditure is established for Al Maher. The current Al Wasl paid campaigns began on 24 November 2025, so earlier new patients cannot be attributed to those campaigns; their individual non-paid sources cannot be classified without the missing exports.

## 2. Patients acquired through marketing

Definition: a unique person is new at their first registration, or first visit where registration is unavailable, after matching across systems; marketing acquisition requires a recorded source, with the Practo-era subset classified by the existing Growth waterfall.

| Year | Al Wasl full-history new and marketing-acquired people | Dr Tosun | Al Maher |
| --- | --- | --- | --- |
| 2023 | not available: registration, source and linked old history missing | not available: register and source history missing | not available: patient/source history missing |
| 2024 | not available: registration, source and linked old history missing | not available: register and source history missing | not available: patient/source history missing |
| 2025 | not available: registration, source and linked old history missing | not available: register and source history missing | not available: patient/source history missing |
| 2026 | not available: registration, source and linked old history missing | not available: register and source history missing | not available: patient/source history missing |

This availability applies to every requested month in each year, including January to March 2026. The portal explicitly provides neither January to September new/returning patients nor patient source. Its visits cannot supply these missing denominators.

### Observed Al Wasl Practo-era reconciliation

| 2026 month | DN-012 / Executive new-file count | Scope |
| --- | --- | --- |
| 2026-04 | 1 | observed non-cancelled bills; October through 10 October |
| 2026-05 | 18 | observed non-cancelled bills; October through 10 October |
| 2026-06 | 23 | observed non-cancelled bills; October through 10 October |
| 2026-07 | 22 | observed non-cancelled bills; October through 10 October |
| 2026-08 | 23 | observed non-cancelled bills; October through 10 October |
| 2026-09 | 26 | observed non-cancelled bills; October through 10 October |
| 2026-10 | 12 | observed non-cancelled bills; October through 10 October |

The April to September counts are exactly **1, 18, 23, 22, 23, 26**, equal to DN-012 as requested. Their sum is 113; including October gives 125. These are the shared Executive first-observed-bill rule, not a newly reconstructed registration history: a DN-prefix file, excluding DNJ and a Tosun first bill on or before its first Al Wasl bill. Al Wasl-first patients who later attend Tosun stay eligible. Zero-value non-cancelled bills count. Earlier missing history can shift first observation; no old-system/Practo deduplication has been claimed.

The observed subset contains **11 digital-unpaid acquisitions**, comprising 9 Website and 2 AI Concierge, among the 125 Executive-rule new files. Recorded paid attribution is 0; 114 fall in the not-marketing/default group. This is the current Growth classification, not proof that paid activity had no influence. There are 82 Direct / Walk-in defaults, including 9 new files without a usable first appointment; missing attribution must not be interpreted as a known acquisition source.

| Observed 2026 cohort month | Paid | Digital unpaid | Not marketing / default | All new files |
| --- | --- | --- | --- | --- |
| 2026-04 | 0 | 0 | 1 | 1 |
| 2026-05 | 0 | 4 | 14 | 18 |
| 2026-06 | 0 | 1 | 22 | 23 |
| 2026-07 | 0 | 1 | 21 | 22 |
| 2026-08 | 0 | 2 | 21 | 23 |
| 2026-09 | 0 | 3 | 23 | 26 |
| 2026-10 | 0 | 0 | 12 | 12 |
| Observed 2026 total | 0 | 11 | 114 | 125 |

Sources: a SELECT-only reproduction of getFirstAppointmentChannels and the current Growth waterfall, using all-time evidence from practo_appointments_raw, raw_zavis, leads, crm_appointments, existing_patients and practo_patients, then joining the Executive-eligible cohort. All six attribution feeds were readable. Paid = paid search, paid social or affiliate; digital unpaid = Website, organic social, Google Business Profile or AI Concierge. The remaining group includes referral, WhatsApp, partnership and default Direct / Walk-in. Monthly channel groups sum to the same Executive counts; no phone-path estimate is added.

Separate Google Ads phone-path model: **86 estimated bookings**, comprising 46 from ad call taps, 27 from website WhatsApp taps and 13 from website phone taps. Inputs are 292 ad call taps through 8 October, plus 127 WhatsApp and 85 phone taps from website events available only from 9 July to 11 October. The existing Growth model rounds each source estimate using call/phone tap-to-booking assumptions of 75% x 75% x 80% x 35%, and WhatsApp assumptions of 75% x 80% x 35%, then caps the sum against 121 untraced desk booking identities. The cap does not reduce 86. Source: modelPhoneBookings in lib/growth/phonePath.ts and the phone-path block in lib/growth/channelPerformance.ts, reproduced with SELECT-only aggregates. These are modelled bookings, not measured acquisitions or a complete-year result. Only 78 model-pool identities intersect the 125 new billed files. Do not add 86 to 125, 11 or any observed channel count.

### Marketing and October context that is not a conversion count

| ArabyAds tracker measure | Count |
| --- | --- |
| Lead-intake records | 139 |
| Invalid | 87 |
| Pending | 48 |
| Test | 3 |
| Valid | 1 |
| Booking records in separate tracker | 76 |

| Tracker routing | Lead records | Booking records |
| --- | --- | --- |
| General / unassigned | 112 | 0 |
| Al Wasl | 12 | 44 |
| Dr Tosun | 15 | 32 |

Source: portal `Ortho Marketing` A30:C35, A38:G45 and A48:D52. The trackers are not split by month and are not linked, deduplicated patient conversions. Bookings exceed lead-intake records in the two named branch slices, confirming that a conversion rate from these two totals would be invalid. No tracker count is added to acquired patients.

| 1 to 8 October 2026 | New bill encounters | Revisit bill encounters | Total encounters | Billed AED | Collected AED |
| --- | --- | --- | --- | --- | --- |
| Al Wasl | 14 | 41 | 55 | 25,496.00 | 16,156.00 |
| Dr Tosun | 28 | 43 | 71 | 48,413.00 | 48,413.00 |
| Al Maher | 10 | 4 | 14 | 10,665.00 | 9,079.00 |

Source: portal `October MTD` A12:I14. These are indications from bill encounters, not unique new or retained patients. For the identical 1 to 8 October window, live billed amounts match exactly for Al Wasl and Dr Tosun. Live bills/unique billed files are 47/44 and 68/55 respectively, whereas portal encounter totals are 55 and 71. Different populations or status rules therefore remain even when revenue matches; no unique-patient retention rate is inferred. Al Maher has no live Practo comparison. Its portal notes also disclose an AED 142 difference between the new/old and insurance/walk-in groupings; the source-selected branch total above is not silently replaced.

The portal Zavis snapshot contains 1,440 appointments, including future dates into February 2027: 1,198 Platform, 159 Widget, 64 CRM and 19 AI-agent records. It is booking-source context, not evidence that those counts became new patients. Source: `Zavis` A42:C47 and A50:G53; snapshot exported through 24 August 2026.

## 3. Collected lifetime value

Definition: for each matched person, sum actual receipts within their registration cohort's first year, first two years, first three years and through the observed cutoff, then calculate cohort mean/median, average visits, all-patient lifetime mean and average years active.

| Registration cohort | Al Wasl | Dr Tosun | Al Maher |
| --- | --- | --- | --- |
| 2023 | not available: linked registration and full receipts missing | not available: register and linked receipts missing | not available: register and linked receipts missing |
| 2024 | not available: linked registration and full receipts missing | not available: register and linked receipts missing | not available: register and linked receipts missing |
| 2025 | not available: linked registration and full receipts missing | not available: register and linked receipts missing | not available: register and linked receipts missing |
| 2026 | not available: linked registration and full receipts missing | not available: register and linked receipts missing | not available: register and linked receipts missing |

Each unavailable cell covers all requested mean and median year-1, by-year-2, by-year-3 and to-date values, average visits, all-patient average lifetime value and average years active. A by-year-2 or by-year-3 value for a recent cohort would also require a mature observation window. There is no defensible monthly registration-cohort table without the register. Older Al Wasl cohorts back to 2013 are unavailable for the same reason.

Recent collection workbooks and monthly legacy collections do not supply a complete, cross-system person-linked lifetime denominator. DN-012 early cohort value uses non-cancelled billed amounts and is a different measure. For reconciliation only, the June observed cohort remains 23 files with AED 110,399 billed through 10 October, mean AED 4,799.96 and median AED 580. These are not collected LTV and are not used in the executive LTV cells.

### Branch collections already held in the live legacy aggregate table

| Year | Al Wasl collected AED and coverage | Dr Tosun collected AED and coverage | Al Maher collected |
| --- | --- | --- | --- |
| 2023 | 757,709.97; March to December | 4,700,578.70; January to December | not available |
| 2024 | 2,725,733.53; January to December | 5,434,733.50; January to December | not available |
| 2025 | 1,061,495.10; April absent, March/May partial-export limitations | 5,625,476.12; January to December | not available |
| 2026 | 405,956.40; January to May | 2,383,552.50; January to July | not available |

Source: `clinic_revenue_raw`, collected metric. These are observed source sums, not certified complete collections. Patient-count fields are partitioned aggregates and cannot be summed into unique annual patients or used as an LTV denominator. Al Maher's legacy amounts are billed, not collected; its inconsistent 1900-month record is excluded from period allocation. The undated 2020 to 2025 total is not allocated to years.

| Month | Al Wasl legacy collected AED | Dr Tosun legacy collected AED |
| --- | --- | --- |
| 2023-01 | not available | 341,491.00 |
| 2023-02 | not available | 491,039.50 |
| 2023-03 | 32,576.00 | 492,280.50 |
| 2023-04 | 45,749.50 | 334,861.75 |
| 2023-05 | 40,345.10 | 414,176.35 |
| 2023-06 | 42,777.40 | 437,888.75 |
| 2023-07 | 56,086.59 | 214,318.50 |
| 2023-08 | 34,759.80 | 321,316.00 |
| 2023-09 | 31,985.26 | 453,918.35 |
| 2023-10 | 45,337.43 | 395,077.50 |
| 2023-11 | 119,428.90 | 361,026.50 |
| 2023-12 | 308,663.99 | 443,184.00 |
| 2024-01 | 238,470.92 | 534,310.00 |
| 2024-02 | 215,862.02 | 424,955.50 |
| 2024-03 | 268,610.79 | 449,824.50 |
| 2024-04 | 186,706.52 | 352,658.00 |
| 2024-05 | 228,601.45 | 534,919.50 |
| 2024-06 | 248,848.25 | 412,742.50 |
| 2024-07 | 218,160.36 | 220,005.50 |
| 2024-08 | 255,805.23 | 326,561.00 |
| 2024-09 | 233,618.15 | 553,149.50 |
| 2024-10 | 168,472.60 | 547,928.50 |
| 2024-11 | 232,346.54 | 516,689.00 |
| 2024-12 | 230,230.70 | 560,990.00 |
| 2025-01 | 127,769.90 | 653,099.00 |
| 2025-02 | 118,681.30 | 557,614.25 |
| 2025-03 | 42,200.00 | 496,375.00 |
| 2025-04 | not available | 506,990.25 |
| 2025-05 | 62,900.00 | 671,288.75 |
| 2025-06 | 108,075.00 | 403,523.50 |
| 2025-07 | 118,330.00 | 254,267.25 |
| 2025-08 | 107,225.00 | 356,808.62 |
| 2025-09 | 104,025.00 | 490,750.00 |
| 2025-10 | 73,183.00 | 441,868.00 |
| 2025-11 | 129,775.00 | 336,616.00 |
| 2025-12 | 69,330.90 | 456,275.50 |
| 2026-01 | 91,343.80 | 485,511.50 |
| 2026-02 | 113,651.40 | 360,140.00 |
| 2026-03 | 66,493.60 | 270,484.50 |
| 2026-04 | 97,648.50 | 330,214.00 |
| 2026-05 | 36,819.10 | 283,985.00 |
| 2026-06 | not available | 432,297.50 |
| 2026-07 | not available | 220,920.00 |
| 2026-08 | not available | not available |
| 2026-09 | not available | not available |
| 2026-10 | not available | not available |

### Portal revenue and revenue per reported visit reference

| January to September 2026 | Revenue AED | Collections AED | Reported visits | Revenue per reported visit AED |
| --- | --- | --- | --- | --- |
| Al Wasl | 1,193,028.00 | 828,391.00 | 867 | 1,376.04 |
| Dr Tosun | 3,039,027.00 | 3,045,009.00 | 1218 | 2,495.10 |
| Al Maher | 393,912.00 | 359,802.00 | 250 | 1,575.65 |

Source: portal `Branch Monthly` A3:J29, with recalculated sums. Revenue per visit is revenue divided by reported visits, not a per-person or lifetime measure. The Al Wasl monthly sum is AED 1,193,028; the portal headline is AED 1,193,027, an acknowledged AED 1 rounding difference. Al Maher January explicitly reports zero revenue and visits; its revenue per visit is unavailable because the denominator is zero.

| Branch | 2026 month | Revenue AED | Collections AED | Reported visits | Revenue per visit AED |
| --- | --- | --- | --- | --- | --- |
| Al Wasl | 2026-01 | 95,861.00 | 92,182.00 | 70 | 1,369.44 |
| Al Wasl | 2026-02 | 103,069.00 | 101,470.00 | 94 | 1,096.48 |
| Al Wasl | 2026-03 | 50,617.00 | 75,386.00 | 73 | 693.38 |
| Al Wasl | 2026-04 | 99,769.00 | 99,389.00 | 105 | 950.18 |
| Al Wasl | 2026-05 | 209,238.00 | 96,111.00 | 111 | 1,885.03 |
| Al Wasl | 2026-06 | 162,544.00 | 89,870.00 | 106 | 1,533.43 |
| Al Wasl | 2026-07 | 202,246.00 | 77,827.00 | 82 | 2,466.41 |
| Al Wasl | 2026-08 | 103,283.00 | 84,884.00 | 117 | 882.76 |
| Al Wasl | 2026-09 | 166,401.00 | 111,272.00 | 109 | 1,526.61 |
| Dr Tosun | 2026-01 | 483,263.00 | 443,512.00 | 173 | 2,793.43 |
| Dr Tosun | 2026-02 | 358,495.00 | 333,594.00 | 142 | 2,524.61 |
| Dr Tosun | 2026-03 | 269,794.00 | 308,331.00 | 110 | 2,452.67 |
| Dr Tosun | 2026-04 | 327,434.00 | 320,164.00 | 128 | 2,558.08 |
| Dr Tosun | 2026-05 | 283,498.00 | 349,647.00 | 126 | 2,249.98 |
| Dr Tosun | 2026-06 | 432,668.00 | 417,311.00 | 206 | 2,100.33 |
| Dr Tosun | 2026-07 | 272,948.00 | 267,843.00 | 105 | 2,599.50 |
| Dr Tosun | 2026-08 | 239,513.00 | 231,204.00 | 95 | 2,521.19 |
| Dr Tosun | 2026-09 | 371,414.00 | 373,403.00 | 133 | 2,792.59 |
| Al Maher | 2026-01 | 0.00 | 0.00 | 0 | not available |
| Al Maher | 2026-02 | 10,080.00 | 10,746.00 | 10 | 1,008.00 |
| Al Maher | 2026-03 | 34,128.00 | 15,607.00 | 31 | 1,100.90 |
| Al Maher | 2026-04 | 95,078.00 | 58,736.00 | 41 | 2,318.98 |
| Al Maher | 2026-05 | 61,425.00 | 35,438.00 | 48 | 1,279.69 |
| Al Maher | 2026-06 | 81,955.00 | 74,855.00 | 46 | 1,781.63 |
| Al Maher | 2026-07 | 73,081.00 | 77,609.00 | 34 | 2,149.44 |
| Al Maher | 2026-08 | 12,094.00 | 46,485.00 | 18 | 671.89 |
| Al Maher | 2026-09 | 26,071.00 | 40,326.00 | 22 | 1,185.05 |

## 4. Retained patients and retention

Definition: annual active patients have any visit or receipt; annual retention is the share of unique people active in year Y who are active again in Y+1, while new-cohort retention is the share with a later visit within twelve months of their first registration/visit.

| Year of activity / new cohort | Al Wasl | Dr Tosun | Al Maher |
| --- | --- | --- | --- |
| 2023 | not available: incomplete linked annual history | not available: incomplete history and migration register absent | not available: created/last-visit file absent |
| 2024 | not available: incomplete linked annual history | not available: incomplete history and migration register absent | not available: created/last-visit file absent |
| 2025 | not available: incomplete linked annual history | not available: incomplete history and migration register absent | not available: created/last-visit file absent |
| 2026 | not available: incomplete linked annual history | not available: incomplete history and migration register absent | not available: created/last-visit file absent |

These cells cover annual active people, the true new/returning split, retained counts, year-on-year rates and twelve-month cohort returns. All monthly full-history new/returning splits are unavailable for the same reasons. The 2026 to 2027 annual result is not yet observable, and the 2026 Practo cohorts have not completed twelve months. Even if the Al Maher last-visit file arrives, created plus last visit alone cannot recover all intervening annual activity or establish a complete first-twelve-month return rate.

### Available billing activity, with its limits

| Branch | 2026 month | Distinct active billed files | Non-cancelled bills |
| --- | --- | --- | --- |
| Al Wasl | 2026-04 | 3 | 4 |
| Al Wasl | 2026-05 | 62 | 77 |
| Al Wasl | 2026-06 | 95 | 132 |
| Al Wasl | 2026-07 | 98 | 125 |
| Al Wasl | 2026-08 | 120 | 187 |
| Al Wasl | 2026-09 | 110 | 158 |
| Al Wasl | 2026-10 | 49 | 53 |
| Dr Tosun | 2026-07 | 59 | 76 |
| Dr Tosun | 2026-08 | 122 | 174 |
| Dr Tosun | 2026-09 | 210 | 340 |
| Dr Tosun | 2026-10 | 88 | 110 |

Source: `practo_bills_raw`, non-cancelled bills. Across the entire observed period Al Wasl has 273 distinct billed files and Dr Tosun 368. These are branch file counts, not cross-system matched people; monthly distinct counts must not be added. They also omit activity without a bill. Al Wasl begins on 21 April, with no bills from 24 April to 15 May; Tosun begins on 15 July. Al Maher has no live patient feed.

| 2026 month | Existing non-DN files | DN files billed after first-bill month | DN-012 observed returning files |
| --- | --- | --- | --- |
| 2026-04 | 2 | 0 | 2 |
| 2026-05 | 44 | 0 | 44 |
| 2026-06 | 64 | 8 | 72 |
| 2026-07 | 66 | 10 | 76 |
| 2026-08 | 80 | 16 | 96 |
| 2026-09 | 66 | 18 | 84 |
| 2026-10 | 28 | 9 | 37 |
| Observed-year distinct files | 146 | 31 | 177 |

The DN-012 returning-file measure is **177 distinct files** in the observed 2026 window: 146 existing non-DN files plus 31 DN files billed after their first bill month. Monthly totals are distinct within each month and do not add to the annual distinct count. This preserves the existing report definition, including its cross-branch first-bill rule; it is not a full-history retention denominator or a clean subtraction from Executive new patients. Dr Tosun has 368 billed files that remain unclassified as new or returning until its old register is available. No 12-month or annual retention percentage is substituted with short-term bill repeats.

## Revenue reconciliation and differences

Reference: portal Branch Monthly revenue. Variance is (comparison minus reference) / reference. Revenue, cash collections, reported visits, unique files and encounters retain their own definitions. An unavailable comparison is never inserted as zero.

| Branch | Month | Portal revenue AED | Zoho AED | Zoho variance | Live Practo billed AED | Practo variance |
| --- | --- | --- | --- | --- | --- | --- |
| Al Wasl | 2026-01 | 95,861.00 | 95,861.00 | +0.00% | not available | not available |
| Al Wasl | 2026-02 | 103,069.00 | 103,068.50 | -0.00% | not available | not available |
| Al Wasl | 2026-03 | 50,617.00 | 50,617.00 | +0.00% | not available | not available |
| Al Wasl | 2026-04 | 99,769.00 | 99,769.00 | +0.00% | 380.00 | -99.62% |
| Al Wasl | 2026-05 | 209,238.00 | 209,238.00 | +0.00% | 24,436.84 | -88.32% |
| Al Wasl | 2026-06 | 162,544.00 | 162,544.00 | +0.00% | 177,407.95 | +9.14% |
| Al Wasl | 2026-07 | 202,246.00 | 202,246.00 | +0.00% | 294,816.00 | +45.77% |
| Al Wasl | 2026-08 | 103,283.00 | 103,283.00 | +0.00% | 115,646.00 | +11.97% |
| Al Wasl | 2026-09 | 166,401.00 | not available | not available | 167,851.15 | +0.87% |
| Dr Tosun | 2026-01 | 483,263.00 | 483,263.29 | +0.00% | not available | not available |
| Dr Tosun | 2026-02 | 358,495.00 | 358,494.76 | -0.00% | not available | not available |
| Dr Tosun | 2026-03 | 269,794.00 | 269,794.43 | +0.00% | not available | not available |
| Dr Tosun | 2026-04 | 327,434.00 | 327,434.47 | +0.00% | not available | not available |
| Dr Tosun | 2026-05 | 283,498.00 | 283,498.10 | +0.00% | not available | not available |
| Dr Tosun | 2026-06 | 432,668.00 | 432,667.98 | -0.00% | not available | not available |
| Dr Tosun | 2026-07 | 272,948.00 | 272,947.61 | -0.00% | 3,500.00 | -98.72% |
| Dr Tosun | 2026-08 | 239,513.00 | 239,512.62 | -0.00% | 32,705.00 | -86.35% |
| Dr Tosun | 2026-09 | 371,414.00 | not available | not available | 499,724.25 | +34.55% |
| Al Maher | 2026-01 | 0.00 | not available | not available | not available | not available |
| Al Maher | 2026-02 | 10,080.00 | 10,079.66 | -0.00% | not available | not available |
| Al Maher | 2026-03 | 34,128.00 | 34,128.22 | +0.00% | not available | not available |
| Al Maher | 2026-04 | 95,078.00 | 95,077.99 | -0.00% | not available | not available |
| Al Maher | 2026-05 | 61,425.00 | 61,424.77 | -0.00% | not available | not available |
| Al Maher | 2026-06 | 81,955.00 | 81,955.00 | +0.00% | not available | not available |
| Al Maher | 2026-07 | 73,081.00 | 73,081.00 | +0.00% | not available | not available |
| Al Maher | 2026-08 | 12,094.00 | 12,094.00 | +0.00% | not available | not available |
| Al Maher | 2026-09 | 26,071.00 | not available | not available | not available | not available |

All **23 available** Zoho branch-months agree with portal revenue to the nearest dirham: Al Wasl and Dr Tosun January to August, and Al Maher February to August. Each exact amount differs by at most AED 0.50. There are no Zoho/portal differences over 5% in those overlaps. September is absent from Zoho for all branches; Al Maher January is absent from Zoho, so the portal zero cannot be independently confirmed. This is agreement between related financial sources, not proof of independent patient-level completeness.

| Branch | Month | Live Practo minus portal AED | Difference over 5% | Likely explanation, not proven |
| --- | --- | --- | --- | --- |
| Al Wasl | 2026-04 | -99,389.00 | -99.62% | Partial Practo migration/import window and different billed-date/status scope; not a cash-collection comparison |
| Al Wasl | 2026-05 | -184,801.16 | -88.32% | Partial Practo migration/import window and different billed-date/status scope; not a cash-collection comparison |
| Al Wasl | 2026-06 | 14,863.95 | +9.14% | Different billing date, status or included-record scope; cash collection is a separate basis; exact cause unverified |
| Al Wasl | 2026-07 | 92,570.00 | +45.77% | Different billing date, status or included-record scope; cash collection is a separate basis; exact cause unverified |
| Al Wasl | 2026-08 | 12,363.00 | +11.97% | Different billing date, status or included-record scope; cash collection is a separate basis; exact cause unverified |
| Dr Tosun | 2026-07 | -269,448.00 | -98.72% | Partial Practo migration/import window and different billed-date/status scope; not a cash-collection comparison |
| Dr Tosun | 2026-08 | -206,808.00 | -86.35% | Partial Practo migration/import window and different billed-date/status scope; not a cash-collection comparison |
| Dr Tosun | 2026-09 | 128,310.25 | +34.55% | Different billing date, status or included-record scope; cash collection is a separate basis; exact cause unverified |

Al Wasl September is within 5%: live Practo AED 167,851.15 versus portal AED 166,401, a +0.87% difference. Branch mapping follows centre names containing Tosun for Dr Tosun and the named Dental Nation General Dental Clinic for Al Wasl. No Al Maher Practo branch is present. No evidence establishes a branch-mapping error; a bill-level accounting reconciliation would be needed to resolve the remaining differences.

### Legacy collected amounts versus portal collections

Collections are compared separately from billed revenue. The following are all eight differences above 5% within the twelve overlapping 2026 branch-months, using (legacy collected minus portal collections) / portal collections. The other four overlaps are within 5%. Al Maher has no legacy collected comparison; later months without legacy collections remain unavailable.

| Branch | Month | Portal collections AED | Legacy collected AED | Variance over 5% |
| --- | --- | --- | --- | --- |
| Al Wasl | 2026-02 | 101,470.00 | 113,651.40 | +12.00% |
| Al Wasl | 2026-03 | 75,386.00 | 66,493.60 | -11.80% |
| Al Wasl | 2026-05 | 96,111.00 | 36,819.10 | -61.69% |
| Dr Tosun | 2026-01 | 443,512.00 | 485,511.50 | +9.47% |
| Dr Tosun | 2026-02 | 333,594.00 | 360,140.00 | +7.96% |
| Dr Tosun | 2026-03 | 308,331.00 | 270,484.50 | -12.27% |
| Dr Tosun | 2026-05 | 349,647.00 | 283,985.00 | -18.78% |
| Dr Tosun | 2026-07 | 267,843.00 | 220,920.00 | -17.52% |

Likely explanations are different export coverage, receipt-date/accounting allocation and updates after the historic extracts; no exact cause is established. The especially large Al Wasl May gap is consistent with incomplete legacy coverage around migration, but this remains an explanation to verify. Neither series replaces the other or supplies a per-person LTV denominator.

### Portal Practo snapshots versus current live Practo

This separate comparison addresses the portal's warning that its monthly Practo queries do not reconcile with the single January to September query. July to September use the same nominal month; October is a moving snapshot comparison, with the portal labelled 1 to 11 October and live data last billed on 10 October. Positive differences mean current live data is higher. Every revenue or unique-file difference over 5% in these branch-month comparisons appears below; counts are source file/patient definitions, not proven matched people.

| Branch | Period | Portal Practo AED | Live Practo AED | Revenue variance | Portal unique | Live unique files | Count variance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Al Wasl | Jul | 163,209.00 | 294,816.00 | +80.64% | 78 | 98 | +25.64% |
| Dr Tosun | Jul | 3,500.00 | 3,500.00 | +0.00% | 56 | 59 | +5.36% |
| Al Wasl | Aug | 103,398.00 | 115,646.00 | +11.85% | 118 | 120 | +1.69% |
| Dr Tosun | Aug | 22,740.00 | 32,705.00 | +43.82% | 109 | 122 | +11.93% |
| Al Wasl | Sep | 163,603.00 | 167,851.15 | +2.60% | 109 | 110 | +0.92% |
| Dr Tosun | Sep | 435,814.00 | 499,724.25 | +14.66% | 204 | 210 | +2.94% |
| Al Wasl | Oct 1-11 | 27,441.00 | 27,441.00 | +0.00% | 49 | 49 | +0.00% |
| Dr Tosun | Oct 1-11 | 84,278.00 | 85,148.00 | +1.03% | 87 | 88 | +1.15% |

For portal Practo April to June the notes explicitly assign all records to Al Wasl. Their net revenue differs from live by more than 5% in all three months, as shown below. January to March portal Practo has no corresponding live bills, so it cannot be reconciled; branch assignment is not assumed from an all-branch heading.

| 2026 month | Portal Practo AED | Live Practo AED | Revenue variance | Portal unique | Live unique files | Count variance |
| --- | --- | --- | --- | --- | --- | --- |
| Apr | 17,000.00 | 380.00 | -97.76% | 4 | 3 | -25.00% |
| May | 82,347.00 | 24,436.84 | -70.32% | 49 | 62 | +26.53% |
| Jun | 38,541.00 | 177,407.95 | +360.31% | 61 | 95 | +55.74% |

| January to September nominal query | Portal single-query AED | Live observed bills AED | Variance |
| --- | --- | --- | --- |
| Al Wasl | 671,568.00 | 780,537.94 | +16.23% |
| Dr Tosun | 422,044.00 | 535,929.25 | +26.98% |

The snapshot discrepancies are consistent with different query date bases, filters, status inclusion and subsequent ingestion, but the exact causes are not established. The portal single-query record counts are not relabelled as unique people. Current live Practo is the chosen source for Practo measures. Portal branch unique counts also sum above its all-branch count in August and September; neither branch totals nor monthly unique counts are used to infer annual unique patients.

## Data quality, inventory and reproducibility

### Matching and duplicates

| Check | Result |
| --- | --- |
| Emirates ID matching | not available: neither side of the required historical register comparison is present |
| Mobile last-nine-digit matching | not available: missing old registers; no match denominator |
| Name plus date-of-birth matching | not available: missing old registers; no match denominator |
| Old Al Wasl file number to Practo ORN overlap | not available: old file-number list absent; no inferred overlap |
| Dr Tosun register to DNJ migration match | not available: pre-migration register absent; unmatched DNJ files are not labelled new |
| Historical duplicate patients removed | not available: no full historical identity dataset; no claim of zero duplicates |
| Portal Branch Monthly duplicate branch-months removed | 0; 27 rows have 27 unique keys |
| Live bill source-key duplicates removed | 0; 1,463 rows have 1,463 distinct source keys |
| Cancelled live bills excluded | 27; 1,436 non-cancelled bills remain |
| Zero-value non-cancelled bills retained | 865; 419 Al Wasl and 446 Dr Tosun |
| Live bill negative/missing amounts, missing dates or missing file identity | 0 in the audited source |
| Meta / Google duplicate source-key rows removed | 0; 486 Meta rows and 939 Google rows have unique source keys |

Different bill keys for the same person are not duplicate bills merely because the person repeats. Annual distinct files were counted within branch; full identity deduplication was not possible. Revenue snapshots and collection copies were inventoried rather than summed into a second revenue series. The archive contains oversized Excel used ranges, overlapping snapshots and inconsistent dates; populated-row counts below exclude blank formatting and are not patient counts.

### Top-level files

| File | Use |
| --- | --- |
| Dental_Nation_Portal_Extract_Jan-Sep_2026.xlsx | 16-sheet inventory below; four prohibited sheets excluded |
| Dental_Nation_Dashboard_Source_Files_2026-09-11 (1).zip | Safely extracted inside data/dashboard-source; file and sheet inventory below |
| Contracts&Professionals_Updated (1).xlsx | Ignored unopened, Addendum 2 |
| 25-6-2025-Corporate Policy-v07 (1).pdf | Ignored unopened, Addendum 2 |
| Nurses Training Acknowledgment (1).pdf | Ignored unopened, Addendum 2 |
| Screenshot PNG | Ignored unopened, Addendum 2 |

### Portal workbook inventory

| Sheet | Populated rows / analysed records | Columns | Date range / branch / source range |
| --- | --- | --- | --- |
| README | 28 | Narrative notes | Read 11 October 2026; source notes; Al Wasl, Dr Tosun and Al Maher; A1:A12, A16:A18, A21:A31 |
| Branch Monthly | 47 / 27 | Branch, Month (2026), Revenue (AED), Collections (AED), Collection ratio (calc), Patients (reported visits), Revenue / patient (AED, calc), New patients, Returning patients, Patient source / marketing | January to September 2026; Al Wasl, Dr Tosun and Al Maher; A3:J29; A33:G41; A45:J50 |
| Group KPIs | 42 / 3 | Branch, Actual (AED), 9M target (AED), Achievement (portal), Status | January to September 2026; September mix; Al Wasl, Dr Tosun and Al Maher; A12:E14 |
| Doctor Summary | not inspected | not inspected | Excluded by Addendum 2; sheet content not parsed or inspected |
| Doctor Monthly | not inspected | not inspected | Excluded by Addendum 2; sheet content not parsed or inspected |
| Doctor Sep Scorecard | not inspected | not inspected | Excluded by Addendum 2; sheet content not parsed or inspected |
| Aug Commission | not inspected | not inspected | Excluded by Addendum 2; sheet content not parsed or inspected |
| October MTD | 37 / 3 | Branch, MTD billed (AED), New, Revisit, Collected (AED), October forecast (AED), Forecast vs Sep, New share (calc), Revenue / encounter (calc) | 1 to 8 October 2026; Al Wasl, Dr Tosun and Al Maher; A12:I14; A37:A40 |
| DN Ortho | 39 | Branch, MTD billed (AED), Encounters, Forecast (AED) | January to September 2026 and 1 to 8 October 2026; Al Wasl, Dr Tosun and Al Maher; Inventory only; no doctor sections used |
| Ortho Marketing | 70 / 3 | Branch, Total records, Lead records, Booking records | Paid-lead trackers not split by month; Instagram snapshot 29 August 2026; other context August and October; Al Wasl, Dr Tosun and general/unassigned; A30:C35; A38:G45; A48:D52; A79 |
| Practo Monthly | 34 / 19 | Period (2026), Branch, Unique patients, Visits, Net revenue (AED), Collected (AED), Patient dues (AED), Bills, Net revenue / unique patient (calc), Visits / patient (calc), Collection ratio (calc), Note | January to 11 October 2026; separate branch-months July to October; Al Wasl and Dr Tosun; A3:L21; A25:F26; A33:A36 |
| Practo Oct Detail | 59 | Date, Revenue (AED), Activity | 1 to 11 October 2026; Al Wasl and Dr Tosun; Inventory only; no doctor sections used |
| Practo Bills | 167 / 160 | Date, Branch, Department, Doctor, Status, Net (AED), Paid (AED), Due (AED) | 1 to 10 October 2026; Al Wasl and Dr Tosun; Inventory only; row-level bill and doctor figures not used |
| Zavis | 67 / 2 | Branch, Appointments, Completed, Cancelled, No-show, Cancellation rate (calc), Completion rate (calc) | Exported through 24 August 2026; appointment dates 10 January 2026 to 20 February 2027; Al Wasl and Dr Tosun; A42:C47; A50:G53 |
| CEO Intelligence | 33 / 3 | Branch, Revenue (AED), Patients, Revenue / patient (AED) | Live 1 to 11 October 2026; branch economics September; Al Wasl, Dr Tosun and Al Maher; A25:D27 |
| Daily Appt Report | 53 | Branch, #, Booking method, Treatment, Assigned doctor, Time slot, Presence status, Reschedule status, Reminder type, Confirmation, New patient, Notes | 27 August 2026; Al Wasl, Dr Tosun and Al Maher; Inventory only; log values not used |

Counts above include headings, summaries and notes unless analysed records are specified. January to September source fields H:J are explicitly unavailable. No values from Doctor Summary, Doctor Monthly, Doctor Sep Scorecard or Aug Commission were used or copied. Other mixed-content sheets were used only for permitted branch aggregates or inventory metadata.

### Extracted archive inventory

Paths below are relative to `data/dashboard-source/Dental_Nation_Dashboard_Source_Files_2026-09-11/`. File and sheet names are source metadata. Populated row counts are structural inventory only, not doctor-performance or patient figures. Branch is unverified unless explicitly stated. No branch is inferred from a clinician's name. Header lists include only identified column labels; unrecognised layouts remain labelled rather than disclosing arbitrary cells. Date bounds are observed cells, not a completeness certificate. Images, Apple resource-fork files and the unrelated brandbook were not used as clinical evidence.

**27.08-2026 Daily Appointment Report.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Report Info & Guidelines | Dr Tosun | 11 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Daily Summary | Not explicitly identified | 30 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Appointment Log | Dr Tosun | 26 | B: #; C: Patient Name; D: Booking Method; E: Treatment; F: Assigned Doctor; G: Time Slot; H: Presence Status; I: Reschedule Status; J: Reminder Type; K: Confirmation; L: New Patient?; M: Notes | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Patient Feedback | Not explicitly identified | 3 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**27.08.2026_Daily Appointment Report.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Report Info & Guidelines | DN Al Wasl | 11 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Daily Summary | Not explicitly identified | 30 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Appointment Log | DN Al Wasl | 7 | B: #; C: Patient Name; D: Booking Method; E: Treatment; F: Assigned Doctor; G: Time Slot; H: Presence Status; I: Reschedule Status; J: Reminder Type; K: Confirmation; L: New Patient?; M: Notes | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Patient Feedback | Not explicitly identified | 3 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**account-13-appointments-through-2026-08-24 (1).csv**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Sheet1 | Not explicitly identified | 1441 | A: appointment_id; B: platform_id; C: account_id; D: status; E: source; F: platform; G: booking_mode; H: timeslot; I: duration_minutes; J: location; K: address; L: services; M: complaint; N: remarks; O: amount; P: currency; Q: created_at; R: updated_at; S: patient_id; T: patient_platform_id; U: patient_name; V: patient_email; W: patient_gender; X: patient_dob; Y: patient_phone_country_code; Z: patient_phone; AA: patient_contact; AB: professional_id; AC: professional_name; AD: professional_type; AE: professional_department | H 2026-01-10 to 2027-02-20; Q 2026-01-09 to 2026-08-24; R 2026-03-11 to 2026-08-24 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR.  BULENT OZDOGAN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpBO | Dr Tosun | 18 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr.BO; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-29 to 2026-08-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. DILSAD OZDOGAN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpDO | Dr Tosun | 59 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. DO; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-11 to 2026-08-31 | Inventoried known headers and aggregate coverage |
| Sheet2 | Dr Tosun | 124 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. DO; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-06-02 to 2026-06-30 | Inventoried known headers and aggregate coverage |
| Sheet1 | Not explicitly identified | 0 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. MAYSOON.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| MA | Dr Tosun | 69 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. MA; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-12 to 2026-08-31 | Inventoried known headers and aggregate coverage |
| MA (2) | Dr Tosun | 68 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. MA; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-12 to 2026-08-31 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. MAYSOUN AHMAD.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpMAH | Not explicitly identified | 35 | L: Bank; M: Bank; N: Bank; P: Bank; R: Net; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. MAH; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: charges; M: charges; N: charges; P: charges; Q: Bank charges; R: Collection | A 2025-08-20 to 2026-08-26 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. SATHYAPRIYA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpSS | Dr Tosun | 22 | J: Bank; Q: Net; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr.SS; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable; T: Treatment | A 2026-08-04 to 2026-08-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. SEVINC BEHRUZOGLU.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpSB | Not explicitly identified | 38 | L: Bank; M: Bank; N: Bank; P: Bank; R: Net; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. SB; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-05 to 2026-08-17 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUG 2026 - DR. YAHYA TOSUN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpYT | Dr Tosun | 83 | Q: Net; T: Treatment; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. YT; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-05-01 to 2026-05-22 | Inventoried known headers and aggregate coverage |
| Sheet1 | Dr Tosun | 51 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. YT; G: Total-C; H: Pmt.; I: CASH/BT; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-08-12 to 2026-08-31 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR HASNA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Hasna | Not explicitly identified | 98 | A: Date; B: R4#; C: Pt.No.; D: Patient Name; E: Total; F: Total-C; G: Pmt.; H: CASH; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable; T: Payable | A 2026-08-01 to 2026-08-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. GHADA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Ghada | Not explicitly identified | 22 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Insurance; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Cost; O: Services; P: Charges; Q: Collection; R: Revenue; S: Payable; T: Payable | A 2026-08-14 to 2026-08-28 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. HELMI SHAATH.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Helmi Shaath | Not explicitly identified | 20 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A None to None | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. LEILA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Maher | Al Maher | 31 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-08-01 to 2026-08-29 | Inventoried known headers and aggregate coverage |
| Dr. Maher New | Al Maher | 90 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-03-31 to 2026-04-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. MAHER.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Maher | Al Maher | 27 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-07-21 to 2026-07-21 | Inventoried known headers and aggregate coverage |
| Dr. Maher New | Al Maher | 90 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-03-31 to 2026-04-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. MOHD QASEM.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Mohd Qasem | Not explicitly identified | 20 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A 2026-08-11 to 2026-08-11 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. SUZANNA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Suzanna | Al Maher | 38 | H: Bank; P: Insurance; A: Date; B: Pt. Code; C: Patient's Invoice; D: Total; E: Card; F: Pmt.; G: Cash; H: Charges; I: 5% VAT; J: charges; K: Consumables; L: Cost; M: Services; N: Charges; O: Collection; P: Received; Q: Doctor's Share; R: Revenue; S: Payable; T: Payable | A 2026-08-05 to 2026-08-30 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF AUGUST 2026 - DR. YASMIN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Yasmin | Not explicitly identified | 34 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash/BT; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A 2026-07-31 to 2026-08-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR HASNA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Hasna | Not explicitly identified | 74 | A: Date; B: R4#; C: Pt.No.; E: Total; F: Total-C; G: Pmt.; H: CASH; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable; T: Payable | A 2026-07-04 to 2026-07-18 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. DILSAD OZDOGAN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpDO | Not explicitly identified | 79 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. DO; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-07-01 to 2026-07-28 | Inventoried known headers and aggregate coverage |
| Sheet2 | Dr Tosun | 124 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. DO; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-06-02 to 2026-06-30 | Inventoried known headers and aggregate coverage |
| Sheet1 | Dr Tosun | 2 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. GHADA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Ghada | Not explicitly identified | 21 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Insurance; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Cost; O: Services; P: Charges; Q: Collection; R: Revenue; S: Payable; T: Payable | A 2026-07-24 to 2026-07-24 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. HELMI SHAATH.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Helmi Shaath | Not explicitly identified | 20 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A 2026-07-03 to 2026-07-03 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. MAHER.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Maher | Al Maher | 78 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-06-30 to 2026-07-21 | Inventoried known headers and aggregate coverage |
| Dr. Maher New | Al Maher | 90 | A: Date; B: Pt. Code; C: Total; D: Card; E: Pmt.; F: Cash/BT; G: Charges; H: charges; I: Consumables; J: Cost; K: Services; L: Collection; M: Revenue; N: Payable; O: Payable | A 2026-03-31 to 2026-04-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. MAYSOON.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| MA | Dr Tosun | 53 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. MA; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-07-02 to 2026-07-18 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. MAYSOUN AHMAD.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpMAH | Not explicitly identified | 35 | L: Bank; M: Bank; N: Bank; P: Bank; R: Net; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. MAH; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: charges; M: charges; N: charges; P: charges; Q: Bank charges; R: Collection | A 2025-08-20 to 2026-07-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. MOHD QASEM.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Mohd Qasem | Not explicitly identified | 22 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A 2026-07-13 to 2026-07-21 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. SATHYAPRIYA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpSS | Dr Tosun | 25 | J: Bank; Q: Net; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr.SS; G: Total-C; H: Pmt.; I: CASH; J: Charges; K: 5% VAT; L: charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable; T: Treatment | A 2026-07-04 to 2026-07-29 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. SUZANNA.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Suzanna | Al Maher | 32 | H: Bank; P: Insurance; A: Date; B: Pt. Code; C: Patient's Invoice; D: Total; E: Card; F: Pmt.; G: Cash; H: Charges; I: 5% VAT; J: charges; K: Consumables; L: Cost; M: Services; N: Charges; O: Collection; P: Received; Q: Doctor's Share; R: Revenue; S: Payable; T: Payable | A 2026-07-04 to 2026-07-25 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. YAHYA TOSUN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| wpYT | Dr Tosun | 83 | Q: Net; T: Treatment; A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. YT; G: Total-C; H: Pmt.; I: CASH; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-05-01 to 2026-05-22 | Inventoried known headers and aggregate coverage |
| Sheet1 | Dr Tosun | 62 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; F: Dr. YT; G: Total-C; H: Pmt.; I: CASH/BT; J: Visa/MC; K: 5% VAT; L: Charges; M: Consumables; N: Services; O: Charges; P: Services Doctor's Share; Q: Collection; R: Revenue; S: Payable | A 2026-07-02 to 2026-07-23 | Inventoried known headers and aggregate coverage |

**COLLECTIONS FOR THE MONTH OF JULY 2026 - DR. YASMIN.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dr. Yasmin | Not explicitly identified | 36 | A: Date; B: R4#; C: Pt.No.; D: Patient's Name; E: Total; F: Card; G: Pmt.; H: Cash/BT; I: Charges; J: 5% VAT; K: charges; L: Consumables; M: Cost; N: Services; O: Charges; P: Collection; Q: Revenue; R: Payable; S: Payable | A 2026-07-04 to 2026-07-24 | Inventoried known headers and aggregate coverage |

**Daily Appointment Report 27-08-2026.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Report Info & Guidelines | Al Maher | 11 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Daily Summary | Not explicitly identified | 30 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Appointment Log | Al Maher | 3 | B: #; C: Patient Name; D: Booking Method; E: Treatment; F: Assigned Doctor; G: Time Slot; H: Presence Status; I: Reschedule Status; J: Reminder Type; K: Confirmation; L: New Patient?; M: Notes | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Patient Feedback | Not explicitly identified | 7 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**Dental Nation Brandbook Final (1).pdf**

Not parsed: non-spreadsheet source. Branch/date/rows: not applicable or not safely established.

**DN 2026 KPI_Target.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| 01 Summary | Not explicitly identified | 34 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| 02 Revenue by Clinic | Not explicitly identified | 8 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| 03 Costs & Margins | Not explicitly identified | 23 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| 04 Patients & Funnel | Not explicitly identified | 25 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| 05 Growth Channels | Not explicitly identified | 31 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| 06 Operating KPIs | Not explicitly identified | 31 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**Doctor's daily schedule - Branch wise.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Sheet1 | Dr Tosun | 22 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**Revenue Report DN Group - H1-2026.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Not explicitly identified | 28 | B: Department; O: Total | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Doctor Wise / Depart Wise Rev | Multiple explicitly labelled branches | not inspected | not safely recognised | not established from a recognised date column | Excluded doctor/commission sheet; contents not parsed |
| DN Al Wasl | DN Al Wasl | 1138 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-01-03 to 2026-07-29 | Inventoried known headers and aggregate coverage |
| Dr Tosun | Dr Tosun | 2627 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes | A 2026-01-01 to 2026-07-29 | Inventoried known headers and aggregate coverage |
| Al Maher | Al Maher | 327 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-02-15 to 2026-07-25 | Inventoried known headers and aggregate coverage |
| DIFC | Not explicitly identified | 1 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A None to None | Inventoried known headers and aggregate coverage |
| Sheet1 | Not explicitly identified | 21 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

**Revenue Report DN Group - Jan-August 2026.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Not explicitly identified | 28 | B: Department; O: Total | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Doctor Wise / Depart Wise Rev | Multiple explicitly labelled branches | not inspected | not safely recognised | not established from a recognised date column | Excluded doctor/commission sheet; contents not parsed |
| DN Al Wasl | DN Al Wasl | 1477 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-01-03 to 2026-08-30 | Inventoried known headers and aggregate coverage |
| Dr Tosun | Dr Tosun | 2893 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes | A 2026-01-01 to 2026-08-30 | Inventoried known headers and aggregate coverage |
| Al Maher | Al Maher | 345 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-02-15 to 2026-08-29 | Inventoried known headers and aggregate coverage |
| DIFC | Not explicitly identified | 1 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A None to None | Inventoried known headers and aggregate coverage |

**Revenue Report DN Group - Jan-July 2026.xlsx**

| Sheet | Branch | Populated rows | Recognised column names | Observed transaction-date bounds | Use / limitation |
| --- | --- | --- | --- | --- | --- |
| Dashboard | Not explicitly identified | 28 | B: Department; O: Total | not established from a recognised date column | Inventoried known headers and aggregate coverage |
| Doctor Wise / Depart Wise Rev | Multiple explicitly labelled branches | not inspected | not safely recognised | not established from a recognised date column | Excluded doctor/commission sheet; contents not parsed |
| DN Al Wasl | DN Al Wasl | 1138 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-01-03 to 2026-07-29 | Inventoried known headers and aggregate coverage |
| Dr Tosun | Dr Tosun | 2627 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes | A 2026-01-01 to 2026-07-29 | Inventoried known headers and aggregate coverage |
| Al Maher | Al Maher | 327 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A 2026-02-15 to 2026-07-25 | Inventoried known headers and aggregate coverage |
| DIFC | Not explicitly identified | 1 | A: Invoice Date; B: Month; C: Invoice Number; D: Invoice Status; E: Customer Name; F: Item Type; G: Item Name; H: Quantity; I: Item Total; J: Doctor; K: Department; L: Notes; M: Item Desc | A None to None | Inventoried known headers and aggregate coverage |
| Sheet1 | Not explicitly identified | 21 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |
| Sheet2 | Not explicitly identified | 44 | not safely recognised | not established from a recognised date column | No safely recognized multi-column header; metadata only |

The extracted, relevant inventory contains 37 files: 35 XLSX, one CSV and the unopened brandbook PDF. All 36 spreadsheet/CSV files parsed successfully. Images and Apple resource-fork metadata were excluded from extraction/use. The CSV contains 1,440 appointment records created from 9 January to 24 August 2026, with scheduled dates from 10 January 2026 to 20 February 2027; future bookings do not establish completed visits. The H1 revenue workbook contains July dates and overlaps the January to July snapshot. The January to August workbook reaches 30 August for Al Wasl and Tosun, and 29 August for Al Maher. Collection workbooks include copied March to June tabs and isolated 20 August 2025 dates, so filenames alone are not a reliable period filter. None supplies the missing 2013 to 2026 demographic exports or migration/last-visit register. Targets, schedules and daily appointment snapshots were inventoried but do not answer historical acquisition, collected LTV or annual retention.

### Live sources and audit cutoffs

| Source | Audited rows | Relevant fields / scope | Coverage |
| --- | --- | --- | --- |
| meta_insights_raw | 486 | campaign/date key; spend; account | 24 November 2025 to 11 October 2026 |
| google_ads_insights_raw | 939 | campaign/date key; cost/spend; customer | 29 November 2025 to 8 October 2026 |
| raw_raw_social | 592 | data Date, Clinic, Channel, Spend | Only six explicitly labelled Tosun campaign days added separately |
| practo_bills_raw | 1,463 before cancellations | bill_date, amount, data centre/status/file identity, unique source key | Al Wasl 21 April and Dr Tosun 15 July to 10 October 2026 |
| practo_appointments_raw | 2,368 | appointment date/status, first-appointment attribution evidence | Appointments are separate from billed patients; no future/cancelled appointments counted as acquired people |
| finance_revenue_monthly | 130 | clinic, ym, gross | Al Wasl/Tosun January to August; Al Maher February to August 2026 |
| clinic_revenue_raw | 1,622 | clinic, metric, txn_year, txn_month, gross | Historical aggregate collections/billing; no person-level cohort denominator |

Aggregate source checks were made on 11 October 2026; the recorded database clock check was 14:22:24 UTC. Bill and ad snapshots were checked around 14:01 UTC; appointments/manual data around 14:16 UTC. Finance was loaded on 8 September. Periodic ingestion can change a later rerun, especially current-day Meta spend. Source JSON, scripts and extracted inputs remain ignored in the task workspace; only this aggregate report and the handoff are to be committed.

Validation: 27 portal branch-month keys; zero missing revenue/collections/visit values; every branch sum and group-month control reconciles; revenue-per-visit and collection-ratio recalculations agree with cached values; 23 overlapping Zoho amounts match within AED 0.50; the seven Executive monthly new counts match DN-012. No source workbook, app code or production data was changed. A code build is not relevant to this draft-only analysis.

## Exact missing inputs and remaining owner questions

- `ListOfPatientsDemography_01.01.2013 to 13.05.2026.xls`

- `FINANCIAL REPORT DR'S WISE.zip`

- `Treatment_Dr's wise.zip`

- `list of patients_Dr's wise.zip`

- `patient demographic report 2026-6-2 15-1-59.xlsx`

- `Almaher patients last visit report.xlsx`



These six named inputs were not found at the data-folder root or in the dashboard-source ZIP. The first four are the Al Wasl attachments from 25 May; the Dr Tosun register is from the 3 June migration email; the Al Maher file is from the 4 June last-visit email. Open owner questions are the missing exports, the amount/date coverage of Dr Tosun's external Google account, and the billing-date/status definitions behind the unresolved portal/Practo differences. No missing patient history, marketing conversions, lifetime value or annual retention has been estimated.
