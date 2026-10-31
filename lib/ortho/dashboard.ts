/**
 * DN Ortho dashboard (Dr Luvi, 30 Oct 2026): the lead funnel, spend,
 * enquiries, appointments, treatment starts and revenue, by week and by
 * segment (S1 adults, S2 after braces, S3 parents). Read by the /next/ortho
 * page and the Monday 09:00 weekly email, so the two always agree.
 *
 * Where each figure comes from:
 *  - Google spend, clicks, impressions: lane_e.google_ads_insights_raw rows of
 *    every campaign whose name says ortho (the new DN Ortho Search campaign
 *    and the September one).
 *  - Google spend by segment: ad-level spend (ad_creative_daily joined to
 *    ad_creatives) of the DN Ortho Search campaign. Each ad group holds one
 *    ad, named after its ad group, so the ad name gives the segment.
 *  - Meta spend and people: lane_e.meta_ad_insights_raw rows whose campaign or
 *    ad set says ortho; people by lib/meta/people.ts (started a chat = gross,
 *    sent at least two messages = net). Meta's own "leads" figure double
 *    counts and is never used.
 *  - Enquiries: Inhouse Lead Tracker lead tabs (lane_e.leads), rows whose
 *    Campaign / Offer or Service text names ortho work. Booked or arrived is
 *    the Status rule (statusConverted). A segment code such as "DNO-S1" in any
 *    column gives the lead's segment.
 *  - Appointments: Practo appointments with the orthodontists. Attended is
 *    Arrived or Completed. New means the patient's first appointment in the
 *    Practo feed.
 *  - Assessments, treatment starts, ortho billing: Practo bill charge lines by
 *    description ("Pre-Orthodontic Treatment Visit"; comprehensive or limited
 *    orthodontic treatment, not the subsequent visits; any ortho line).
 *
 * Practo cannot link a patient to a lead or a campaign, so clinic figures are
 * all patients, whatever brought them. Each source is read on its own; one
 * that cannot be read is null (Unavailable), never 0.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { metaPeople, type MetaActions } from '@/lib/meta/people';
import { sheetMapping } from '@/config/sheet-mapping';
import { isNonLeadTab, statusConverted } from '@/lib/activation/read';
import { addDaysIso, type Range } from '@/lib/alerts/links';

export type Segment = 'S1' | 'S2' | 'S3';
export const SEGMENTS: { key: Segment; name: string }[] = [
  { key: 'S1', name: 'S1 adults' },
  { key: 'S2', name: 'S2 after braces' },
  { key: 'S3', name: 'S3 parents' },
];
/** The DN Ortho Search campaign (live 23 Oct 2026). */
export const DNO_SEARCH_CAMPAIGN = 'Search | DNO Ortho | EN | Dubai | 2026-10';
/** First day of the DN Ortho reporting (the September campaigns started on 3 Sep 2026). */
export const ORTHO_FROM = '2026-09-01';
/** Orthodontists by their Practo appointment names. */
export const ORTHO_DOCTORS = [
  { name: 'Dr Hasna Alsaeed', practo: 'Dr. Hasna Alsaeed', clinic: 'Al Wasl' },
  { name: 'Dr Yasmin Youssef', practo: 'Dr. Yasmin Youssef', clinic: 'Al Wasl' },
  { name: 'Dr Yahya Tosun', practo: 'Dr.Yahya Serif Tosun', clinic: 'Dr Tosun' },
  { name: 'Dr Suzanna Almaali', practo: 'Dr. Suzanna Almaali', clinic: 'Al Maher' },
] as const;

const ORTHO_NAME = /ortho/i;
const ORTHO_LEAD = /ortho|brace|align|invisal|retainer|crooked|gap|turkish/i;
const SEGMENT_CODE = /\bDNO[-\s]?S([123])\b/i;

/** The segment of a DN Ortho Search ad (ad name = ad group headline). */
export function segmentOfAd(adName: string): Segment {
  if (/kid|teen|child/i.test(adName)) return 'S3';
  if (/retainer|shift|after braces|moved|relapse/i.test(adName)) return 'S2';
  return 'S1';
}

