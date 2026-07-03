import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * CRM — Zavis CSV ingest. Detects which of the three Zavis exports a CSV is,
 * parses it (handling quoted fields + embedded commas/newlines), and upserts
 * into the matching lane_e.crm_* table via the service-role client.
 *
 * Test-data flagging (appointments) mirrors the loader rules so dashboards only
 * ever count real patient appointments.
 */

export type ZavisReportType =
  | 'appointments'
  | 'conversation_summary'
  | 'conversation_traffic'
  | 'csat';

export interface IngestSummary {
  type: ZavisReportType;
  rowsIngested: number;
}

/* -------------------------------------------------------------- CSV parser --- */

/**
 * Parse CSV text into rows of string cells. RFC-4180-ish: handles double-quoted
 * fields, embedded commas, embedded newlines, and "" escaped quotes. Tolerates
 * \r\n and \r line endings. Trailing empty final line is dropped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (c === '\r') {
      // swallow \r (handle \r\n and bare \r)
      if (text[i + 1] === '\n') i += 1;
      pushRow();
      i += 1;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // flush trailing field/row unless the file ended exactly on a newline
  if (field.length > 0 || row.length > 0) pushRow();

  // drop a single fully-empty trailing row artifact
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === '')) rows.pop();
  return rows;
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

/* ----------------------------------------------------------- type detection --- */

/**
 * Detect the Zavis report type from the FIRST few rows of the CSV. Returns null
 * when nothing matches (caller surfaces a friendly error).
 */
export function detectZavisReport(rows: string[][]): ZavisReportType | null {
  if (!rows.length) return null;
  const flat = rows
    .slice(0, 12)
    .map((r) => r.map(norm));

  // Appointments: a header row beginning appointment_id,platform_id,account_id,status,...
  const apptHeaderIdx = flat.findIndex(
    (r) => r[0] === 'appointment_id' && r.includes('status'),
  );
  if (apptHeaderIdx !== -1) return 'appointments';

  // CSAT: a header row carrying both "rating" and "feedback comment" (the patient
  // satisfaction export). Distinct from the agent report, which has neither.
  if (flat.some((r) => r.includes('rating') && r.includes('feedback comment'))) return 'csat';

  // Conversation summary: first line "Reporting period YYYY-MM-DD to YYYY-MM-DD"
  const firstCell = norm(rows[0]?.[0]);
  if (firstCell.startsWith('reporting period')) return 'conversation_summary';
  if (flat.some((r) => r[0] === 'conversations' && r.includes('messages received')))
    return 'conversation_summary';

  // Conversation traffic: first cell "Timezone,..." or a "Start of the hour" header
  if (firstCell.startsWith('timezone')) return 'conversation_traffic';
  if (flat.some((r) => r[0]?.startsWith('start of the hour'))) return 'conversation_traffic';

  return null;
}

/** Convenience overload accepting either raw headers or parsed rows. */
export function detectZavisReportFromHeaders(headers: string[]): ZavisReportType | null {
  return detectZavisReport([headers]);
}

/* ------------------------------------------------------- duration parsing --- */

/**
 * Parse a human duration like "14 days 10 hours", "22 hours 5 minutes",
 * "3 minutes 12 seconds" into decimal hours. Returns null when nothing parses.
 */
export function parseDurationToHours(text: string | null | undefined): number | null {
  if (!text) return null;
  const s = String(text).toLowerCase();
  let hours = 0;
  let matched = false;
  const grab = (unit: RegExp): number => {
    const m = s.match(unit);
    if (m) {
      matched = true;
      return parseFloat(m[1]);
    }
    return 0;
  };
  hours += grab(/([\d.]+)\s*days?/) * 24;
  hours += grab(/([\d.]+)\s*hours?/);
  hours += grab(/([\d.]+)\s*minutes?/) / 60;
  hours += grab(/([\d.]+)\s*seconds?/) / 3600;
  return matched ? Math.round(hours * 1000) / 1000 : null;
}

/* ----------------------------------------------------- appointment flagging --- */

