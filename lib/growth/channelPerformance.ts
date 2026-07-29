import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { parseArabySource } from '@/lib/arabyads/report';
import { CHANNELS, type ChannelDef } from '@/config/growth-channels';
import {
  classifyAppointment,
  isNewFile,
  isTestAppt,
  leadTrackerChannel,
  phone9,
  tagHit,
  type ApptFacts,
  type Lookups,
  type Verdict,
} from '@/lib/growth/attribution';

/**
 * Growth Platform read layer — one funnel per acquisition channel:
 *
 *   visibility → enquiries → booked → showed → treated → revenue (+ economics)
 *
 * Everything funnels through the SAME attribution waterfall (lib/growth/
 * attribution.ts): appointments are classified per patient, and revenue joins
 * back through the patient file (mr_no) so a channel is only ever credited with
 * money a billed patient actually brought in.
 *
 * Honesty rules, because this lands in front of the CEO:
 *  - Evidence-graded: every count splits tagged (hard trace) vs inferred
 *    (logic), and the view shows the split. No pretending inference is fact.
 *  - Coverage-noted: paid spend feeds are range-checked; if Meta spend stopped
 *    syncing in April, the paid-social economics SAY so instead of dividing by
 *    a silently-stale number.
 *  - Untracked lanes (influencers, affiliates) render zeroed with an explicit
 *    "not tracked yet" — the tree stays complete, the gaps stay visible.
 *
 * Attribution EVIDENCE is deliberately unscoped by the date filter (a July
 * patient's widget submission may be from June); only the COUNTED events
 * (enquiries, appointments, bills, spend) obey the window.
 */

export interface ChannelPerf extends ChannelDef {
  /** Reach in-window (ad impressions / GMB profile views) — null where no visibility source exists. */
  impressions: number | null;
  /** One-line breakdown under the reach figure (e.g. GMB calls · directions · clicks). */
  reachNote: string | null;
  enquiries: number;
  /** Appointments booked in-window attributed to this channel. */
  booked: number;
  bookedPatients: number;
  /** Arrived + Completed. */
  showed: number;
  cancelled: number;
  noshow: number;
  /** Distinct billed patients (in-window bills) whose file routes to this channel. */
  treated: number;
  revenue: number;
  /** Booked appts by evidence level — the confidence split. */
  taggedBooked: number;
  inferredBooked: number;
  // Economics (paid channels only; null elsewhere or when spend is unknown).
  spend: number | null;
  /** Latest date the spend feed actually covers, when it falls short of `to`. */
  spendThrough: string | null;
  costPerEnquiry: number | null;
  costPerPatient: number | null; // spend ÷ treated
  roas: number | null;
}

export interface GrowthFunnelTotals {
  enquiries: number;
  booked: number;
  showed: number;
  treated: number;
  revenue: number;
  showRate: number | null; // showed ÷ (showed + noshow + cancelled)
  treatRate: number | null; // treated patients ÷ booked patients
}

export interface GrowthReport {
  source: 'live' | 'empty';
  from: string | null;
  to: string | null;
  channels: ChannelPerf[];
  totals: GrowthFunnelTotals;
  /** Confidence over booked appointments: how much is hard-traced vs logic vs default. */
  confidence: { tagged: number; inferred: number; defaulted: number };
  /** Site-wide visibility context (latest GA4 sync — not range-scoped). */
  ga4: { periodStart: string; periodEnd: string; sessions: number; channels: { channel: string; sessions: number }[] } | null;
  /** Revenue in-window that no channel can claim (billed file never seen in the appointment feed). */
  unattributedRevenue: number;
  unattributedPatients: number;
  notes: string[];
}

const S = (v: unknown): string => String(v ?? '').trim();
const inRange = (day: string | null | undefined, from: string | null, to: string | null) =>
  !!day && (!from || day >= from) && (!to || day <= to);

const emptyTotals: GrowthFunnelTotals = {
  enquiries: 0, booked: 0, showed: 0, treated: 0, revenue: 0, showRate: null, treatRate: null,
};

