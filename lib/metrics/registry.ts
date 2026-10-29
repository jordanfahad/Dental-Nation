/**
 * DN-032 metric registry, definition version 1 (approved handoff:
 * .agent-bus/outbox/DN-032.md §Metric registry and §Canonical metric homes).
 *
 * One entry per figure the new design preview (/next and its section pages)
 * shows. Each definition is one plain-English sentence a CEO can read: what
 * counts, what does not, the day boundary and the clinic scope. The registry
 * describes the figures EXACTLY as the existing readers produce them (the
 * same readers behind the 09:00 emails), so a definition never promises a
 * rule the number does not apply. Coverage-gap metrics (M02, M23, M24, M25)
 * say what evidence is missing instead of substituting a lookalike number.
 * Changing a definition means a new definitionVersion, never a silent edit.
 */

/** Every measure in the DN-032 catalogue; METRICS is checked to cover them all. */
export type KnownMetricId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07' | 'M08' | 'M09' | 'M10'
  | 'M11' | 'M12' | 'M13' | 'M14' | 'M15' | 'M16' | 'M17' | 'M18' | 'M19' | 'M20'
  | 'M21' | 'M22' | 'M23' | 'M24' | 'M25' | 'M26' | 'M27' | 'M28' | 'M29' | 'M30'
  | 'M31' | 'M32' | 'M33' | 'M34' | 'M35';

/**
 * The id a figure chip carries. A pattern rather than the closed union, so a
 * page's partial per-figure map (such as the Overview drawer's footnotes,
 * which cover only its own eleven figures) still type-checks as sections add
 * figures; the registry itself stays exhaustive over KnownMetricId.
 */
export type MetricId = `M${string}` | `A${string}`;

/** The Clinic Activation report's own figures (/next/activation), kept apart from M01 to M35. */
export type ActivationMetricId =
  | 'A01' | 'A02' | 'A03' | 'A04' | 'A05' | 'A06' | 'A07' | 'A08' | 'A09' | 'A10'
  | 'A11' | 'A12' | 'A13' | 'A14' | 'A15' | 'A16' | 'A17' | 'A18' | 'A19' | 'A20'
  | 'A21' | 'A22';

export type MetricUnit =
  | 'count'
  | 'AED'
  | 'AED per enquiry'
  | 'AED per appointment'
  | 'rating out of 5'
  | 'searches per month'
  | 'percent of sampled clicks';

export interface MetricDef {
  id: MetricId;
  name: string;
  /** One plain-English sentence: what counts, what does not, the day boundary and the clinic scope. */
  definition: string;
  unit: MetricUnit;
  /** One line naming the system the figure comes from. */
  source: string;
  definitionVersion: 1;
}

