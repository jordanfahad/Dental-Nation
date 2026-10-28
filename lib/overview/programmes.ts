/**
 * Reader for the DN-032 Programmes preview at /next/programmes.
 *
 * ONE RULE - NO NEW ARITHMETIC. Every figure is a straight projection of what
 * the 09:00 emails already read:
 *   - DN Ortho campaign spend and clicks (M31, M32) come from readOrthoDaily
 *     (lib/alerts/orthoDaily.ts), the DN Ortho email's reader: the stored
 *     Google Ads rows filtered to the exact campaign name, with the email's
 *     own rule that the campaign is shown only once a day in the range has
 *     spend or impressions (otherwise it is "not live", never AED 0);
 *   - Smile Club members (M19), the partnership row (M20, M21, M22) and the
 *     scripts-waiting assignments (M34) come from readSmileClubDaily
 *     (lib/alerts/smileclubDaily.ts), the Smile Club email's reader. The one
 *     sum here - scripts waiting added over the reviewers - is the registry's
 *     own M34 unit (review assignments; one script waiting on two reviewers
 *     counts twice), exactly the per-reviewer figures the linked panel shows.
 * Programme outcomes M23, M24 and M25 are ALWAYS unavailable at definition
 * version 1 (no campaign-to-patient linkage; the conducting doctor is missing
 * on about 99% of priced lines), so this reader carries only their nearest
 * detail-view URLs, never a substituted number.
 *
 * Proof URLs are built here, server side, with the SAME builders the emails
 * use (lib/alerts/links.ts), so a figure's drawer always opens exactly the
 * view the email links for the same dates and clinic.
 *
 * buildProgrammes is pure; readProgrammes does the reading and never throws
 * for a missing source (a source that cannot be read becomes null, which the
 * page renders as "Unavailable", never 0).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { ORTHO_GOOGLE_CAMPAIGN, readOrthoDaily, type OrthoDailyData } from '@/lib/alerts/orthoDaily';
import { readSmileClubDaily, type SmileClubDailyData } from '@/lib/alerts/smileclubDaily';
import {
  SMILE_CLUB_COMPANIES, SMILE_CLUB_SCRIPTS, executiveLink, growthLink, marketingLink, periods,
  practoRevenueLink, reportUrl, type Range,
} from '@/lib/alerts/links';

/** The DN Ortho email's Google Search section, as readOrthoDaily returns it. */
export type OrthoCampaign = OrthoDailyData['googleSearch'];

export interface ProgrammesData {
  /** Dubai today (the page is opened on this day; figures cover up to yesterday). */
  today: string;
  mtd: Range;
  ortho: {
    /** Month-to-date spend for the exact campaign; null = Google Ads could not be read, or no day in the range has activity yet. */
    spendMtd: number | null;
    /** Month-to-date clicks under the same rule. */
    clicksMtd: number | null;
    /** True once a day in the range has spend or impressions - the email's own "live" rule. */
    live: boolean;
    /** False when the Google Ads rows could not be read at all. */
    read: boolean;
    /** Marketing Google view filtered to the exact campaign - the DN Ortho email's proof. */
    url: string;
    /** Nearest existing detail views for the always-unavailable programme outcomes. */
    enquiriesUrl: string;
    appointmentsUrl: string;
    billingUrl: string;
  };
  smileClub: {
    /** Company-reported members, summed over the pipeline as entered; null = could not be read or no company entered. */
    members: number | null;
    /** The Growth "Partnerships (Smile Club)" row, month to date, all clinics. */
    enquiries: number | null;
    booked: number | null;
    attended: number | null;
    membersUrl: string;
    growthUrl: string;
  };
  delivery: {
    /** Review assignments waiting, added over the reviewers (the M34 unit); null = the reviews could not be read. */
    scriptsWaiting: number | null;
    scriptsUrl: string;
    companiesUrl: string;
    calendarUrl: string;
  };
}

/** The content calendar as the current dashboard addresses it (?tab=marketing&mtab=calendar). */
export const CONTENT_CALENDAR_LINK = reportUrl({ tab: 'marketing', mtab: 'calendar' });

/** Pure projection of the two email readers' data into the Programmes shape. */
export function buildProgrammes(google: OrthoCampaign, smile: SmileClubDailyData | null, today: string): ProgrammesData {
  const p = periods(today);
  // The DN Ortho email's rule: the campaign has figures only once a day in the
  // range reports spend or impressions; before that it is "not live", never 0.
  const live = google != null && google.mtd.activeDays > 0;
  const all = smile?.growth.all.mtd ?? null;
  return {
    today,
    mtd: p.mtd,
    ortho: {
      spendMtd: live ? google.mtd.spend : null,
      clicksMtd: live ? google.mtd.clicks : null,
      live,
      read: google != null,
      url: marketingLink('google', p.mtd, { gcamp: ORTHO_GOOGLE_CAMPAIGN }),
      enquiriesUrl: growthLink(p.mtd),
      appointmentsUrl: executiveLink(p.mtd),
      billingUrl: practoRevenueLink('dental-nation', p.mtd),
    },
    smileClub: {
      members: smile?.companies?.members ?? null,
      enquiries: all?.enquiries ?? null,
      booked: all?.booked ?? null,
      attended: all?.showed ?? null,
      membersUrl: SMILE_CLUB_COMPANIES,
      growthUrl: growthLink(p.mtd),
    },
    delivery: {
      scriptsWaiting: smile?.scriptsWaiting
        ? Object.values(smile.scriptsWaiting).reduce((n, v) => n + v, 0)
        : null,
      scriptsUrl: SMILE_CLUB_SCRIPTS,
      companiesUrl: SMILE_CLUB_COMPANIES,
      calendarUrl: CONTENT_CALENDAR_LINK,
    },
  };
}

/** Read everything the Programmes page shows, through the email readers; never throws. */
export async function readProgrammes(db: AdminClient | null, today: string): Promise<ProgrammesData> {
  if (!db) return buildProgrammes(null, null, today);
  const [ortho, smile] = await Promise.all([
    readOrthoDaily(db, today).catch(() => null),
    readSmileClubDaily(db, today).catch((): SmileClubDailyData | null => null),
  ]);
  return buildProgrammes(ortho?.googleSearch ?? null, smile, today);
}
