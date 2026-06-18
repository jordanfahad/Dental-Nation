import type {
  Blocker,
  ChannelStatus,
  ContentItem,
  DailySnapshot,
  FunnelStage,
  Ga4Summary,
  IngestionStatus,
  KpiTrends,
  PacFeedback,
  ReportView,
  TrackingHealth,
} from '@/lib/types';
import { ONSITE_FUNNEL } from '@/config/ga4';
import { CANONICAL_CHANNELS } from '@/config/channels';
import { ownerFor } from '@/config/data-gap-owners';
import { trailingDates } from '@/lib/dates';

/**
 * Realistic mock ReportView for the scaffold (mock-first build). It deliberately
 * exercises EVERY state the real data must handle: upstream funnel stages as
 * data gaps (not zeros), unattributed leads above the ceiling (→ suggested Fix),
 * a founder decision required (amber hero), partial channel activation, and
 * qualitative PAC quotes. Replace with the live data layer once Phase 0 + the
 * lead-tracker sync land (build step 2).
 */

const MEASURED: Array<[string, string, number]> = [
  ['valid_inquiries', 'Valid inquiries', 41],
  ['qualified_inquiries', 'Qualified inquiries', 23],
  ['glow_up_bookings', 'Glow Up bookings', 6],
  ['attended_visits', 'Attended visits', 4],
  ['treatment_opportunities', 'Treatment opportunities', 3],
  ['proof_captured', 'Proof captured', 2],
  ['reviews_captured', 'Reviews captured', 1],
];
const UPSTREAM: Array<[string, string]> = [
  ['reach', 'Reach'],
  ['impressions', 'Impressions'],
  ['clicks', 'Clicks'],
  ['lp_visits', 'Landing-page visits'],
  ['wa_clicks', 'WhatsApp clicks'],
  ['call_clicks', 'Call clicks'],
];

function buildFunnel(scale = 1): FunnelStage[] {
  const upstream: FunnelStage[] = UPSTREAM.map(([key, label]) => ({
    key,
    label,
    upstream: true,
    today: null, // data gap — no reach/impression/click source mapped in v1
    yesterday: null,
    total: null,
    conversionFromPrev: null,
  }));
  const measured: FunnelStage[] = MEASURED.map(([key, label, base]) => {
    const today = Math.round(base * scale);
    return {
      key,
      label,
      today,
      yesterday: Math.max(0, Math.round(today * 0.85)),
      total: today * 24,
      conversionFromPrev: null,
    };
  });
  let prev: number | null = null;
  for (const s of measured) {
    s.conversionFromPrev = prev != null && prev > 0 ? (s.today as number) / prev : null;
    prev = s.today;
  }
  return [...upstream, ...measured];
}

const INQUIRIES_BY_CHANNEL: Record<string, number> = {
  'WhatsApp click path': 12,
  'Google Business Profile/Maps': 9,
  'Instagram reels': 7,
  'Meta paid ads': 5,
  'Website/landing page': 4,
  Unattributed: 4,
};
const QUALIFIED_BY_CHANNEL: Record<string, number> = {
  'WhatsApp click path': 7,
  'Google Business Profile/Maps': 6,
  'Instagram reels': 4,
  'Meta paid ads': 3,
  'Website/landing page': 3,
};
const BOOKINGS_BY_CHANNEL: Record<string, number> = {
  'Google Business Profile/Maps': 3,
  'WhatsApp click path': 2,
  'Meta paid ads': 1,
};

function buildSnapshot(reportDate: string, scale = 1): DailySnapshot {
  const funnel = buildFunnel(scale);
  const inquiries = 41;
  const unattributed = 11;
  const dataGaps = [
    { area: 'cost', detail: 'No ad-spend source mapped', owner: ownerFor('cost') },
    {
      area: 'attribution',
      detail: `${unattributed} inquiries today have no identifiable channel source`,
      owner: ownerFor('attribution'),
    },
    {
      area: 'tracking',
      detail: 'Reach / impressions / clicks have no source (raw social report not yet mapped)',
      owner: ownerFor('tracking'),
    },
  ];
  return {
    report_date: reportDate,
    decision: 'Fix',
    decision_reason: 'Fix — 27% of inquiries unattributed (above the 20% ceiling)',
    best_channel: 'Google Business Profile/Maps',
    worst_channel: 'Instagram reels',
    main_bottleneck: 'Qualified → Glow Up booking (74% drop)',
    founder_decision: 'Approve paid budget shift from IG reels to Maps + WhatsApp',
    founder_decision_needed: true,
    funnel,
    inquiries_by_channel: INQUIRIES_BY_CHANNEL,
    qualified_by_channel: QUALIFIED_BY_CHANNEL,
    bookings_by_channel: BOOKINGS_BY_CHANNEL,
    lead_to_booking_rate: 6 / 23,
    cost_per_inquiry: null, // data gap — no spend source
    cost_per_booking: null,
    show_rate: 4 / 6,
    unattributed_leads: unattributed,
    data_gaps: dataGaps,
    computed_at: new Date().toISOString(),
  };
}

