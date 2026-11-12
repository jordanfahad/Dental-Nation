/**
 * DN Ortho daily 09:00 email (template 2, approved 24 Oct 2026).
 * To Dr Luvi, MJ and Ms Shadi; copied to Fahad.
 *
 * Where each figure comes from:
 *  - Orthodontist billing, month to date: Practo finalised bills
 *    (lane_e.practo_bills_raw) with the rule of "Revenue by conducting doctor"
 *    in lib/practo/report.ts (getPractoSummary byDoctor, topMix): bills dated in
 *    the range, clinic from the bill centre (clinicOfCenter), positive charge
 *    lines summed by the line's exact trimmed conducting doctor. Each figure is
 *    that doctor's named bar on the linked practoRevenueLink(clinic, mtd) view;
 *    a doctor with no named bar there (no priced line, or folded into "Other")
 *    reads "not yet".
 *  - Google Search campaign: lane_e.google_ads_insights_raw rows for the new
 *    DN Ortho campaign. "Not live" until a row in the range has spend or
 *    impressions.
 *  - Ortho enquiries and appointments per orthodontist: not yet (no source
 *    the dashboard can prove). Al Maher is in Practo from 22 Oct 2026, but
 *    with no conducting doctor on its charge lines: not yet.
 *  - Checklist: config/ortho-checklist.ts (project plan, edited by hand).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { clinicOfCenter } from '@/config/clinics';
import { topMix } from '@/lib/practo/report';
import type { MixRow } from '@/lib/types';
import { ORTHO_CHECKLIST, type OrthoChecklist } from '@/config/ortho-checklist';
import { buildOrthoDashboard, funnelFor, readOrthoSources, type Funnel, type SegmentLine } from '@/lib/ortho/dashboard';
import { marketingLink, orthoLink, periods, practoRevenueLink, type ExecClinic } from './links';
import {
  dayLabel, emailHtml, finishEmail, fmt, gap, h2, note, NOT_YET, num, proof, rangeLabel, table, text, tiles,
} from './shell';

/** Exact Google Ads campaign name (the gcamp filter must match it exactly). */
export const ORTHO_GOOGLE_CAMPAIGN = 'Search | DNO Ortho | EN | Dubai | 2026-10';
export const ORTHO_DAILY_RECIPIENTS = 'To Dr Luvi and MJ; copied to Fahad.';

/**
 * Orthodontists with a Practo feed, in template order. `practo` is the
 * conducting-doctor name as stored on Practo charge lines (checked against
 * lane_e.practo_bills_raw on 24 Oct 2026); `clinic` is the bill centre whose
 * Revenue view proves the figure.
 */
