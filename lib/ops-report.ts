import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * The Head of Operations report — an EDITABLE, block-based live document.
 *
 * Every section is a database row (lane_e.ops_report_sections) rather than
 * code, because the person who owns this narrative is the Operations
 * Director, not the repository. The dashboard renders the rows; she edits,
 * adds, reorders, hides and deletes them herself.
 *
 * The edit surface is deliberately TEXT, not JSON: each section kind maps its
 * payload to a small set of plain-text fields (one item per line, cells
 * separated by |) and back. A director should never see a brace.
 */

export type SectionKind =
  | 'hero'
  | 'stats'
  | 'table'
  | 'columns'
  | 'beforeafter'
  | 'list'
  | 'bars'
  | 'flow'
  | 'quote'
  | 'text';

export const KIND_LABEL: Record<SectionKind, string> = {
  hero: 'Headline banner (big numbers)',
  stats: 'Stat row (big numbers)',
  table: 'Table',
  columns: 'Side-by-side columns',
  beforeafter: 'Before / after',
  list: 'List',
  bars: 'Bar chart',
  flow: 'Step flow / journey',
  quote: 'Pull quote',
  text: 'Paragraph',
};

export const SECTION_KINDS = Object.keys(KIND_LABEL) as SectionKind[];

export interface OpsSection {
  id: number;
  position: number;
  kind: SectionKind;
  title: string;
  subtitle: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  payload: any;
  visible: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export const getOpsSections = cache(async (includeHidden: boolean): Promise<OpsSection[]> => {
  const db = getSupabaseAdmin();
  if (!db) return [];
  let q = db.from('ops_report_sections').select('*').order('position', { ascending: true });
  if (!includeHidden) q = q.eq('visible', true);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((r) => ({
    id: Number(r.id),
    position: Number(r.position),
    kind: (SECTION_KINDS.includes(r.kind as SectionKind) ? r.kind : 'text') as SectionKind,
    title: String(r.title ?? ''),
    subtitle: String(r.subtitle ?? ''),
    payload: r.payload ?? {},
    visible: Boolean(r.visible),
    updatedAt: String(r.updated_at),
    updatedBy: r.updated_by ? String(r.updated_by) : null,
  }));
});

export const getOpsLastUpdated = cache(async (): Promise<{ at: string; by: string | null } | null> => {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from('ops_report_sections')
    .select('updated_at,updated_by')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { at: String(data.updated_at), by: data.updated_by ? String(data.updated_by) : null };
});

/* ───────────────────────────── payload ⇄ plain-text field mapping ───────── */

const lines = (v: string): string[] =>
  v
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

/** One editable field of a section's edit form. */
export interface EditField {
  name: string;
  label: string;
  /** 'line' renders an <input>, 'area' a <textarea>. */
  widget: 'line' | 'area';
  value: string;
  hint: string;
}

/**
 * The plain-text fields a given section edits, with current values.
 * The inverse (textToPayload) rebuilds the payload from the submitted form.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function payloadToFields(kind: SectionKind, payload: any): EditField[] {
  switch (kind) {
    case 'hero':
    case 'stats':
      return [
        {
          name: 'stats',
          label: 'Numbers',
          widget: 'area',
          value: asArr(payload?.stats)
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            .map((s: any) => [asStr(s?.value), asStr(s?.label), asStr(s?.note)].filter(Boolean).join(' | '))
            .join('\n'),
          hint: 'One number per line: value | label | small note (the note is optional).',
        },
      ];
    case 'table': {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const headers = asArr(payload?.headers).map(asStr);
      const rows = asArr(payload?.rows).map((r: any) => asArr(r).map(asStr).join(' | '));
      /* eslint-enable @typescript-eslint/no-explicit-any */
      return [
        {
          name: 'table',
          label: 'Table',
          widget: 'area',
          value: [headers.join(' | '), ...rows].join('\n'),
          hint: 'First line is the column headings; every other line is a row. Separate cells with |.',
        },
        {
          name: 'note',
          label: 'Note under the table',
          widget: 'line',
          value: asStr(payload?.note),
          hint: 'Optional.',
        },
      ];
    }
    case 'columns':
      return [
        {
          name: 'columns',
          label: 'Columns',
          widget: 'area',
          value: asArr(payload?.columns)
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            .map((c: any) => {
              const head = [asStr(c?.title), asStr(c?.subtitle) ? `~ ${asStr(c?.subtitle)}` : ''].filter(Boolean);
              return [...head, ...asArr(c?.lines).map(asStr)].join('\n');
            })
            .join('\n---\n'),
          hint: 'Separate columns with a line containing only ---. In each column: first line is its title, a line starting with ~ is its small subtitle, every other line is a point.',
        },
      ];
    case 'beforeafter':
      return [
        { name: 'beforeTitle', label: 'Left heading', widget: 'line', value: asStr(payload?.beforeTitle) || 'Before', hint: '' },
        {
          name: 'before',
          label: 'Left points',
          widget: 'area',
          value: asArr(payload?.before).map(asStr).join('\n'),
          hint: 'One point per line.',
        },
        { name: 'afterTitle', label: 'Right heading', widget: 'line', value: asStr(payload?.afterTitle) || 'After', hint: '' },
        {
          name: 'after',
          label: 'Right points',
          widget: 'area',
          value: asArr(payload?.after).map(asStr).join('\n'),
          hint: 'One point per line.',
        },
        { name: 'impact', label: 'Impact line', widget: 'line', value: asStr(payload?.impact), hint: 'Optional — shown under both columns.' },
      ];
    case 'list':
      return [
        {
          name: 'items',
          label: 'Items',
          widget: 'area',
          value: asArr(payload?.items).map(asStr).join('\n'),
          hint: 'One item per line.',
        },
        {
          name: 'numbered',
          label: 'Numbered',
          widget: 'line',
          value: payload?.numbered ? 'yes' : 'no',
          hint: 'yes = numbered 1, 2, 3 · no = bullet points.',
        },
      ];
    case 'bars':
      return [
        {
          name: 'bars',
          label: 'Bars',
          widget: 'area',
          value: asArr(payload?.bars)
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            .map((b: any) => [asStr(b?.label), String(b?.value ?? ''), asStr(b?.note)].filter(Boolean).join(' | '))
            .join('\n'),
          hint: 'One bar per line: label | value | small note (note optional). Negative values are drawn in red — e.g. Feb | -177476.',
        },
        {
          name: 'unit',
          label: 'Unit',
          widget: 'line',
          value: asStr(payload?.unit) || 'aed',
          hint: 'aed = dirham amounts · pct = percentages · plain = bare numbers.',
        },
      ];
    case 'flow':
      return [
        {
          name: 'steps',
          label: 'Steps',
          widget: 'area',
          value: asArr(payload?.steps)
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            .map((st: any) => [asStr(st?.label), asStr(st?.note)].filter(Boolean).join(' | '))
            .join('\n'),
          hint: 'One step per line, in order: step name | short description. They render as a numbered arrow flow.',
        },
      ];
    case 'quote':
    case 'text':
      return [
        {
          name: 'text',
          label: kind === 'quote' ? 'Quote' : 'Text',
          widget: 'area',
          value: asStr(payload?.text),
          hint: '',
        },
      ];
  }
}

