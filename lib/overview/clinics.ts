/**
 * Reader for the DN-032 Clinics preview at /next/clinics.
 *
 * ONE RULE - NO NEW ARITHMETIC. Every figure is a straight projection of what
 * existing surfaces already read:
 *   - booked, attended and billed per clinic (M03, M04, M06) come from
 *     readPerformanceDaily (lib/alerts/performanceDaily.ts), the 09:00 email's
 *     reader, and each row's proof is the SAME executive link the email uses
 *     for that clinic and month to date;
 *   - missed appointments per clinic (M05) are the Growth page's own no-show
 *     figures: getChannelPerformance(p.mtd, lens, db) with the Growth page's
 *     DEFAULT options, with the channels' no-show column added up exactly as
 *     the Growth table adds it; a report with no appointment feed rows means
 *     the read failed, so the figure is null, never 0. The proof is the Growth
 *     view pinned to the same dates and clinic lens.
 * Proof URLs are built here, server side, with the builders the morning email
 * uses (lib/alerts/links.ts).
 *
 * buildClinics is pure; readClinics does the reading and never throws for a
 * missing source (a source that cannot be read becomes null, which the page
 * renders as "Unavailable", never 0).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { readPerformanceDaily, type PerfClinicKey, type PerformanceDailyData } from '@/lib/alerts/performanceDaily';
import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { executiveLink, growthLink, periods, periodsFor, practoRevenueLink, type ExecClinic, type Range } from '@/lib/alerts/links';
import { AL_MAHER_PRACTO_FROM, growthKeyOfClinic } from '@/config/clinics';
import { emptyPerformance } from './read';
import { dayMonthYear } from './format';

/** One row of the appointments-and-billing table (month to date). */
export interface ClinicsRow {
  key: PerfClinicKey;
  /** As the mockup prints it ("Al Wasl", not the email's longer name). */
  name: string;
  /** Small line under the clinic name ("Patient-system feed", feed-start note). */
  feedNote: string;
  booked: number | null;
  attended: number | null;
  billed: number | null;
  /** Executive view pinned to this lens, month to date - the email's proof. */
  urlMtd: string;
}

/** One "Follow up missed visits" card. */
export interface MissedCard {
  key: ExecClinic;
  name: string;
  /** No-shows month to date from the Growth report for this clinic lens; null = could not be read. */
  missed: number | null;
  /** Growth view pinned to the same dates and clinic lens - the proof. */
  url: string;
}

/** One per-clinic billing proof button (Revenue by conducting doctor). */
export interface BillingProof { key: ExecClinic; name: string; url: string }

export interface ClinicsData {
  /** Dubai today (the page is opened on this day; figures cover up to yesterday). */
  today: string;
  mtd: Range;
  /** Al Wasl, Dr Tosun, Al Maher, then the connected-clinics group row. */
  rows: ClinicsRow[];
  missed: MissedCard[];
  billing: BillingProof[];
}

const CLINICS: { key: ExecClinic; name: string }[] = [
  { key: 'dental-nation', name: 'Al Wasl' },
  { key: 'dr-tosun', name: 'Dr Tosun Dental Clinic' },
  { key: 'al-maher', name: 'Al Maher Medical Centre' },
];

export type MissedByClinic = Record<ExecClinic, number | null>;

/** Every lens unread: the page then shows "Unavailable", never 0. */
export const emptyMissed = (): MissedByClinic => ({ 'dental-nation': null, 'dr-tosun': null, 'al-maher': null });

/** Pure projection of the email reader's data and the Growth no-shows into the Clinics shape. */
export function buildClinics(perf: PerformanceDailyData, missed: MissedByClinic, today: string, range?: Range): ClinicsData {
  const p = range ? periodsFor(range) : periods(today);

  const row = (key: PerfClinicKey, name: string, feedNote: string, clinic?: ExecClinic): ClinicsRow => {
    const c = perf.clinics[key];
    return {
      key, name, feedNote,
      booked: c.mtd.booked,
      attended: c.mtd.showed,
      billed: c.mtd.billed,
      urlMtd: executiveLink(p.mtd, clinic),
    };
  };

  return {
    today,
    mtd: p.mtd,
    rows: [
      row('dental-nation', CLINICS[0].name, 'Patient-system feed', 'dental-nation'),
      row('dr-tosun', CLINICS[1].name, 'Patient-system feed', 'dr-tosun'),
      row('al-maher', CLINICS[2].name, `Patient-system feed from ${dayMonthYear(AL_MAHER_PRACTO_FROM)}`, 'al-maher'),
      row('group', 'Connected clinics', 'All connected feeds together', undefined),
    ],
    missed: CLINICS.map(({ key, name }) => ({
      key, name,
      missed: missed[key],
      url: growthLink(p.mtd, growthKeyOfClinic(key)),
    })),
    billing: CLINICS.map(({ key, name }) => ({ key, name, url: practoRevenueLink(key, p.mtd) })),
  };
}

/**
 * Read everything the Clinics page shows, through the existing readers; never throws.
 * `range` (optional, the page's date control) replaces month to yesterday.
 */
export async function readClinics(db: AdminClient | null, today: string, range?: Range): Promise<ClinicsData> {
  if (!db) return buildClinics(emptyPerformance(), emptyMissed(), today, range);
  const p = range ? periodsFor(range) : periods(today);
  // The Growth page's no-show column for one clinic lens, month to date, with
  // the page's DEFAULT options. No appointment feed rows means the report
  // could not be read (getChannelPerformance returns an empty report on
  // failure), so the figure is null rather than zero - the same rule as
  // growthWindow in the email reader.
  const noshowMtd = async (clinic: ExecClinic): Promise<number | null> => {
    try {
      const report = await getChannelPerformance(p.mtd, growthKeyOfClinic(clinic), db);
      if (!report.apptFeedRows) return null;
      return report.channels.reduce((n, c) => n + c.noshow, 0);
    } catch {
      return null;
    }
  };
  const [perf, wasl, tosun, maher] = await Promise.all([
    readPerformanceDaily(db, today, p).catch(() => emptyPerformance()),
    noshowMtd('dental-nation'),
    noshowMtd('dr-tosun'),
    noshowMtd('al-maher'),
  ]);
  return buildClinics(perf, { 'dental-nation': wasl, 'dr-tosun': tosun, 'al-maher': maher }, today, range);
}