const TEST_PLATFORM_ID = 'MLS5013422';

/** Whether an appointment row is test/junk data and must be excluded from KPIs. */
export function isTestAppointment(fields: {
  remarks?: string;
  complaint?: string;
  services?: string;
  patient_name?: string;
  patient_platform_id?: string;
}): boolean {
  const blob = `${fields.remarks ?? ''} ${fields.complaint ?? ''} ${fields.services ?? ''}`.toLowerCase();
  if (blob.includes('zavis testing') || /\btest\b/.test(blob) || blob.includes('test')) return true;

  const name = (fields.patient_name ?? '').trim();
  const nameLower = name.toLowerCase();
  if (name === '' || nameLower === 'block' || nameLower.includes('test')) return true;

  if ((fields.patient_platform_id ?? '').trim() === TEST_PLATFORM_ID) return true;
  return false;
}

/* ---------------------------------------------------------------- helpers --- */

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const t = v.trim().replace(/,/g, '');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function int(v: string | undefined): number | null {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

function ts(v: string | undefined): string | null {
  if (!v || !v.trim()) return null;
  const ms = Date.parse(v.trim());
  return Number.isFinite(ms) ? new Date(ms).toISOString() : v.trim();
}

function str(v: string | undefined): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t === '' ? null : t;
}

/** Index a header row → {colName: index} (normalised). */
function headerIndex(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = norm(h);
    if (key && !(key in idx)) idx[key] = i;
  });
  return idx;
}

/* ---------------------------------------------------- ingest: appointments --- */

async function ingestAppointments(rows: string[][]): Promise<IngestSummary> {
  const db = getSupabaseAdmin();
  if (!db) return { type: 'appointments', rowsIngested: 0 };

  const headerIdx = rows.findIndex((r) => norm(r[0]) === 'appointment_id');
  if (headerIdx === -1) return { type: 'appointments', rowsIngested: 0 };

  const idx = headerIndex(rows[headerIdx]);
  const at = (r: string[], col: string) => {
    const i = idx[col];
    return i == null ? undefined : r[i];
  };

  const records: Record<string, unknown>[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const idRaw = at(r, 'appointment_id');
    const apptId = int(idRaw);
    if (apptId == null) continue;

    const remarks = str(at(r, 'remarks')) ?? '';
    const complaint = str(at(r, 'complaint')) ?? '';
    const services = str(at(r, 'services')) ?? '';
    const patientName = str(at(r, 'patient_name')) ?? '';
    const patientPlatformId = str(at(r, 'patient_platform_id')) ?? '';

    records.push({
      appointment_id: apptId,
      platform_id: str(at(r, 'platform_id')),
      account_id: str(at(r, 'account_id')),
      status: str(at(r, 'status')),
      source: str(at(r, 'source')),
      platform: str(at(r, 'platform')),
      booking_mode: str(at(r, 'booking_mode')),
      timeslot: ts(at(r, 'timeslot')),
      duration_minutes: int(at(r, 'duration_minutes')),
      services: str(services),
      complaint: str(complaint),
      remarks: str(remarks),
      amount: num(at(r, 'amount')),
      currency: str(at(r, 'currency')),
      created_at: ts(at(r, 'created_at')),
      updated_at: ts(at(r, 'updated_at')),
      patient_id: str(at(r, 'patient_id')),
      patient_platform_id: str(patientPlatformId),
      patient_name: str(patientName),
      patient_gender: str(at(r, 'patient_gender')),
      patient_phone: str(at(r, 'patient_phone')),
      professional_id: str(at(r, 'professional_id')),
      professional_name: str(at(r, 'professional_name')),
      professional_type: str(at(r, 'professional_type')),
      professional_department: str(at(r, 'professional_department')),
      is_test: isTestAppointment({
        remarks,
        complaint,
        services,
        patient_name: patientName,
        patient_platform_id: patientPlatformId,
      }),
      ingested_at: new Date().toISOString(),
    });
  }

  let ingested = 0;
  // chunked upsert (on conflict appointment_id → update)
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = records.slice(i, i + CHUNK);
    const { error } = await db
      .from('crm_appointments')
      .upsert(batch, { onConflict: 'appointment_id' });
    if (error) throw new Error(`Appointments upsert failed: ${error.message}`);
    ingested += batch.length;
  }
  return { type: 'appointments', rowsIngested: ingested };
}

