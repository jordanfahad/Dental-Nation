/**
 * Clinic Activation (Dr Luvi's daily report) — read layer only. The page and
 * the 09:00 email are built on top of this later.
 *
 * Windows are Dubai days: by default yesterday and the 1st of yesterday's
 * month to yesterday (periods(today)); a chosen range uses periodsFor(range).
 *
 * Read-only and never throws: each section is read on its own and a source
 * that cannot be read is null. Missing is never turned into 0.
 *
 *  - leads: lane_e.leads (the Inhouse Lead Tracker rows the sync already
 *    normalised: inquiry_date, channel_source, booking_status from the
 *    Conversion column), excluding the Smile Club, GMB and website tabs.
 *  - smileClub: lane_e.raw_lead_tracker rows from the "Smile Club" tab.
 *  - gmb: lane_e.gmb_frontoffice_daily snapshots.
 *  - revenue: Practo billed revenue via getPractoSummary (as the morning
 *    performance email) and AMC revenue from lane_e.amc_daily_report — two
 *    different sources, kept apart.
 *  - ortho: readOrthoDaily (lib/alerts/orthoDaily.ts), unchanged semantics.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { GMB_CLINICS, type GmbClinicKey } from '@/config/gmb-clinics';
import { type ClinicFilterKey } from '@/config/clinics';
import { GMB_FRONTOFFICE_TAB, SMILE_CLUB_TAB, sheetMapping } from '@/config/sheet-mapping';
import { isWebsiteMirrorTab } from '@/config/website-enquiries';
import { periods, periodsFor, type Range } from '@/lib/alerts/links';
import { readOrthoDaily, type OrthoDailyData } from '@/lib/alerts/orthoDaily';
import { getPractoSummary } from '@/lib/practo/report';
import { canonicalBranch } from '@/lib/lead-tracker/branch';
import { leadGroup } from '@/lib/lead-tracker/reporting';
import { bookedFrom } from '@/lib/bookings/status';
import { asLeadDate, conversionIsBooked } from '@/lib/sync/normalize';
import type { PerfGroup } from '@/lib/performance/core';

export type ActivationClinic = GmbClinicKey;
export type LeadClinic = ActivationClinic | 'unassigned';
export const ACTIVATION_CLINICS: ActivationClinic[] = GMB_CLINICS.map((c) => c.key);
const LEAD_CLINICS: LeadClinic[] = [...ACTIVATION_CLINICS, 'unassigned'];

/** Tracker tabs that are not lead tabs for this report (website tabs are matched by isWebsiteMirrorTab). */
export const NON_LEAD_TABS = [SMILE_CLUB_TAB, GMB_FRONTOFFICE_TAB];

/* ── types ── */

export interface LeadBucket {
  leads: number;
  /** Leads whose Conversion column says booked/converted (cohort: by enquiry date). */
  converted: number;
  /** By Inquiry Platform as the sync normalised it (channel_source); "Not recorded" when empty. */
  byPlatform: Record<string, number>;
  /** By reporting group (Paid digital, Organic digital, …), the reception rule. */
  byGroup: Partial<Record<PerfGroup, number>>;
}
export interface LeadsSection {
  byClinic: Record<LeadClinic, { yesterday: LeadBucket; window: LeadBucket }>;
  total: { yesterday: LeadBucket; window: LeadBucket };
  /** Rows dropped because they came from Smile Club, GMB or website tabs (window). */
  excludedRows: number;
}

export interface SmileClubBucket { enquiries: number; followedUp: number; converted: number }
export interface SmileClubSection {
  byClinic: Record<LeadClinic, { yesterday: SmileClubBucket; window: SmileClubBucket }>;
  total: { yesterday: SmileClubBucket; window: SmileClubBucket };
  /** Smile Club rows with no readable date (never in any window). */
  undated: number;
}

