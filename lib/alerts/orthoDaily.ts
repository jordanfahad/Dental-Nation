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
 *    the dashboard can prove). Al Maher has no Practo feed: not yet.
 *  - Checklist: config/ortho-checklist.ts (project plan, edited by hand).
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { clinicOfCenter } from '@/config/clinics';
import { topMix } from '@/lib/practo/report';
import type { MixRow } from '@/lib/types';
import { ORTHO_CHECKLIST, type OrthoChecklist } from '@/config/ortho-checklist';
import { marketingLink, periods, practoRevenueLink, type ExecClinic } from './links';
import {
  dayLabel, emailHtml, finishEmail, fmt, gap, h2, note, NOT_YET, num, proof, rangeLabel, table, text, tiles,
} from './shell';

/** Exact Google Ads campaign name (the gcamp filter must match it exactly). */
export const ORTHO_GOOGLE_CAMPAIGN = 'Search | DNO Ortho | EN | Dubai | 2026-10';
export const ORTHO_DAILY_RECIPIENTS = 'To Dr Luvi, MJ and Ms Shadi; copied to Fahad.';

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
export async function readOrthoDaily(db: AdminClient, today: string): Promise<OrthoDailyData> {
  const { yesterday, mtd } = periods(today);
  const [billing, googleSearch] = await Promise.all([
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
  };
}

/** Checklist row that the campaign figures above supersede once the campaign runs. */
const GOOGLE_CHECKLIST_ITEM = 'Google Search campaign';

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(`${s}T12:00:00Z`));
const spendClicks = (t: CampaignTotals) => `AED ${fmt(t.spend)} · ${fmt(t.clicks)} ${t.clicks === 1 ? 'click' : 'clicks'}`;

/** Pure: no IO. */
export function buildOrthoDaily(
  data: OrthoDailyData,
  today: string,
  opts: { preview?: string; recipients?: string } = {},
): { subject: string; html: string } {
  const { yesterday, mtd } = periods(today);
  const billingLink = practoRevenueLink('dental-nation', mtd);
  const billed = data.doctors.map((d) => d.billedMtd);
  const total = billed.length > 0 && billed.every((v) => v != null) ? billed.reduce<number>((a, v) => a + (v ?? 0), 0) : null;

  const g = data.googleSearch;
  const gcamp = g?.campaign ?? ORTHO_GOOGLE_CAMPAIGN;
  const gMtd = marketingLink('google', mtd, { gcamp });
  const gYesterday = marketingLink('google', yesterday, { gcamp });
  const live = g != null && g.mtd.activeDays > 0;

  const searchTile = g == null
    ? { label: 'Google Search campaign', value: null }
    : live
      ? { label: 'Google Search campaign', value: `AED ${fmt(g.mtd.spend)}`, href: gMtd, sub: `Live · ${fmt(g.mtd.clicks)} ${g.mtd.clicks === 1 ? 'click' : 'clicks'} month to date` }
      : { label: 'Google Search campaign', value: 'Not live', href: gMtd, sub: 'Built, paused for review', subTone: 'down' as const };

  const doctorRows = data.doctors.map((d) => {
    const href = practoRevenueLink(d.clinic, mtd);
    return [text(d.name), text(d.clinicLabel), num(d.billedMtd, href), NOT_YET, d.billedMtd == null ? '' : proof(href)];
  });
  doctorRows.push([text('Dr Suzanna Almaali'), text('Al Maher Medical Centre'), NOT_YET, NOT_YET, '']);

  const googleRow = g == null
    ? [text('Google Search: DN Ortho (new)'), NOT_YET, NOT_YET, NOT_YET, proof(gMtd)]
    : live
      ? [text('Google Search: DN Ortho (new)'), text(g.yesterday.activeDays > 0 ? 'Live' : 'No activity yesterday'),
        num(spendClicks(g.yesterday), gYesterday), num(spendClicks(g.mtd), gMtd), proof(gMtd)]
      : [text('Google Search: DN Ortho (new)'), text('Built, paused'), text('not live'), text('not live'), proof(gMtd)];

  const checklist = data.checklist;
  const body = [
    h2('At a glance'),
    tiles([
      { label: 'Orthodontist billing · month to date (AED)', value: total, href: billingLink, sub: '3 orthodontists, finalised bills' },
      searchTile,
      // Template 2: "not yet" with the Demand view as its proof (only Meta rows are classified as ortho today).
      { label: 'Ortho enquiries', value: null, sub: 'Needs the ortho tagging update', extra: `<div>${proof(marketingLink('demand', mtd))}</div>` },
    ]),
    h2('Billing by orthodontist (month to date)'),
    table(['Orthodontist', 'Clinic', 'Billed (AED)', 'Appointments', ''], doctorRows, [2, 3]),
    note('From Practo "Revenue by conducting doctor" (finalised bills; open bills appear once finalised). Appointments per doctor for a date range need a dashboard update.'),
    h2('Campaigns'),
    table(['Campaign', 'Status', 'Yesterday', 'Month to date', ''], [
      googleRow,
      [text('Meta: DN Ortho (Sep)'), text('Stopped 6 Oct'), text('-'), text('-'), proof(marketingLink('demand', mtd))],
    ], [2, 3]),
    note(live
      ? 'On the Google Ads page the headline totals are for the whole account; the campaign table below them shows this campaign only.'
      : 'On the Google Ads page the headline totals are for the whole account; the campaign table below them is empty until this campaign runs.'),
    gap(live
      ? 'Not in this email yet: spend, clicks and enquiries per ad group (S1 adults, S2 teeth moved, S3 children). WhatsApp chats per campaign need a tracking update first.'
      : 'Once the campaign is live: spend, clicks and enquiries per ad group (S1 adults, S2 teeth moved, S3 children). WhatsApp chats per campaign need a tracking update first.'),
    h2('Content and launch checklist'),
    // The plan's status for the campaign is written by hand; once Google Ads shows
    // it running, the row must not contradict the Campaigns table.
    table(['Item', 'Status'], checklist.items.map((i) => [
      text(i.item), text(live && i.item === GOOGLE_CHECKLIST_ITEM ? 'Live (figures under Campaigns above)' : i.status),
    ])),
    note('Checklist status comes from the project plan; there is no dashboard page for it yet.'),
    isDay(checklist.updated) ? note(`Last updated ${dayLabel(checklist.updated)}.`) : '',
  ].join('\n');

  const subject = total != null
    ? `DN Ortho · ${dayLabel(today)} · AED ${fmt(total)} orthodontist billing this month`
    : `DN Ortho · ${dayLabel(today)} · orthodontist billing not yet available`;

  return finishEmail(subject, emailHtml({
    kicker: 'DN ORTHO · DAILY 9 AM',
    title: 'DN Ortho: status and month to date',
    subtitle: `${dayLabel(yesterday.from)} (yesterday) and ${rangeLabel(mtd.from, mtd.to)} (month to date)`,
    body,
    landing: { href: billingLink, label: 'Open the orthodontist billing report' },
    sources: 'Sources: Practo bills (every 15 min), Google Ads (every 15 min), project plan. Al Maher is not connected yet.',
    recipients: opts.recipients ?? ORTHO_DAILY_RECIPIENTS,
    preview: opts.preview,
  }));
}
