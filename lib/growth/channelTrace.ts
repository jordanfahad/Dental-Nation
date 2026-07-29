import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { parseArabySource } from '@/lib/arabyads/report';
import { clinicOfDoctor } from '@/config/clinics';
import {
  classifyAppointment,
  isTestAppt,
  leadTrackerChannel,
  phone9,
  tagHit,
  WATERFALL_RULES,
  type ApptFacts,
  type Lookups,
} from '@/lib/growth/attribution';

/**
 * Per-channel patient trace — the drill-down behind every Growth Platform
 * number. For a channel + window it returns the actual booked patients with
 * the rule and evidence that attributed each one, so a number on the P&L row
 * is never a dead end.
 *
 * The lookup construction MUST mirror lib/growth/channelPerformance.ts — the
 * two views walk the same waterfall over the same evidence, or a row's count
 * and its trace would disagree. Change both together.
 */

export interface TracedPatient {
  date: string | null;
  patientName: string;
  phone: string;
  mrNo: string;
  status: string;
  doctor: string;
  ruleId: string;
  ruleText: string;
  evidence: 'tagged' | 'inferred';
}

export interface ChannelTraceResult {
  channelKey: string;
  total: number;
  truncated: boolean;
  patients: TracedPatient[];
}

const S = (v: unknown): string => String(v ?? '').trim();
const inRange = (day: string | null | undefined, from: string | null, to: string | null) =>
  !!day && (!from || day >= from) && (!to || day <= to);