export interface GmbSnapshot {
  snapshotDay: string;
  /** First name only, as the sheet gives it (staff). */
  foName: string | null;
  reviewsToday: number | null;
  reviewsIndividual: number | null;
  reviewsTotal: number | null;
  photos: number | null;
  videos: number | null;
  monthTitle: string | null;
  syncedAt: string | null;
}
export interface GmbWindowSums {
  /** Days in the window with a snapshot. */
  days: number;
  /** Sums over those snapshots; null when no snapshot has the figure. */
  reviewsToday: number | null;
  photos: number | null;
  videos: number | null;
}
export interface GmbSection {
  /** Latest snapshot on or before the window end; null = none. */
  latest: Record<ActivationClinic, GmbSnapshot | null>;
  /** Snapshot taken on the window's last day; null = none that day. */
  yesterday: Record<ActivationClinic, GmbSnapshot | null>;
  window: Record<ActivationClinic, GmbWindowSums>;
  total: GmbWindowSums;
}

export interface AmcDay {
  reportDate: string;
  totalAppointments: number | null;
  consulted: number | null;
  invoiced: number | null;
  nonInvoiced: number | null;
  cancelled: number | null;
  patientsOld: number | null;
  patientsNew: number | null;
  invoiceAmountTotal: number | null;
  insuranceTotal: number | null;
  copayTotal: number | null;
  cashTotal: number | null;
  cardTotal: number | null;
  advanceTotal: number | null;
  balanceTotal: number | null;
  invoiceCount: number | null;
  doctors: Record<string, { invoices: number; amount: number }>;
  preparedBy: string | null;
}
export type AmcTotals = Omit<AmcDay, 'reportDate' | 'preparedBy'> & {
  /** Report dates present in the window, ascending. */
  days: string[];
  /** Dubai days in the window with no report tab. */
  missingDays: string[];
};
export interface RevenueSection {
  practo: {
    source: 'practo';
    /** Billed AED (getPractoSummary revenue, source live); null = not available. */
    byClinic: Record<ClinicFilterKey, { yesterday: number | null; window: number | null }>;
  };
  /** Al Maher (AMC) from Dr Luvi's daily report sheet; null = table unreadable. */
  amc: {
    source: 'amc-daily-report';
    clinic: 'al-maher';
    /** null = no report for that day. */
    yesterday: AmcDay | null;
    /** null = no report in the window. */
    window: AmcTotals | null;
  } | null;
}

export interface ClinicActivation {
  today: string;
  yesterday: Range;
  window: Range;
  leads: LeadsSection | null;
  smileClub: SmileClubSection | null;
  gmb: GmbSection | null;
  revenue: RevenueSection;
  ortho: OrthoDailyData | null;
}

/* ── helpers ── */

const safe = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};
const text = (v: unknown) => String(v ?? '').trim();
const inRange = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;
const per = <K extends string, V>(keys: readonly K[], make: () => V) => Object.fromEntries(keys.map((k) => [k, make()])) as Record<K, V>;

/** A lead-tracker tab that is not a lead tab for this report. */
export function isNonLeadTab(tab: unknown, leadId?: unknown): boolean {
  const t = text(tab).toLowerCase();
  return NON_LEAD_TABS.some((x) => x.toLowerCase() === t) || isWebsiteMirrorTab(tab) || /^WEB-\d+$/i.test(text(leadId));
}

/* ── leads ── */

export interface LeadRow {
  inquiry_date: string | null;
  booking_status: string | null;
  channel_source: string | null;
  clinic: string | null;
  whatsapp_ref: string | null;
  raw_row: Record<string, unknown> | null;
}

const emptyLeadBucket = (): LeadBucket => ({ leads: 0, converted: 0, byPlatform: {}, byGroup: {} });
function addLead(b: LeadBucket, row: LeadRow) {
  b.leads += 1;
  if (bookedFrom(row.booking_status)) b.converted += 1;
  const platform = text(row.channel_source) || 'Not recorded';
  b.byPlatform[platform] = (b.byPlatform[platform] ?? 0) + 1;
  const group = leadGroup(row);
  b.byGroup[group] = (b.byGroup[group] ?? 0) + 1;
}

