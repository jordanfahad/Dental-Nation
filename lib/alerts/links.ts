/**
 * Proof links for the 09:00 alert emails (approved 24 Oct 2026).
 *
 * Every figure in those emails links to the reports.dentalnation.com view that
 * shows it, pinned to the same dates and clinic, so a reader can open the
 * evidence behind each number. Dates are Dubai calendar days (YYYY-MM-DD).
 * Parameter names and values must match app/(app)/page.tsx and lib/range.ts:
 * a valid ordered from/to pair always wins over a preset.
 */
import { growthKeyOfClinic, type GrowthClinicKey } from '@/config/clinics';

export const REPORTS = 'https://reports.dentalnation.com/';

export interface Range { from: string; to: string }

/** Build a dashboard URL; undefined params are dropped, order is kept. */
export function reportUrl(params: Record<string, string | undefined>, hash?: string): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, v);
  const s = q.toString();
  return `${REPORTS}${s ? `?${s}` : ''}${hash ? `#${hash}` : ''}`;
}

const dated = (r: Range) => ({ preset: 'custom', from: r.from, to: r.to });

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Reporting windows for an email sent on Dubai day `today`. */
export function periods(today: string) {
  const y = addDaysIso(today, -1);
  return {
    yesterday: { from: y, to: y },
    mtd: { from: `${y.slice(0, 7)}-01`, to: y },
    last7: { from: addDaysIso(y, -6), to: y },
    prior7: { from: addDaysIso(y, -13), to: addDaysIso(y, -7) },
  };
}

export type GrowthClinic = GrowthClinicKey;
export type ExecClinic = 'dental-nation' | 'dr-tosun' | 'al-maher';
export type GbpClinic = 'all' | 'dental-nation' | 'dr-tosun' | 'al-maher';

/** Growth channel table (enquiries, booked, showed, billed, spend, cost per enquiry per channel). */
export const growthLink = (r: Range, gclinic: GrowthClinic = 'all') =>
  reportUrl({ tab: 'group', gtab: 'growth', gclinic, ...dated(r) });
/** Growth patient list behind one channel (the "Patients" proof). */
export const growthPatientsLink = (r: Range, gchan: string) =>
  reportUrl({ tab: 'group', gtab: 'growth', gclinic: 'all', gchan, ...dated(r) });
/** Executive view: bookings, shows and billed revenue, by clinic or group. */
export const executiveLink = (r: Range, clinic?: ExecClinic) =>
  reportUrl({ tab: 'executive', gclinic: growthKeyOfClinic(clinic ?? 'all'), clinic, ...dated(r) });
export const marketingLink = (mtab: 'overview' | 'google' | 'meta' | 'demand', r: Range, extra: Record<string, string> = {}) =>
  reportUrl({ tab: 'marketing', mtab, ...extra, ...dated(r) });
/** Practo revenue by conducting doctor, per clinic (this sub-tab honours clinic=). */
export const practoRevenueLink = (clinic: ExecClinic, r: Range) =>
  reportUrl({ tab: 'practo', ptab: 'revenue', clinic, ...dated(r) });
/** Social & Local: Business Profile totals for the range; reviews card is live. */
export const socialLink = (bpclinic: GbpClinic, r?: Range) =>
  reportUrl({ tab: 'social', bpclinic, ...(r ? dated(r) : {}) });
export const smileClubLink = (sc?: 'team' | 'scripts', hash?: string) => reportUrl({ tab: 'smileclub', sc }, hash);
export const SMILE_CLUB_COMPANIES = smileClubLink('team', 'corp-pipeline');
export const SMILE_CLUB_SCRIPTS = smileClubLink('scripts');
/** Viewer-safe Smile Club summary (members). */
export const IMPACT_SMILE_CLUB = `${REPORTS}impact#smileclub`;
export const digitalLink = (r?: Range) => reportUrl({ tab: 'digital', ...(r ? dated(r) : {}) });
export const COMPETITORS_LINK = reportUrl({ tab: 'digital', dtab: 'competitors' });
