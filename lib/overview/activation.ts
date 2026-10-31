/**
 * View model of the Clinic Activation report (Dr Luvi's daily report), shared
 * by the /next/activation page and the Clinic Activation 09:00 email.
 *
 * NO NEW ARITHMETIC beyond what is named here. Every figure is a projection of
 * readClinicActivation (lib/activation/read.ts); the only sums are:
 *  - Practo billed for Al Wasl and Dr Tosun together (A12), null unless both are known;
 *  - the DN Ortho orthodontists' charge lines together (M26), null unless all are known,
 *    exactly as the DN Ortho email adds them.
 * Platform labels are free text in the tracker, so only known platform names
 * are shown; anything else is grouped as "Other platform" (a typed name can
 * never reach the page or the email).
 *
 * Proof URLs are built here, server side, with the email link builders
 * (lib/alerts/links.ts), so the page drawer and the email agree.
 *
 * buildActivation is pure; readActivation does the reading. The page reads
 * its date range; the email reads the default (yesterday and month to yesterday).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { readClinicActivation } from '@/lib/activation/read';
export { amcMonthFileLine, CONVERTED_RULE, TOSUN_LEADS_NOTE } from './activationCopy';
import { growthKeyOfClinic, type GrowthClinicKey } from '@/config/clinics';
import { activationSources } from '@/config/sheet-mapping';
import type {
  ActivationClinic, AmcDay, AmcMonthFile, AmcTotals, ClinicActivation, GmbSnapshot, GmbWindowSums, LeadBucket, LeadClinic, SmileClubBucket,
} from '@/lib/activation/read';
import { ORTHO_GOOGLE_CAMPAIGN } from '@/lib/alerts/orthoDaily';
import {
  SMILE_CLUB_COMPANIES, addDaysIso, executiveLink, growthLink, marketingLink, practoRevenueLink, socialLink, type ExecClinic, type Range,
} from '@/lib/alerts/links';

/** First day the dashboard copies the lead tracker GMB tab (the feed went live on 29 Oct 2026). */
export const GMB_COPIES_FROM = '2026-10-29';
/** Shown wherever no daily copy exists yet; never 0. */
export const GMB_NO_COPY = 'Daily copies start 29 Oct 2026';

/** Dr Luvi's Revenue AMC sheet, the only place the AMC figures come from. */
export const AMC_SHEET_URL = `https://docs.google.com/spreadsheets/d/${activationSources.amcRevenue.spreadsheetId}/edit`;

type Val = number | null;

const CLINIC_NAMES: Record<LeadClinic, string> = {
  'dental-nation': 'Al Wasl',
  'dr-tosun': 'Dr Tosun',
  'al-maher': 'Al Maher',
  unassigned: 'Not assigned',
};
const ACTIVATION_CLINICS: ActivationClinic[] = ['dental-nation', 'dr-tosun', 'al-maher'];
const LEAD_CLINICS: LeadClinic[] = [...ACTIVATION_CLINICS, 'unassigned'];
const gclinicOf = (k: LeadClinic | 'total'): GrowthClinicKey => (k === 'total' || k === 'unassigned' ? 'all' : growthKeyOfClinic(k));

/** Platform names the tracker uses; anything else is "Other platform". */
const KNOWN_PLATFORMS: Record<string, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', zavis: 'ZAVIS', facebook: 'Facebook', 'walk in': 'Walk in',
  telephone: 'Telephone', google: 'Google', 'google ads': 'Google Ads', gmb: 'Google Business Profile',
  'google business profile': 'Google Business Profile', website: 'Website', tiktok: 'TikTok', snapchat: 'Snapchat',
  referral: 'Referral', 'smile club': 'Smile Club', linkedin: 'LinkedIn', youtube: 'YouTube', email: 'Email',
  'not recorded': 'Not recorded',
};
export const OTHER_PLATFORM = 'Other platform';
export const safePlatform = (label: string) => KNOWN_PLATFORMS[label.trim().toLowerCase().replace(/\s+/g, ' ')] ?? OTHER_PLATFORM;

