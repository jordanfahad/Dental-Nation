import { GMB_CLINICS, type GmbClinicKey } from '@/config/gmb-clinics';
import { clinicOfCenter } from '@/config/clinics';
import { CHANNELS } from '@/config/growth-channels';
import { computeNewPatientAcquisition, type BillInput } from '@/lib/executive/acquisitionCore';
import { leadTrackerChannel, tagHit } from '@/lib/growth/attribution';
import type { GrowthReport } from '@/lib/growth/channelPerformance';
import { addDays, validDay, type GbpPlan } from '@/lib/gbp/plan';

export const GROUPS = ['Paid digital', 'Organic digital', 'Direct & walk-in', 'Referral', 'Existing patients', 'Unclassified'] as const;
export type PerfGroup = typeof GROUPS[number];
export function groupOf(key: string | null): PerfGroup {
  // Only the gross parser supplies null; Growth channel keys keep their mapping.
  if (key === null) return 'Unclassified';
  if (key === 'direct-walkin') return 'Direct & walk-in';
  if (key === 'retention') return 'Existing patients';
  // Commission affiliates and creator collaborations sit with paid digital;
  // institutional partnerships sit with referral. Nothing is dropped from totals.
  if (['paid-search', 'paid-social', 'affiliate', 'influencer'].includes(key)) return 'Paid digital';
  if (['patient-referral', 'doctor-referral', 'partnership'].includes(key)) return 'Referral';
  return 'Organic digital';
}
export const TOSUN_NOTE = 'Dr Tosun: renumbered at migration - not measurable yet';
export const MAHER_NOTE = 'Al Maher: no patient feed';
export const DEMAND_NOTE = 'Gross enquiries = raw tracker rows before deduplication. Net enquiries = Growth Platform people deduped by phone across widget, tracker and CRM; phoneless entries count individually. These are different source populations. Group-level gross and net are not directly comparable because classification sources differ. Shared net enquiry sources are shown under Al Wasl, not a verified branch split; Dr Tosun and Al Maher net enquiries are unavailable. Affiliate/influencer channels sit in Paid digital; partnerships in Referral. Bookings and shows are appointments, billed patients are distinct files, revenue is AED billed (not cash collected). Channel assignment includes inference; phone-path estimates are excluded. Group patients are deduped across clinics.';

/** Existing explicit tag/tracker rules, without Growth's default WhatsApp attribution. */
export function performanceChannel(sourceType: string, inquiryPlatform: string, preferredChannel: string, notes = ''): string | null {
  const tagged = tagHit(`${notes} ${sourceType} ${preferredChannel}`.toLowerCase());
  if (tagged) return tagged;
  const channel = leadTrackerChannel(sourceType, inquiryPlatform, preferredChannel);
  // Every non-WhatsApp result is explicit. Preserve WhatsApp only when its
  // existing tracker rule matched, rather than the identical fallback value.
  const st = sourceType.toLowerCase(), ip = inquiryPlatform.toLowerCase();
  return channel !== 'whatsapp' || st.includes('whatsapp') || ip.includes('whatsapp') || ip.includes('zavis') ? channel : null;
}
export interface GrossRow { date: string; clinic: GmbClinicKey | null; group: PerfGroup }
export function parseGrossRows(rows: { data: Record<string, unknown> }[]) {
  let undated = 0;
  const parsed: GrossRow[] = [];
  for (const { data: d } of rows) {
    const s = (k: string) => String(d[k] ?? '').trim();
    let date = s('Date');
    const m = date.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
    if (m) date = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (!validDay(date)) { undated++; continue; }
    const branch = `${s('Clinic / Branch')} ${s('_source_tab')}`.toLowerCase();
    const hits = [
      { key: 'dental-nation' as const, match: /al[ -]?wasl|dn campaign|dental nation/.test(branch) },
      { key: 'dr-tosun' as const, match: /tosun|\btdc\b/.test(branch) },
      { key: 'al-maher' as const, match: /maher|\bamc\b/.test(branch) },
    ].filter((b) => b.match);
    const notes = ['Notes / Remarks', 'Follow-up Remarks', 'Follow up Remarks'].map(s).join(' ');
    const channel = performanceChannel(s('Source Type'), s('Inquiry Platform'), s('Preferred Channel'), notes);
    parsed.push({ date, clinic: hits.length === 1 ? hits[0].key : null, group: groupOf(channel) });
  }
  return { rows: parsed, undated };
}
export interface FunnelRow { clinic: string; group: string; gross: number | null; net: number | null; bookings: number | null; shows: number | null; billed: number | null; revenue: number | null }
export interface PatientSplit { clinic: string; total: number | null; new: number | null; existing: number | null; unclassified: number | null; note: string }
export interface PerformancePeriod { from: string; to: string; rows: FunnelRow[]; patients: PatientSplit[]; total: FunnelRow; notes: string[] }