export const ORTHODONTISTS = [
  { key: 'hasna', name: 'Dr Hasna Alsaeed', practo: 'Dr. Hasna Alsaeed', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl' },
  { key: 'yasmin', name: 'Dr Yasmin Youssef', practo: 'Dr. Yasmin Youssef', clinic: 'dental-nation', clinicLabel: 'Dental Nation Al Wasl' },
  { key: 'yahya', name: 'Dr Yahya Tosun', practo: 'Dr.Yahya Serif Tosun', clinic: 'dr-tosun', clinicLabel: 'Dr. Tosun Dental Clinic' },
] as const satisfies readonly { key: string; name: string; practo: string; clinic: ExecClinic; clinicLabel: string }[];
export type OrthodontistKey = (typeof ORTHODONTISTS)[number]['key'];

export interface OrthoDoctorBilling {
  key: OrthodontistKey;
  name: string;
  clinic: ExecClinic;
  clinicLabel: string;
  /** AED on finalised bills, month to date; null = Practo could not be read, or the doctor has no named bar on the Revenue view. */
  billedMtd: number | null;
}

export interface CampaignTotals {
  spend: number;
  impressions: number;
  clicks: number;
  /** Days with any spend or impressions. */
  activeDays: number;
}

export interface OrthoDailyData {
  doctors: OrthoDoctorBilling[];
  /** The new Google Search campaign; null = Google Ads could not be read. */
  googleSearch: { campaign: string; yesterday: CampaignTotals; mtd: CampaignTotals } | null;
  checklist: OrthoChecklist;
  /**
   * The DN Ortho dashboard's figures (lib/ortho/dashboard.ts) for yesterday and
   * month to date, so the email and /next/ortho agree. null = could not be read.
   */
  funnel?: { yesterday: Funnel; mtd: Funnel; segments: SegmentLine[] } | null;
}

export interface PractoBillRow {
  bill_date: string | null;
  data: Record<string, unknown> | null;
}

interface AdsRow { date: string | null; spend: number | string | null; impressions: number | string | null; clicks: number | string | null }

/**
 * Billed AED per orthodontist from bills already limited to the date range,
 * exactly as the clinic-filtered Revenue view draws "Revenue by conducting
 * doctor" (getPractoSummary byDoctor): bills scoped to the clinic by centre,
 * positive charge lines summed by the exact trimmed conducting doctor, then
 * topMix (rounded, above 0, top 7 plus "Other" when more than 8). A doctor's
 * figure is their named bar; null when they have none, so every figure can be
 * found on the linked view. Spelling variants are separate bars there, so they
 * are never merged here.
 */
export function orthodontistBilling(rows: PractoBillRow[]): Record<OrthodontistKey, number | null> {
  const byClinic = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const clinic = clinicOfCenter((r.data?.center_name as string) ?? '');
    const byDoctor = byClinic.get(clinic) ?? new Map<string, number>();
    byClinic.set(clinic, byDoctor);
    const charges = Array.isArray(r.data?.charges) ? (r.data!.charges as Record<string, unknown>[]) : [];
    for (const c of charges) {
      const amount = Number(c.amount) || 0;
      if (amount <= 0) continue;
      const doctor = String(c.conducting_doctor ?? '').trim();
      if (doctor) byDoctor.set(doctor, (byDoctor.get(doctor) ?? 0) + amount);
    }
  }
  const bars = new Map<string, MixRow[]>();
  for (const [clinic, byDoctor] of byClinic) bars.set(clinic, topMix(byDoctor));
  // The practo names are real doctors, never the "Other" fold row.
  return Object.fromEntries(ORTHODONTISTS.map((d) => [
    d.key, bars.get(d.clinic)?.find((b) => b.label === d.practo)?.value ?? null,
  ])) as Record<OrthodontistKey, number | null>;
}

export function campaignTotals(rows: AdsRow[]): CampaignTotals {
  const t: CampaignTotals = { spend: 0, impressions: 0, clicks: 0, activeDays: 0 };
  const active = new Set<string>();
  for (const r of rows) {
    const spend = Number(r.spend) || 0;
    const impressions = Number(r.impressions) || 0;
    t.spend += spend;
    t.impressions += impressions;
    t.clicks += Number(r.clicks) || 0;
    if ((spend > 0 || impressions > 0) && r.date) active.add(r.date);
  }
  t.activeDays = active.size;
  return t;
}

/** Read-only. Each source is caught on its own, so one broken feed shows "not yet" instead of blocking the email. */
/** `p` (optional) replaces the windows; without it they are periods(today), as the email reads them. */
export async function readOrthoDaily(
  db: AdminClient, today: string, p: ReturnType<typeof periods> = periods(today),
): Promise<OrthoDailyData> {
  const { yesterday, mtd } = p;
  const [billing, googleSearch, funnel] = await Promise.all([
    (async () => {
      const { data } = await selectAll(
        () => db.from('practo_bills_raw').select('bill_date, data').gte('bill_date', mtd.from).lte('bill_date', mtd.to),
        'bill_key',
      );
      return orthodontistBilling(data as PractoBillRow[]);
    })().catch(() => null),
    (async () => {
      const { data } = await selectAll(
        () => db.from('google_ads_insights_raw').select('date, spend, impressions, clicks')
          .eq('campaign_name', ORTHO_GOOGLE_CAMPAIGN).gte('date', mtd.from).lte('date', mtd.to),
        'key',
      );
      const rows = data as AdsRow[];
      return {
        campaign: ORTHO_GOOGLE_CAMPAIGN,
        yesterday: campaignTotals(rows.filter((r) => r.date === yesterday.from)),
        mtd: campaignTotals(rows),
      };
    })().catch(() => null),
    (async () => {
      const s = await readOrthoSources(db, mtd);
      return { yesterday: funnelFor(s, yesterday), mtd: funnelFor(s, mtd), segments: buildOrthoDashboard(s, mtd).segments };
    })().catch(() => null),
  ]);
  return {
    // A doctor with no named bar on the linked Revenue view cannot be proved
    // there: "not yet", never 0. (Oct 2026: Practo leaves conducting_doctor
    // empty on most priced lines.)
    doctors: ORTHODONTISTS.map((d) => ({
      key: d.key, name: d.name, clinic: d.clinic, clinicLabel: d.clinicLabel, billedMtd: billing?.[d.key] ?? null,
    })),
    googleSearch,
    checklist: ORTHO_CHECKLIST,
    funnel,
  };
}