export interface PlatformCount { label: string; count: number }

/** Top platforms (largest first, then by name), known names only. */
export function topPlatforms(byPlatform: Record<string, number>, n = 3): PlatformCount[] {
  const merged = new Map<string, number>();
  for (const [label, count] of Object.entries(byPlatform)) {
    const safe = safePlatform(label);
    merged.set(safe, (merged.get(safe) ?? 0) + (Number(count) || 0));
  }
  return [...merged.entries()].filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n).map(([label, count]) => ({ label, count }));
}

export interface LeadLine {
  key: LeadClinic | 'total';
  name: string;
  yesterday: { leads: Val; converted: Val };
  window: { leads: Val; converted: Val };
  /** Top three platforms in the window; empty when none or unreadable. */
  platforms: PlatformCount[];
  urlYesterday: string;
  urlWindow: string;
}

export interface SmileLine {
  key: LeadClinic | 'total';
  name: string;
  yesterday: { enquiries: Val; followedUp: Val; converted: Val };
  window: { enquiries: Val; followedUp: Val; converted: Val };
  urlYesterday: string;
  urlWindow: string;
}

export interface GmbLine {
  key: ActivationClinic | 'total';
  name: string;
  /** Latest copy on or before the last selected day; null = none yet. */
  latest: GmbSnapshot | null;
  window: GmbWindowSums;
}

export interface AmcMeasure {
  id: 'A13' | 'A14' | 'A15' | 'A16' | 'A17' | 'A18' | 'A19' | 'A20' | 'A21';
  label: string;
  unit: 'AED' | 'count';
  yesterday: Val;
  window: Val;
}

export interface PractoLine { key: ExecClinic | 'together'; name: string; yesterday: Val; window: Val; urlYesterday: string; urlWindow: string }

export interface OrthoDoctorLine { name: string; clinicLabel: string; billed: Val; url: string }

export interface ActivationData {
  today: string;
  yesterday: Range;
  window: Range;
  leads: { read: boolean; lines: LeadLine[]; excludedRows: Val };
  smileClub: { read: boolean; lines: SmileLine[]; undated: Val; companiesUrl: string };
  gbp: { read: boolean; lines: GmbLine[]; googleUrl: string; copiesFrom: string };
  revenue: {
    practo: PractoLine[];
    amc: {
      read: boolean;
      measures: AmcMeasure[];
      /** Report days in the window; null = unreadable. */
      daysReported: Val;
      missingDays: string[] | null;
      /** Dr Luvi's month-to-date file for part of the window (October 2026); null = none. */
      monthFile: AmcMonthFile | null;
      /** Invoiced AED for the window: month file plus daily tabs after it; null = nothing reported. */
      invoicedToDate: Val;
      yesterdayReported: boolean;
      sheetUrl: string;
    };
  };
  ortho: {
    read: boolean;
    /** The DN Ortho email's rule: figures only once a day in the window has spend or impressions. */
    live: boolean;
    spend: { yesterday: Val; window: Val };
    clicks: { yesterday: Val; window: Val };
    campaignUrlYesterday: string;
    campaignUrlWindow: string;
    doctors: OrthoDoctorLine[];
    /** The three Practo-fed orthodontists together (as the DN Ortho email); null unless each is known. */
    billedTotal: Val;
    billingUrl: string;
  };
}

const leadVals = (b: LeadBucket | undefined | null) => ({ leads: b?.leads ?? null, converted: b?.converted ?? null });
const smileVals = (b: SmileClubBucket | undefined | null) => ({
  enquiries: b?.enquiries ?? null, followedUp: b?.followedUp ?? null, converted: b?.converted ?? null,
});
const EMPTY_GMB: GmbWindowSums = { days: 0, reviewsToday: null, photos: null, videos: null };