export async function getChannelTrace(
  channelKey: string,
  range: { from?: string; to?: string } = {},
  clinic: 'all' | 'dn-alwasl' | 'dr-tosun' = 'all',
): Promise<ChannelTraceResult> {
  const empty: ChannelTraceResult = { channelKey, total: 0, truncated: false, patients: [] };
  const db = getSupabaseAdmin();
  if (!db) return empty;
  const from = range.from ?? null;
  const to = range.to ?? null;

  try {
    const [apptRes, zavisRes, leadRes, crmRes, existRes, practoPtRes] = await Promise.all([
      db.from('practo_appointments_raw').select('appt_date, status, mr_no, doctor, patient_name, patient_phone, data'),
      db.from('raw_zavis').select('data'),
      db.from('leads').select('inquiry_date, raw_row'),
      db.from('crm_appointments').select('patient_phone, source, is_test'),
      db.from('existing_patients').select('phone9'),
      db.from('practo_patients').select('phone'),
    ]);

    /* ── Lookups (mirror of channelPerformance.ts) ── */

    const widgetByPhone = new Map<string, { hasLane: boolean; paidSearch: boolean }>();
    for (const r of (zavisRes.data as { data: Record<string, unknown> }[] | null) ?? []) {
      const d = r.data ?? {};
      if (!('Full Name' in d)) continue;
      const name = S(d['Full Name']);
      const email = S(d['Email']);
      const ref = S(d['Booking Reference']).toUpperCase();
      if (/zavis|test/i.test(email) || /test|sagar/i.test(name) || ref.startsWith('BK')) continue;
      const p9 = phone9(S(d['Phone Number']));
      if (!p9) continue;
      const src = S(d['Source']);
      const hasLane = Boolean(parseArabySource(src)?.lane);
      const paidSearch = !hasLane && (/^\s*google\s*\//i.test(src) || /gclid|utm_source\s*[=:]\s*google/i.test(src));
      const prev = widgetByPhone.get(p9);
      if (!prev || ((hasLane || paidSearch) && !prev.hasLane && !prev.paidSearch)) {
        widgetByPhone.set(p9, { hasLane, paidSearch });
      }
    }

    const leadChannelByPhone = new Map<string, string>();
    const leadTextByPhone = new Map<string, string>();
    for (const r of (leadRes.data as { raw_row: Record<string, unknown> }[] | null) ?? []) {
      const d = r.raw_row ?? {};
      const name = S(d['Patient Name']);
      if (!name && !S(d['Contact Number'])) continue;
      if (/^patient name$/i.test(name)) continue;
      const p9 = phone9(S(d['Contact Number']));
      const text = `${S(d['Notes / Remarks'])} ${S(d['Follow-up Remarks'])} ${S(d['Follow up Remarks'])} ${S(d['Source Type'])} ${S(d['Preferred Channel'])}`.toLowerCase();
      const channel =
        tagHit(text) ?? leadTrackerChannel(S(d['Source Type']), S(d['Inquiry Platform']), S(d['Preferred Channel']));
      if (p9) {
        if (!leadChannelByPhone.has(p9)) leadChannelByPhone.set(p9, channel);
        leadTextByPhone.set(p9, `${leadTextByPhone.get(p9) ?? ''} ${text}`.trim());
      }
    }

    const aiAgentPhones = new Set<string>();
    for (const r of (crmRes.data as { patient_phone: string | null; source: string | null; is_test: boolean }[] | null) ?? []) {
      if (r.is_test || r.source !== 'aiAgent') continue;
      const p9 = phone9(r.patient_phone);
      if (p9) aiAgentPhones.add(p9);
    }

    const existingPhones = new Set<string>();
    for (const r of (existRes.data as { phone9: string | null }[] | null) ?? []) if (r.phone9) existingPhones.add(r.phone9);
    for (const r of (practoPtRes.data as { phone: string | null }[] | null) ?? []) {
      const p9 = phone9(r.phone);
      if (p9) existingPhones.add(p9);
    }

    const filesByPhone = new Map<string, Set<string>>();
    const apptRows = (apptRes.data as {
      appt_date: string | null; status: string | null; mr_no: string | null; doctor: string | null;
      patient_name: string | null; patient_phone: string | null; data: Record<string, unknown>;
    }[] | null) ?? [];
    for (const a of apptRows) {
      const p9 = phone9(a.patient_phone);
      const mr = S(a.mr_no);
      if (!p9 || !mr) continue;
      const freeText = `${S(a.data?.['remarks'])} ${S(a.data?.['complaint'])}`.toLowerCase();
      if (isTestAppt(`${freeText} ${S(a.patient_name)}`)) continue; // mirror: test rows never feed family links
      (filesByPhone.get(p9) ?? filesByPhone.set(p9, new Set()).get(p9)!).add(mr);
    }

    const L: Lookups = { widgetByPhone, leadChannelByPhone, aiAgentPhones, existingPhones, filesByPhone, leadTextByPhone };
    const ruleText = new Map(WATERFALL_RULES.map((r) => [r.id, r.text]));

    /* ── Classify every in-window appointment; keep this channel's ── */

    const out: TracedPatient[] = [];
    for (const a of apptRows) {
      if (!inRange(a.appt_date, from, to)) continue;
      // Clinic scope mirrors channelPerformance: appointments split by doctor.
      if (clinic !== 'all' && (clinicOfDoctor(S(a.doctor)) === 'dr-tosun') !== (clinic === 'dr-tosun')) continue;
      const freeText = `${S(a.data?.['remarks'])} ${S(a.data?.['complaint'])}`.toLowerCase();
      const facts: ApptFacts = {
        mrNo: S(a.mr_no),
        p9: phone9(a.patient_phone),
        bookedBy: S(a.data?.['booked_by']),
        freeText,
        isTest: isTestAppt(`${freeText} ${S(a.patient_name)}`),
      };
      const v = classifyAppointment(facts, L);
      if (!v || v.channel !== channelKey) continue;
      out.push({
        date: a.appt_date,
        patientName: S(a.patient_name) || '(no name in feed)',
        phone: S(a.patient_phone),
        mrNo: S(a.mr_no),
        status: S(a.status),
        doctor: S(a.doctor),
        ruleId: v.ruleId,
        ruleText: ruleText.get(v.ruleId) ?? v.ruleId,
        evidence: v.evidence,
      });
    }
    out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const MAX = 300;
    return { channelKey, total: out.length, truncated: out.length > MAX, patients: out.slice(0, MAX) };
  } catch {
    return empty;
  }
}