/* ------------------------------------------ ingest: conversation summary --- */

async function ingestConversationSummary(rows: string[][]): Promise<IngestSummary> {
  const db = getSupabaseAdmin();
  if (!db) return { type: 'conversation_summary', rowsIngested: 0 };

  // Reporting period from the first "Reporting period A to B" line.
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  for (const r of rows.slice(0, 6)) {
    const joined = r.join(' ');
    const m = joined.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
    if (norm(r[0]).startsWith('reporting period') && m) {
      periodStart = m[1];
      periodEnd = m[2];
      break;
    }
  }

  // Find the metrics header row + its data row.
  const headerIdx = rows.findIndex((r) => norm(r[0]) === 'conversations');
  if (headerIdx === -1 || !rows[headerIdx + 1]) {
    return { type: 'conversation_summary', rowsIngested: 0 };
  }
  const idx = headerIndex(rows[headerIdx]);
  const data = rows[headerIdx + 1];
  const at = (col: string) => {
    const i = idx[col];
    return i == null ? undefined : data[i];
  };

  const firstResponseText = str(at('average first response time')) ?? str(at('avg first response time'));
  const resolutionText = str(at('average resolution time')) ?? str(at('avg resolution time'));
  const waitingText = str(at('average waiting time')) ?? str(at('avg waiting time'));

  const record = {
    id: 1,
    period_start: periodStart,
    period_end: periodEnd,
    conversations: int(at('conversations')),
    messages_received: int(at('messages received')),
    messages_sent: int(at('messages sent')),
    resolution_count: int(at('resolution count')) ?? int(at('resolutions')),
    avg_first_response_text: firstResponseText,
    avg_resolution_text: resolutionText,
    avg_waiting_text: waitingText,
    avg_first_response_hours: parseDurationToHours(firstResponseText),
    avg_resolution_hours: parseDurationToHours(resolutionText),
    avg_waiting_hours: parseDurationToHours(waitingText),
    uploaded_at: new Date().toISOString(),
  };

  const { error } = await db
    .from('crm_conversation_summary')
    .upsert(record, { onConflict: 'id' });
  if (error) throw new Error(`Conversation summary upsert failed: ${error.message}`);
  return { type: 'conversation_summary', rowsIngested: 1 };
}

/* ------------------------------------------- ingest: conversation traffic --- */

async function ingestConversationTraffic(rows: string[][]): Promise<IngestSummary> {
  const db = getSupabaseAdmin();
  if (!db) return { type: 'conversation_traffic', rowsIngested: 0 };

  // Header row "Start of the hour, <date>, <date>, ..."
  const headerIdx = rows.findIndex((r) => norm(r[0]).startsWith('start of the hour'));
  if (headerIdx === -1) return { type: 'conversation_traffic', rowsIngested: 0 };

  const header = rows[headerIdx];
  // Column dates: normalise any parseable date in the header cells to YYYY-MM-DD.
  const dates: (string | null)[] = header.map((cell, i) => {
    if (i === 0) return null;
    const t = (cell ?? '').trim();
    if (!t) return null;
    const ms = Date.parse(t);
    if (Number.isFinite(ms)) return new Date(ms).toISOString().slice(0, 10);
    // accept already-formatted YYYY-MM-DD
    return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  });

  const records: Record<string, unknown>[] = [];
  const now = new Date().toISOString();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const hourCell = (r[0] ?? '').trim();
    const hm = hourCell.match(/^(\d{1,2})/);
    if (!hm) continue;
    const hour = parseInt(hm[1], 10);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) continue;

    for (let c = 1; c < r.length; c++) {
      const date = dates[c];
      if (!date) continue;
      const conv = int(r[c]);
      if (conv == null || conv <= 0) continue; // melt: only nonzero cells
      records.push({ date, hour, conversations: conv, uploaded_at: now });
    }
  }

  let ingested = 0;
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = records.slice(i, i + CHUNK);
    const { error } = await db
      .from('crm_conversation_traffic')
      .upsert(batch, { onConflict: 'date,hour' });
    if (error) throw new Error(`Traffic upsert failed: ${error.message}`);
    ingested += batch.length;
  }
  return { type: 'conversation_traffic', rowsIngested: ingested };
}