/** Checklist row that the campaign figures above supersede once the campaign runs. */
const GOOGLE_CHECKLIST_ITEM = 'Google Search campaign';

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`));
const spendClicks = (t: CampaignTotals) => `AED ${fmt(t.spend)} · ${fmt(t.clicks)} ${t.clicks === 1 ? 'click' : 'clicks'}`;

const aed = (v: number | null | undefined) => (v == null ? null : `AED ${fmt(v)}`);
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/** Pure: no IO. */
export function buildOrthoDaily(
  data: OrthoDailyData,
  today: string,
  opts: { preview?: string; recipients?: string } = {},
): { subject: string; html: string } {
  const { yesterday, mtd } = periods(today);
  const dashY = orthoLink(yesterday, 'weeks');
  const dashM = orthoLink(mtd, 'weeks');
  const f = data.funnel ?? null;
  const fy = f?.yesterday ?? null;
  const fm = f?.mtd ?? null;
  const cell = (v: number | null | undefined, href: string, money = false) => (v == null ? NOT_YET : num(money ? aed(v) : v, href));

  const g = data.googleSearch;
  const gcamp = g?.campaign ?? ORTHO_GOOGLE_CAMPAIGN;
  const gMtd = marketingLink('google', mtd, { gcamp });
  const gYesterday = marketingLink('google', yesterday, { gcamp });
  const live = g != null && g.mtd.activeDays > 0;

  const doctorRows = data.doctors.map((d) => {
    const href = practoRevenueLink(d.clinic, mtd);
    return [text(d.name), text(d.clinicLabel), num(d.billedMtd, href), d.billedMtd == null ? '' : proof(href)];
  });
  // Al Maher is in Practo from 22 Oct 2026, but its charge lines carry no conducting doctor yet.
  doctorRows.push([text('Dr Suzanna Almaali'), text('Al Maher Medical Centre'), NOT_YET, '']);

  const googleRow = g == null
    ? [text('Google Search: DN Ortho'), NOT_YET, NOT_YET, NOT_YET, proof(gMtd)]
    : live
      ? [text('Google Search: DN Ortho'), text(g.yesterday.activeDays > 0 ? 'Live' : 'No activity yesterday'),
        num(spendClicks(g.yesterday), gYesterday), num(spendClicks(g.mtd), gMtd), proof(gMtd)]
      : [text('Google Search: DN Ortho'), text('Not live'), text('-'), text('-'), proof(gMtd)];
  const metaRow = [
    text('Meta: ortho ad sets'),
    text(fy?.metaSpend ? 'Live' : fm?.metaSpend ? 'No spend yesterday' : fm ? 'No spend this month' : 'not yet'),
    fy ? num(`${aed(fy.metaSpend) ?? 'not yet'} · ${fmt(fy.metaRealPeople ?? 0)} real chats`, dashY) : NOT_YET,
    fm ? num(`${aed(fm.metaSpend) ?? 'not yet'} · ${fmt(fm.metaRealPeople ?? 0)} real chats`, dashM) : NOT_YET,
    proof(marketingLink('meta', mtd)),
  ];

  const funnelRows: [string, (x: Funnel) => number | null, boolean][] = [
    ['Ad spend (Google and Meta)', (x) => x.spend, true],
    ['Google clicks', (x) => x.googleClicks, false],
    ['Meta real chats', (x) => x.metaRealPeople, false],
    ['Ortho enquiries (lead tracker)', (x) => x.leads, false],
    ['Enquiries booked or arrived', (x) => x.leadsBooked, false],
    ['Orthodontist visits attended', (x) => x.attended, false],
    ['New patients seen by an orthodontist', (x) => x.newAttended, false],
    ['Ortho assessments billed', (x) => x.assessments, false],
    ['Ortho treatment starts', (x) => x.starts, false],
    ['Ortho billing (all ortho bill lines)', (x) => x.orthoBilled, true],
  ];
  const segSum = (f?.segments ?? []).reduce((a, x) => a + (x.googleSpend ?? 0), 0);

  const checklist = data.checklist;
  const body = [
    h2('At a glance'),
    tiles([
      { label: 'Ad spend · month to date', value: aed(fm?.spend), href: dashM, sub: fy?.spend == null ? undefined : `AED ${fmt(fy.spend)} yesterday` },
      { label: 'Ortho enquiries · month to date', value: fm?.leads ?? null, href: orthoLink(mtd, 'leads'), sub: fm?.leadsBooked == null ? undefined : `${fmt(fm.leadsBooked)} booked or arrived` },
      { label: 'Orthodontist visits · month to date', value: fm?.attended ?? null, href: orthoLink(mtd, 'clinic'), sub: fm?.newAttended == null ? undefined : `${fmt(fm.newAttended)} new patients` },
      { label: 'Treatment starts · month to date', value: fm?.starts ?? null, href: dashM, sub: fm?.startsAed == null ? undefined : `AED ${fmt(fm.startsAed)}` },
    ]),
    h2('Yesterday and month to date'),
    f ? table(['Measure', `Yesterday (${dayLabel(yesterday.from)})`, `Month to date (${rangeLabel(mtd.from, mtd.to)})`],
      funnelRows.map(([label, get, money]) => [text(label), cell(get(f.yesterday), dashY, money), cell(get(f.mtd), dashM, money)]), [1, 2])
      : note('The DN Ortho figures could not be read this morning.'),
    note('Ads and enquiries are DN Ortho only. Visits, assessments, starts and billing are every orthodontist patient in Practo, because Practo cannot yet link a patient to a lead or a campaign.'),
    h2('Campaigns'),
    table(['Campaign', 'Status', 'Yesterday', 'Month to date', ''], [googleRow, metaRow], [2, 3]),
    f && segSum > 0 ? table(['Google segment', 'Spend month to date', 'Share'], f.segments.map((x) => [
      text(x.name), cell(x.googleSpend, orthoLink(mtd, 'segments'), true), text(x.googleSpend == null ? '' : `${Math.round((x.googleSpend / segSum) * 100)}%`),
    ]), [1, 2]) : '',
    gap('Not yet: enquiries per segment (S1, S2, S3). They appear once the WhatsApp message carries a code such as DNO-S1 and the front office keeps it in the tracker.'),
    h2('Billing by orthodontist (month to date)'),
    table(['Orthodontist', 'Clinic', 'Billed (AED)', ''], doctorRows, [2]),
    note('Practo names the treating doctor on very few bills, so a doctor with no named figure shows not yet, never 0. Ortho billing above counts every ortho bill line instead.'),
    h2('Content and launch checklist'),
    // The plan's status for the campaign is written by hand; once Google Ads shows
    // it running, the row must not contradict the Campaigns table.
    table(['Item', 'Status'], checklist.items.map((i) => [
      text(i.item), text(live && i.item === GOOGLE_CHECKLIST_ITEM ? 'Live (figures under Campaigns above)' : i.status),
    ])),
    note('Checklist status comes from the project plan; there is no dashboard page for it yet.'),
    isDay(checklist.updated) ? note(`Last updated ${dayLabel(checklist.updated)}.`) : '',
  ].join('\n');

  const parts = fy
    ? [
      fy.spend == null ? 'spend not yet' : `AED ${fmt(fy.spend)} spend`,
      fy.leads == null ? 'enquiries not yet' : plural(fy.leads, 'enquiry', 'enquiries'),
      fy.attended == null ? 'visits not yet' : plural(fy.attended, 'orthodontist visit', 'orthodontist visits'),
    ]
    : ['figures not yet available'];
  const subject = `DN Ortho · ${dayLabel(today)} · ${parts.join(', ')} yesterday`.replace('available yesterday', 'available');

  return finishEmail(subject, emailHtml({
    kicker: 'DN ORTHO · DAILY 9 AM',
    title: 'DN Ortho: spend, enquiries, visits and treatment starts',
    subtitle: `${dayLabel(yesterday.from)} (yesterday) and ${rangeLabel(mtd.from, mtd.to)} (month to date)`,
    body,
    landing: { href: orthoLink(mtd), label: 'Open the DN Ortho dashboard' },
    sources: 'Sources: Google Ads and Meta Ads (ortho campaigns and ad sets), Inhouse Lead Tracker, Practo appointments and bills, project plan.',
    recipients: opts.recipients ?? ORTHO_DAILY_RECIPIENTS,
    preview: opts.preview,
  }));
}