function buildKpiTrends(): KpiTrends {
  const mk = (series: number[]) => ({
    series,
    today: series[series.length - 1],
    yesterday: series[series.length - 2],
    delta: series[series.length - 1] - series[series.length - 2],
  });
  return {
    qualified_inquiries: mk([14, 18, 16, 21, 19, 22, 23]),
    glow_up_bookings: mk([3, 5, 4, 6, 5, 5, 6]),
    lead_to_booking_rate: mk([0.21, 0.28, 0.25, 0.29, 0.26, 0.23, 0.26]),
    show_rate: mk([0.6, 0.62, 0.7, 0.66, 0.64, 0.68, 0.67]),
    unattributed_leads: mk([6, 8, 7, 10, 9, 12, 11]),
  };
}

function buildChannels(): ChannelStatus[] {
  // First handful fully/mostly live, a middle band partial, the rest not live —
  // every canonical channel rendered (never omitted).
  const live = new Set([
    'Website/landing page',
    'WhatsApp click path',
    'Call click path',
    'Instagram feed',
    'Instagram reels',
    'Google Business Profile/Maps',
  ]);
  const partial = new Set([
    'Instagram stories',
    'Instagram highlights',
    'Facebook page',
    'Meta paid ads',
    'SEO/organic',
    'Email CRM',
  ]);
  const owners = ['Acquisition', 'Content/Studio', 'PAC', 'Clinic ops', 'Data/Analytics'];
  return CANONICAL_CHANNELS.map((channel, i) => {
    const isLive = live.has(channel);
    const isPartial = partial.has(channel);
    const on = isLive;
    const mid = isLive || isPartial;
    return {
      channel,
      is_live: on,
      content_populated: mid,
      cta_correct: on,
      destination_correct: mid,
      tracking_active: on && channel !== 'Instagram reels', // reels tracking gap, intentionally
      owner: owners[i % owners.length],
      blocker: isLive
        ? channel === 'Instagram reels'
          ? 'No UTM on link-in-bio'
          : null
        : isPartial
          ? 'Awaiting creative / setup'
          : 'Not live yet',
    };
  });
}

function buildContent(): ContentItem[] {
  return [
    {
      id: 'c1',
      title: 'Dr. Sara — veneer case reveal',
      channel: 'Instagram reels',
      link: '#',
      objective: 'proof',
      content_type: 'proof',
      audience: 'Women 28–45, Dubai',
      cta: 'Book The DN Glow Up',
      perf_note: 'Strong saves; high profile visits',
      issue_note: 'No UTM on the link-in-bio',
      status: 'live',
    },
    {
      id: 'c2',
      title: 'Why we do a full smile assessment',
      channel: 'Instagram feed',
      link: '#',
      objective: 'awareness',
      content_type: 'doctor authority',
      audience: 'Cold',
      cta: 'Learn more',
      perf_note: 'Steady reach',
      issue_note: null,
      status: 'live',
    },
    {
      id: 'c3',
      title: 'Patient testimonial — Mariam',
      channel: 'Meta paid ads',
      link: '#',
      objective: 'conversion',
      content_type: 'testimonial',
      audience: 'Lookalike 1%',
      cta: 'Book The DN Glow Up',
      perf_note: 'Best CTR of the set',
      issue_note: 'Creative fatigue starting',
      status: 'live',
    },
    {
      id: 'c4',
      title: 'Glow Up offer explainer',
      channel: 'Instagram stories',
      link: '#',
      objective: 'conversion',
      content_type: 'offer',
      audience: 'Warm',
      cta: 'Swipe up',
      perf_note: '—',
      issue_note: 'Reads discount-y; tone too promotional',
      status: 'review',
    },
    {
      id: 'c5',
      title: '“Is it painful?” — objection handling',
      channel: 'TikTok organic',
      link: '#',
      objective: 'retargeting',
      content_type: 'objection-handling',
      audience: 'Engaged non-bookers',
      cta: 'DM us',
      perf_note: 'Not yet shot',
      issue_note: 'Blocked on shoot calendar',
      status: 'planned',
    },
  ];
}

function buildPac(reportDate: string): PacFeedback {
  return {
    report_date: reportDate,
    whatsapp_inquiries: 27,
    calls: 9,
    avg_response_minutes: 23,
    missed_inquiries: 4,
    bookings_created: 6,
    top_questions: [
      'How much is the Glow Up package?',
      'Do you have availability this week?',
      'Is it painful / how long does it take?',
      'Do you take insurance?',
    ],
    top_objections: [
      'Want to think about it / check with partner',
      'Price higher than expected',
      'Timing — travelling next week',
    ],
    main_no_booking_reason: 'Price clarity — patients ask cost before value is established',
    script_issue: 'PAC quoting price before framing the assessment value',
    content_needed: 'A “what’s included in the Glow Up” explainer to send on first reply',
  };
}

