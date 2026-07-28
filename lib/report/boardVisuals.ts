/**
 * Parsers for the Board Report's visual commentary blocks.
 *
 * The narrative commentary stays prose — it reads like a manager talking. These
 * two blocks are the at-a-glance layer above it, for a reader who wants the
 * shape of the period before the words: what happened when, and where each
 * workstream stands.
 *
 * Stored as plain text, not JSON, deliberately. It lives in the same
 * admin-editable textarea as the prose (app_secrets via saveCommentary), and a
 * manager should be able to add a line without balancing braces. One item per
 * line, fields separated by "|":
 *
 *   Timeline    17 Jul | milestone | Campaign kicked off
 *   Workstreams blocked | ArabyAds restart | Emailed Sylvia, awaiting reply
 *
 * Tolerant by design: unknown kinds/statuses fall back to a neutral style,
 * missing trailing fields are optional, blank lines and #comments are skipped.
 * A malformed line renders plainly rather than breaking the board report.
 */

export type TimelineKind = 'milestone' | 'issue' | 'fix' | 'pending';
export type WorkStatus = 'done' | 'progress' | 'blocked' | 'pending';

export interface TimelineItem {
  date: string;
  kind: TimelineKind;
  label: string;
}

export interface WorkstreamItem {
  status: WorkStatus;
  name: string;
  note: string;
}

const KINDS: TimelineKind[] = ['milestone', 'issue', 'fix', 'pending'];
const STATUSES: WorkStatus[] = ['done', 'progress', 'blocked', 'pending'];

/** Split into non-empty, non-comment lines of "a | b | c" fields. */
function rows(body: string): string[][] {
  return String(body ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('|').map((c) => c.trim()));
}

export function parseTimeline(body: string): TimelineItem[] {
  return rows(body)
    .map((c) => {
      const date = c[0] ?? '';
      // "date | label" is allowed — the kind is the optional middle field.
      const hasKind = c.length >= 3 && KINDS.includes(c[1]?.toLowerCase() as TimelineKind);
      return {
        date,
        kind: hasKind ? (c[1].toLowerCase() as TimelineKind) : 'milestone',
        label: (hasKind ? c.slice(2).join(' — ') : c.slice(1).join(' — ')) || '',
      };
    })
    .filter((i) => i.date && i.label);
}

export function parseWorkstreams(body: string): WorkstreamItem[] {
  return rows(body)
    .map((c) => {
      const raw = (c[0] ?? '').toLowerCase();
      const status = (STATUSES.includes(raw as WorkStatus) ? raw : 'pending') as WorkStatus;
      return { status, name: c[1] ?? '', note: c.slice(2).join(' — ') };
    })
    .filter((i) => i.name);
}

/** Counts per status — drives the summary strip above the cards. */
export function tallyWorkstreams(items: WorkstreamItem[]): Record<WorkStatus, number> {
  const out: Record<WorkStatus, number> = { done: 0, progress: 0, blocked: 0, pending: 0 };
  for (const i of items) out[i.status] += 1;
  return out;
}