export function patientSplits(bills: BillInput[], from: string, to: string): PatientSplit[] {
  const clean = bills.filter((b) => b.bill_date && String(b.data?.bill_status ?? '').toUpperCase() !== 'CANCELLED');
  const acquisition = computeNewPatientAcquisition({ bills: clean, appts: [], widgetPhones: new Set(), from, to, spend: null, clinic: 'dental-nation' });
  const first = new Map<string, { wasl?: string; tosun?: string }>();
  for (const b of clean) {
    const mr = String(b.data?.mr_no ?? '').trim();
    if (!mr) continue;
    const p = first.get(mr) ?? {};
    const clinic = clinicOfCenter(String(b.data?.center_name ?? '')) === 'dr-tosun' ? 'tosun' : 'wasl';
    if (!p[clinic] || b.bill_date! < p[clinic]!) p[clinic] = b.bill_date!;
    first.set(mr, p);
  }
  const periodFiles = (tosun: boolean) => new Set(clean.filter((b) => b.bill_date! >= from && b.bill_date! <= to && (clinicOfCenter(String(b.data?.center_name ?? '')) === 'dr-tosun') === tosun).map((b) => String(b.data?.mr_no ?? '').trim()).filter(Boolean));
  const files = periodFiles(false);
  const unresolved = [...files].filter((mr) => /^DNJ/i.test(mr) || (/^DN/i.test(mr) && first.get(mr)?.tosun && first.get(mr)!.tosun! <= (first.get(mr)?.wasl ?? '9999'))).length;
  return [
    { clinic: 'Al Wasl', total: files.size, new: acquisition.billedNewPatients, existing: Math.max(0, files.size - acquisition.billedNewPatients - unresolved), unclassified: unresolved,
      note: 'Executive rule: Al Wasl DN-series files count as new on their first non-cancelled bill. Other measurable billed files are existing; transferred Dr Tosun files remain unclassified.' },
    { clinic: 'Dr Tosun', total: periodFiles(true).size, new: null, existing: null, unclassified: null, note: TOSUN_NOTE },
    { clinic: 'Al Maher', total: null, new: null, existing: null, unclassified: null, note: MAHER_NOTE },
  ];
}