/** Rebuild a payload from the submitted plain-text fields. */
export function fieldsToPayload(kind: SectionKind, get: (name: string) => string): object {
  switch (kind) {
    case 'hero':
    case 'stats':
      return {
        stats: lines(get('stats')).map((l) => {
          const [value = '', label = '', ...rest] = l.split('|').map((p) => p.trim());
          return { value, label, ...(rest.length ? { note: rest.join(' | ') } : {}) };
        }),
      };
    case 'table': {
      const all = lines(get('table')).map((l) => l.split('|').map((c) => c.trim()));
      const note = get('note').trim();
      return {
        headers: all[0] ?? [],
        rows: all.slice(1),
        ...(note ? { note } : {}),
      };
    }
    case 'columns':
      return {
        columns: get('columns')
          .split(/\n\s*---\s*\n/)
          .map((block) => {
            const ls = lines(block);
            if (ls.length === 0) return null;
            const title = ls[0];
            let subtitle = '';
            let rest = ls.slice(1);
            if (rest[0]?.startsWith('~')) {
              subtitle = rest[0].replace(/^~\s*/, '');
              rest = rest.slice(1);
            }
            return { title, ...(subtitle ? { subtitle } : {}), lines: rest };
          })
          .filter(Boolean),
      };
    case 'beforeafter':
      return {
        beforeTitle: get('beforeTitle').trim() || 'Before',
        afterTitle: get('afterTitle').trim() || 'After',
        before: lines(get('before')),
        after: lines(get('after')),
        ...(get('impact').trim() ? { impact: get('impact').trim() } : {}),
      };
    case 'list':
      return {
        items: lines(get('items')),
        numbered: /^\s*y/i.test(get('numbered')),
      };
    case 'bars': {
      const unitRaw = get('unit').trim().toLowerCase();
      return {
        unit: unitRaw === 'pct' || unitRaw === 'plain' ? unitRaw : 'aed',
        bars: lines(get('bars')).map((l) => {
          const [label = '', valueRaw = '', ...rest] = l.split('|').map((p) => p.trim());
          const value = Number(valueRaw.replace(/[^0-9.\-]/g, ''));
          return {
            label,
            value: Number.isFinite(value) ? value : 0,
            ...(rest.length ? { note: rest.join(' | ') } : {}),
          };
        }),
      };
    }
    case 'flow':
      return {
        steps: lines(get('steps')).map((l) => {
          const [label = '', ...rest] = l.split('|').map((p) => p.trim());
          return { label, ...(rest.length ? { note: rest.join(' | ') } : {}) };
        }),
      };
    case 'quote':
    case 'text':
      return { text: get('text').trim() };
  }
}

/** Template payload for a freshly added section. */
export function templatePayload(kind: SectionKind): object {
  switch (kind) {
    case 'hero':
    case 'stats':
      return { stats: [{ value: '—', label: 'New number', note: '' }] };
    case 'table':
      return { headers: ['Column A', 'Column B'], rows: [['…', '…']] };
    case 'columns':
      return { columns: [{ title: 'Column one', lines: ['First point'] }, { title: 'Column two', lines: ['First point'] }] };
    case 'beforeafter':
      return { beforeTitle: 'Before', afterTitle: 'After', before: ['…'], after: ['…'] };
    case 'list':
      return { items: ['First item'], numbered: false };
    case 'bars':
      return { unit: 'aed', bars: [{ label: 'First bar', value: 100 }] };
    case 'flow':
      return { steps: [{ label: 'Step one', note: 'What happens here' }, { label: 'Step two', note: '…' }] };
    case 'quote':
    case 'text':
      return { text: '…' };
  }
}
