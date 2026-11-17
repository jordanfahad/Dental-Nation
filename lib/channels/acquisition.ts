/**
 * Cost per lead and cost per patient by channel (Ms Shadi, 17 Nov 2026: "the
 * CPL/CAC of our channels in DN, gross and then net").
 *
 * - Gross leads: every lead-tracker row in the dates (repeats included).
 * - Net leads: unique people in the dates, by phone (last 9 digits).
 * - Booked / attended: a net lead whose phone has a Practo appointment from
 *   the enquiry day to 60 days after it (any status but cancelled = booked;
 *   Arrived or Completed = attended). Practo covers Al Wasl and Dr Tosun;
 *   Al Maher's own system is not matched.
 * - Spend: Meta ad spend (Smile Club campaigns left out) and Google Ads
 *   spend, both as stored by the daily sync.
 * - CPL = spend / leads; cost per booking = spend / booked; CAC = spend /
 *   attended. A division by zero or a missing input is null, never 0.
 *
 * Only counts leave this module: phones are used to match, never returned.
 */
import type { AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import { isNonLeadTab } from '@/lib/activation/read';
import { addDaysIso, type Range } from '@/lib/alerts/links';

export type AcqChannel = 'meta' | 'google' | 'other';
export const ACQ_CHANNEL_NAMES: Record<AcqChannel, string> = {
  meta: 'Meta ads (WhatsApp and Facebook)',
  google: 'Google Ads',
  other: 'Other or not recorded',
};
/** Days after the enquiry in which a Practo appointment counts for that lead. */
export const MATCH_DAYS = 60;

export interface LeadInput { inquiry_date: string | null; raw_row: Record<string, unknown> | null }
export interface ApptInput { appt_date: string | null; status: string | null; patient_phone: string | null; data: Record<string, unknown> | null }

export interface AcqRow {
  channel: AcqChannel;
  name: string;
  spend: number | null;
  grossLeads: number;
  netLeads: number;
  booked: number;
  attended: number;
  cplGross: number | null;
  cplNet: number | null;
  costPerBooking: number | null;
  cac: number | null;
}

export interface Acquisition {
  range: Range;
  rows: AcqRow[];
  /** All channels together; spend is the sum of known spend. */
  total: AcqRow;
  /** Net leads with no usable phone (cannot be matched to Practo). */
  noPhone: number;
  /** False when the lead tracker or Practo could not be read. */
  read: boolean;
}

const str = (v: unknown) => String(v ?? '').trim();
/** Last 9 digits, so +971 50…, 00971 50… and 050… agree; null when too short. */
export const phoneKey = (v: unknown): string | null => {
  const d = str(v).replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : null;
};

/** Which paid channel a tracker row came from. */
export function channelOf(raw: Record<string, unknown> | null): AcqChannel {
  const r = raw ?? {};
  const s = [r['Source Type'], r['Campaign / Offer Name'], r['Inquiry Platform']].map((x) => str(x).toLowerCase()).join(' | ');
  if (/google|adwords|search ad|gmb ad/.test(s)) return 'google';
  if (/zavis|whatsapp ad|facebook|instagram|meta|fb /.test(s)) return 'meta';
  return 'other';
}

const BOOKED = /^(booked|confirmed|arrived|completed|noshow|no show|rescheduled)/i;
const ATTENDED = /^(arrived|completed)/i;

const ratio = (spend: number | null, n: number) => (spend == null || n <= 0 ? null : Math.round((spend / n) * 100) / 100);

function row(channel: AcqChannel, spend: number | null, gross: number, net: number, booked: number, attended: number, name = ACQ_CHANNEL_NAMES[channel]): AcqRow {
  return {
    channel, name, spend, grossLeads: gross, netLeads: net, booked, attended,
    cplGross: ratio(spend, gross), cplNet: ratio(spend, net), costPerBooking: ratio(spend, booked), cac: ratio(spend, attended),
  };
}

/** Pure: no IO. */
export function buildAcquisition(
  range: Range, leads: LeadInput[], appts: ApptInput[], spend: { meta: number | null; google: number | null },
): Acquisition {
  // Practo appointments by phone, for matching.
  const byPhone = new Map<string, ApptInput[]>();
  for (const a of appts) {
    const k = phoneKey(a.patient_phone ?? a.data?.patient_contact);
    if (!k || !a.appt_date) continue;
    (byPhone.get(k) ?? byPhone.set(k, []).get(k)!).push(a);
  }
  const gross: Record<AcqChannel, number> = { meta: 0, google: 0, other: 0 };
  const seen = new Map<string, { channel: AcqChannel; day: string }>();
  let noPhone = 0;
  for (const l of leads) {
    if (!l.inquiry_date || l.inquiry_date < range.from || l.inquiry_date > range.to) continue;
    if (isNonLeadTab(l.raw_row?._source_tab, l.raw_row?.['Lead ID'])) continue;
    const ch = channelOf(l.raw_row);
    gross[ch] += 1;
    const k = phoneKey(l.raw_row?.['Contact Number']);
    if (!k) { noPhone += 1; continue; }
    const prev = seen.get(k);
    // A person counts once, on their first enquiry in the dates.
    if (!prev || l.inquiry_date < prev.day) seen.set(k, { channel: ch, day: l.inquiry_date });
  }
  const net: Record<AcqChannel, number> = { meta: 0, google: 0, other: 0 };
  const booked: Record<AcqChannel, number> = { meta: 0, google: 0, other: 0 };
  const attended: Record<AcqChannel, number> = { meta: 0, google: 0, other: 0 };
  for (const [k, { channel, day }] of seen) {
    net[channel] += 1;
    const last = addDaysIso(day, MATCH_DAYS);
    const mine = (byPhone.get(k) ?? []).filter((a) => a.appt_date! >= day && a.appt_date! <= last);
    if (mine.some((a) => BOOKED.test(str(a.status)))) booked[channel] += 1;
    if (mine.some((a) => ATTENDED.test(str(a.status)))) attended[channel] += 1;
  }
  const spendOf: Record<AcqChannel, number | null> = { meta: spend.meta, google: spend.google, other: null };
  const rows = (['meta', 'google', 'other'] as AcqChannel[]).map((c) => row(c, spendOf[c], gross[c], net[c], booked[c], attended[c]));
  const sum = (f: (r: AcqRow) => number) => rows.reduce((n, r) => n + f(r), 0);
  const knownSpend = [spend.meta, spend.google].filter((x): x is number => x != null);
  const total = row('other', knownSpend.length ? knownSpend.reduce((a, b) => a + b, 0) : null,
    sum((r) => r.grossLeads), sum((r) => r.netLeads), sum((r) => r.booked), sum((r) => r.attended), 'All channels');
  return { range, rows, total, noPhone, read: true };
}

interface SpendRow { spend: number | string | null; campaign_name?: string | null }
const sumSpend = (rows: SpendRow[] | null, skip?: RegExp) =>
  rows == null ? null : rows.filter((r) => !skip || !skip.test(str(r.campaign_name))).reduce((n, r) => n + (Number(r.spend) || 0), 0);

export async function readAcquisition(db: AdminClient | null, range: Range): Promise<Acquisition> {
  const empty: Acquisition = { range, rows: [], total: row('other', null, 0, 0, 0, 0, 'All channels'), noPhone: 0, read: false };
  if (!db) return empty;
  try {
    const last = addDaysIso(range.to, MATCH_DAYS);
    const [leads, appts, meta, google] = await Promise.all([
      selectAll<LeadInput & { id: string }>(() => db.from('leads').select('id,inquiry_date,raw_row').gte('inquiry_date', range.from).lte('inquiry_date', range.to) as never, 'id'),
      selectAll<ApptInput & { appt_key: string }>(() => db.from('practo_appointments_raw').select('appt_key,appt_date,status,patient_phone,data').gte('appt_date', range.from).lte('appt_date', last) as never, 'appt_key'),
      selectAll<SpendRow & { key: string }>(() => db.from('meta_ad_insights_raw').select('key,spend,campaign_name').gte('date', range.from).lte('date', range.to) as never, 'key').catch(() => null),
      selectAll<SpendRow & { key: string }>(() => db.from('google_ads_insights_raw').select('key,spend').gte('date', range.from).lte('date', range.to) as never, 'key').catch(() => null),
    ]);
    return buildAcquisition(range, leads.data, appts.data, {
      meta: sumSpend(meta?.data ?? null, /smile/i),
      google: sumSpend(google?.data ?? null),
    });
  } catch {
    return empty;
  }
}