/** Pure: count already-normalised tracker leads (lane_e.leads rows) per clinic. */
export function countLeads(rows: LeadRow[], p: { yesterday: Range; mtd: Range }): LeadsSection {
  const byClinic = per(LEAD_CLINICS, () => ({ yesterday: emptyLeadBucket(), window: emptyLeadBucket() }));
  const total = { yesterday: emptyLeadBucket(), window: emptyLeadBucket() };
  let excludedRows = 0;
  for (const row of rows) {
    if (!inRange(row.inquiry_date, p.mtd)) continue;
    const raw = row.raw_row ?? {};
    if (isNonLeadTab(raw['_source_tab'], raw['Lead ID'])) { excludedRows += 1; continue; }
    const clinic = canonicalBranch(row.clinic || raw['Clinic / Branch'], raw['_source_tab']);
    addLead(byClinic[clinic].window, row);
    addLead(total.window, row);
    if (inRange(row.inquiry_date, p.yesterday)) {
      addLead(byClinic[clinic].yesterday, row);
      addLead(total.yesterday, row);
    }
  }
  return { byClinic, total, excludedRows };
}

/* ── Smile Club ── */

/** "10.10.2026" or "10.10.2026 at 10:48PM" → 2026-10-10 (the tracker's day-first rule). */
const smileDate = (v: unknown) => asLeadDate(text(v).split(/\s+/)[0]);
const followedUp = (d: Record<string, unknown>) =>
  Object.entries(d).some(([k, v]) => /follow/i.test(k) && !/date/i.test(k) && !!text(v) && !/^(n\/?a|-+)$/i.test(text(v)));
const isConverted = (d: Record<string, unknown>) => {
  const key = Object.keys(d).find((k) => /^conversion\b/i.test(k));
  return key ? conversionIsBooked(text(d[key])) : false;
};

/** Pure: count Smile Club tab rows (raw_lead_tracker data). Names and phones are never read. */
export function countSmileClub(rows: { data: Record<string, unknown> | null }[], p: { yesterday: Range; mtd: Range }): SmileClubSection {
  const empty = (): SmileClubBucket => ({ enquiries: 0, followedUp: 0, converted: 0 });
  const add = (b: SmileClubBucket, d: Record<string, unknown>) => {
    b.enquiries += 1;
    if (followedUp(d)) b.followedUp += 1;
    if (isConverted(d)) b.converted += 1;
  };
  const byClinic = per(LEAD_CLINICS, () => ({ yesterday: empty(), window: empty() }));
  const total = { yesterday: empty(), window: empty() };
  let undated = 0;
  for (const { data } of rows) {
    const d = data ?? {};
    if (text(d['_source_tab']).toLowerCase() !== SMILE_CLUB_TAB.toLowerCase()) continue;
    const day = smileDate(d['Date']);
    if (!day) { undated += 1; continue; }
    if (!inRange(day, p.mtd)) continue;
    const clinic = canonicalBranch(d['Clinic / Branch'], d['_source_tab']);
    add(byClinic[clinic].window, d);
    add(total.window, d);
    if (inRange(day, p.yesterday)) { add(byClinic[clinic].yesterday, d); add(total.yesterday, d); }
  }
  return { byClinic, total, undated };
}

/* ── GMB ── */

export interface GmbRow {
  snapshot_day: string;
  clinic: string;
  fo_name: string | null;
  reviews_today: number | null;
  reviews_individual: number | null;
  reviews_total: number | null;
  photos: number | null;
  videos: number | null;
  month_title: string | null;
  synced_at: string | null;
}

const snap = (r: GmbRow): GmbSnapshot => ({
  snapshotDay: r.snapshot_day,
  foName: text(r.fo_name).split(' ')[0] || null,
  reviewsToday: r.reviews_today, reviewsIndividual: r.reviews_individual, reviewsTotal: r.reviews_total,
  photos: r.photos, videos: r.videos, monthTitle: r.month_title, syncedAt: r.synced_at,
});
const nullableSum = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(Number(x))).map(Number);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};
const gmbSums = (rows: GmbRow[]): GmbWindowSums => ({
  days: new Set(rows.map((r) => r.snapshot_day)).size,
  reviewsToday: nullableSum(rows.map((r) => r.reviews_today)),
  photos: nullableSum(rows.map((r) => r.photos)),
  videos: nullableSum(rows.map((r) => r.videos)),
});

