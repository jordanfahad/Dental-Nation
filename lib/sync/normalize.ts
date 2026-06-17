import { createHash } from 'crypto';
import { z } from 'zod';
import type { SourceMapping } from '@/config/sheet-mapping';
import { ownerFor } from '@/config/data-gap-owners';
import type { DataGap } from '@/lib/types';
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