function emptyReport(from: string | null, to: string | null): GrowthReport {
  return {
    source: 'empty', from, to,
    channels: CHANNELS.map((c) => ({
      ...c, impressions: null, reachNote: null, enquiries: 0, booked: 0, bookedPatients: 0, showed: 0, cancelled: 0,
      noshow: 0, treated: 0, revenue: 0, taggedBooked: 0, inferredBooked: 0, spend: null,
      spendThrough: null, costPerEnquiry: null, costPerPatient: null, roas: null,
    })),
    totals: emptyTotals, confidence: { tagged: 0, inferred: 0, defaulted: 0 },
    ga4: null, unattributedRevenue: 0, unattributedPatients: 0, notes: [],
  };
}

/** Mirror of the widget-source test rule (normalize.ts / arabyads/report.ts). */
function isTestWidgetRow(d: Record<string, unknown>): boolean {
  const name = S(d['Full Name']);
  const email = S(d['Email']);
  const ref = S(d['Booking Reference']).toUpperCase();
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || ref.startsWith('BK');
}

export async function getChannelPerformance(range: { from?: string; to?: string } = {}): Promise<GrowthReport> {
  const from = range.from ?? null;
  const to = range.to ?? null;
  const db = getSupabaseAdmin();
  if (!db) return emptyReport(from, to);

  try {
    const [apptRes, billRes, zavisRes, leadRes, crmRes, existRes, practoPtRes, metaRes, gadsRes, ga4Res, gmbRes] =
      await Promise.all([
        db.from('practo_appointments_raw').select('appt_date, status, mr_no, patient_phone, patient_name, data'),
        db.from('practo_bills_raw').select('bill_date, amount, data'),
        db.from('raw_zavis').select('data'),
        db.from('leads').select('inquiry_date, raw_row'),
        db.from('crm_appointments').select('patient_phone, source, is_test, timeslot'),
        db.from('existing_patients').select('phone9'),
        db.from('practo_patients').select('phone'),
        db.from('meta_insights_raw').select('date, spend, impressions'),
        db.from('google_ads_insights_raw').select('date, spend, impressions'),
        db.from('ga4_summary').select('period_start, period_end, sessions, channels').order('period_end', { ascending: false }).limit(1),
        db.from('social_insights').select('metric, day, value').eq('channel', 'gmb'),
      ]);

    /* ─── Build the waterfall's evidence lookups (all-time, not range-scoped) ── */

    const widgetByPhone = new Map<string, { hasLane: boolean; paidSearch: boolean }>();
    const widgetRows: { p9: string; date: string | null; hasLane: boolean; paidSearch: boolean }[] = [];
    for (const r of (zavisRes.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      if (!('Full Name' in d) || isTestWidgetRow(d)) continue;
      const p9 = phone9(S(d['Phone Number']));
      const src = S(d['Source']);
      const hasLane = Boolean(parseArabySource(src)?.lane);
      // The site writes captured UTMs into Source as "google / <campaignid>
      // (PID:<keyword>)" — verified live with a tagged test booking (ref 128640,
      // 29 Jul). Raw gclid/utm_source forms kept as a fallback in case the
      // format changes. Either marks Paid Search.
      const paidSearch = !hasLane && (/^\s*google\s*\//i.test(src) || /gclid|utm_source\s*[=:]\s*google/i.test(src));
      const date = S(d['Timestamp']).slice(0, 10) || S(d['Date']).slice(0, 10) || null;
      widgetRows.push({ p9, date, hasLane, paidSearch });
      if (!p9) continue;
      const prev = widgetByPhone.get(p9);
      // A campaign tag anywhere on the phone's history wins (paid trace beats none).
      if (!prev || ((hasLane || paidSearch) && !prev.hasLane && !prev.paidSearch)) {
        widgetByPhone.set(p9, { hasLane, paidSearch });
      }
    }

    const leadChannelByPhone = new Map<string, string>();
    const leadTextByPhone = new Map<string, string>();
    const leadRows: { p9: string; date: string | null; channel: string; text: string }[] = [];
    for (const r of (leadRes.data as { inquiry_date: string | null; raw_row: Record<string, unknown> }[] | null) ?? []) {
      const d = r.raw_row ?? {};
      const name = S(d['Patient Name']);
      // Skip header echoes / placeholder rows the sheet sync lets through.
      if (!name && !S(d['Contact Number'])) continue;
      if (/^patient name$/i.test(name)) continue;
      const p9 = phone9(S(d['Contact Number']));
      const text = `${S(d['Notes / Remarks'])} ${S(d['Follow-up Remarks'])} ${S(d['Follow up Remarks'])} ${S(d['Source Type'])} ${S(d['Preferred Channel'])}`.toLowerCase();
      const channel =
        tagHit(text) ?? leadTrackerChannel(S(d['Source Type']), S(d['Inquiry Platform']), S(d['Preferred Channel']));
      leadRows.push({ p9, date: r.inquiry_date, channel, text });
      if (p9) {
        if (!leadChannelByPhone.has(p9)) leadChannelByPhone.set(p9, channel);
        leadTextByPhone.set(p9, `${leadTextByPhone.get(p9) ?? ''} ${text}`.trim());
      }
    }

    const aiAgentPhones = new Set<string>();
    const crmRows: { p9: string; date: string | null; source: string }[] = [];
    for (const r of (crmRes.data as { patient_phone: string | null; source: string | null; is_test: boolean; timeslot: string | null }[] | null) ?? []) {
      if (r.is_test) continue;
      const p9 = phone9(r.patient_phone);
      const source = S(r.source);
      crmRows.push({ p9, date: r.timeslot ? String(r.timeslot).slice(0, 10) : null, source });
      if (p9 && source === 'aiAgent') aiAgentPhones.add(p9);
    }

    const existingPhones = new Set<string>();
    for (const r of (existRes.data as { phone9: string | null }[] | null) ?? []) {
      const p = phone9(r.phone9);
      if (p) existingPhones.add(p);
    }
    for (const r of (practoPtRes.data as { phone: string | null }[] | null) ?? []) {
      const p = phone9(r.phone);
      if (p) existingPhones.add(p);
    }

    /* ─── Prepare appointments + the family-link map ─────────────────────── */

    interface ApptRow { date: string | null; status: string; facts: ApptFacts }
    const appts: ApptRow[] = [];
    const filesByPhone = new Map<string, Set<string>>();
    for (const r of (apptRes.data as { appt_date: string | null; status: string | null; mr_no: string | null; patient_phone: string | null; patient_name: string | null; data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      const freeText = `${S(d['remarks'])} ${S(d['complaint'])}`.toLowerCase();
      const facts: ApptFacts = {
        p9: phone9(r.patient_phone),
        mrNo: S(r.mr_no),
        bookedBy: S(d['booked_by']),
        freeText,
        isTest: isTestAppt(`${freeText} ${S(r.patient_name)}`),
      };
      appts.push({ date: r.appt_date, status: S(r.status).toLowerCase(), facts });
      if (facts.p9 && facts.mrNo && !facts.isTest) {
        (filesByPhone.get(facts.p9) ?? filesByPhone.set(facts.p9, new Set()).get(facts.p9)!).add(facts.mrNo);
      }
    }

    const lookups: Lookups = { widgetByPhone, leadChannelByPhone, aiAgentPhones, existingPhones, filesByPhone, leadTextByPhone };

    /* ─── Classify appointments; derive each patient file's channel ───────── */

    // Sort by date so a patient's FIRST appointment decides their channel:
    // acquisition credit belongs to what brought them in, not to a re-booking.
    const byDate = [...appts].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    const patientChannel = new Map<string, Verdict>(); // mr_no → verdict
    const apptVerdicts = new Map<ApptRow, Verdict>();
    for (const a of byDate) {
      const v = classifyAppointment(a.facts, lookups);
      if (!v) continue;
      apptVerdicts.set(a, v);
      if (a.facts.mrNo && !patientChannel.has(a.facts.mrNo)) patientChannel.set(a.facts.mrNo, v);
    }

    /* ─── Aggregate the in-window funnel per channel ─────────────────────── */

    const perf = new Map<string, ChannelPerf>(
      CHANNELS.map((c) => [c.key, {
        ...c, impressions: null, reachNote: null, enquiries: 0, booked: 0, bookedPatients: 0, showed: 0, cancelled: 0,
        noshow: 0, treated: 0, revenue: 0, taggedBooked: 0, inferredBooked: 0, spend: null,
        spendThrough: null, costPerEnquiry: null, costPerPatient: null, roas: null,
      }]),
    );
    const at = (key: string): ChannelPerf => perf.get(key) ?? perf.get('direct-walkin')!;

    // Enquiries — dedupe by phone across sources (widget > lead > crm-widget);
    // phoneless rows count individually (nothing to dedupe on).
    const enquirySeen = new Set<string>();
    const countEnquiry = (p9: string, channel: string) => {
      if (p9) {
        if (enquirySeen.has(p9)) return;
        enquirySeen.add(p9);
      }
      at(channel).enquiries += 1;
    };
    for (const w of widgetRows) if (inRange(w.date, from, to)) countEnquiry(w.p9, w.hasLane ? 'paid-social' : w.paidSearch ? 'paid-search' : 'website');
    for (const l of leadRows) if (inRange(l.date, from, to)) countEnquiry(l.p9, l.channel);
    for (const c of crmRows) if (c.source === 'aiAgent' && inRange(c.date, from, to)) countEnquiry(c.p9, 'ai-concierge');

    // Appointments booked / showed / cancelled / no-show.
    const bookedPatientsByChannel = new Map<string, Set<string>>();
    let taggedAll = 0, inferredAll = 0, defaultedAll = 0;
    for (const a of appts) {
      if (!inRange(a.date, from, to)) continue;
      const v = apptVerdicts.get(a);
      if (!v) continue;
      const p = at(v.channel);
      p.booked += 1;
      if (v.evidence === 'tagged') {
        p.taggedBooked += 1;
        taggedAll += 1;
      } else {
        p.inferredBooked += 1;
        if (v.ruleId === 'R10') defaultedAll += 1;
        else inferredAll += 1;
      }
      const pid = a.facts.mrNo || (a.facts.p9 ? `p:${a.facts.p9}` : '');
      if (pid) (bookedPatientsByChannel.get(v.channel) ?? bookedPatientsByChannel.set(v.channel, new Set()).get(v.channel)!).add(pid);
      if (a.status === 'arrived' || a.status === 'completed') p.showed += 1;
      else if (a.status === 'noshow') p.noshow += 1;
      else if (a.status.startsWith('cancel')) p.cancelled += 1;
    }
    for (const [k, set] of bookedPatientsByChannel) at(k).bookedPatients = set.size;

    // Revenue — bills in-window join to the patient file's channel. A returning
    // file (non-DN) is retention even when its appointments predate our feed.
    const treatedByChannel = new Map<string, Set<string>>();
    let unattributedRevenue = 0;
    const unattributedFiles = new Set<string>();
    for (const b of (billRes.data as { bill_date: string | null; amount: number | null; data: Record<string, unknown> }[] | null) ?? []) {
      if (!inRange(b.bill_date, from, to)) continue;
      const mr = S(b.data?.['mr_no']);
      const amount = b.amount != null ? Number(b.amount) || 0 : 0;
      const v = mr ? patientChannel.get(mr) : undefined;
      const channel = v?.channel ?? (mr && !isNewFile(mr) ? 'retention' : null);
      if (!channel) {
        unattributedRevenue += amount;
        if (mr) unattributedFiles.add(mr);
        continue;
      }
      const p = at(channel);
      p.revenue += amount;
      if (mr) (treatedByChannel.get(channel) ?? treatedByChannel.set(channel, new Set()).get(channel)!).add(mr);
    }
    for (const [k, set] of treatedByChannel) at(k).treated = set.size;

    /* ─── Paid spend + visibility, with feed-coverage honesty ────────────── */

    const notes: string[] = [];
    const sumSpend = (rows: { date: string | null; spend: number | null; impressions: number | null }[] | null, key: string, label: string) => {
      let spend = 0, impressions = 0, maxDate = '';
      let any = false;
      for (const r of rows ?? []) {
        if (r.date && r.date > maxDate) maxDate = r.date;
        if (!inRange(r.date, from, to)) continue;
        any = true;
        spend += r.spend != null ? Number(r.spend) || 0 : 0;
        impressions += r.impressions != null ? Number(r.impressions) || 0 : 0;
      }
      const p = at(key);
      p.impressions = any ? Math.round(impressions) : null;
      p.spend = any ? Math.round(spend) : null;
      if (maxDate && to && maxDate < to) {
        p.spendThrough = maxDate;
        notes.push(`${label} spend/impressions are synced only through ${maxDate} — economics beyond that date are understated.`);
      }
      if (!any && (from || to)) notes.push(`No ${label} spend rows fall in this window.`);
    };
    sumSpend((gadsRes.data as never[]) ?? null, 'paid-search', 'Google Ads');
    sumSpend((metaRes.data as never[]) ?? null, 'paid-social', 'Meta');

    // Google Business Profile — reach from Google's own counters. These are
    // profile-level tallies with no patient identity, so they inform the REACH
    // column only; the patients they produce surface under Direct / Walk-in
    // until reception tags them (the coverage note says exactly that).
    {
      const gmbRows = (gmbRes.data as { metric: string; day: string | null; value: number | null }[] | null) ?? [];
      const gmb = at('gmb');
      if (gmbRows.length === 0) {
        notes.push(
          'Google Business Profile feed is not connected yet — the sync code exists but GMB_CLIENT_ID / GMB_CLIENT_SECRET / GMB_REFRESH_TOKEN / GMB_LOCATION_IDS are not set in Vercel. Until then its reach column stays empty and its patients appear under Direct / Walk-in.',
        );
      } else {
        const sums = new Map<string, number>();
        for (const r of gmbRows) {
          if (!inRange(r.day, from, to)) continue;
          sums.set(r.metric, (sums.get(r.metric) ?? 0) + (r.value != null ? Number(r.value) || 0 : 0));
        }
        const views = (sums.get('map_views_desktop') ?? 0) + (sums.get('map_views_mobile') ?? 0);
        const calls = sums.get('calls') ?? 0;
        const directions = sums.get('directions') ?? 0;
        const clicks = sums.get('website_clicks') ?? 0;
        gmb.impressions = views > 0 ? Math.round(views) : null;
        if (calls + directions + clicks > 0) {
          gmb.reachNote = `${Math.round(calls)} calls · ${Math.round(directions)} directions · ${Math.round(clicks)} site clicks (Google's counters)`;
          notes.push(
            'GMB calls/directions are Google-side counters without patient identity — those patients sit under Direct / Walk-in until reception tags bookings ("found on google"), so do not add the two rows together.',
          );
        }
      }
    }

    for (const p of perf.values()) {
      if (p.spend != null && p.spend > 0) {
        p.costPerEnquiry = p.enquiries > 0 ? p.spend / p.enquiries : null;
        p.costPerPatient = p.treated > 0 ? p.spend / p.treated : null;
        p.roas = p.revenue > 0 ? p.revenue / p.spend : null;
      }
    }

    /* ─── Totals + confidence ────────────────────────────────────────────── */

    const channels = CHANNELS.map((c) => perf.get(c.key)!);
    const sum = (f: (p: ChannelPerf) => number) => channels.reduce((a, p) => a + f(p), 0);
    const booked = sum((p) => p.booked);
    const showed = sum((p) => p.showed);
    const noshow = sum((p) => p.noshow);
    const cancelled = sum((p) => p.cancelled);
    const bookedPatients = sum((p) => p.bookedPatients);
    const treated = sum((p) => p.treated);
    const totals: GrowthFunnelTotals = {
      enquiries: sum((p) => p.enquiries),
      booked, showed, treated,
      revenue: Math.round(sum((p) => p.revenue)),
      showRate: showed + noshow + cancelled > 0 ? showed / (showed + noshow + cancelled) : null,
      treatRate: bookedPatients > 0 ? Math.min(1, treated / bookedPatients) : null,
    };

    const ga4Row = (ga4Res.data as { period_start: string; period_end: string; sessions: number | null; channels: { channel: string; sessions: number }[] | null }[] | null)?.[0] ?? null;

    if (unattributedRevenue > 0) {
      notes.push('Unattributed revenue = billed patient files that never appear in the synced appointment feed, so no channel can honestly claim them.');
    }

    return {
      source: booked + totals.enquiries > 0 ? 'live' : 'empty',
      from, to, channels, totals,
      confidence: { tagged: taggedAll, inferred: inferredAll, defaulted: defaultedAll },
      ga4: ga4Row
        ? { periodStart: ga4Row.period_start, periodEnd: ga4Row.period_end, sessions: ga4Row.sessions ?? 0, channels: (ga4Row.channels ?? []).map((c) => ({ channel: c.channel, sessions: c.sessions })) }
        : null,
      unattributedRevenue: Math.round(unattributedRevenue),
      unattributedPatients: unattributedFiles.size,
      notes,
    };
  } catch {
    return emptyReport(from, to);
  }
}
