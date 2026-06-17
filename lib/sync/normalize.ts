import { createHash } from 'crypto';
import { z } from 'zod';
import type { SourceMapping } from '@/config/sheet-mapping';
import { ownerFor } from '@/config/data-gap-owners';
import type { Blocker, BlockerImpact, BlockerStatus, BlockerType, ContentItem, ContentObjective, DataGap } from '@/lib/types';
import type { RawRow } from './adapters/types';

/**
 * Normalisation (silver). Maps raw rows through sheet-mapping.ts + zod into
 * canonical shapes. A mapped header that is ABSENT in the sheet becomes a typed
 * data gap (never a throw, §15). Invalid individual rows are skipped with a gap,
 * not crashed.
 */

export interface NormalizeResult<T> {
  rows: T[];
  dataGaps: DataGap[];
}

/** Stable id: prefer a sheet `id`/`ID` column, else hash source+row+inquiry. */
function stableId(source: SourceMapping, raw: RawRow, parts: (string | null)[]): string {
  const explicit = raw.data['id'] ?? raw.data['ID'] ?? raw.data['Id'];
  if (explicit && explicit.trim()) return `${source.key}:${explicit.trim()}`;
  const seed = [source.key, raw.rowIndex, ...parts].join('|');
  return `${source.key}:${createHash('sha1').update(seed).digest('hex').slice(0, 16)}`;
}

/** Read a mapped field from a row, applying its transform. Returns null if the
 *  mapped header is missing from the row entirely. */
function readField(
  source: SourceMapping,
  raw: RawRow,
  field: string,
  presentHeaders: Set<string>,
): { value: unknown; missingHeader: boolean } {
  const header = source.columns[field];
  if (!header) return { value: null, missingHeader: false }; // not mapped at all
  if (!presentHeaders.has(header)) return { value: null, missingHeader: true };
  const rawValue = raw.data[header] ?? '';
  const transform = source.transforms?.[field];
  const value = transform ? transform(rawValue) : rawValue === '' ? null : rawValue;
  return { value, missingHeader: false };
}

/** Headers that exist across the fetched rows (sample the first row). */
function headerSet(rows: RawRow[]): Set<string> {
  const s = new Set<string>();
  for (const r of rows.slice(0, 5)) Object.keys(r.data).forEach((h) => s.add(h));
  return s;
}

const leadSchema = z.object({
  id: z.string(),
  source_sheet: z.string(),
  channel_source: z.string().nullable(),
  inquiry_date: z.string().nullable(),
});

export interface NormalizedLead {
  id: string;
  source_sheet: string;
  clinic: string | null;
  doctor: string | null;
  channel_source: string | null;
  medium: string | null;
  campaign_name: string | null;
  creative_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  landing_page_url: string | null;
  whatsapp_ref: string | null;
  call_tracking_no: string | null;
  inquiry_date: string | null;
  booking_date: string | null;
  appointment_date: string | null;
  pac_owner: string | null;
  booking_status: string | null;
  is_qualified: boolean | null;
  treatment_signal: string | null;
  proof_captured: boolean | null;
  review_captured: boolean | null;
  raw_row: Record<string, string>;
}

const LEAD_FIELDS: (keyof NormalizedLead)[] = [
  'clinic', 'doctor', 'channel_source', 'medium', 'campaign_name', 'creative_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'landing_page_url', 'whatsapp_ref', 'call_tracking_no', 'inquiry_date',
  'booking_date', 'appointment_date', 'pac_owner', 'booking_status',
  'is_qualified', 'treatment_signal', 'proof_captured', 'review_captured',
];

/** Map a leads-target source into canonical leads + data gaps. */
export function normalizeLeads(
  source: SourceMapping,
  rows: RawRow[],
): NormalizeResult<NormalizedLead> {
  const present = headerSet(rows);
  const gaps = new Map<string, DataGap>();
  const out: NormalizedLead[] = [];

  // Column-level gaps: a field is mapped but its header is absent in the sheet.
  for (const field of LEAD_FIELDS) {
    const header = source.columns[field];
    if (header && !present.has(header) && rows.length > 0) {
      const area = field.startsWith('utm') ? 'utm' : field === 'channel_source' ? 'attribution' : 'tracking';
      gaps.set(`col:${field}`, {
        area,
        detail: `${source.label}: mapped column "${header}" (${field}) not found`,
        owner: ownerFor(area),
      });
    }
  }

  for (const raw of rows) {
    const obj: Partial<NormalizedLead> = {};
    for (const field of LEAD_FIELDS) {
      obj[field] = readField(source, raw, field, present).value as never;
    }
    const lead: NormalizedLead = {
      id: stableId(source, raw, [String(obj.inquiry_date ?? '')]),
      source_sheet: source.label,
      raw_row: raw.data,
      ...(obj as Omit<NormalizedLead, 'id' | 'source_sheet' | 'raw_row'>),
    } as NormalizedLead;

    const check = leadSchema.safeParse(lead);
    if (!check.success) {
      gaps.set(`row:${raw.rowIndex}`, {
        area: 'attribution',
        detail: `${source.label} row ${raw.rowIndex}: invalid lead (${check.error.issues[0]?.message})`,
        owner: ownerFor('attribution'),
      });
      continue;
    }
    // Attribution gap: an inquiry with no identifiable channel (Akbar's rule).
    if (!lead.channel_source) {
      gaps.set('unattributed', {
        area: 'attribution',
        detail: 'One or more inquiries have no identifiable channel source',
        owner: ownerFor('attribution'),
      });
    }
    out.push(lead);
  }

  return { rows: out, dataGaps: [...gaps.values()] };
}

