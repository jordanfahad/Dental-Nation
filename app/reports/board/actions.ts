'use server';

import { revalidatePath } from 'next/cache';
import { currentRole, currentUser } from '@/lib/auth/role';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { createShareLink, setShareLinkRevoked, type ShareScope } from '@/lib/board/shareLinks';
import type { ActionState } from '@/lib/impact/action-types';

/**
 * Board report admin mutations — mint/revoke share links and enter the manual
 * metrics that have no live feed yet.
 *
 * These live under /reports/board, which sits behind the dashboard password
 * gate, and every one re-checks `admin` server-side. Nothing here is reachable
 * from a /share/* route: those pages render no form and call no action.
 */

async function guard(): Promise<ActionState> {
  if ((await currentRole()) !== 'admin') return { ok: false, error: 'Admin only.' };
  if (!getSupabaseAdmin()) return { ok: false, error: 'Supabase not configured.' };
  return null;
}

const ADMIN_PATH = '/reports/board';

function scopeOf(v: FormDataEntryValue | null): ShareScope | null {
  const s = String(v ?? '').trim();
  return s === 'growth' || s === 'handover' ? s : null;
}

/** Mint a new tokenized link for a scope. */
export async function generateLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const scope = scopeOf(formData.get('scope'));
  if (!scope) return { ok: false, error: 'Unknown link type.' };

  const label = String(formData.get('label') ?? '').trim();
  if (!label) return { ok: false, error: 'Give the link a label so you can tell them apart later.' };

  // Board links carry a view: the Command Deck (default for board/investor
  // recipients) or the funnel report. Anything else falls back to the deck.
  const view = String(formData.get('view') ?? '') === 'funnel' ? 'funnel' : 'command_deck';

  const who = (await currentUser())?.name ?? 'admin';
  const link = await createShareLink(scope, label, who, view);
  if (!link) return { ok: false, error: 'Could not create the link.' };

  revalidatePath(ADMIN_PATH);
  return { ok: true, id: link.token };
}

/**
 * Revoke or restore a link. Revocation takes effect on the very next request —
 * the public route re-validates the token server-side every time, so there is
 * no cached copy to outlive it.
 */
export async function toggleRevoke(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) return { ok: false, error: 'Unknown link.' };
  const revoked = String(formData.get('revoked') ?? '') === 'true';

  const ok = await setShareLinkRevoked(id, revoked);
  if (!ok) return { ok: false, error: 'Could not update the link.' };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}

/**
 * Enter or update a manual metric (GSC, WhatsApp, Smile Club). Storing the
 * period alongside the value is deliberate: a number on a board report has to
 * say what window it describes, and `source_note` renders on the card so a
 * hand-entered figure is never mistaken for a live one.
 */
export async function saveManualMetric(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const metricKey = String(formData.get('metric_key') ?? '').trim();
  const periodStart = String(formData.get('period_start') ?? '').trim();
  const periodEnd = String(formData.get('period_end') ?? '').trim();
  const raw = String(formData.get('value') ?? '').trim();

  if (!metricKey) return { ok: false, error: 'Pick a metric.' };
  if (!periodStart || !periodEnd) return { ok: false, error: 'Both period dates are required.' };
  if (periodStart > periodEnd) return { ok: false, error: 'The period starts after it ends.' };

  const value = raw === '' ? null : Number(raw.replace(/,/g, ''));
  if (value != null && !Number.isFinite(value)) return { ok: false, error: 'Value must be a number.' };

  const sourceNote = String(formData.get('source_note') ?? '').trim() || 'Entered manually';
  const who = (await currentUser())?.name ?? 'admin';

  const { error } = await db.from('growth_report_metrics').upsert(
    {
      metric_key: metricKey,
      period_start: periodStart,
      period_end: periodEnd,
      value,
      unit: String(formData.get('unit') ?? '').trim() || null,
      source_note: sourceNote,
      updated_at: new Date().toISOString(),
      updated_by: who,
    },
    { onConflict: 'metric_key,period_start,period_end' },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(ADMIN_PATH);
  return { ok: true };
}
