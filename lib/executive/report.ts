import 'server-only';
import { parseISO, format } from 'date-fns';
import { getRangeReport } from '@/lib/report';
import { getCrmReport } from '@/lib/crm/report';
import { getPractoSummary } from '@/lib/practo/report';
import { getMarketingReport } from '@/lib/marketing/report';
import type { ExecKpis, ExecMonthPoint, ExecutiveReport } from './types';

/**
 * Assemble the Executive Dashboard report. Reads every source over its FULL
 * history (preset 'all' for the range sources; all-time for CRM + Practo) so the
 * hero shows the complete business picture. Pure composition — each underlying
 * read already degrades gracefully, so this never throws.
 *
 * Marketing spend comes from the LIVE Meta + Google ad APIs (the same source as
 * the Marketing tab) — NOT the older manual social sheet — so the hero and the
 * Marketing tab can never disagree on spend. Cost-per-lead is that live spend
 * over the tracked leads shown beside it, so the two numbers reconcile.
 */
export interface ExecQuery {
  from?: string;
  to?: string;
  preset?: string;
  compare?: string;
}

export async function getExecutiveReport(query: ExecQuery = {}): Promise<ExecutiveReport> {
  const [range, crm, practo, mkt] = await Promise.all([
    getRangeReport({
      from: query.from,
      to: query.to,
      preset: query.preset ?? 'all',
      compare: query.compare ?? 'none',
    }),
    getCrmReport({ from: query.from, to: query.to }),
    getPractoSummary({ from: query.from, to: query.to }),
    getMarketingReport(),
  ]);

  const { paid, leads, ga4, bookings, series } = range;
  const appt = crm.appointments;
  const conv = crm.conversation;

  // A specific window is selected (not the full-history default). When scoped,
  // spend/trend come from the range-scoped paid data; at the 'all' default we
  // keep the LIVE all-time ad spend so the headline reconciles with Marketing.
  const scoped = range.range.preset !== 'all';

  // Live ad spend (Meta + Google), with a graceful fallback to the manual sheet.
  // When a window is selected, prefer the range-scoped paid spend (live is
  // all-time and would misreport the window).
  const liveAdSpend = mkt.source === 'live' ? mkt.totals.adSpend : null;
  const marketingSpend = scoped ? paid.spend.value : (liveAdSpend ?? paid.spend.value);
  const leadsGenerated = leads.total.value;
  // Cost per lead = live spend ÷ tracked leads (the two figures shown together).
  const costPerLead =
    marketingSpend != null && leadsGenerated && leadsGenerated > 0
      ? marketingSpend / leadsGenerated
      : paid.costPerLead.value;

  const kpis: ExecKpis = {
    marketingSpend,
    leadsGenerated,
    paidLeads: paid.leads.value,
    costPerLead,
    websiteSessions: ga4?.sessions.value ?? null,
    websiteConversions: ga4?.conversions.value ?? null,
    appointmentsBooked: appt.total,
    appointmentsCompleted: appt.completed,
    completionRate: appt.completionRate,
    cancellationRate: appt.cancellationRate,
    aiAgentBookings: appt.aiAgentBookings,
    clinicRevenue: practo.source === 'live' ? practo.revenue : null,
    avgBillValue: practo.avgBill,
    conversationsHandled: conv?.conversations ?? null,
    avgFirstResponseHours: conv?.avgFirstResponseHours ?? null,
  };

  // Monthly roll-up across the business (each metric from its own population).
  const months = new Map<string, ExecMonthPoint>();
  const bump = (date: string | null | undefined, patch: Partial<ExecMonthPoint>) => {
    if (!date) return;
    const m = date.slice(0, 7); // YYYY-MM
    const row =
      months.get(m) ??
      { month: m, label: safeMonthLabel(m), spend: 0, leads: 0, appointments: 0, revenue: 0 };
    if (patch.spend) row.spend += patch.spend;
    if (patch.leads) row.leads += patch.leads;
    if (patch.appointments) row.appointments += patch.appointments;
    if (patch.revenue) row.revenue += patch.revenue;
    months.set(m, row);
  };
  for (const d of series) bump(d.date, { leads: d.inquiries });
  // Monthly spend: LIVE ad source at the default (matches the headline +
  // Marketing tab); the range-scoped per-day series when a window is selected.
  if (!scoped && mkt.source === 'live') {
    for (const m of mkt.monthly) bump(`${m.month}-01`, { spend: m.spend });
  } else {
    for (const d of series) bump(d.date, { spend: d.spend });
  }
  for (const d of appt.series) bump(d.date, { appointments: d.appointments });
  for (const d of practo.byDay) bump(d.date, { revenue: d.revenue });
  const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

  const coverage = {
    paid: mkt.source === 'live' || !paid.empty,
    leads: !leads.empty,
    ga4: Boolean(ga4 && (ga4.sessions.value ?? 0) > 0),
    bookings: !bookings.empty,
    crm: crm.source === 'live',
    practo: practo.source === 'live',
  };

  const anyLive = Object.values(coverage).some(Boolean);

  return {
    range: range.range,
    paid,
    leads,
    ga4,
    bookings,
    series,
    crm,
    practo,
    kpis,
    monthly,
    coverage,
    source: range.source === 'mock' ? 'mock' : anyLive ? 'live' : 'empty',
  };
}

function safeMonthLabel(m: string): string {
  try {
    return format(parseISO(`${m}-01`), 'MMM yyyy');
  } catch {
    return m;
  }
}
