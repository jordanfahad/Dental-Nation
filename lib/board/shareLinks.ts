import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Tokenized read-only share links for the board growth report and the leave
 * handover (migration 0020).
 *
 * Three scopes, deliberately separate tokens:
 *   - `growth`     → /share/growth/[token]     — board & investors
 *   - `handover`   → /share/handover/[token]   — Mr. Akbar only, not for the board
 *   - `operations` → /share/operations/[token] — the Head of Operations report
 *   - `room`       → /share/room/[token]       — the Investor Evidence Room: one
 *     token opening the landing page and every section behind it
 *
 * A token is validated SERVER-SIDE on every request and is scope-checked: a
 * handover token pasted into the board URL is a 404, and vice versa. Revoking
 * one link never touches the other.
 */

export type ShareScope = 'growth' | 'handover' | 'operations' | 'room';

/**
 * Which board-facing page a `growth` link renders. One link system, two views
 * (spec v3 §0): the Command Deck is the instrument one-pager issued to the
 * board and investors; `funnel` keeps every link minted before it working
 * exactly as it did.
 */
export type ShareView = 'command_deck' | 'funnel';

export interface ShareLink {
  id: number;
  token: string;
  scope: ShareScope;
  view: ShareView;
  label: string;
  createdBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  revoked: boolean;
  viewCount: number;
  lastViewedAt: string | null;
  /** Per-link module toggles: {"partner": false} hides that Command Deck card. */
  sections: Record<string, boolean> | null;
  /** Operations links only: the holder may EDIT the report, not just read it. */
  canEdit: boolean;
}

const TABLE = 'report_share_links';

/** A token must be a real uuid before it ever reaches the database. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toLink(row: any): ShareLink {
  return {
    id: row.id,
    token: row.token,
    scope: row.scope,
    view: row.view === 'funnel' ? 'funnel' : 'command_deck',
    canEdit: Boolean(row.can_edit),
    sections: row.sections && typeof row.sections === 'object' ? row.sections : null,
    label: row.label ?? '',
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? null,
    revoked: Boolean(row.revoked),
    viewCount: row.view_count ?? 0,
    lastViewedAt: row.last_viewed_at ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Resolve a token for a PUBLIC share route. Returns null for anything that
 * isn't a live link of exactly this scope — unknown, malformed, revoked,
 * expired, or the wrong scope. The caller renders notFound() on null; the
 * visitor can never tell which of those it was.
 */
export async function resolveShareToken(
  token: string,
  scope: ShareScope,
): Promise<ShareLink | null> {
  if (!UUID_RE.test(token)) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;

  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('token', token)
    .eq('scope', scope)
    .maybeSingle();

  if (error || !data) return null;
  const link = toLink(data);
  if (link.revoked) return null;
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) return null;
  return link;
}

/**
 * Increment the view counter. Fire-and-forget: a counter failure must never
 * take down the board member's page mid-meeting, so errors are swallowed.
 */
export async function bumpShareView(token: string): Promise<void> {
  if (!UUID_RE.test(token)) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  try {
    await db.rpc('bump_share_link_view', { p_token: token });
  } catch {
    /* counting is best-effort */
  }
}

/** All links of a scope, newest first — for the admin panel. */
export async function listShareLinks(scope: ShareScope): Promise<ShareLink[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('scope', scope)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(toLink);
}

/** Mint a new link. The database generates the uuid. */
export async function createShareLink(
  scope: ShareScope,
  label: string,
  createdBy?: string | null,
  view: ShareView = 'command_deck',
  canEdit = false,
): Promise<ShareLink | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .from(TABLE)
    .insert({
      scope,
      label: label.trim().slice(0, 120),
      created_by: createdBy ?? null,
      // The view only means anything for board links; a handover link has one page.
      view: scope === 'growth' ? view : 'funnel',
      // Editing rides on a link ONLY for the operations report, and only when
      // minted that way on purpose — every other scope is read-only by type.
      can_edit: scope === 'operations' && canEdit,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return toLink(data);
}

/**
 * Resolve a token that must carry EDIT rights on the operations report.
 * Anything else — read-only link, wrong scope, revoked, expired — is null.
 */
export async function resolveEditToken(token: string): Promise<ShareLink | null> {
  const link = await resolveShareToken(token, 'operations');
  return link?.canEdit ? link : null;
}

/**
 * Revoke (or un-revoke) a link. Revocation is a flag rather than a delete so
 * the view history survives — "who opened the Q3 board link, how often" stays
 * answerable after the link is killed.
 */
export async function setShareLinkRevoked(id: number, revoked: boolean): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { error } = await db.from(TABLE).update({ revoked }).eq('id', id);
  return !error;
}
