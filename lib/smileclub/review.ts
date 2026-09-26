/**
 * Script sign-off (25 Sep): Fahad creates and reviews every dentist's scripts
 * (pre-final); Ms Shadi, Dr Luvi and Gautam each give the final approval on the
 * system. An approval counts only for the exact wording it was given on
 * (scriptHash) — any later change needs a fresh approval. Every decision and
 * input goes into the team's next Smile Club email (lib/smileclub/alerts.ts —
 * at most two a day per person). Rows: lane_e.sc_script_reviews.
 */
import { DENTISTS, scriptHash, type Dentist } from '@/lib/smileclub/scripts';

export type ReviewerId = 'shadi' | 'luvi' | 'gautam';
export type Decision = 'approved' | 'changes' | 'input' | 'sent';

export const REVIEWERS: { id: ReviewerId; name: string; role: string; user: string }[] = [
  { id: 'shadi', name: 'Ms Shadi', role: 'Operations Director', user: 'Ms Shadi' },
  { id: 'luvi', name: 'Dr Luvi', role: 'Head of Operations', user: 'Dr Luvi' },
  { id: 'gautam', name: 'Gautam', role: 'Project owner', user: 'Gautam' },
];

/** dashboard_users.name → reviewer. */
export const REVIEWER_BY_USER: Record<string, ReviewerId> = Object.fromEntries(REVIEWERS.map((r) => [r.user, r.id]));

export interface ReviewEntry {
  dentistId: string;
  /** 'fahad' for sent-for-review and admin inputs. */
  reviewer: ReviewerId | 'fahad';
  decision: Decision;
  note: string | null;
  hash: string;
  actor: string;
  at: string;
}

export type ReviewerState = 'approved' | 'changes' | 'stale' | 'pending';

export interface DentistReview {
  hash: string;
  sent: ReviewEntry | null;
  per: Record<ReviewerId, { state: ReviewerState; last: ReviewEntry | null }>;
  final: boolean;
  thread: ReviewEntry[];
}

/** Current sign-off status for one dentist's scripts. */
export function reviewFor(d: Dentist, entries: ReviewEntry[]): DentistReview {
  const hash = scriptHash(d);
  const mine = entries.filter((e) => e.dentistId === d.id).sort((a, b) => a.at.localeCompare(b.at));
  const per = {} as DentistReview['per'];
  for (const r of REVIEWERS) {
    const last = [...mine].reverse().find((e) => e.reviewer === r.id && (e.decision === 'approved' || e.decision === 'changes')) ?? null;
    const state: ReviewerState = !last ? 'pending' : last.hash !== hash ? 'stale' : last.decision === 'approved' ? 'approved' : 'changes';
    per[r.id] = { state, last };
  }
  const sent = [...mine].reverse().find((e) => e.decision === 'sent') ?? null;
  return {
    hash,
    sent: sent && sent.hash === hash ? sent : null,
    per,
    final: REVIEWERS.every((r) => per[r.id].state === 'approved'),
    thread: mine.filter((e) => e.note),
  };
}

export function reviewSummary(entries: ReviewEntry[]) {
  const all = DENTISTS.map((d) => ({ d, r: reviewFor(d, entries) }));
  return {
    all,
    final: all.filter((x) => x.r.final).length,
    changes: all.filter((x) => Object.values(x.r.per).some((p) => p.state === 'changes')).length,
    sent: all.filter((x) => x.r.sent).length,
  };
}
