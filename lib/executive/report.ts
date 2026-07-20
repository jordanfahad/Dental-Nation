import 'server-only';
import { parseISO, format, differenceInCalendarDays } from 'date-fns';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getRangeReport } from '@/lib/report';
import { getCrmReport } from '@/lib/crm/report';
import { getPractoSummary } from '@/lib/practo/report';
import { getAdSpendForRange, getAdFeedFreshness } from '@/lib/marketing/report';
import { getWidgetEnquiries } from '@/lib/bookings/widgetEnquiries';
import type { ClinicFilterKey } from '@/config/clinics';
import type { ExecKpis, ExecMonthPoint, ExecutiveReport } from './types';

/**
 * Assemble the Executive Dashboard report. Every source honours the header date
 * picker via one RESOLVED window (range.range): the default 'All' shows the
 * complete business picture, and any preset/custom range scopes the KPIs, the
 * revenue mix (department / doctor / treatment) and appointments to that window,
 * consistently with leads/spend/GA4. Pure composition — each underlying read
 * already degrades gracefully, so this never throws.
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
  /** Clinic lens for the clinic-specific populations (CRM appointments + Practo
   *  revenue). Acquisition sources stay all-clinic regardless. */
  clinic?: ClinicFilterKey;
}

export async function getExecutiveReport(query: ExecQuery = {}): Promise<ExecutiveReport> {
  // Acquisition sources (ad spend, leads, GA4, booking widget) are SHARED across
  // both clinics — the website + booking widget are the same — so they are never
  // scoped by clinic. Only the clinic-specific populations (CRM appointments +
  // Practo bills) take the clinic lens; their byClinic split always carries both.
  const clinic = query.clinic ?? 'all';
  // Resolve the range FIRST. The date picker DELETES ?from/?to when a preset is
  // chosen, so query.from/to are undefined under any preset — reading CRM/Practo
  // with those would silently return ALL-TIME while leads/spend/GA4 follow the
  // picker (the misalignment the CEO flagged). Scope the clinic populations to
  // the RESOLVED window instead; 'All' stays unbounded so the hero's all-time
  // totals never clip early bills.
  const range = await getRangeReport({
    from: query.from,
    to: query.to,
    preset: query.preset ?? 'all',
    compare: query.compare ?? 'none',
  });
  const isAll = range.range.preset === 'all';
  const clinicFrom = isAll ? undefined : range.range.from;
  const clinicTo = isAll ? undefined : range.range.to;

  const [crm, practo, adSpend, freshness] = await Promise.all([
    getCrmReport({ from: clinicFrom, to: clinicTo, clinic }),
    getPractoSummary({ from: clinicFrom, to: clinicTo, clinic }),
    getAdSpendForRange(range.range.from, range.range.to),
    getAdFeedFreshness(),
  ]);

  const { paid, leads, ga4, bookings, series } = range;
  const appt = crm.appointments;
  const conv = crm.conversation;

  // Live ad spend (Meta + Google insight tables), summed over the SELECTED
  // window — so the headline always matches the picker (over the full span it
  // equals the all-time total on the Marketing tab). Falls back to the manual
  // RAW_Performance spend only when there is no live ad data in the window.
  // (adSpend + freshness are fetched with the sources above.)
  const marketingSpend = adSpend.rows > 0 ? adSpend.total : (paid.spend.value ?? null);
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
  // Monthly enquiries: lead tracker (lane_e.leads) + non-test website-widget
  // enquiries, grouped by month, scoped to the window — so the enquiry line
  // matches the Platforms tab (e.g. July = 3 tracker + 1 widget = 4).
  for (const [m, n] of await leadsByMonth(range.range.from, range.range.to)) {
    const row =
      months.get(m) ?? { month: m, label: safeMonthLabel(m), spend: 0, leads: 0, appointments: 0, revenue: 0 };
    row.leads += n;
    months.set(m, row);
  }
  try {
    const widgetEnq = await getWidgetEnquiries({ from: range.range.from, to: range.range.to });
    for (const e of widgetEnq.enquiries) {
      if (!e.enquiredAt) continue;
      const m = e.enquiredAt.slice(0, 7);
      const row =
        months.get(m) ?? { month: m, label: safeMonthLabel(m), spend: 0, leads: 0, appointments: 0, revenue: 0 };
      row.leads += 1;
      months.set(m, row);
    }
  } catch {
    /* widget enquiries best-effort */
  }
  // Monthly spend from the LIVE per-day ad spend (Meta + Google), scoped to the
  // window — consistent with the headline.
  for (const d of adSpend.daily) bump(d.date, { spend: d.spend });
  for (const d of appt.series) bump(d.date, { appointments: d.appointments });
  for (const d of practo.byDay) bump(d.date, { revenue: d.revenue });
  const monthly = [...months.values()].sort((a, b) => a.month.localeCompare(b.month));

  const coverage = {
    paid: adSpend.rows > 0 || !paid.empty,
    leads: !leads.empty,
    ga4: Boolean(ga4 && (ga4.sessions.value ?? 0) > 0),
    bookings: !bookings.empty,
    crm: crm.source === 'live',
    practo: practo.source === 'live',
  };

  const anyLive = Object.values(coverage).some(Boolean);

  // Meta is stale when its latest insight date lags well behind Google's — a
  // clear signal the Meta feed stopped syncing (expired token / lost access).
  const metaStale = Boolean(
    freshness.metaLatest &&
      freshness.googleLatest &&
      differenceInCalendarDays(parseISO(freshness.googleLatest), parseISO(freshness.metaLatest)) > 7,
  );

  return {
    range: range.range,
    adFreshness: { metaLatest: freshness.metaLatest, googleLatest: freshness.googleLatest, metaStale },
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

/** Lead-tracker (lane_e.leads) enquiry counts grouped by YYYY-MM, scoped to the
 *  window (all channels, incl. ZAVIS). The authoritative monthly leads source
 *  for the Executive trend. */
async function leadsByMonth(from: string, to: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const db = getSupabaseAdmin();
  if (!db) return out;
  try {
    let q = db.from('leads').select('inquiry_date');
    if (from) q = q.gte('inquiry_date', from);
    if (to) q = q.lte('inquiry_date', to);
    const { data } = await q;
    for (const r of (data as { inquiry_date: string | null }[] | null) ?? []) {
      const m = (r.inquiry_date ?? '').slice(0, 7);
      if (m) out.set(m, (out.get(m) ?? 0) + 1);
    }
  } catch {
    /* leave empty on failure */
  }
  return out;
}