/** A lead's segment from a "DNO-S1" style code anywhere in its row; null = none. */
export function segmentOfLead(raw: Record<string, unknown> | null | undefined): Segment | null {
  for (const v of Object.values(raw ?? {})) {
    const m = String(v ?? '').match(SEGMENT_CODE);
    if (m) return `S${m[1]}` as Segment;
  }
  return null;
}

export type LeadOutcome = 'booked' | 'noAnswer' | 'international' | 'notInterested' | 'noEnglish' | 'interested' | 'other';
export const LEAD_OUTCOMES: { key: LeadOutcome; label: string }[] = [
  { key: 'booked', label: 'Booked or arrived' },
  { key: 'interested', label: 'Interested' },
  { key: 'noAnswer', label: 'No answer' },
  { key: 'international', label: 'International number' },
  { key: 'noEnglish', label: 'No English' },
  { key: 'notInterested', label: 'Not interested or lost' },
  { key: 'other', label: 'Other or not filled in' },
];
export function leadOutcome(raw: Record<string, unknown> | null | undefined): LeadOutcome {
  if (statusConverted(raw)) return 'booked';
  const key = Object.keys(raw ?? {}).find((k) => /^\s*status\s*$/i.test(k));
  const s = key ? String(raw![key] ?? '').toLowerCase() : '';
  if (/international|internatio/.test(s)) return 'international';
  if (/no english/.test(s)) return 'noEnglish';
  if (/not interested|not serious|invalid|location is far|cancel/.test(s)) return 'notInterested';
  if (/no answ|no answr|\bna\b|drop call/.test(s)) return 'noAnswer';
  if (/interested/.test(s)) return 'interested';
  return 'other';
}

/** Monday of the week holding `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return addDaysIso(iso, -((d.getUTCDay() + 6) % 7));
}
/** Monday-to-Sunday weeks covering the range, each clipped to it. */
export function weeksOf(r: Range): Range[] {
  const out: Range[] = [];
  for (let mon = mondayOf(r.from); mon <= r.to && out.length < 60; mon = addDaysIso(mon, 7)) {
    const sun = addDaysIso(mon, 6);
    out.push({ from: mon < r.from ? r.from : mon, to: sun > r.to ? r.to : sun });
  }
  return out;
}

export interface Funnel {
  googleSpend: number | null; googleClicks: number | null; googleImpressions: number | null;
  metaSpend: number | null; metaPeople: number | null; metaRealPeople: number | null;
  /** Google + Meta; null unless both are known. */
  spend: number | null;
  leads: number | null; leadsBooked: number | null;
  appointments: number | null; attended: number | null; newAttended: number | null;
  assessments: number | null; starts: number | null; startsAed: number | null; orthoBilled: number | null;
}
export interface SegmentLine { key: Segment; name: string; googleSpend: number | null; leadsTagged: number | null }
export interface MetaAdSetLine { name: string; spend: number; people: number; realPeople: number; lastDay: string }
export interface DoctorLine { name: string; clinic: string; appointments: number | null; attended: number | null; newAttended: number | null }

export interface OrthoDashboard {
  range: Range;
  weeks: { range: Range; funnel: Funnel }[];
  total: Funnel;
  segments: SegmentLine[];
  outcomes: { key: LeadOutcome; label: string; count: number }[] | null;
  metaAdSets: MetaAdSetLine[] | null;
  doctors: DoctorLine[];
  /** Last day with Google or Meta ortho activity, per platform; null = none in range. */
  live: { google: string | null; meta: string | null };
}

/* ── rows ── */

export interface GoogleRow { campaign_name: string | null; date: string; spend: number | string | null; impressions: number | string | null; clicks: number | string | null }
export interface GoogleAdRow { ad_name: string; day: string; spend: number | string | null }
export interface MetaRow { campaign_name: string | null; adset_name: string | null; date: string; spend: number | string | null; data: { actions?: MetaActions } | null }
export interface LeadRow { inquiry_date: string | null; raw_row: Record<string, unknown> | null }
export interface ApptRow { appt_date: string; status: string | null; doctor: string | null; mr_no: string | null }
export interface BillRow { bill_date: string; data: { charges?: { description?: string; amount?: number | string }[] } | null }

