/**
 * DN-032 metric registry, definition version 1 (approved handoff:
 * .agent-bus/outbox/DN-032.md §Metric registry).
 *
 * One entry per figure the new Overview preview (/next) shows. Each definition
 * is one plain-English sentence a CEO can read: what counts, what does not,
 * the day boundary and the clinic scope. The registry describes the figures
 * EXACTLY as the existing readers produce them (the same readers behind the
 * 09:00 emails), so a definition never promises a rule the number does not
 * apply. Changing a definition means a new definitionVersion, never a silent
 * edit.
 */

export type MetricId =
  | 'M01' | 'M03' | 'M04' | 'M06' | 'M07' | 'M08'
  | 'M15' | 'M16' | 'M18' | 'M19' | 'M25';

export type MetricUnit = 'count' | 'AED' | 'AED per enquiry' | 'rating out of 5';

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

export const METRICS: Record<MetricId, MetricDef> = {
  M01: {
    id: 'M01',
    name: 'Enquiries',
    definition:
      'Enquiry records in the selected Dubai days, tracked for all clinics together and never split by clinic: a website enquiry counts once per phone number per day, any other enquiry counts once per phone number in the selected dates, so this is a record count, not a count of unique people.',
    unit: 'count',
    source: 'Lead tracker and website enquiries, read by the Growth channel report.',
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
  M25: {
    id: 'M25',
    name: 'DN Ortho programme billing',
    definition:
      'Billing the DN Ortho programme can prove it caused, from bills explicitly linked to the programme in the selected Dubai days across its clinics; no such link exists yet, so the figure is unavailable rather than estimated from the orthodontists’ charge lines.',
    unit: 'AED',
    source: 'No linked source yet; the orthodontists’ charge lines are a different measure and are not substituted.',
    definitionVersion: 1,
  },
};

/** Typed lookup; the id doubles as the chip under every figure. */
export const metricDef = (id: MetricId): MetricDef => METRICS[id];

export const METRIC_IDS = Object.keys(METRICS) as MetricId[];