/**
 * Pure: latest snapshot per clinic (on or before `latestThrough`, by default
 * the window end) and window sums. The reader passes today when the window
 * ends yesterday, so the front office's entries for today show as the latest
 * copy instead of waiting a day.
 */
export function summariseGmb(rows: GmbRow[], p: { yesterday: Range; mtd: Range }, latestThrough: string = p.mtd.to): GmbSection {
  const latest = per(ACTIVATION_CLINICS, () => null as GmbSnapshot | null);
  const yesterday = per(ACTIVATION_CLINICS, () => null as GmbSnapshot | null);
  const window = per(ACTIVATION_CLINICS, () => gmbSums([]));
  const inWindow = rows.filter((r) => inRange(r.snapshot_day, p.mtd) && (ACTIVATION_CLINICS as string[]).includes(r.clinic));
  for (const c of ACTIVATION_CLINICS) {
    const mine = rows.filter((r) => r.clinic === c && r.snapshot_day <= latestThrough).sort((a, b) => b.snapshot_day.localeCompare(a.snapshot_day));
    latest[c] = mine[0] ? snap(mine[0]) : null;
    const y = mine.find((r) => r.snapshot_day === p.yesterday.to);
    yesterday[c] = y ? snap(y) : null;
    window[c] = gmbSums(inWindow.filter((r) => r.clinic === c));
  }
  return { latest, yesterday, window, total: gmbSums(inWindow) };
}

/* ── AMC daily report ── */

export interface AmcRow {
  report_date: string;
  total_appointments: number | null; consulted: number | null; invoiced: number | null; non_invoiced: number | null;
  cancelled: number | null; patients_old: number | null; patients_new: number | null;
  invoice_amount_total: number | string | null; insurance_total: number | string | null; copay_total: number | string | null;
  cash_total: number | string | null; card_total: number | string | null; advance_total: number | string | null;
  balance_total: number | string | null; invoice_count: number | null;
  doctors: Record<string, { invoices: number; amount: number }> | null;
  prepared_by: string | null;
}

/** numeric columns arrive from PostgREST as strings; null stays null. */
const n = (v: number | string | null | undefined) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const r2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);

const amcDay = (r: AmcRow): AmcDay => ({
  reportDate: r.report_date,
  totalAppointments: n(r.total_appointments), consulted: n(r.consulted), invoiced: n(r.invoiced), nonInvoiced: n(r.non_invoiced),
  cancelled: n(r.cancelled), patientsOld: n(r.patients_old), patientsNew: n(r.patients_new),
  invoiceAmountTotal: n(r.invoice_amount_total), insuranceTotal: n(r.insurance_total), copayTotal: n(r.copay_total),
  cashTotal: n(r.cash_total), cardTotal: n(r.card_total), advanceTotal: n(r.advance_total), balanceTotal: n(r.balance_total),
  invoiceCount: n(r.invoice_count), doctors: r.doctors ?? {}, preparedBy: r.prepared_by,
});