const REGISTRY = {
  M01: {
    id: 'M01',
    name: 'Enquiries',
    definition:
      'Enquiry records in the selected Dubai days, tracked for all clinics together and never split by clinic: a website enquiry counts once per phone number per day, any other enquiry counts once per phone number in the selected dates, so this is a record count, not a count of unique people.',
    unit: 'count',
    source: 'Lead tracker and website enquiries, read by the Growth channel report.',
    definitionVersion: 1,
  },
  M02: {
    id: 'M02',
    name: 'People who enquired',
    definition:
      'The number of different people behind the enquiries in the selected Dubai days across all clinics, matched as one person however many times and channels they used; no source yet records one identity per enquiry across every channel, so the figure is unavailable rather than substituted with enquiry records, platform contact counts or daily totals added up.',
    unit: 'count',
    source: 'No complete source yet; enquiry records (M01) and the platforms’ own contact counts measure different things and are not substituted.',
    definitionVersion: 1,
  },
  M03: {
    id: 'M03',
    name: 'Appointments booked',
    definition:
      'Appointments whose appointment date falls inside the selected Dubai days at the chosen clinic, whatever their status; an appointment created in the period for a later date does not count, and only clinics with a connected patient-system feed have figures.',
    unit: 'count',
    source: 'Practo appointment feed, split by clinic, read by the Growth channel report.',
    definitionVersion: 1,
  },
  M04: {
    id: 'M04',
    name: 'Appointments attended',
    definition:
      'Appointments inside the selected Dubai days at the chosen clinic that arrived or were completed; a bill on its own does not count as attendance, and only clinics with a connected patient-system feed have figures.',
    unit: 'count',
    source: 'Practo appointment feed, split by clinic, read by the Growth channel report.',
    definitionVersion: 1,
  },
  M05: {
    id: 'M05',
    name: 'Missed appointments',
    definition:
      'Appointments inside the selected Dubai days at the chosen clinic that were recorded as a no-show; cancelled appointments and appointments without a recorded outcome do not count as missed, and only clinics with a connected patient-system feed have figures.',
    unit: 'count',
    source: 'Practo appointment feed, split by clinic, read by the Growth channel report.',
    definitionVersion: 1,
  },
  M06: {
    id: 'M06',
    name: 'Billed revenue',
    definition:
      'The AED total of bills dated inside the selected Dubai days at the chosen clinic, exactly as the billing system stores them; bills later marked cancelled are still included until the finance cancellation policy is agreed, and days before a clinic joined the feed have no bills to count.',
    unit: 'AED',
    source: 'Practo bills, split by clinic, read by the same summary the Executive view uses.',
    definitionVersion: 1,
  },
  M07: {
    id: 'M07',
    name: 'Advertising spend',
    definition:
      'The AED that Google Ads and Meta report for the selected Dubai days over the shared advertising accounts; the accounts serve the group as a whole, so spend is never split by clinic, and manual budgets or estimates do not count.',
    unit: 'AED',
    source: 'Google Ads and Meta spend rows stored by the dashboard, refreshed about every 15 minutes.',
    definitionVersion: 1,
  },
  M08: {
    id: 'M08',
    name: 'Cost per enquiry',
    definition:
      'Advertising spend (M07) divided by measured enquiries (M01) for the same Dubai days across all clinics; it uses only measured enquiries, never the modelled phone estimate, and when spend or enquiries are unavailable, or enquiries are zero, the figure is unavailable rather than estimated.',
    unit: 'AED per enquiry',
    source: 'Calculated on this page from M07 and M01, with no other inputs.',
    definitionVersion: 1,
  },
  M09: {
    id: 'M09',
    name: 'Cost per appointment',
    definition:
      'Advertising spend (M07) divided by appointments booked (M03) for the same Dubai days across all clinics; it uses only appointments recorded in the patient system, never platform-reported conversions or modelled phone bookings, and when spend or appointments are unavailable, or appointments are zero, the figure is unavailable rather than estimated.',
    unit: 'AED per appointment',
    source: 'Calculated on this page from M07 and M03, with no other inputs.',
    definitionVersion: 1,
  },
  M10: {
    id: 'M10',
    name: 'Meta reported conversations',
    definition:
      'The conversations Meta reports its ads started, on the days Meta reports for the selected dates, counted so a conversation reported under more than one Meta label is not added twice; these are Meta’s own figures for the shared advertising account, never split by clinic, and they are not enquiries (M01) or counted people (M02).',
    unit: 'count',
    source: 'Meta advertising reports stored by the dashboard.',
    definitionVersion: 1,
  },
  M11: {
    id: 'M11',
    name: 'Google profile calls',
    definition:
      'Phone calls Google reports people made from the connected clinics’ Google Business Profiles, for the chosen clinic or all connected clinics, counted over the selected days Google has fully reported; Google reports a day a few days late and stores an unreported day as zero, so days Google has not finished reporting are left out rather than counted as zero.',
    unit: 'count',
    source: 'Google Business Profile daily figures stored by the dashboard, as on the Social & Local view.',
    definitionVersion: 1,
  },
  M12: {
    id: 'M12',
    name: 'Google profile direction requests',
    definition:
      'Requests for directions Google reports people made from the connected clinics’ Google Business Profiles, for the chosen clinic or all connected clinics, counted over the selected days Google has fully reported; Google reports a day a few days late and stores an unreported day as zero, so days Google has not finished reporting are left out rather than counted as zero.',
    unit: 'count',
    source: 'Google Business Profile daily figures stored by the dashboard, as on the Social & Local view.',
    definitionVersion: 1,
  },
  M13: {
    id: 'M13',
    name: 'Google profile website clicks',
    definition:
      'Clicks through to the website Google reports people made from the connected clinics’ Google Business Profiles, for the chosen clinic or all connected clinics, counted over the selected days Google has fully reported; Google reports a day a few days late and stores an unreported day as zero, so days Google has not finished reporting are left out rather than counted as zero.',
    unit: 'count',
    source: 'Google Business Profile daily figures stored by the dashboard, as on the Social & Local view.',
    definitionVersion: 1,
  },
  M14: {
    id: 'M14',
    name: 'Google Maps views',
    definition:
      'Times Google reports the connected clinics’ profiles were seen on Google Maps, for the chosen clinic or all connected clinics, counted over the selected days Google has fully reported; Google reports a day a few days late and stores an unreported day as zero, so days Google has not finished reporting are left out rather than counted as zero.',
    unit: 'count',
    source: 'Google Business Profile daily figures stored by the dashboard, as on the Social & Local view.',
    definitionVersion: 1,
  },
  M15: {
    id: 'M15',
    name: 'Google reviews',
    definition:
      'Reviews currently live on the connected clinics’ Google Business Profiles, counted over all connected clinics at the moment the page is opened; removed reviews do not count, and the figure is live rather than pinned to the selected dates.',
    unit: 'count',
    source: 'Google Business Profile reviews stored by the dashboard.',
    definitionVersion: 1,
  },
  M16: {
    id: 'M16',
    name: 'Average Google rating',
    definition:
      'The average star rating of the reviews currently live on the connected clinics’ Google Business Profiles, where every review counts once whichever clinic it belongs to; it is live at the moment the page is opened, not pinned to the selected dates.',
    unit: 'rating out of 5',
    source: 'Google Business Profile reviews stored by the dashboard.',
    definitionVersion: 1,
  },
  M17: {
    id: 'M17',
    name: 'New Google reviews',
    definition:
      'Reviews written on the connected clinics’ Google Business Profiles whose Dubai day falls inside the selected dates, for the chosen clinic or all connected clinics; reviews since removed do not count, and because Google reviews can change after the fact, an old figure can differ from today’s count for the same dates.',
    unit: 'count',
    source: 'Google Business Profile reviews stored by the dashboard.',
    definitionVersion: 1,
  },
  M18: {
    id: 'M18',
    name: 'Written reviews awaiting a reply',
    definition:
      'Reviews with a written comment on the connected clinics’ Google Business Profiles that have no owner reply yet, counted over all connected clinics at the moment the page is opened; reviews without a written comment do not count.',
    unit: 'count',
    source: 'Google Business Profile reviews stored by the dashboard.',
    definitionVersion: 1,
  },
  M19: {
    id: 'M19',
    name: 'Smile Club company-reported members',
    definition:
      'The members each partner company reports in the Smile Club pipeline, added up over all companies as entered at the moment the page is opened; these are company-reported figures across the whole group, not paid memberships verified by billing.',
    unit: 'count',
    source: 'The Smile Club corporate pipeline kept on this dashboard.',
    definitionVersion: 1,
  },
  M20: {
    id: 'M20',
    name: 'Smile Club enquiries',
    definition:
      'Enquiries in the selected Dubai days whose channel is Partnerships (Smile Club), read exactly like Enquiries (M01) with that one channel filter; a partnership enquiry does not prove a paid membership, and shared enquiries are tracked for all clinics together and never split by clinic.',
    unit: 'count',
    source: 'Lead tracker and website enquiries, read by the Growth channel report’s Partnerships (Smile Club) row.',
    definitionVersion: 1,
  },
  M21: {
    id: 'M21',
    name: 'Smile Club appointments',
    definition:
      'Appointments whose appointment date falls inside the selected Dubai days on the Partnerships (Smile Club) channel, read exactly like Appointments booked (M03) with that one channel filter; a partnership appointment does not prove a paid membership, and only clinics with a connected patient-system feed have figures.',
    unit: 'count',
    source: 'Practo appointment feed, read by the Growth channel report’s Partnerships (Smile Club) row.',
    definitionVersion: 1,
  },
  M22: {
    id: 'M22',
    name: 'Smile Club attended appointments',
    definition:
      'Appointments inside the selected Dubai days on the Partnerships (Smile Club) channel that arrived or were completed, read exactly like Appointments attended (M04) with that one channel filter; attendance does not prove a paid membership, and only clinics with a connected patient-system feed have figures.',
    unit: 'count',
    source: 'Practo appointment feed, read by the Growth channel report’s Partnerships (Smile Club) row.',
    definitionVersion: 1,
  },
  M23: {
    id: 'M23',
    name: 'DN Ortho enquiries',
    definition:
      'Enquiries the DN Ortho programme can prove it caused, from enquiry records explicitly tagged to the programme in the selected Dubai days; no such tag exists yet, so the figure is unavailable rather than substituted with Google campaign clicks or the clinics’ general enquiries, which cannot prove a programme enquiry.',
    unit: 'count',
    source: 'No linked source yet; campaign clicks (M32) and general enquiries (M01) are different measures and are not substituted.',
    definitionVersion: 1,
  },
  M24: {
    id: 'M24',
    name: 'DN Ortho appointments',
    definition:
      'Appointments the DN Ortho programme can prove it caused, from appointments explicitly linked to the programme with an appointment date inside the selected Dubai days; no such link exists yet, so the figure is unavailable rather than substituted with the orthodontists’ overall appointments, which include patients the programme never touched.',
    unit: 'count',
    source: 'No linked source yet; the orthodontists’ overall appointment activity is a different measure and is not substituted.',
    definitionVersion: 1,
  },
  M25: {
    id: 'M25',
    name: 'DN Ortho programme billing',
    definition:
      'Billing the DN Ortho programme can prove it caused, from bills explicitly linked to the programme in the selected Dubai days across its clinics; no such link exists yet, so the figure is unavailable rather than estimated from the orthodontists’ charge lines.',
    unit: 'AED',
    source: 'No linked source yet; the orthodontists’ charge lines are a different measure and are not substituted.',
    definitionVersion: 1,
  },
  M26: {
    id: 'M26',
    name: 'Orthodontist charge-line proxy',
    definition:
      'The AED total of positive charge lines on bills dated inside the selected Dubai days that name one of the DN Ortho orthodontists as the conducting doctor, added over their clinics; charge lines with no named doctor are left out, so this is a proxy for the doctors’ activity, not programme revenue (M25) and not net billed revenue (M06).',
    unit: 'AED',
    source: 'Practo bill charge lines by conducting doctor, the same rule as the Revenue by doctor view.',
    definitionVersion: 1,
  },
  M27: {
    id: 'M27',
    name: 'Estimated monthly brand searches',
    definition:
      'The provider’s estimate of how many times people search for the Dental Nation brand in a month, added over the markets with recorded data at the moment the page is opened; it is a monthly estimate for the whole group, not a count of the selected Dubai days, and it is never mixed into measured enquiry or click figures.',
    unit: 'searches per month',
    source: 'Third-party search estimates stored by the dashboard with the competitor comparison.',
    definitionVersion: 1,
  },
  M28: {
    id: 'M28',
    name: 'Brand share of sampled search clicks',
    definition:
      'The share of clicks that came from searches naming the brand, out of the sample of up to 250 top search terms Google Search Console returns for the selected dates up to the most recent day Google has reported, for the one group website; it describes that sample only, not all search clicks, and when the sample cannot be read or has no clicks the figure is unavailable rather than estimated.',
    unit: 'percent of sampled clicks',
    source: 'Google Search Console query sample stored by the dashboard.',
    definitionVersion: 1,
  },
  M29: {
    id: 'M29',
    name: 'Instagram followers',
    definition:
      'The follower count of the group’s one Instagram account on the most recent day with a recorded value inside the selected dates; days without a recorded value are not filled in, so a period with no recorded value shows unavailable rather than the last known figure, and it is a level on that day for the whole group, never split by clinic.',
    unit: 'count',
    source: 'Instagram account figures stored by the dashboard.',
    definitionVersion: 1,
  },
  M30: {
    id: 'M30',
    name: 'Instagram daily reach total',
    definition:
      'The accounts Instagram reports the group’s one account reached on each day inside the selected dates, added over those days; the same person reached on two days counts twice, so this is a total of daily figures, not the number of different people reached, and it is group-wide, never split by clinic.',
    unit: 'count',
    source: 'Instagram account figures stored by the dashboard.',
    definitionVersion: 1,
  },
  M31: {
    id: 'M31',
    name: 'DN Ortho campaign spend',
    definition:
      'The AED Google Ads reports for the DN Ortho search campaign alone on the selected Dubai days, from the same stored rows as Advertising spend (M07) filtered to that exact campaign name; spend on the group’s other campaigns does not count, and the campaign has been live since 23 Oct 2026, so earlier days have nothing to report.',
    unit: 'AED',
    source: 'Google Ads spend rows stored by the dashboard, filtered to the exact DN Ortho campaign.',
    definitionVersion: 1,
  },
  M32: {
    id: 'M32',
    name: 'DN Ortho campaign clicks',
    definition:
      'Clicks Google Ads reports for the DN Ortho search campaign alone on the selected Dubai days, from the same stored rows filtered to that exact campaign name; a click is not a programme enquiry (M23) or appointment (M24), and the campaign has been live since 23 Oct 2026, so earlier days have nothing to report.',
    unit: 'count',
    source: 'Google Ads campaign rows stored by the dashboard, filtered to the exact DN Ortho campaign.',
    definitionVersion: 1,
  },
  M33: {
    id: 'M33',
    name: 'Companies by Smile Club stage',
    definition:
      'The partner companies in the Smile Club pipeline counted by the stage each one is in at the moment the page is opened, across the whole group; each company counts once in its one current stage, so this is live pipeline state, not pinned to the selected dates.',
    unit: 'count',
    source: 'The Smile Club corporate pipeline kept on this dashboard.',
    definitionVersion: 1,
  },
  M34: {
    id: 'M34',
    name: 'Scripts awaiting review',
    definition:
      'Review assignments waiting on Smile Club script reviewers at the moment the page is opened, covering scripts sent for sign-off or belonging to a shoot in the next seven Dubai days; one script waiting on two reviewers counts twice, because the unit is an assignment, not a script, and the figure is live group-wide workflow state, not pinned to the selected dates.',
    unit: 'count',
    source: 'The Smile Club script reviews kept on this dashboard.',
    definitionVersion: 1,
  },
  M35: {
    id: 'M35',
    name: 'Shoot changes and due work',
    definition:
      'The Smile Club shoot changes from the last seven days and the tasks due on the current Dubai day, as the daily plan selects them with at most four changes and three tasks per person; it is a capped selection to act on, not a list of all pending work, and it is live group-wide plan state, not pinned to the selected dates.',
    unit: 'count',
    source: 'The Smile Club shoot plan and team tasks kept on this dashboard.',
    definitionVersion: 1,
  },
} satisfies Record<KnownMetricId, MetricDef>;

