import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type {
  CrmAppointmentStats,
  CrmConversationSummary,
  CrmDailyPoint,
  CrmMixRow,
  CrmRange,
  CrmReport,
  CrmTraffic,
} from './types';

/**
 * CRM — Zavis data layer (server-only). Reads the three lane_e.crm_* tables via
 * the service-role client and computes the honest report the CRM tab renders.
 *
 * Hard rules (CLAUDE.md): NEVER fabricate a 0 for a missing source. When the DB
 * is unreachable (the build/preview container can't reach Supabase) or a table
 * is absent, the report degrades to a well-formed EMPTY state (source:'empty')
 * with null metrics — the UI then renders calm data-gap / "not yet ingested"
 * states. Every read is wrapped so a failure never crashes the page.
 */

const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000; // UTC+4, no DST.

/** YYYY-MM-DD of a timestamp on the Dubai day boundary. null on bad input. */
function dubaiDate(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const ms = Date.parse(ts);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + DUBAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Mon=0 … Sun=6 for a YYYY-MM-DD date. */
function weekdayMon0(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00Z`).getUTCDay(); // 0=Sun … 6=Sat
  return (d + 6) % 7;
}

function emptyAppointments(): CrmAppointmentStats {
  return {
    empty: true,
    requested: null,
    booked: null,
    confirmed: null,
    completed: null,
    cancel: null,
    total: null,
    cancellationRate: null,
    completionRate: null,
    aiAgentBookings: null,
    bySource: [],
    byDepartment: [],
    byDoctor: [],
    series: [],
  };
}

function emptyTraffic(): CrmTraffic {
  return { empty: true, byHour: [], matrix: [], peak: null };
}

function emptyReport(): CrmReport {
  return {
    appointments: emptyAppointments(),
    conversation: null,
    traffic: emptyTraffic(),
    source: 'empty',
  };
}

/** Sort a label→count map into a descending {label,value} array, top N. */
function topMix(counts: Map<string, number>, topN?: number): CrmMixRow[] {
  const rows = [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.label && r.value > 0)
    .sort((a, b) => b.value - a.value);
  return topN ? rows.slice(0, topN) : rows;
}

interface AppointmentRow {
  status: string | null;
  source: string | null;
  professional_name: string | null;
  professional_department: string | null;
  created_at: string | null;
}

function computeAppointments(rows: AppointmentRow[]): CrmAppointmentStats {
  if (!rows.length) return emptyAppointments();

  const statusCounts = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byDept = new Map<string, number>();
  const byDoctor = new Map<string, number>();
  const byDay = new Map<string, number>();
  let aiAgent = 0;

  for (const r of rows) {
    const status = (r.status ?? '').trim().toLowerCase();
    if (status) statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    const source = (r.source ?? '').trim();
    if (source) bySource.set(source, (bySource.get(source) ?? 0) + 1);
    if (source === 'aiAgent') aiAgent += 1;

    const dept = (r.professional_department ?? '').trim();
    if (dept) byDept.set(dept, (byDept.get(dept) ?? 0) + 1);

    const doctor = (r.professional_name ?? '').trim();
    if (doctor) byDoctor.set(doctor, (byDoctor.get(doctor) ?? 0) + 1);

    const day = dubaiDate(r.created_at);
    if (day) byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const requested = statusCounts.get('requested') ?? 0;
  const booked = statusCounts.get('booked') ?? 0;
  const confirmed = statusCounts.get('confirmed') ?? 0;
  const completed = statusCounts.get('completed') ?? 0;
  const cancel = statusCounts.get('cancel') ?? 0;
  const total = rows.length;

  const cancellationRate = total > 0 ? cancel / total : null;
  const completionDenom = completed + cancel;
  const completionRate = completionDenom > 0 ? completed / completionDenom : null;

  const series: CrmDailyPoint[] = [...byDay.entries()]
    .map(([date, appointments]) => ({ date, appointments }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    empty: false,
    requested,
    booked,
    confirmed,
    completed,
    cancel,
    total,
    cancellationRate,
    completionRate,
    aiAgentBookings: aiAgent,
    bySource: topMix(bySource),
    byDepartment: topMix(byDept),
    byDoctor: topMix(byDoctor, 8),
    series,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapConversation(row: any): CrmConversationSummary | null {
  if (!row) return null;
  const num = (v: unknown): number | null => {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    periodStart: row.period_start ?? null,
    periodEnd: row.period_end ?? null,
    conversations: num(row.conversations),
    messagesReceived: num(row.messages_received),
    messagesSent: num(row.messages_sent),
    resolutionCount: num(row.resolution_count),
    avgFirstResponseHours: num(row.avg_first_response_hours),
    avgFirstResponseText: row.avg_first_response_text ?? null,
    avgResolutionHours: num(row.avg_resolution_hours),
    avgResolutionText: row.avg_resolution_text ?? null,
    avgWaitingHours: num(row.avg_waiting_hours),
    avgWaitingText: row.avg_waiting_text ?? null,
  };
}

interface TrafficRow {
  date: string | null;
  hour: number | null;
  conversations: number | null;
}

function computeTraffic(rows: TrafficRow[]): CrmTraffic {
  if (!rows.length) return emptyTraffic();

  const hourTotals = new Array<number>(24).fill(0);
  // matrix[hour][weekday] — full 24×7 grid (zeros are real for a heatmap).
  const matrix: number[][] = Array.from({ length: 24 }, () => new Array<number>(7).fill(0));
  let peak: CrmTraffic['peak'] = null;
  let any = false;

  for (const r of rows) {
    const hour = r.hour;
    const conv = Number(r.conversations ?? 0);
    if (hour == null || hour < 0 || hour > 23 || !Number.isFinite(conv)) continue;
    any = true;
    hourTotals[hour] += conv;
    if (r.date) {
      const wd = weekdayMon0(r.date);
      matrix[hour][wd] += conv;
      const cell = matrix[hour][wd];
      if (!peak || cell > peak.conversations) {
        peak = { hour, weekday: wd, conversations: cell };
      }
    }
  }

  if (!any) return emptyTraffic();

  return {
    empty: false,
    byHour: hourTotals.map((conversations, hour) => ({ hour, conversations })),
    matrix,
    peak: peak && peak.conversations > 0 ? peak : null,
  };
}

/**
 * Assemble the CRM report. Reads all three tables (appointments filtered to
 * is_test=false), scoped to `range` on created_at when provided. Any failure on
 * any read degrades that section to empty — the whole report only ever returns a
 * well-formed object, never throws.
 */
export async function getCrmReport(range?: CrmRange): Promise<CrmReport> {
  const db = getSupabaseAdmin();
  if (!db) return emptyReport();

  let appointments: CrmAppointmentStats = emptyAppointments();
  let conversation: CrmConversationSummary | null = null;
  let traffic: CrmTraffic = emptyTraffic();

  // --- Appointments (non-test only) ----------------------------------------
  try {
    let q = db
      .from('crm_appointments')
      .select('status, source, professional_name, professional_department, created_at')
      .eq('is_test', false);
    if (range?.from) q = q.gte('created_at', `${range.from}T00:00:00+04:00`);
    if (range?.to) q = q.lte('created_at', `${range.to}T23:59:59+04:00`);
    const { data, error } = await q;
    if (!error && Array.isArray(data)) {
      appointments = computeAppointments(data as AppointmentRow[]);
    }
  } catch {
    appointments = emptyAppointments();
  }

  // --- Conversation summary (singleton id=1) -------------------------------
  try {
    const { data, error } = await db
      .from('crm_conversation_summary')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (!error) conversation = mapConversation(data);
  } catch {
    conversation = null;
  }

  // --- Conversation traffic ------------------------------------------------
  try {
    const { data, error } = await db
      .from('crm_conversation_traffic')
      .select('date, hour, conversations');
    if (!error && Array.isArray(data)) {
      traffic = computeTraffic(data as TrafficRow[]);
    }
  } catch {
    traffic = emptyTraffic();
  }

  const live = !appointments.empty || conversation != null || !traffic.empty;
  return {
    appointments,
    conversation,
    traffic,
    source: live ? 'live' : 'empty',
  };
}
