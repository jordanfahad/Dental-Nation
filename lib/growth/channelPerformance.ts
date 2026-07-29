import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { parseArabySource } from '@/lib/arabyads/report';
import { clinicOfCenter, clinicOfDoctor } from '@/config/clinics';
import { META_ADS_PAUSED_SINCE } from '@/config/meta';
import {
  CHANNELS,
  PHONE_PATH_BENCHMARKS,
  aiEngineOf,
  metaCampaignTypeOf,
  metaPlatformHintOf,
  searchEngineOf,
  type ChannelDef,
} from '@/config/growth-channels';
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
  /**
   * Benchmark-estimated bookings folded into this channel's row (currently only
   * paid-search phone-path). Kept SEPARATE from `booked`/`bookedPatients` so
   * measured stays measured; the row renders it with an explicit 'est.' mark.
   */
  estExtraBookings?: number;
  /**
   * The estimated bookings carried through the funnel at the untraced pool's
   * MEASURED Practo rates (its real show/treat/revenue-per-patient) — the
   * orphan patients are real; only their channel is estimated.
   */
  estEnquiries?: number;
  estShowed?: number;
  estTreated?: number;
  estRevenue?: number;
  /** Spend ÷ (measured patients + estimated bookings) — the realistic CPA. */
  estCostPerPatient?: number | null;
  /** (measured revenue + estimated revenue) ÷ spend. */
  estRoas?: number | null;
  // Per-unit costs INCLUDING the estimated phone path (≈ figures in the UI).
  estCostPerEnquiry?: number | null; // spend ÷ (enquiries + est enquiries)
  estCostPerBooked?: number | null; // spend ÷ (booked + est bookings)
  estCostPerShowed?: number | null; // spend ÷ (showed + est showed)
  estCostPerTreated?: number | null; // spend ÷ (treated + est treated)
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
  costPerEnquiry: number | null; // spend ÷ net enquiries (CPL)
  costPerBooked: number | null; // spend ÷ net bookings
  costPerShowed: number | null; // spend ÷ net shows
  costPerPatient: number | null; // spend ÷ treated patients
  roas: number | null; // revenue ÷ spend
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
  ga4: { periodStart: string; periodEnd: string; sessions: number; users: number; channels: { channel: string; sessions: number }[] } | null;
  /** Revenue in-window that no channel can claim (billed file never seen in the appointment feed). */
  unattributedRevenue: number;
  unattributedPatients: number;
  /**
   * Google Ads phone path — MEASURED taps by click type, plus benchmark
   * ESTIMATES (labelled as such in the UI; the UAE has no Google forwarding
   * numbers, so taps are the only phone signal the API can ever report).
   */
  phonePath: {
    callTaps: number;
    directionTaps: number;
    otherClicks: number;
    /** Estimate chain, each step netting out a benchmark loss. */
    estValidTaps: number;
    estAnswered: number;
    estPatientCalls: number;
    estBookings: number;
    /**
     * The reconciliation the estimate must live inside: patients in-window with
     * NO channel trace (Direct/Walk-in + unattributed). Estimated ad-call
     * patients may only claim from this pool — never someone already traced —
     * so `estBookingsReconciled = min(estBookings, untracedPool)`.
     */
    untracedPool: number;
    estBookingsReconciled: number;
    byCampaign: { campaign: string; callTaps: number }[];
  } | null;
  /**
   * The Organic split (latest GA4 sync, source-level): how many sessions each
   * search engine, AI assistant and Direct brought. Reach-level ONLY — the
   * booking widget doesn't capture the referrer, so bookings can't yet be
   * split SEO-vs-AI (the UI says so). Null until the first post-0018 sync.
   */
  organicSplit: {
    periodStart: string;
    periodEnd: string;
    seo: { engine: string; sessions: number }[];
    ai: { key: string; label: string; sessions: number }[];
    seoSessions: number;
    aiSessions: number;
    directSessions: number;
  } | null;
  /**
   * Paid Social (Meta) in-window split by campaign TYPE (derived from campaign
   * names) and by delivery PLATFORM (publisher_platform breakdown — empty until
   * the Meta token is refreshed and the new sync pass runs). Spend/leads are
   * Meta-reported; they contextualize the funnel row, they don't replace it.
   */
  metaSplit: {
    types: { key: string; label: string; platformHint: string | null; spend: number; impressions: number; clicks: number; leads: number; cpl: number | null }[];
    platforms: { platform: string; spend: number; impressions: number; leads: number }[];
  } | null;
  /** Raw in-window lead-tracker rows BEFORE cross-source dedup — the Executive
   *  "Leads generated" basis, exposed so the reconciliation card can show all
   *  three enquiry lenses side by side with live numbers. */
  trackerLeadRows: number;
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
      spendThrough: null, costPerEnquiry: null, costPerBooked: null, costPerShowed: null, costPerPatient: null, roas: null,
    })),
    totals: emptyTotals, confidence: { tagged: 0, inferred: 0, defaulted: 0 },
    ga4: null, unattributedRevenue: 0, unattributedPatients: 0, phonePath: null,
    organicSplit: null, metaSplit: null, trackerLeadRows: 0, notes: [],
  };
}