function daysOf(r: Range): string[] {
  const out: string[] = [];
  for (let d = new Date(`${r.from}T12:00:00Z`); d.toISOString().slice(0, 10) <= r.to && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** Pure: the yesterday report and window totals from amc_daily_report rows. */
export function summariseAmc(rows: AmcRow[], p: { yesterday: Range; mtd: Range }): NonNullable<RevenueSection['amc']> {
  const days = rows.filter((r) => inRange(r.report_date, p.mtd)).map(amcDay).sort((a, b) => a.reportDate.localeCompare(b.reportDate));
  const y = days.find((d) => d.reportDate === p.yesterday.to) ?? null;
  let window: AmcTotals | null = null;
  if (days.length) {
    const sum = (k: keyof Omit<AmcDay, 'reportDate' | 'doctors' | 'preparedBy'>) => r2(nullableSum(days.map((d) => d[k])));
    const doctors: AmcDay['doctors'] = {};
    for (const d of days) for (const [name, v] of Object.entries(d.doctors)) {
      const acc = doctors[name] ?? { invoices: 0, amount: 0 };
      acc.invoices += Number(v?.invoices) || 0;
      acc.amount = Math.round((acc.amount + (Number(v?.amount) || 0)) * 100) / 100;
      doctors[name] = acc;
    }
    const have = new Set(days.map((d) => d.reportDate));
    window = {
      totalAppointments: sum('totalAppointments'), consulted: sum('consulted'), invoiced: sum('invoiced'), nonInvoiced: sum('nonInvoiced'),
      cancelled: sum('cancelled'), patientsOld: sum('patientsOld'), patientsNew: sum('patientsNew'),
      invoiceAmountTotal: sum('invoiceAmountTotal'), insuranceTotal: sum('insuranceTotal'), copayTotal: sum('copayTotal'),
      cashTotal: sum('cashTotal'), cardTotal: sum('cardTotal'), advanceTotal: sum('advanceTotal'), balanceTotal: sum('balanceTotal'),
      invoiceCount: sum('invoiceCount'), doctors,
      days: days.map((d) => d.reportDate),
      missingDays: daysOf(p.mtd).filter((d) => !have.has(d)),
    };
  }
  return { source: 'amc-daily-report', clinic: 'al-maher', yesterday: y, window };
}

/* ── read ── */

/**
 * Everything the Clinic Activation report needs for Dubai day `today`.
 * `range` (optional) replaces the default window (1st of yesterday's month to
 * yesterday); "yesterday" is then the range's last day.
 */
export async function readClinicActivation(db: AdminClient, today: string, range?: Range): Promise<ClinicActivation> {
  const p = range ? periodsFor(range) : periods(today);
  // A window ending yesterday (the default) also shows today's front-office copy as the latest.
  const gmbLatestThrough = p.mtd.to >= periods(today).yesterday.to ? today : p.mtd.to;
  const { yesterday, mtd } = p;

  const practo = (r: Range, clinic: ClinicFilterKey) => safe(async () => {
    const s = await getPractoSummary({ from: r.from, to: r.to, clinic });
    return s.source === 'live' ? s.revenue : null;
  });
  const practoClinics: ClinicFilterKey[] = ['all', 'dental-nation', 'dr-tosun', 'al-maher'];

  const [leads, smileClub, gmb, amc, ortho, practoFigures] = await Promise.all([
    safe(async () => {
      const { data } = await selectAll(() => db.from('leads')
        .select('id,inquiry_date,booking_status,channel_source,clinic,whatsapp_ref,raw_row')
        .eq('source_sheet', sheetMapping.leadTracker.label)
        .gte('inquiry_date', mtd.from).lte('inquiry_date', mtd.to), 'id');
      return countLeads(data as LeadRow[], p);
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('raw_lead_tracker').select('id,data'), 'id');
      return countSmileClub(data as { data: Record<string, unknown> | null }[], p);
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('gmb_frontoffice_daily')
        .select('snapshot_day,clinic,fo_name,reviews_today,reviews_individual,reviews_total,photos,videos,month_title,synced_at')
        .lte('snapshot_day', gmbLatestThrough), ['snapshot_day', 'clinic']);
      return summariseGmb(data as GmbRow[], p, gmbLatestThrough);
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('amc_daily_report')
        .select('report_date,total_appointments,consulted,invoiced,non_invoiced,cancelled,patients_old,patients_new,invoice_amount_total,insurance_total,copay_total,cash_total,card_total,advance_total,balance_total,invoice_count,doctors,prepared_by')
        .gte('report_date', mtd.from).lte('report_date', mtd.to), 'report_date');
      return summariseAmc(data as AmcRow[], p);
    }),
    safe(() => readOrthoDaily(db, today, p)),
    Promise.all(practoClinics.flatMap((c) => [practo(yesterday, c), practo(mtd, c)])),
  ]);

  const byClinic = Object.fromEntries(practoClinics.map((c, i) => [c, { yesterday: practoFigures[i * 2], window: practoFigures[i * 2 + 1] }])) as RevenueSection['practo']['byClinic'];

  return {
    today,
    yesterday,
    window: mtd,
    leads,
    smileClub,
    gmb,
    revenue: { practo: { source: 'practo', byClinic }, amc },
    ortho,
  };
}
