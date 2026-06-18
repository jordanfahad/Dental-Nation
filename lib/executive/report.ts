import 'server-only';
import { parseISO, format } from 'date-fns';
import { getRangeReport } from '@/lib/report';
import { getCrmReport } from '@/lib/crm/report';
import { getPractoSummary } from '@/lib/practo/report';
import type { ExecKpis, ExecMonthPoint, ExecutiveReport } from './types';

/**
 * Assemble the Executive Dashboard report. Reads every source over its FULL
 * history (preset 'all' for the range sources; all-time for CRM + Practo) so the
 * hero shows the complete business picture. Pure composition — each underlying
 * read already degrades gracefully, so this never throws.
 */
export async function getExecutiveReport(): Promise<ExecutiveReport> {
  const [range, crm, practo] = await Promise.all([
    getRangeReport({ preset: 'all', compare: 'none' }),
    getCrmReport({}),
    getPractoSummary({}),
  ]);

  const { paid, leads, ga4, bookings, series } = range;
  const appt = crm.appointments;
  const conv = crm.conversation;

  const kpis: ExecKpis = {
    marketingSpend: paid.spend.value,
    leadsGenerated: leads.total.value,
    paidLeads: paid.leads.value,
    costPerLead: paid.costPerLead.value,
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
  for (const d of series) bump(d.date, { spend: d.spend, leads: d.inquiries });
  for (const d of appt.series) bump(d.date, { appointments: d.appointments });
  for (const d of practo.byDay) bump(d.date, { revenue: d.revenue });
  const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

  const coverage = {
    paid: !paid.empty,
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