const amc = (id: ActivationMetricId, name: string, what: string, unit: MetricUnit): MetricDef => ({
  id,
  name,
  definition: `${what} on Al Maher's daily report for each selected Dubai day, added over the days that have a report; a day with no report tab is listed as missing and counts as nothing rather than 0, and this sheet is a different source from Practo.`,
  unit,
  source: 'Dr Luvi\u2019s Revenue AMC sheet (one Report tab per day), stored by the dashboard sync.',
  definitionVersion: 1,
});

/**
 * Clinic Activation (Dr Luvi's daily report) figures, definition version 1.
 * Read by lib/activation/read.ts; shown on /next/activation and in the
 * Clinic Activation 09:00 email.
 */
const ACTIVATION_REGISTRY = {
  A01: {
    id: 'A01',
    name: 'Lead tracker leads',
    definition:
      'Rows on the lead tabs of the Inhouse Lead Tracker whose enquiry date falls inside the selected Dubai days, counted by the clinic the row names (or the clinic its tab belongs to); the Smile Club, GMB and website tabs are left out, and a row is a record, not a unique person.',
    unit: 'count',
    source: 'Inhouse Lead Tracker lead tabs, as the dashboard sync stores them.',
    definitionVersion: 1,
  },
  A02: {
    id: 'A02',
    name: 'Leads converted',
    definition:
      'Of the lead tracker leads (A01) with an enquiry date inside the selected Dubai days, the ones whose Conversion column says booked or converted, counted against the enquiry date, not the day of the booking.',
    unit: 'count',
    source: 'Inhouse Lead Tracker lead tabs, Conversion column.',
    definitionVersion: 1,
  },
  A03: {
    id: 'A03',
    name: 'Leads by platform',
    definition:
      'The lead tracker leads (A01) in the selected Dubai days counted by the Inquiry Platform the front office entered, with unknown labels grouped as Other platform and blanks shown as Not recorded.',
    unit: 'count',
    source: 'Inhouse Lead Tracker lead tabs, Inquiry Platform column.',
    definitionVersion: 1,
  },
  A04: {
    id: 'A04',
    name: 'Smile Club enquiries',
    definition:
      'Rows on the Smile Club tab of the Inhouse Lead Tracker dated inside the selected Dubai days, counted by the clinic the row names; rows with no readable date are left out.',
    unit: 'count',
    source: 'Inhouse Lead Tracker, Smile Club tab.',
    definitionVersion: 1,
  },
  A05: {
    id: 'A05',
    name: 'Smile Club enquiries followed up',
    definition:
      'Of the Smile Club enquiries (A04) in the selected Dubai days, the ones with any follow-up remark entered on the Smile Club tab.',
    unit: 'count',
    source: 'Inhouse Lead Tracker, Smile Club tab, follow-up columns.',
    definitionVersion: 1,
  },
  A06: {
    id: 'A06',
    name: 'Smile Club enquiries converted',
    definition:
      'Of the Smile Club enquiries (A04) in the selected Dubai days, the ones whose Conversion column says booked or converted, counted against the enquiry date.',
    unit: 'count',
    source: 'Inhouse Lead Tracker, Smile Club tab, Conversion column.',
    definitionVersion: 1,
  },
  A07: {
    id: 'A07',
    name: 'Google reviews today (front office)',
    definition:
      'The Google reviews the front office entered as received today on the lead tracker GMB tab, as copied once a day by the dashboard, for one clinic on its latest copy, or added over the copied days in the selected Dubai days; it is what the front office typed, not Google\u2019s own count.',
    unit: 'count',
    source: 'Inhouse Lead Tracker GMB tab, copied daily from 29 Oct 2026.',
    definitionVersion: 1,
  },
  A08: {
    id: 'A08',
    name: 'Google reviews total (front office)',
    definition:
      'The total Google reviews the front office entered for one clinic on the lead tracker GMB tab, on the latest daily copy on or before the last selected Dubai day; it is what the front office typed, so it can differ from Google\u2019s own count.',
    unit: 'count',
    source: 'Inhouse Lead Tracker GMB tab, copied daily from 29 Oct 2026.',
    definitionVersion: 1,
  },
  A09: {
    id: 'A09',
    name: 'Photos posted (front office)',
    definition:
      'The photos the front office entered on the lead tracker GMB tab for one clinic, on its latest daily copy, or added over the copied days in the selected Dubai days.',
    unit: 'count',
    source: 'Inhouse Lead Tracker GMB tab, copied daily from 29 Oct 2026.',
    definitionVersion: 1,
  },
  A10: {
    id: 'A10',
    name: 'Videos posted (front office)',
    definition:
      'The videos the front office entered on the lead tracker GMB tab for one clinic, on its latest daily copy, or added over the copied days in the selected Dubai days.',
    unit: 'count',
    source: 'Inhouse Lead Tracker GMB tab, copied daily from 29 Oct 2026.',
    definitionVersion: 1,
  },
  A11: {
    id: 'A11',
    name: 'Days with a front office copy',
    definition:
      'The selected Dubai days on which the dashboard holds a daily copy of the lead tracker GMB tab for the clinic; days before the first copy on 29 Oct 2026 have none.',
    unit: 'count',
    source: 'Daily copies of the Inhouse Lead Tracker GMB tab stored by the dashboard.',
    definitionVersion: 1,
  },
  A12: {
    id: 'A12',
    name: 'Practo billed, Al Wasl and Dr Tosun',
    definition:
      'Billed revenue (M06) for Al Wasl added to billed revenue for Dr Tosun over the same selected Dubai days; Al Maher is left out because its revenue in this report comes from its own daily sheet, and the total is unavailable when either clinic is.',
    unit: 'AED',
    source: 'Practo bills, read by the same summary the Executive view and the morning performance email use.',
    definitionVersion: 1,
  },
  A13: amc('A13', 'AMC invoiced amount', 'The total invoice amount in AED', 'AED'),
  A14: amc('A14', 'AMC insurance amount', 'The AED billed to insurance', 'AED'),
  A15: amc('A15', 'AMC co-payment', 'The AED patients paid as co-payment', 'AED'),
  A16: amc('A16', 'AMC cash', 'The AED taken in cash', 'AED'),
  A17: amc('A17', 'AMC card', 'The AED taken by card', 'AED'),
  A18: amc('A18', 'AMC appointments', 'The total appointments', 'count'),
  A19: amc('A19', 'AMC cancelled appointments', 'The cancelled appointments', 'count'),
  A20: amc('A20', 'AMC new patients', 'The patients marked new', 'count'),
  A21: amc('A21', 'AMC returning patients', 'The patients marked old (returning)', 'count'),
  A22: {
    id: 'A22',
    name: 'AMC days reported',
    definition:
      'The selected Dubai days that have a Report tab on Al Maher\u2019s daily sheet; the days without one are listed as missing, never filled in.',
    unit: 'count',
    source: 'Dr Luvi\u2019s Revenue AMC sheet (one Report tab per day), stored by the dashboard sync.',
    definitionVersion: 1,
  },
} satisfies Record<ActivationMetricId, MetricDef>;