const AMC_MEASURES: { id: AmcMeasure['id']; label: string; unit: AmcMeasure['unit']; key: keyof Omit<AmcDay, 'reportDate' | 'doctors' | 'preparedBy'> }[] = [
  { id: 'A13', label: 'Invoiced amount', unit: 'AED', key: 'invoiceAmountTotal' },
  { id: 'A14', label: 'Insurance', unit: 'AED', key: 'insuranceTotal' },
  { id: 'A15', label: 'Co-payment', unit: 'AED', key: 'copayTotal' },
  { id: 'A16', label: 'Cash', unit: 'AED', key: 'cashTotal' },
  { id: 'A17', label: 'Card', unit: 'AED', key: 'cardTotal' },
  { id: 'A18', label: 'Appointments', unit: 'count', key: 'totalAppointments' },
  { id: 'A19', label: 'Cancelled appointments', unit: 'count', key: 'cancelled' },
  { id: 'A20', label: 'New patients', unit: 'count', key: 'patientsNew' },
  { id: 'A21', label: 'Returning patients', unit: 'count', key: 'patientsOld' },
];

/** Every Dubai day in the range, ascending (capped like the reader). */
function daysOf(r: Range): string[] {
  const out: string[] = [];
  for (let d = r.from; d <= r.to && out.length < 400; d = addDaysIso(d, 1)) out.push(d);
  return out;
}

const finite = (v: unknown): Val => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const sumAll = (xs: Val[]): Val => (xs.length > 0 && xs.every((x) => x != null) ? xs.reduce<number>((a, x) => a + (x ?? 0), 0) : null);