// ============================================================================
// Performance (aggregated paid-acquisition rows) — THE funnel/spend engine.
// ============================================================================

export interface PerfRow {
  date: string | null; // YYYY-MM-DD
  channel: string;
  channelGroup: string | null;
  campaign: string | null;
  objective: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  bookings: number;
  showups: number;
  treatments: number;
  revenue: number;
}

/** Parse a numeric cell: strip commas, ignore #DIV/0!/#N/A/errors → 0. */
function parseNum(v: unknown): number {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  if (s.startsWith('#')) return 0; // #DIV/0!, #N/A, #REF! etc.
  const cleaned = s.replace(/[,$%\s]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Parse M/D/YYYY (or M/D/YY) → YYYY-MM-DD. Returns null for "Total"/blank/bad. */
function parsePerfDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  if (/total/i.test(s)) return null;
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const [, mo, d, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10);
}

/**
 * Normalise aggregated performance rows. Summary rows (Date contains "Total")
 * and rows with no parseable date are skipped. Columns whose values are empty
 * everywhere (bookings/show-ups/treatments per spec) are reported as data gaps
 * by the caller via `emptyColumns`.
 */
export function normalizePerformance(
  source: SourceMapping,
  rows: RawRow[],
): NormalizeResult<PerfRow> & { emptyColumns: string[] } {
  const present = headerSet(rows);
  const gaps = new Map<string, DataGap>();
  const out: PerfRow[] = [];

  const col = (field: string) => source.columns[field];
  // Column-level gaps: mapped header absent from sheet.
  for (const field of ['date', 'channel', 'spend', 'impressions', 'clicks', 'leads']) {
    const header = col(field);
    if (header && !present.has(header) && rows.length > 0) {
      gaps.set(`col:${field}`, {
        area: 'tracking',
        detail: `${source.label}: mapped column "${header}" (${field}) not found`,
        owner: ownerFor('tracking'),
      });
    }
  }

  const get = (raw: RawRow, field: string): string => {
    const header = col(field);
    return header ? raw.data[header] ?? '' : '';
  };

  // Track per-column non-zero presence to enforce the "all-empty ⇒ data gap" rule.
  const seen: Record<string, boolean> = {
    bookings: false, showups: false, treatments: false,
    impressions: false, clicks: false, leads: false, spend: false,
  };

  for (const raw of rows) {
    const date = parsePerfDate(get(raw, 'date'));
    if (!date) continue; // skip Total/summary/blank-date rows

    const row: PerfRow = {
      date,
      channel: (get(raw, 'channel') || 'Unattributed').trim(),
      channelGroup: get(raw, 'channelGroup').trim() || null,
      campaign: get(raw, 'campaign').trim() || null,
      objective: get(raw, 'objective').trim() || null,
      spend: parseNum(get(raw, 'spend')),
      impressions: parseNum(get(raw, 'impressions')),
      clicks: parseNum(get(raw, 'clicks')),
      leads: parseNum(get(raw, 'leads')),
      bookings: parseNum(get(raw, 'bookings')),
      showups: parseNum(get(raw, 'showups')),
      treatments: parseNum(get(raw, 'treatments')),
      revenue: parseNum(get(raw, 'revenue')),
    };
    for (const k of Object.keys(seen)) {
      if ((row as unknown as Record<string, number>)[k] > 0) seen[k] = true;
    }
    out.push(row);
  }

  // Empty-column data gaps (spec §15): a stage whose source column has NO
  // non-zero value anywhere is a data gap, not a fabricated 0.
  const emptyColumns: string[] = [];
  const stageGapMeta: Record<string, { label: string; area: string }> = {
    bookings: { label: 'Bookings', area: 'clinic' },
    showups: { label: 'Show-ups', area: 'attendance' },
    treatments: { label: 'Treatments', area: 'clinic' },
  };
  for (const k of ['bookings', 'showups', 'treatments']) {
    if (!seen[k] && out.length > 0) {
      emptyColumns.push(k);
      const meta = stageGapMeta[k];
      gaps.set(`empty:${k}`, {
        area: meta.area,
        detail: `${meta.label} has no recorded value anywhere in ${source.label} — reported as a data gap, not 0`,
        owner: ownerFor(meta.area),
      });
    }
  }

  return { rows: out, dataGaps: [...gaps.values()], emptyColumns };
}

// ============================================================================
// Blockers (§G) from the task tracker.
// ============================================================================

function mapImpact(v: string): BlockerImpact | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/(p0|p1|critical|urgent|high)/.test(s)) return 'high';
  if (/(p2|medium|med|normal)/.test(s)) return 'medium';
  if (/(p3|p4|low|minor)/.test(s)) return 'low';
  return null;
}