/* -------------------------------------------------------------- ingest: csat --- */

/**
 * CSAT (patient satisfaction) export. Columns: Agent Name, Rating, Feedback
 * Comment, Contact Name/Email/Phone, Link to the conversation, Recorded date.
 * We dedupe on the conversation id parsed from the link and store only the
 * rating/agent/feedback/date + link — contact PII is intentionally dropped,
 * mirroring the lean posture of the appointments ingest.
 */
async function ingestCsat(rows: string[][]): Promise<IngestSummary> {
  const db = getSupabaseAdmin();
  if (!db) return { type: 'csat', rowsIngested: 0 };

  const headerIdx = rows.findIndex((r) => {
    const nr = r.map(norm);
    return nr.includes('rating') && nr.includes('feedback comment');
  });
  if (headerIdx === -1) return { type: 'csat', rowsIngested: 0 };

  const idx = headerIndex(rows[headerIdx]);
  const at = (r: string[], col: string) => {
    const i = idx[col];
    return i == null ? undefined : r[i];
  };

  const now = new Date().toISOString();
  const records: Record<string, unknown>[] = [];
  const seen = new Set<number>();
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    // Skip the trailing "Reporting period …" footer / blank artifact rows.
    if (norm(r[0]).startsWith('reporting period')) continue;

    const link = str(at(r, 'link to the conversation')) ?? '';
    const m = link.match(/conversations\/(\d+)/);
    const convId = m ? parseInt(m[1], 10) : null;
    if (convId == null || !Number.isFinite(convId)) continue;

    const rating = int(at(r, 'rating'));
    if (rating == null) continue; // a CSAT row without a rating is not usable
    if (seen.has(convId)) continue; // de-dupe within the file (last write wins on the DB)
    seen.add(convId);

    records.push({
      conversation_id: convId,
      rating,
      agent_name: str(at(r, 'agent name')),
      feedback: str(at(r, 'feedback comment')),
      recorded_at: ts(at(r, 'recorded date')),
      conversation_url: link || null,
      ingested_at: now,
    });
  }

  let ingested = 0;
  const CHUNK = 500;
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = records.slice(i, i + CHUNK);
    const { error } = await db.from('crm_csat').upsert(batch, { onConflict: 'conversation_id' });
    if (error) throw new Error(`CSAT upsert failed: ${error.message}`);
    ingested += batch.length;
  }
  return { type: 'csat', rowsIngested: ingested };
}

/* ------------------------------------------------------------ entry point --- */

/**
 * Detect the report type from the CSV text, parse, and upsert into the right
 * table. Throws a friendly Error when the type can't be detected or a write
 * fails — callers (the route) translate that into a JSON error.
 */
export async function ingestZavisCsv(text: string): Promise<IngestSummary> {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('The file is empty.');

  const type = detectZavisReport(rows);
  if (!type) {
    throw new Error(
      'Could not recognise this as a Zavis export. Expected an appointments export (header starting "appointment_id,..."), a CSAT export (header with "Rating" and "Feedback Comment"), a conversation summary ("Reporting period …"), or a conversation traffic export ("Timezone,…" / "Start of the hour,…").',
    );
  }

  switch (type) {
    case 'appointments':
      return ingestAppointments(rows);
    case 'csat':
      return ingestCsat(rows);
    case 'conversation_summary':
      return ingestConversationSummary(rows);
    case 'conversation_traffic':
      return ingestConversationTraffic(rows);
  }
}