/** Every defined measure; indexing with an unknown id gives undefined at runtime. */
export const METRICS: Record<MetricId, MetricDef> = { ...REGISTRY, ...ACTIVATION_REGISTRY };

/** Typed lookup; the id doubles as the chip under every figure. */
export const metricDef = (id: KnownMetricId | ActivationMetricId): MetricDef =>
  (REGISTRY as Record<string, MetricDef>)[id] ?? (ACTIVATION_REGISTRY as Record<string, MetricDef>)[id];

/** The Clinic Activation report's own measures, in id order. */
export const ACTIVATION_METRIC_IDS = Object.keys(ACTIVATION_REGISTRY) as ActivationMetricId[];

/**
 * The figures the Overview preview page shows (its chips, asserted by
 * tests/next-overview.test.ts). The registry itself covers all 35 measures;
 * ALL_METRIC_IDS lists every one for the section pages.
 */
export const METRIC_IDS: KnownMetricId[] = [
  'M01', 'M03', 'M04', 'M06', 'M07', 'M08', 'M15', 'M16', 'M18', 'M19', 'M25',
];

/** Every DN-032 measure (M01 to M35), in id order; ACTIVATION_METRIC_IDS lists the A-ids. */
export const ALL_METRIC_IDS = Object.keys(REGISTRY) as KnownMetricId[];