function mapBlockerType(v: string): BlockerType | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/track|analytic|utm|data/.test(s)) return 'tracking';
  if (/pac|whatsapp|call/.test(s)) return 'PAC';
  if (/creativ|content|shoot|video|caption/.test(s)) return 'creative';
  if (/web|site|landing|page/.test(s)) return 'website';
  if (/crm/.test(s)) return 'CRM';
  if (/clinic|ops/.test(s)) return 'clinic';
  if (/channel|ad|meta|google|search|social/.test(s)) return 'channel';
  return null;
}

function mapBlockerStatus(v: string): BlockerStatus | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/(done|complete|closed|resolved)/.test(s)) return 'done';
  if (/(progress|wip|ongoing|started|review)/.test(s)) return 'in-progress';
  return 'open';
}

/** Map a task-tracker source into §G blockers (only NOT-completed rows, cap 40). */
export function normalizeBlockers(
  source: SourceMapping,
  rows: RawRow[],
): NormalizeResult<Blocker> {
  const gaps: DataGap[] = [];
  const out: Blocker[] = [];
  const col = (field: string) => source.columns[field];
  const get = (raw: RawRow, field: string): string => {
    const header = col(field);
    return header ? (raw.data[header] ?? '').trim() : '';
  };

  for (const raw of rows) {
    const autoStatus = get(raw, 'status');
    const finalCompletion = get(raw, '_finalCompletion');
    const completed =
      /complete|done|closed/i.test(autoStatus) || finalCompletion !== '';
    if (completed) continue;

    const blockerText = get(raw, 'blocker');
    if (!blockerText) continue;

    const explicitId = get(raw, '_id');
    const id = explicitId
      ? `${source.key}:${explicitId}`
      : stableId(source, raw, [blockerText]);

    out.push({
      id,
      blocker: blockerText,
      type: mapBlockerType(get(raw, 'type')),
      impact: mapImpact(get(raw, 'impact')),
      owner: get(raw, 'owner') || null,
      fix: get(raw, 'fix') || null,
      due_time: get(raw, 'due_time') || null,
      status: mapBlockerStatus(autoStatus),
    });
    if (out.length >= 40) break;
  }

  return { rows: out, dataGaps: gaps };
}

// ============================================================================
// Content items (§E) from the shoot calendar.
// ============================================================================

function mapObjective(v: string): ContentObjective | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  if (/aware|reach|brand/.test(s)) return 'awareness';
  if (/proof|testimon|result|review|case/.test(s)) return 'proof';
  if (/convert|conversion|book|lead|sale/.test(s)) return 'conversion';
  if (/retarget|remarket|nurtur/.test(s)) return 'retargeting';
  return null;
}

/** Map a content source into §E content_items (only rows with a non-empty title). */
export function normalizeContent(
  source: SourceMapping,
  rows: RawRow[],
): NormalizeResult<ContentItem> {
  const gaps: DataGap[] = [];
  const out: ContentItem[] = [];
  const col = (field: string) => source.columns[field];
  const get = (raw: RawRow, field: string): string => {
    const header = col(field);
    return header ? (raw.data[header] ?? '').trim() : '';
  };

  for (const raw of rows) {
    const title = get(raw, 'title');
    if (!title) continue;

    out.push({
      id: stableId(source, raw, [title]),
      title,
      channel: get(raw, 'channel') || null,
      link: null,
      objective: mapObjective(get(raw, 'objective')),
      content_type: get(raw, 'content_type') || null,
      audience: null,
      cta: null,
      perf_note: get(raw, 'perf_note') || null,
      issue_note: null,
      status: get(raw, 'status') || null,
    });
  }

  return { rows: out, dataGaps: gaps };
}