export function buildPeriod(from: string, to: string, reports: { all: GrowthReport; wasl: GrowthReport; tosun: GrowthReport }, gross: ReturnType<typeof parseGrossRows>, bills: BillInput[]): PerformancePeriod {
  const raw = gross.rows.filter((r) => r.date >= from && r.date <= to);
  const summarise = (report: GrowthReport | null, label: string, clinic: GmbClinicKey | null, group?: PerfGroup): FunnelRow => {
    const channels = report?.channels.filter((c) => !group || groupOf(c.key) === group);
    const sum = (key: 'enquiries' | 'booked' | 'showed' | 'treated' | 'revenue') => channels?.reduce((n, c) => n + c[key], 0) ?? null;
    return { clinic: label, group: group ?? 'Total',
      gross: raw.filter((r) => (!clinic || r.clinic === clinic) && (!group || r.group === group)).length,
      net: clinic === 'dr-tosun' || clinic === 'al-maher' ? null : sum('enquiries'), bookings: sum('booked'), shows: sum('showed'),
      billed: sum('treated'), revenue: sum('revenue') };
  };
  const rows: FunnelRow[] = [];
  for (const c of GMB_CLINICS) {
    const report = c.key === 'dental-nation' ? reports.wasl : c.key === 'dr-tosun' ? reports.tosun : null;
    rows.push(...GROUPS.map((g) => summarise(report, c.label, c.key, g)));
    const total = summarise(report, c.label, c.key);
    if (report) { total.billed! += report.unattributedPatients; total.revenue! += report.unattributedRevenue; }
    rows.push(total);
  }
  rows.push(...GROUPS.map((g) => summarise(reports.all, 'Group', null, g)));
  rows.push({ clinic: 'Group', group: 'Unattributed billing', gross: null, net: null, bookings: null, shows: null, billed: reports.all.unattributedPatients, revenue: reports.all.unattributedRevenue });
  const total = summarise(reports.all, 'Group', null);
  total.billed! += reports.all.unattributedPatients; total.revenue! += reports.all.unattributedRevenue;
  rows.push(total);
  const patients = patientSplits(bills, from, to).map((patient) => {
    const billed = rows.find((r) => r.clinic === patient.clinic && r.group === 'Total')?.billed;
    if (patient.total == null || billed == null || patient.total === billed) return patient;
    return { ...patient, note: `${patient.note} Billing-file count differs from Growth billed count by ${Math.abs(patient.total - billed)}; the funnel shows the Growth count.` };
  });
  return { from, to, rows, total, patients, notes: [DEMAND_NOTE,
    ...(['Al Wasl', 'Dr Tosun'] as const).map((label) => {
      const last = bills.filter((b) => String(b.data?.bill_status ?? '').toUpperCase() !== 'CANCELLED' && (clinicOfCenter(String(b.data?.center_name ?? '')) === 'dr-tosun') === (label === 'Dr Tosun')).map((b) => b.bill_date ?? '').filter(Boolean).sort().at(-1);
      return `${label} billing feed: latest recorded bill ${last || 'unavailable'}. Period totals describe recorded non-cancelled bills; later missing days are not proof of no business.`;
    }),
    `${raw.filter((r) => !r.clinic).length} gross tracker rows have no unambiguous branch; included only in Group. ${gross.undated} undated/invalid-date raw rows excluded from both periods.`,
    'Clinic totals include unattributed billing. Group channel rows plus Unattributed billing reconcile to Group total.',
    ...reports.all.notes,
  ] };
}