export interface Sources {
  google: GoogleRow[] | null;
  googleAds: GoogleAdRow[] | null;
  meta: MetaRow[] | null;
  leads: LeadRow[] | null;
  appts: ApptRow[] | null;
  /** First appointment day per patient (whole feed). */
  firstVisit: Map<string, string> | null;
  bills: BillRow[] | null;
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r2 = (v: number) => Math.round(v * 100) / 100;
const inR = (d: string | null | undefined, r: Range) => !!d && d >= r.from && d <= r.to;
const isOrthoMeta = (r: MetaRow) => ORTHO_NAME.test(r.campaign_name ?? '') || ORTHO_NAME.test(r.adset_name ?? '');
const ATTENDED = /^(arrived|completed)$/i;
const ORTHO_PRACTO = new Set<string>(ORTHO_DOCTORS.map((d) => d.practo));

/** Lead-tab rows that ask about ortho work. */
export function isOrthoLead(raw: Record<string, unknown> | null | undefined): boolean {
  const d = raw ?? {};
  if (isNonLeadTab(d['_source_tab'], d['Lead ID'])) return false;
  const text = Object.entries(d).filter(([k]) => /campaign|offer|service|inquiry type/i.test(k)).map(([, v]) => String(v ?? '')).join(' ');
  return ORTHO_LEAD.test(text) || segmentOfLead(d) != null;
}

type ChargeKind = 'assessment' | 'start' | 'ortho' | null;
export function chargeKind(description: string): ChargeKind {
  const d = description.toLowerCase();
  if (/pre-?orthodontic treatment visit/.test(d)) return 'assessment';
  if (/^(comprehensive|limited) orthodontic treatment/.test(d) && !/subsequent/.test(d)) return 'start';
  if (/ortho|align|invisal|retainer|brace/.test(d)) return 'ortho';
  return null;
}

/** Pure: every figure for one range from the source rows. */
export function funnelFor(s: Sources, r: Range): Funnel {
  const g = s.google?.filter((x) => ORTHO_NAME.test(x.campaign_name ?? '') && inR(x.date, r)) ?? null;
  const m = s.meta?.filter((x) => isOrthoMeta(x) && inR(x.date, r)) ?? null;
  let people = 0, real = 0;
  for (const x of m ?? []) { const p = metaPeople(x.data?.actions); people += p.gross; real += p.net; }
  const leads = s.leads?.filter((x) => inR(x.inquiry_date, r) && isOrthoLead(x.raw_row)) ?? null;
  const appts = s.appts?.filter((x) => inR(x.appt_date, r) && ORTHO_PRACTO.has((x.doctor ?? '').trim())) ?? null;
  const attended = appts?.filter((x) => ATTENDED.test((x.status ?? '').trim())) ?? null;
  let newAttended: number | null = null;
  if (attended && s.firstVisit) {
    const seen = new Set<string>();
    for (const a of attended) {
      if (a.mr_no && s.firstVisit.get(a.mr_no) === a.appt_date) seen.add(a.mr_no);
    }
    newAttended = seen.size;
  }
  let assessments: number | null = null, starts: number | null = null, startsAed: number | null = null, orthoBilled: number | null = null;
  if (s.bills) {
    assessments = 0; starts = 0; startsAed = 0; orthoBilled = 0;
    for (const b of s.bills) {
      if (!inR(b.bill_date, r)) continue;
      for (const c of b.data?.charges ?? []) {
        const amount = num(c.amount);
        if (amount <= 0) continue;
        const kind = chargeKind(String(c.description ?? ''));
        if (!kind) continue;
        orthoBilled += amount;
        if (kind === 'assessment') assessments += 1;
        if (kind === 'start') { starts += 1; startsAed += amount; }
      }
    }
    startsAed = r2(startsAed); orthoBilled = r2(orthoBilled);
  }
  const googleSpend = g ? r2(g.reduce((a, x) => a + num(x.spend), 0)) : null;
  const metaSpend = m ? r2(m.reduce((a, x) => a + num(x.spend), 0)) : null;
  return {
    googleSpend,
    googleClicks: g ? g.reduce((a, x) => a + num(x.clicks), 0) : null,
    googleImpressions: g ? g.reduce((a, x) => a + num(x.impressions), 0) : null,
    metaSpend, metaPeople: m ? people : null, metaRealPeople: m ? real : null,
    spend: googleSpend != null && metaSpend != null ? r2(googleSpend + metaSpend) : null,
    leads: leads ? leads.length : null,
    leadsBooked: leads ? leads.filter((x) => statusConverted(x.raw_row)).length : null,
    appointments: appts ? appts.length : null,
    attended: attended ? attended.length : null,
    newAttended,
    assessments, starts, startsAed, orthoBilled,
  };
}

/** Pure: the whole dashboard from the source rows. */
export function buildOrthoDashboard(s: Sources, range: Range): OrthoDashboard {
  const segSpend: Record<Segment, number> = { S1: 0, S2: 0, S3: 0 };
  for (const a of s.googleAds ?? []) if (inR(a.day, range)) segSpend[segmentOfAd(a.ad_name)] += num(a.spend);
  const leadsInRange = s.leads?.filter((x) => inR(x.inquiry_date, range) && isOrthoLead(x.raw_row)) ?? null;
  const segLeads: Record<Segment, number> = { S1: 0, S2: 0, S3: 0 };
  for (const l of leadsInRange ?? []) { const seg = segmentOfLead(l.raw_row); if (seg) segLeads[seg] += 1; }

  let outcomes: OrthoDashboard['outcomes'] = null;
  if (leadsInRange) {
    const counts: Record<LeadOutcome, number> = { booked: 0, noAnswer: 0, international: 0, notInterested: 0, noEnglish: 0, interested: 0, other: 0 };
    for (const l of leadsInRange) counts[leadOutcome(l.raw_row)] += 1;
    outcomes = LEAD_OUTCOMES.map((o) => ({ ...o, count: counts[o.key] }));
  }

  let metaAdSets: MetaAdSetLine[] | null = null;
  if (s.meta) {
    const by = new Map<string, MetaAdSetLine>();
    for (const x of s.meta) {
      if (!isOrthoMeta(x) || !inR(x.date, range)) continue;
      const name = (ORTHO_NAME.test(x.adset_name ?? '') ? x.adset_name : x.campaign_name) ?? 'Unnamed';
      const line = by.get(name) ?? { name, spend: 0, people: 0, realPeople: 0, lastDay: x.date };
      const p = metaPeople(x.data?.actions);
      line.spend = r2(line.spend + num(x.spend));
      line.people += p.gross; line.realPeople += p.net;
      if (num(x.spend) > 0 && x.date > line.lastDay) line.lastDay = x.date;
      by.set(name, line);
    }
    metaAdSets = [...by.values()].filter((l) => l.spend > 0).sort((a, b) => b.spend - a.spend);
  }

  const doctors: DoctorLine[] = ORTHO_DOCTORS.map((d) => {
    const mine = s.appts?.filter((x) => (x.doctor ?? '').trim() === d.practo && inR(x.appt_date, range)) ?? null;
    const att = mine?.filter((x) => ATTENDED.test((x.status ?? '').trim())) ?? null;
    const fresh = att && s.firstVisit ? new Set(att.filter((a) => a.mr_no && s.firstVisit!.get(a.mr_no) === a.appt_date).map((a) => a.mr_no)).size : null;
    return { name: d.name, clinic: d.clinic, appointments: mine?.length ?? null, attended: att?.length ?? null, newAttended: fresh };
  });

  const lastActive = (days: string[]) => (days.length ? days.sort()[days.length - 1] : null);
  return {
    range,
    weeks: weeksOf(range).map((w) => ({ range: w, funnel: funnelFor(s, w) })),
    total: funnelFor(s, range),
    segments: SEGMENTS.map((x) => ({
      ...x,
      googleSpend: s.googleAds ? r2(segSpend[x.key]) : null,
      leadsTagged: leadsInRange ? segLeads[x.key] : null,
    })),
    outcomes,
    metaAdSets,
    doctors,
    live: {
      google: lastActive((s.google ?? []).filter((x) => x.campaign_name === DNO_SEARCH_CAMPAIGN && num(x.spend) > 0 && x.date <= range.to).map((x) => x.date)),
      meta: lastActive((s.meta ?? []).filter((x) => isOrthoMeta(x) && num(x.spend) > 0 && x.date <= range.to).map((x) => x.date)),
    },
  };
}

/* ── read ── */

const safe = async <T>(f: () => Promise<T>): Promise<T | null> => {
  try { return await f(); } catch { return null; }
};

/** Read every source for `range` (Dubai days). Never throws. */
export async function readOrthoSources(db: AdminClient, range: Range): Promise<Sources> {
  const [google, googleAds, meta, leads, appts, firstVisit, bills] = await Promise.all([
    safe(async () => {
      const { data } = await selectAll(() => db.from('google_ads_insights_raw')
        .select('key,campaign_name,date,spend,impressions,clicks').ilike('campaign_name', '%ortho%')
        .gte('date', range.from).lte('date', range.to), 'key');
      return data as GoogleRow[];
    }),
    safe(async () => {
      const { data: ads, error } = await db.from('ad_creatives').select('ad_id,ad_name')
        .eq('platform', 'google').eq('campaign_name', DNO_SEARCH_CAMPAIGN);
      if (error) throw error;
      const names = new Map((ads ?? []).map((a: { ad_id: string; ad_name: string }) => [a.ad_id, a.ad_name]));
      if (!names.size) return [];
      const { data } = await selectAll(() => db.from('ad_creative_daily').select('ad_id,day,spend')
        .eq('platform', 'google').in('ad_id', [...names.keys()]).gte('day', range.from).lte('day', range.to), ['ad_id', 'day']);
      return (data as { ad_id: string; day: string; spend: number | string | null }[])
        .map((d) => ({ ad_name: names.get(d.ad_id) ?? '', day: d.day, spend: d.spend }));
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('meta_ad_insights_raw')
        .select('key,campaign_name,adset_name,date,spend,data')
        .or('campaign_name.ilike.%ortho%,adset_name.ilike.%ortho%')
        .gte('date', range.from).lte('date', range.to), 'key');
      return data as MetaRow[];
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('leads').select('id,inquiry_date,raw_row')
        .eq('source_sheet', sheetMapping.leadTracker.label)
        .gte('inquiry_date', range.from).lte('inquiry_date', range.to), 'id');
      return data as LeadRow[];
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('practo_appointments_raw').select('appt_key,appt_date,status,doctor,mr_no')
        .in('doctor', ORTHO_DOCTORS.map((d) => d.practo))
        .gte('appt_date', range.from).lte('appt_date', range.to), 'appt_key');
      return data as ApptRow[];
    }),
    safe(async () => {
      // First appointment per patient across the whole feed (any doctor), for "new".
      const { data } = await selectAll(() => db.from('practo_appointments_raw').select('appt_key,appt_date,mr_no')
        .lte('appt_date', range.to).not('mr_no', 'is', null), 'appt_key');
      const first = new Map<string, string>();
      for (const a of data as { appt_date: string; mr_no: string }[]) {
        const cur = first.get(a.mr_no);
        if (!cur || a.appt_date < cur) first.set(a.mr_no, a.appt_date);
      }
      return first;
    }),
    safe(async () => {
      const { data } = await selectAll(() => db.from('practo_bills_raw').select('bill_key,bill_date,data')
        .gte('bill_date', range.from).lte('bill_date', range.to), 'bill_key');
      return data as BillRow[];
    }),
  ]);
  return { google, googleAds, meta, leads, appts, firstVisit, bills };
}

export async function readOrthoDashboard(db: AdminClient, range: Range): Promise<OrthoDashboard> {
  return buildOrthoDashboard(await readOrthoSources(db, range), range);
}