/** Mirror of the widget-source test rule (normalize.ts / arabyads/report.ts). */
function isTestWidgetRow(d: Record<string, unknown>): boolean {
  const name = S(d['Full Name']);
  const email = S(d['Email']);
  const ref = S(d['Booking Reference']).toUpperCase();
  return /zavis|test/i.test(email) || /test|sagar/i.test(name) || ref.startsWith('BK');
}

/** Clinics the channel report can scope to (AMC has no feed — handled in UI). */
export type GrowthPerfClinic = 'all' | 'dn-alwasl' | 'dr-tosun';

export async function getChannelPerformance(
  range: { from?: string; to?: string } = {},
  clinic: GrowthPerfClinic = 'all',
): Promise<GrowthReport> {
  const from = range.from ?? null;
  const to = range.to ?? null;
  const db = getSupabaseAdmin();
  if (!db) return emptyReport(from, to);
  // Spend, reach, GA4 and the phone path are Dental Nation Al Wasl properties
  // (the ads, the site, the GMB profile). They render on All and DN views;
  // never on Dr Tosun's.
  const dnAssets = clinic !== 'dr-tosun';
  const apptInClinic = (doctor: string): boolean =>
    clinic === 'all' || (clinicOfDoctor(doctor) === 'dr-tosun' ? clinic === 'dr-tosun' : clinic === 'dn-alwasl');

  try {
    const [apptRes, billRes, zavisRes, leadRes, crmRes, existRes, practoPtRes, metaRes, gadsRes, ga4Res, gmbRes, ctRes, metaPlatRes] =
      await Promise.all([
        db.from('practo_appointments_raw').select('appt_date, status, mr_no, patient_phone, patient_name, doctor, data'),
        db.from('practo_bills_raw').select('bill_date, amount, data'),
        db.from('raw_zavis').select('data'),
        db.from('leads').select('inquiry_date, raw_row'),
        db.from('crm_appointments').select('patient_phone, source, is_test, timeslot'),
        db.from('existing_patients').select('phone9'),
        db.from('practo_patients').select('phone'),
        db.from('meta_insights_raw').select('date, spend, impressions, clicks, leads, campaign_name'),
        db.from('google_ads_insights_raw').select('date, spend, impressions'),
        db.from('ga4_summary').select('period_start, period_end, sessions, users, channels, sources').order('period_end', { ascending: false }).limit(1),
        db.from('social_insights').select('channel, metric, day, value').in('channel', ['gmb', 'instagram', 'facebook']),
        db.from('google_ads_click_types').select('date, click_type, clicks, campaign_name'),
        db.from('meta_platform_insights_raw').select('date, platform, spend, impressions, leads'),
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

    interface ApptRow { date: string | null; status: string; doctor: string; facts: ApptFacts }
    const appts: ApptRow[] = [];
    const filesByPhone = new Map<string, Set<string>>();
    for (const r of (apptRes.data as { appt_date: string | null; status: string | null; mr_no: string | null; patient_phone: string | null; patient_name: string | null; doctor: string | null; data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      const freeText = `${S(d['remarks'])} ${S(d['complaint'])}`.toLowerCase();
      const facts: ApptFacts = {
        p9: phone9(r.patient_phone),
        mrNo: S(r.mr_no),
        bookedBy: S(d['booked_by']),
        freeText,
        isTest: isTestAppt(`${freeText} ${S(r.patient_name)}`),
      };
      appts.push({ date: r.appt_date, status: S(r.status).toLowerCase(), doctor: S(r.doctor), facts });
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
        spendThrough: null, costPerEnquiry: null, costPerBooked: null, costPerShowed: null, costPerPatient: null, roas: null,
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
    // Enquiries are shared acquisition surfaces (the website, the desk, the
    // WhatsApp line — all Dental Nation Al Wasl's). They can't be split per
    // clinic, so they render on All and DN views and stay empty on Dr Tosun's.
    let trackerLeadRows = 0;
    if (dnAssets) {
      // A lane tag = ArabyAds = the Affiliates channel (commission partner, not our Meta spend).
      for (const w of widgetRows) if (inRange(w.date, from, to)) countEnquiry(w.p9, w.hasLane ? 'affiliate' : w.paidSearch ? 'paid-search' : 'website');
      for (const l of leadRows) if (inRange(l.date, from, to)) { trackerLeadRows += 1; countEnquiry(l.p9, l.channel); }
      for (const c of crmRows) if (c.source === 'aiAgent' && inRange(c.date, from, to)) countEnquiry(c.p9, 'ai-concierge');
    }

    // Appointments booked / showed / cancelled / no-show.
    //
    // Alongside the view's counters we track the untraced pool DN-SCOPED and
    // independently of the clinic filter: the phone-path estimate may only
    // ever claim Dental Nation Al Wasl patients (the ads ran only there). If
    // the pool followed the view instead, narrowing to DN would change its
    // per-patient economics and the DN Paid ≈ figures could exceed the
    // All-clinics ones — an incoherence, since DN is a subset of All.
    const isDnAppt = (doctor: string) => clinicOfDoctor(doctor) !== 'dr-tosun';
    const dnDwBooked = new Set<string>();
    let dnDwShowed = 0;
    const bookedPatientsByChannel = new Map<string, Set<string>>();
    let taggedAll = 0, inferredAll = 0, defaultedAll = 0;
    for (const a of appts) {
      if (!inRange(a.date, from, to)) continue;
      const v = apptVerdicts.get(a);
      if (!v) continue;
      const pid = a.facts.mrNo || (a.facts.p9 ? `p:${a.facts.p9}` : '');
      if (v.channel === 'direct-walkin' && isDnAppt(a.doctor)) {
        if (pid) dnDwBooked.add(pid);
        if (a.status === 'arrived' || a.status === 'completed') dnDwShowed += 1;
      }
      if (!apptInClinic(a.doctor)) continue;
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
    // DN-scoped pool economics (see the appointment loop note): the estimate's
    // revenue-per-pool-patient must come from DN bills only, on every view.
    let dnUnattrRevenue = 0;
    const dnUnattrFiles = new Set<string>();
    let dnDwRevenue = 0;
    const dnDwTreated = new Set<string>();
    for (const b of (billRes.data as { bill_date: string | null; amount: number | null; data: Record<string, unknown> }[] | null) ?? []) {
      if (!inRange(b.bill_date, from, to)) continue;
      const isDnBill = clinicOfCenter(S(b.data?.['center_name'])) !== 'dr-tosun';
      const mr = S(b.data?.['mr_no']);
      const amount = b.amount != null ? Number(b.amount) || 0 : 0;
      const v = mr ? patientChannel.get(mr) : undefined;
      const channel = v?.channel ?? (mr && !isNewFile(mr) ? 'retention' : null);
      if (isDnBill) {
        if (!channel) {
          dnUnattrRevenue += amount;
          if (mr) dnUnattrFiles.add(mr);
        } else if (channel === 'direct-walkin') {
          dnDwRevenue += amount;
          if (mr) dnDwTreated.add(mr);
        }
      }
      if (clinic !== 'all' && isDnBill !== (clinic === 'dn-alwasl')) continue;
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
    if (dnAssets) {
      sumSpend((gadsRes.data as never[]) ?? null, 'paid-search', 'Google Ads');
      sumSpend((metaRes.data as never[]) ?? null, 'paid-social', 'Meta');
      // Meta campaigns are paused (business decision) — the feed ending in
      // April is complete, so replace the generic "understated" warning with
      // the true story.
      if (META_ADS_PAUSED_SINCE) {
        const ix = notes.findIndex((n) => n.startsWith('Meta spend/impressions are synced only through'));
        if (ix >= 0) notes[ix] = `Meta campaigns have been paused since ${META_ADS_PAUSED_SINCE} — the Meta spend shown is complete (not a stale feed). Lead-form enquiries after that date are organic residue, not paid delivery.`;
      }
    } else {
      notes.push(
        'Paid ads ran only for Dental Nation Al Wasl — spend, ad reach, GA4 visibility and the phone-path estimates are not attributed to this clinic. Enquiry surfaces (website, desk, WhatsApp) are shared and can’t be clinic-split, so this view shows the Practo funnel only.',
      );
    }

    // Google Business Profile — reach from Google's own counters. These are
    // profile-level tallies with no patient identity, so they inform the REACH
    // column only; the patients they produce surface under Direct / Walk-in
    // until reception tags them (the coverage note says exactly that).
    if (dnAssets) {
      const allSocial = (gmbRes.data as { channel: string; metric: string; day: string | null; value: number | null }[] | null) ?? [];
      const gmbRows = allSocial.filter((r) => r.channel === 'gmb');

      // Social Organic reach — Instagram/Facebook daily reach from the social
      // sync, plus profile views and the latest follower count as context.
      {
        const soc = allSocial.filter((r) => r.channel === 'instagram' || r.channel === 'facebook');
        let reach = 0, profileViews = 0, latestFollowers = 0, latestDay = '';
        for (const r of soc) {
          const n = r.value != null ? Number(r.value) || 0 : 0;
          if (r.metric === 'reach' && inRange(r.day, from, to)) reach += n;
          if (r.metric === 'profile_views' && inRange(r.day, from, to)) profileViews += n;
          if (r.metric === 'followers' && r.day && r.day > latestDay) { latestDay = r.day; latestFollowers = n; }
        }
        const so = at('social-organic');
        if (reach > 0) so.impressions = Math.round(reach);
        const bits = [
          profileViews > 0 ? `${Math.round(profileViews)} profile views` : '',
          latestFollowers > 0 ? `${Math.round(latestFollowers).toLocaleString('en-US')} followers` : '',
        ].filter(Boolean);
        if (bits.length) so.reachNote = bits.join(' · ');
        if (reach === 0 && soc.length === 0) {
          notes.push('Social Organic reach is empty because the Instagram/Facebook insights sync has no rows yet — not because reach is zero.');
        }
      }

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
        p.costPerBooked = p.booked > 0 ? p.spend / p.booked : null;
        p.costPerShowed = p.showed > 0 ? p.spend / p.showed : null;
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

    const ga4Row = (ga4Res.data as { period_start: string; period_end: string; sessions: number | null; users: number | null; channels: { channel: string; sessions: number }[] | null; sources: { source: string; medium: string; sessions: number }[] | null }[] | null)?.[0] ?? null;

    // The Organic split — GA4 source-level (latest sync): search engines vs AI
    // assistants vs Direct. Reach only: the widget doesn't capture the
    // referrer, so a booking can't yet be split SEO-vs-AI (the UI says so).
    let organicSplit: GrowthReport['organicSplit'] = null;
    const ga4Sources = (dnAssets ? ga4Row?.sources : null) ?? [];
    if (ga4Row && ga4Sources.length > 0) {
      const seoByEngine = new Map<string, number>();
      const aiByEngine = new Map<string, { label: string; sessions: number }>();
      let seoSessions = 0, aiSessions = 0, directSessions = 0;
      for (const s of ga4Sources) {
        const n = Number(s.sessions) || 0;
        if (n <= 0) continue;
        const medium = String(s.medium ?? '').toLowerCase();
        const source = String(s.source ?? '');
        const ai = aiEngineOf(source);
        if (ai) {
          aiSessions += n;
          const prev = aiByEngine.get(ai.key);
          aiByEngine.set(ai.key, { label: ai.label, sessions: (prev?.sessions ?? 0) + n });
        } else if (medium === 'organic') {
          seoSessions += n;
          const eng = searchEngineOf(source);
          seoByEngine.set(eng, (seoByEngine.get(eng) ?? 0) + n);
        } else if (source === '(direct)' || medium === '(none)' || medium === 'none') {
          directSessions += n;
        }
      }
      organicSplit = {
        periodStart: ga4Row.period_start,
        periodEnd: ga4Row.period_end,
        seo: [...seoByEngine.entries()].map(([engine, sessions]) => ({ engine, sessions })).sort((a, b) => b.sessions - a.sessions),
        ai: [...aiByEngine.entries()].map(([key, v]) => ({ key, label: v.label, sessions: v.sessions })).sort((a, b) => b.sessions - a.sessions),
        seoSessions, aiSessions, directSessions,
      };
      const web = at('website');
      if (web.impressions == null && seoSessions > 0) {
        web.impressions = seoSessions;
        web.reachNote = `GA4 organic-search sessions ${ga4Row.period_start}–${ga4Row.period_end}: ${organicSplit.seo
          .slice(0, 3).map((e) => `${e.engine} ${e.sessions}`).join(' · ')}`;
      }
      const aiRow = at('ai-chat');
      if (aiSessions > 0) {
        aiRow.impressions = aiSessions;
        aiRow.reachNote = `AI-assistant referral sessions (GA4, ${ga4Row.period_start}–${ga4Row.period_end})`;
      }
      const dw = at('direct-walkin');
      if (dw.impressions == null && directSessions > 0) {
        dw.impressions = directSessions;
        dw.reachNote = `GA4 direct sessions ${ga4Row.period_start}–${ga4Row.period_end} (typed the URL / untagged links)`;
      }
    } else if (dnAssets && ga4Row?.channels?.length) {
      // Pre-0018 fallback: the sync hasn't stored source-level data yet — keep
      // the old organic-ish reach and say the split is pending, not broken.
      const web = at('website');
      const organicish = (ga4Row.channels ?? []).filter((c) => /organic search|direct|referral/i.test(c.channel));
      const sess = organicish.reduce((a, c) => a + (Number(c.sessions) || 0), 0);
      if (web.impressions == null && sess > 0) {
        web.impressions = sess;
        web.reachNote = `GA4 sessions ${ga4Row.period_start}–${ga4Row.period_end}: ${organicish
          .map((c) => `${c.channel} ${Number(c.sessions) || 0}`)
          .join(' · ')}`;
      }
      notes.push('The Organic SEO / AI-chat / Direct source split appears after the next GA4 sync (source-level capture was just added).');
    }

    // Paid Social (Meta) split — campaign types from campaign names (works on
    // the stored rows today) + delivery platforms from the publisher_platform
    // breakdown (fills once the Meta token is refreshed and the sync runs).
    let metaSplit: GrowthReport['metaSplit'] = null;
    {
      const metaRows = (metaRes.data as { date: string | null; spend: number | null; impressions: number | null; clicks: number | null; leads: number | null; campaign_name: string | null }[] | null) ?? [];
      const inWin = dnAssets ? metaRows.filter((r) => inRange(r.date, from, to)) : [];
      if (inWin.length > 0) {
        const byType = new Map<string, { label: string; hints: Set<string>; spend: number; impressions: number; clicks: number; leads: number }>();
        for (const r of inWin) {
          const name = r.campaign_name ?? '';
          const t = metaCampaignTypeOf(name);
          const hint = metaPlatformHintOf(name);
          const agg = byType.get(t.key) ?? { label: t.label, hints: new Set<string>(), spend: 0, impressions: 0, clicks: 0, leads: 0 };
          if (hint) agg.hints.add(hint);
          agg.spend += r.spend != null ? Number(r.spend) || 0 : 0;
          agg.impressions += r.impressions != null ? Number(r.impressions) || 0 : 0;
          agg.clicks += r.clicks != null ? Number(r.clicks) || 0 : 0;
          agg.leads += r.leads != null ? Number(r.leads) || 0 : 0;
          byType.set(t.key, agg);
        }
        const types = [...byType.entries()]
          .map(([key, v]) => ({
            key,
            label: v.label,
            platformHint: v.hints.size === 1 ? [...v.hints][0] : null,
            spend: Math.round(v.spend),
            impressions: Math.round(v.impressions),
            clicks: Math.round(v.clicks),
            leads: Math.round(v.leads),
            cpl: v.leads > 0 ? v.spend / v.leads : null,
          }))
          .sort((a, b) => b.spend - a.spend);

        const platRows = (metaPlatRes.data as { date: string | null; platform: string | null; spend: number | null; impressions: number | null; leads: number | null }[] | null) ?? [];
        const byPlat = new Map<string, { spend: number; impressions: number; leads: number }>();
        for (const r of platRows) {
          if (!inRange(r.date, from, to)) continue;
          const p = String(r.platform ?? 'unknown');
          const agg = byPlat.get(p) ?? { spend: 0, impressions: 0, leads: 0 };
          agg.spend += r.spend != null ? Number(r.spend) || 0 : 0;
          agg.impressions += r.impressions != null ? Number(r.impressions) || 0 : 0;
          agg.leads += r.leads != null ? Number(r.leads) || 0 : 0;
          byPlat.set(p, agg);
        }
        const platforms = [...byPlat.entries()]
          .map(([platform, v]) => ({ platform, spend: Math.round(v.spend), impressions: Math.round(v.impressions), leads: Math.round(v.leads) }))
          .sort((a, b) => b.spend - a.spend);

        metaSplit = { types, platforms };
      }
    }

    // Google Ads phone path — measured taps by click type; estimates are
    // benchmark-derived and labelled so downstream. CALL_TRACKING/CALLS =
    // call-button taps; GET_DIRECTIONS = direction taps (enum names verbatim
    // from the API, matched loosely so enum renames degrade to 'other').
    let phonePath: GrowthReport['phonePath'] = null;
    {
      const ctRows = (ctRes.data as { date: string | null; click_type: string | null; clicks: number | null; campaign_name: string | null }[] | null) ?? [];
      const inWin = dnAssets ? ctRows.filter((r) => inRange(r.date, from, to)) : [];
      if (inWin.length > 0) {
        let callTaps = 0, directionTaps = 0, otherClicks = 0;
        const perCampaign = new Map<string, number>();
        for (const r of inWin) {
          const n = r.clicks != null ? Number(r.clicks) || 0 : 0;
          const t = String(r.click_type ?? '');
          if (/CALL/i.test(t)) {
            callTaps += n;
            const c = r.campaign_name ?? '(unknown campaign)';
            perCampaign.set(c, (perCampaign.get(c) ?? 0) + n);
          } else if (/DIRECTION/i.test(t)) directionTaps += n;
          else otherClicks += n;
        }
        const B = PHONE_PATH_BENCHMARKS;
        const estValidTaps = callTaps * B.validTapRate;
        const estAnswered = estValidTaps * B.answerRate;
        const estPatientCalls = estAnswered * B.patientRate;
        const estBookings = Math.round(estPatientCalls * B.bookingRate);
        // The pool the estimate is allowed to claim from: in-window DENTAL
        // NATION AL WASL patients with no channel trace (the ads ran only
        // there — a Dr Tosun walk-in can never be an ad caller). DN-scoped on
        // EVERY view so All-clinics and DN-only report the same estimate.
        // Anything above it would double-count patients already credited
        // elsewhere — the exact inflation this view exists to avoid.
        const untracedPool = dnDwBooked.size + dnUnattrFiles.size;
        phonePath = {
          callTaps, directionTaps, otherClicks,
          estValidTaps: Math.round(estValidTaps),
          estAnswered: Math.round(estAnswered),
          estPatientCalls: Math.round(estPatientCalls),
          estBookings,
          untracedPool,
          estBookingsReconciled: Math.min(estBookings, untracedPool),
          byCampaign: [...perCampaign.entries()].map(([campaign, taps]) => ({ campaign, callTaps: taps }))
            .sort((a, b) => b.callTaps - a.callTaps).slice(0, 6),
        };
        // Fold the reconciled estimate into the paid-search P&L row (marked
        // est. there) so its economics reflect the phone path instead of the
        // absurd spend ÷ tagged-only figure of the first tagged day.
        const ps = at('paid-search');
        const est = phonePath.estBookingsReconciled;
        ps.estExtraBookings = est;
        // Estimated enquiries = patient-intent calls (the enquiry-equivalent of
        // a widget submission). Not pool-capped: an enquiry needn't book.
        ps.estEnquiries = phonePath.estPatientCalls;
        // Carry the estimate DOWN the funnel at the pool's own measured rates.
        // The orphan patients are real people with real Practo outcomes; the
        // estimate only decides how many of them Google Ads may claim. Pool =
        // DN Direct/Walk-in (has appointment rows) + DN unattributed billed
        // files (no appointment rows — but a bill means they showed and were
        // treated). Same DN scope as untracedPool above.
        const poolPatients = untracedPool;
        if (est > 0 && poolPatients > 0) {
          const poolShowed = dnDwShowed + dnUnattrFiles.size;
          const poolTreated = dnDwTreated.size + dnUnattrFiles.size;
          const poolRevenue = dnDwRevenue + dnUnattrRevenue;
          ps.estShowed = Math.round((est * poolShowed) / poolPatients);
          ps.estTreated = Math.round((est * poolTreated) / poolPatients);
          ps.estRevenue = Math.round((est * poolRevenue) / poolPatients);
        }
        const denom = ps.bookedPatients + est;
        ps.estCostPerPatient = ps.spend != null && ps.spend > 0 && denom > 0 ? ps.spend / denom : null;
        const totalRev = ps.revenue + (ps.estRevenue ?? 0);
        ps.estRoas = ps.spend != null && ps.spend > 0 && totalRev > 0 ? totalRev / ps.spend : null;
        // Per-unit costs across the combined (measured + estimated) funnel —
        // the CEO's cost-per-net-enquiry / booking / show / treatment set.
        const per = (n: number) => (ps.spend != null && ps.spend > 0 && n > 0 ? ps.spend / n : null);
        ps.estCostPerEnquiry = per(ps.enquiries + (ps.estEnquiries ?? 0));
        ps.estCostPerBooked = per(ps.booked + est);
        ps.estCostPerShowed = per(ps.showed + (ps.estShowed ?? 0));
        ps.estCostPerTreated = per(ps.treated + (ps.estTreated ?? 0));
      }
    }

    if (unattributedRevenue > 0) {
      notes.push('Unattributed revenue = billed patient files that never appear in the synced appointment feed, so no channel can honestly claim them.');
    }
    {
      const aff = at('affiliate');
      if (aff.booked + aff.enquiries > 0) {
        notes.push('Affiliates (ArabyAds) is commission-based — there is no spend feed, so the row shows the funnel without cost economics. Campaign quality lives in the ArabyAds panel on the Marketing tab.');
      }
    }

    return {
      source: booked + totals.enquiries > 0 ? 'live' : 'empty',
      from, to, channels, totals,
      confidence: { tagged: taggedAll, inferred: inferredAll, defaulted: defaultedAll },
      ga4: dnAssets && ga4Row
        ? { periodStart: ga4Row.period_start, periodEnd: ga4Row.period_end, sessions: ga4Row.sessions ?? 0, users: ga4Row.users ?? 0, channels: (ga4Row.channels ?? []).map((c) => ({ channel: c.channel, sessions: c.sessions })) }
        : null,
      unattributedRevenue: Math.round(unattributedRevenue),
      unattributedPatients: unattributedFiles.size,
      phonePath,
      organicSplit,
      metaSplit,
      trackerLeadRows,
      notes,
    };
  } catch {
    return emptyReport(from, to);
  }
}