export interface Signal { clinic: string; channel: string; metric: string; day: string; value: number | null }
export function benchmarks(rows: Signal[], asOf: string) {
  const definitions = [
    { label: 'Dental Nation (Al Wasl profile)', keys: ['dental-nation'] },
    { label: 'Dr Joy Dental Clinic', keys: ['dr-joy', 'drjoydentalclinic.com', 'dr joy dental clinic'] },
    { label: "Dr Michael's Dental Clinic", keys: ['dr-michaels', 'drmichaels.com', "dr michael's dental clinic"] },
  ];
  return definitions.map(({ label, keys }) => {
    const series = (channel: string, metric: string) => rows.filter((r) => keys.includes(r.clinic.toLowerCase()) && r.channel === channel && r.metric === metric && r.day <= asOf && r.value != null).sort((a, b) => b.day.localeCompare(a.day));
    const signal = (channel: string, metric: string) => {
      const all = series(channel, metric);
      const latest = all[0];
      // Exactly 30 days apart on the SAME profile. Never subtract different branches or dates.
      const before = latest && all.find((r) => r.clinic === latest.clinic && r.day === addDays(latest.day, -30));
      return { value: latest?.value ?? null, date: latest?.day ?? null, delta30: latest && before ? latest.value! - before.value! : null };
    };
    return { label, followers: signal('instagram', 'followers'), reviews: signal('gmb', 'review_count'), rating: signal('gmb', 'rating') };
  });
}
export interface SmilePerformance {
  members: number | null; membersAsOf: string | null; verifiedHistoricalMembers: number | null; verifiedAt: string | null;
  yesterday: { enrolments: number | null; messages: number | null; replies: number | null; bookings: number | null; shows: number | null };
  mtd: SmilePerformance['yesterday']; notes: string[];
}
export interface PerformanceBrief {
  today: string; yesterday: PerformancePeriod; mtd: PerformancePeriod; gbp: GbpPlan; action: string;
  why: string[]; benchmark: ReturnType<typeof benchmarks>; smile: SmilePerformance;
}
export function performanceWhy(current: GrowthReport, prior: GrowthReport, gbp: GbpPlan, metaPausedSince: string | null): string[] {
  const spend = (r: GrowthReport) => r.channels.filter((c) => c.group === 'paid').reduce<number | null>((n, c) => c.spend == null ? n : (n ?? 0) + c.spend, null);
  const now = spend(current), before = spend(prior);
  const why = [`Net enquiries: ${current.totals.enquiries} in the last 7 days versus ${prior.totals.enquiries} in the prior 7 days.`];
  why.push(now == null || before == null ? 'Spend comparison: 0 complete comparisons; one or both 7-day spend windows have no stored value.' : `Recorded paid spend: AED ${Math.round(now).toLocaleString('en-GB')} versus AED ${Math.round(before).toLocaleString('en-GB')} in the prior 7 days (change AED ${Math.round(now - before).toLocaleString('en-GB')}). Feed may lag; this is recorded spend.`);
  const noShow = (r: GrowthReport) => { const n = r.channels.reduce((s, c) => s + c.noshow, 0); const shown = r.totals.showed; return { n, rate: shown + n ? n / (shown + n) : null }; };
  const ns = noShow(current), ps = noShow(prior);
  why.push(ns.rate == null || ps.rate == null ? `No-shows: ${ns.n} last 7 days versus ${ps.n} prior 7 days; a rate comparison is unavailable without resolved appointments in both windows.` : `No-show rate: ${(ns.rate * 100).toFixed(1)}% versus ${(ps.rate * 100).toFixed(1)}% (${((ns.rate - ps.rate) * 100).toFixed(1)} percentage points); denominator is shows plus no-shows.`);
  const movers = CHANNELS.map((c) => ({ label: c.label.replace(/\u2014/g, '-'), delta: (current.channels.find((r) => r.key === c.key)?.enquiries ?? 0) - (prior.channels.find((r) => r.key === c.key)?.enquiries ?? 0) })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.label.localeCompare(b.label));
  why.push(`Biggest net enquiry mover: ${movers[0].label}, ${movers[0].delta >= 0 ? '+' : ''}${movers[0].delta} versus the prior 7 days.`);
  const b = gbp.branches.find((r) => r.trend != null);
  why.push(b ? `${b.label} GBP calls: ${b.last7.calls} versus ${b.prior7.calls}, ${(b.trend! * 100).toFixed(1)}% over consecutive 7-day windows.` : `GBP calls: 0 branches have a complete, non-zero prior 7-day comparison.`);
  if (metaPausedSince && metaPausedSince <= gbp.asOf) why.push(`Meta: recorded pause since ${metaPausedSince}; ${current.channels.find((c) => c.key === 'paid-social')?.enquiries ?? 0} net paid-social enquiries in the last 7 days. Configuration status, not a live ad-account check.`);
  return why.slice(0, 6);
}
