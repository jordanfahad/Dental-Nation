import { CHANNELS } from '../../config/growth-channels';
import type { GrowthReport } from '../../lib/growth/channelPerformance';
import { addDays, buildGbpPlan, type RawLogRow } from '../../lib/gbp/plan';
import { benchmarks, buildPeriod, GROUPS, parseGrossRows, type PerformanceBrief, type ReceptionWindow } from '../../lib/performance/core';

export const logRow = (overrides: Record<string, unknown> = {}, row_index = 2): RawLogRow => ({ row_index, data: {
  Date: '2026-10-11', Branch: 'Al Wasl', 'Plan day': '1', Activity: 'Check opening hours', Status: 'Done',
  'Done by': 'Branch team', 'Proof link': 'https://example.com/proof', Notes: '', ...overrides,
} });
export function growth(enquiries = 41, revenue = 23400): GrowthReport {
  return { source: 'live', from: '2026-10-11', to: '2026-10-11',
    channels: CHANNELS.map((c, i) => ({ ...c, impressions: null, reachNote: null, enquiries: i ? 0 : enquiries,
      booked: i ? 0 : 12, bookedPatients: i ? 0 : 10, showed: i ? 0 : 9, cancelled: 0, noshow: i ? 0 : 3,
      treated: i ? 0 : 8, revenue: i ? 0 : revenue, taggedBooked: 0, inferredBooked: 0,
      spend: i ? null : 700, spendThrough: null, costPerEnquiry: null, costPerBooked: null, costPerShowed: null, costPerPatient: null, roas: null })),
    totals: { enquiries, booked: 12, showed: 9, treated: 8, revenue, showRate: .75, treatRate: .8 }, byMonth: [], apptFeedRows: 12,
    confidence: { tagged: 12, inferred: 0, defaulted: 0 }, ga4: null, unattributedPatients: 0, unattributedRevenue: 0,
    phonePath: null, organicSplit: null, metaSplit: null, trackerLeadRows: 65, mvmSelection: null, notes: [],
  };
}
export function gbpFixture() {
  return buildGbpPlan({ asOf: '2026-10-11', syncedAt: '2026-10-12T04:00:00Z', connected: ['dental-nation'],
    rows: Array.from({ length: 11 }, (_, i) => logRow({ Date: addDays('2026-10-01', i), 'Plan day': i + 1 }, i + 2)),
    metrics: Array.from({ length: 41 }, (_, i) => ['calls', 'directions', 'website_clicks', 'map_views_desktop', 'map_views_mobile'].map((metric) => ({ clinic: 'dental-nation', day: addDays('2026-09-01', i), metric, value: metric === 'calls' ? 4 : 2 }))).flat(),
    reviews: [{ clinic: 'dental-nation', date: '2026-10-11', rating: 5, syncedAt: '2026-10-12T04:00:00Z' }],
  });
}
export function briefFixture(): PerformanceBrief {
  const report = growth();
  const p = buildPeriod('2026-10-11', '2026-10-11', { all: report, wasl: report, tosun: growth(0, 0) }, parseGrossRows(Array.from({ length: 65 }, () => ({ data: { Date: '2026-10-11', 'Clinic / Branch': 'Al Wasl', 'Source Type': 'Paid', 'Inquiry Platform': 'Google' } }))), []);
  const period = { enrolments: null, messages: null, replies: null, bookings: 3, shows: 2 };
  const reception: ReceptionWindow = { from: '2026-10-11', to: '2026-10-11', logged: 0,
    byGroup: Object.fromEntries(GROUPS.map((g) => [g, 0])) as ReceptionWindow['byGroup'], booked: 0, noSource: 0 };
  return { today: '2026-10-12', yesterday: p, mtd: { ...p, from: '2026-10-01' }, gbp: gbpFixture(), action: '',
    reception: { yesterday: reception, mtd: { ...reception, from: '2026-10-01' }, futureDated: 0, lastSyncedAt: null },
    why: ['Net enquiries: 41 versus 30 in the prior 7 days.', 'No-shows: 3 versus 2.', 'Recorded paid spend: AED 700 versus AED 600.'],
    benchmark: benchmarks([], '2026-10-11'), smile: { members: 12, membersAsOf: '2026-10-11', verifiedHistoricalMembers: 0, verifiedAt: '2026-09-25', yesterday: period, mtd: period, notes: ['Dated messages and replies not stored.'] } };
}