/** Pure projection of readClinicActivation's output into what the page and the email show. */
export function buildActivation(a: ClinicActivation): ActivationData {
  const { yesterday, window } = a;

  const leadLine = (key: LeadClinic | 'total'): LeadLine => {
    const b = a.leads ? (key === 'total' ? a.leads.total : a.leads.byClinic[key]) : null;
    const g = gclinicOf(key);
    return {
      key, name: key === 'total' ? 'All clinics' : CLINIC_NAMES[key],
      yesterday: leadVals(b?.yesterday), window: leadVals(b?.window),
      platforms: b ? topPlatforms(b.window.byPlatform) : [],
      urlYesterday: growthLink(yesterday, g), urlWindow: growthLink(window, g),
    };
  };
  const smileLine = (key: LeadClinic | 'total'): SmileLine => {
    const b = a.smileClub ? (key === 'total' ? a.smileClub.total : a.smileClub.byClinic[key]) : null;
    const g = gclinicOf(key);
    return {
      key, name: key === 'total' ? 'All clinics' : CLINIC_NAMES[key],
      yesterday: smileVals(b?.yesterday), window: smileVals(b?.window),
      urlYesterday: growthLink(yesterday, g), urlWindow: growthLink(window, g),
    };
  };

  const gmbLines: GmbLine[] = ACTIVATION_CLINICS.map((key) => ({
    key, name: CLINIC_NAMES[key],
    latest: a.gmb?.latest[key] ?? null,
    window: a.gmb?.window[key] ?? EMPTY_GMB,
  }));
  gmbLines.push({ key: 'total', name: 'All clinics', latest: null, window: a.gmb?.total ?? EMPTY_GMB });

  const practo = a.revenue.practo.byClinic;
  const practoLine = (key: ExecClinic, name: string): PractoLine => ({
    key, name, yesterday: finite(practo[key]?.yesterday), window: finite(practo[key]?.window),
    urlYesterday: executiveLink(yesterday, key), urlWindow: executiveLink(window, key),
  });
  const wasl = practoLine('dental-nation', 'Al Wasl');
  const tosun = practoLine('dr-tosun', 'Dr Tosun');
  const together: PractoLine = {
    key: 'together', name: 'Al Wasl and Dr Tosun',
    yesterday: sumAll([wasl.yesterday, tosun.yesterday]), window: sumAll([wasl.window, tosun.window]),
    urlYesterday: executiveLink(yesterday), urlWindow: executiveLink(window),
  };

  const amc = a.revenue.amc;
  const amcY: AmcDay | null = amc?.yesterday ?? null;
  const amcW: AmcTotals | null = amc?.window ?? null;

  const o = a.ortho;
  const g = o?.googleSearch ?? null;
  const live = g != null && g.mtd.activeDays > 0;
  const liveYesterday = live && g.yesterday.activeDays > 0;
  const fed: OrthoDoctorLine[] = (o?.doctors ?? []).map((d) => ({
    name: d.name, clinicLabel: d.clinicLabel, billed: finite(d.billedMtd), url: practoRevenueLink(d.clinic, window),
  }));
  // As in the DN Ortho email: Al Maher is in Practo from 22 Oct 2026, but its charge lines name no doctor yet.
  const doctors: OrthoDoctorLine[] = [...fed, { name: 'Dr Suzanna Almaali', clinicLabel: 'Al Maher Medical Centre', billed: null, url: practoRevenueLink('al-maher', window) }];

  return {
    today: a.today,
    yesterday,
    window,
    leads: {
      read: a.leads != null,
      lines: [...LEAD_CLINICS.map(leadLine), leadLine('total')],
      excludedRows: a.leads?.excludedRows ?? null,
    },
    smileClub: {
      read: a.smileClub != null,
      lines: [...LEAD_CLINICS.map(smileLine), smileLine('total')],
      undated: a.smileClub?.undated ?? null,
      companiesUrl: SMILE_CLUB_COMPANIES,
    },
    gbp: { read: a.gmb != null, lines: gmbLines, googleUrl: socialLink('all'), copiesFrom: GMB_COPIES_FROM },
    revenue: {
      practo: [wasl, tosun, together],
      amc: {
        read: amc != null,
        measures: AMC_MEASURES.map((m) => ({
          id: m.id, label: m.label, unit: m.unit, yesterday: finite(amcY?.[m.key]), window: finite(amcW?.[m.key]),
        })),
        daysReported: amc == null ? null : (amcW?.days.length ?? 0),
        missingDays: amc == null ? null : (amcW?.missingDays ?? daysOf(window)),
        monthFile: amcW?.monthFile ?? null,
        invoicedToDate: finite(amcW?.invoicedToDate),
        yesterdayReported: amcY != null,
        sheetUrl: AMC_SHEET_URL,
      },
    },
    ortho: {
      read: g != null,
      live,
      spend: { yesterday: liveYesterday ? g.yesterday.spend : null, window: live ? g.mtd.spend : null },
      clicks: { yesterday: liveYesterday ? g.yesterday.clicks : null, window: live ? g.mtd.clicks : null },
      campaignUrlYesterday: marketingLink('google', yesterday, { gcamp: g?.campaign ?? ORTHO_GOOGLE_CAMPAIGN }),
      campaignUrlWindow: marketingLink('google', window, { gcamp: g?.campaign ?? ORTHO_GOOGLE_CAMPAIGN }),
      doctors,
      billedTotal: sumAll(fed.map((d) => d.billed)),
      billingUrl: practoRevenueLink('dental-nation', window),
    },
  };
}

/**
 * Read and project everything the Clinic Activation page shows; never throws
 * (readClinicActivation turns each unreadable source into null). `range`
 * (the page's date control) replaces month to yesterday.
 */
export async function readActivation(db: AdminClient | null, today: string, range?: Range): Promise<ActivationData> {
  // No database: every source reads as null (Unavailable), never 0.
  const none = { from() { throw new Error('no database'); } } as unknown as AdminClient;
  return buildActivation(await readClinicActivation(db ?? none, today, range));
}
