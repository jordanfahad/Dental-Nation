'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@/lib/auth/role';
import { effectiveVisibleTabs } from '@/components/tabs';
import { recordLeadCall, type CallOutcome } from '@/lib/ops/unverifiedLeads';

const OUTCOMES: readonly CallOutcome[] = ['booked', 'callback', 'noanswer', 'notinterested', 'wrongnumber'];

/**
 * Log a call outcome against an unverified lead.
 *
 * Gated on access to the Clinical Operations tab, NOT on admin: reception (the
 * `receptionist` role) is exactly who works this list, and an admin-only gate
 * would make the feature useless to the people it is for.
 */
export async function logLeadCall(
  leadRef: string,
  outcome: string,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: 'Signed out — sign in again to log a call.' };

  const tabs = effectiveVisibleTabs(user.role, user.extraTabs, user.removedTabs);
  if (!tabs.includes('clinical-ops')) return { ok: false, error: 'You do not have access to Clinical Operations.' };

  if (!(OUTCOMES as readonly string[]).includes(outcome)) return { ok: false, error: 'Unknown outcome.' };
  if (note.length > 500) return { ok: false, error: 'Note is too long (max 500 characters).' };

  const res = await recordLeadCall({
    leadRef,
    outcome: outcome as CallOutcome,
    note,
    by: user.name ?? (user.uid ? null : 'Admin'),
    uid: user.uid,
  });
  if (res.ok) revalidatePath('/');
  return res;
}