function buildBlockers(): Blocker[] {
  return [
    {
      id: 'b1',
      blocker: 'No UTM/tracking on Instagram link-in-bio',
      type: 'tracking',
      impact: 'high',
      owner: 'Data/Analytics',
      fix: 'Add UTM-tagged short link; verify in lead tracker',
      due_time: 'Today 14:00',
      status: 'open',
    },
    {
      id: 'b2',
      blocker: 'PAC avg response 23 min (target ≤15)',
      type: 'PAC',
      impact: 'high',
      owner: 'PAC',
      fix: 'Add a first-reply template + on-call coverage 9–11am',
      due_time: 'Today 17:00',
      status: 'in-progress',
    },
    {
      id: 'b3',
      blocker: 'Objection-handling video not shot',
      type: 'creative',
      impact: 'medium',
      owner: 'Content/Studio',
      fix: 'Slot into Thursday shoot',
      due_time: 'Thu',
      status: 'open',
    },
    {
      id: 'b4',
      blocker: 'Maps profile missing booking link',
      type: 'channel',
      impact: 'medium',
      owner: 'Acquisition',
      fix: 'Add booking URL to GBP',
      due_time: 'Tomorrow',
      status: 'open',
    },
    {
      id: 'b5',
      blocker: 'Landing page slow on mobile',
      type: 'website',
      impact: 'low',
      owner: 'Acquisition',
      fix: 'Compress hero image',
      due_time: 'This week',
      status: 'done',
    },
  ];
}

function buildTracking(unattributed: number, attributed: number): TrackingHealth {
  return {
    attributed,
    unattributed,
    missing: [
      { label: 'UTM source/campaign', count: unattributed, owner: ownerFor('utm') },
      { label: 'Campaign name', count: unattributed, owner: ownerFor('attribution') },
      { label: 'Creative id', count: unattributed + 3, owner: ownerFor('creative') },
      { label: 'PAC owner', count: 5, owner: ownerFor('pac') },
      { label: 'Booking status', count: 2, owner: ownerFor('clinic') },
    ],
    flagged: [
      { ref: 'LE-0142', detail: 'WhatsApp inquiry, no source tag', owner: ownerFor('attribution') },
      { ref: 'LE-0147', detail: 'Walk-in logged without channel', owner: ownerFor('attribution') },
      { ref: 'LE-0151', detail: 'IG DM, link-in-bio had no UTM', owner: ownerFor('utm') },
    ],
  };
}

function buildIngestion(): IngestionStatus {
  return {
    status: 'success',
    finished_at: new Date().toISOString(),
    sheets_ok: ['Inhouse Lead Tracker', 'DN on-site GMB Form', 'ALL Task detail'],
    sheets_failed: [],
    rows_ingested: 312,
  };
}

/** Mock "Website — last 28 days" GA4 summary so the §GA4 section renders in
 *  scaffold/mock mode. Counts roughly mirror the live shape (smaller than the
 *  90-day sample): sessions descend cleanly through the booking funnel. */
function buildGa4(latest: string): Ga4Summary {
  const sessions = 782;
  const funnelCounts: Record<string, number> = {
    booking_widget_viewed: 612,
    booking_visit_type_selected: 98,
    booking_treatment_selected: 71,
  };
  let prev: number | null = null;
  const onsite_funnel = ONSITE_FUNNEL.map((stage) => {
    const count = funnelCounts[stage.key] ?? 0;
    const conversionFromPrev = prev != null && prev > 0 ? count / prev : null;
    prev = count;
    return { key: stage.key, label: stage.label, count, conversionFromPrev };
  });
  const end = new Date(`${latest}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 28);
  return {
    period_start: start.toISOString().slice(0, 10),
    period_end: latest,
    sessions,
    users: 431,
    new_users: 428,
    conversions: 95,
    engaged_sessions: 408,
    leads: 88,
    channels: [
      { channel: 'Direct', sessions: 286, conversions: 31 },
      { channel: 'Organic Search', sessions: 204, conversions: 24 },
      { channel: 'Paid Search', sessions: 142, conversions: 22 },
      { channel: 'Referral', sessions: 78, conversions: 9 },
      { channel: 'Organic Social', sessions: 52, conversions: 6 },
      { channel: 'Unassigned', sessions: 20, conversions: 3 },
    ],
    onsite_funnel,
  };
}

const DATE_COUNT = 6;

/** All mock report dates, newest first. */
export function mockDates(latest: string): string[] {
  return trailingDates(latest, DATE_COUNT).reverse();
}

export function mockReportView(latest: string, reportDate?: string): ReportView {
  const dates = mockDates(latest);
  const date = reportDate && dates.includes(reportDate) ? reportDate : dates[0];
  // Older dates scale down slightly so the picker shows distinct data.
  const idx = dates.indexOf(date);
  const scale = 1 - idx * 0.08;
  const snapshot = buildSnapshot(date, scale);
  const totalInq = Object.values(snapshot.inquiries_by_channel).reduce((a, b) => a + b, 0);
  return {
    snapshot,
    kpiTrends: buildKpiTrends(),
    channels: buildChannels(),
    content: buildContent(),
    pac: buildPac(date),
    blockers: buildBlockers(),
    tracking: buildTracking(snapshot.unattributed_leads, totalInq - snapshot.unattributed_leads),
    ingestion: buildIngestion(),
    availableDates: dates,
    ga4: buildGa4(date),
  };
}
