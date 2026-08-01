'use server';

import { revalidatePath } from 'next/cache';
import { currentRole } from '@/lib/auth/role';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import type { ActionState } from '@/lib/impact/action-types';

/**
 * Marketing OS mutations — Phase 1 of the spec's data feeds: weekly MANUAL
 * snapshot entry plus approval-queue keeping, admin only. Phases 2/3 (GSC,
 * GA4, WhatsApp APIs) replace the manual writes, not this surface.
 */

async function guard(): Promise<ActionState> {
  if ((await currentRole()) !== 'admin') return { ok: false, error: 'Admin only.' };
  if (!getSupabaseAdmin()) return { ok: false, error: 'Supabase not configured.' };
  return null;
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const text = (v: FormDataEntryValue | null): string | null => {
  const s = String(v ?? '').trim();
  return s || null;
};

/** Upsert one weekly KPI snapshot (kpi_slug + date unique). */
export async function saveSnapshot(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const kpiSlug = text(formData.get('kpi_slug'));
  const date = text(formData.get('date'));
  const value = num(formData.get('value'));
  if (!kpiSlug || !date) return { ok: false, error: 'KPI and date are required.' };
  if (value == null) return { ok: false, error: 'A numeric value is required.' };

  const { error } = await db
    .from('mos_snapshots')
    .upsert({ kpi_slug: kpiSlug, date, value, note: text(formData.get('note')) }, { onConflict: 'kpi_slug,date' });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/** Add an approval-queue item. */
export async function addApproval(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const title = text(formData.get('title'));
  const track = text(formData.get('track')) === 'clinical' ? 'clinical' : 'seo';
  const submittedAt = text(formData.get('submitted_at'));
  if (!title || !submittedAt) return { ok: false, error: 'Title and submitted date are required.' };

  const { error } = await db.from('mos_approvals').insert({
    pipeline_slug: text(formData.get('pipeline')) ?? 'organic',
    item_title: title,
    item_url: text(formData.get('url')),
    track,
    gate: text(formData.get('gate')),
    submitted_at: submittedAt,
    sla_days: track === 'clinical' ? 5 : 3,
    note: text(formData.get('note')),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/** Decide an approval item (approve / reject / publish) or fix its track. */
export async function decideApproval(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const id = Number(formData.get('id'));
  if (!Number.isFinite(id)) return { ok: false, error: 'Missing item id.' };
  const decision = String(formData.get('decision') ?? '');
  const reviewer = text(formData.get('reviewer'));
  const track = text(formData.get('track'));
  const today = new Date().toISOString().slice(0, 10);

  const patch: Record<string, unknown> = {};
  if (track === 'seo' || track === 'clinical') {
    patch.track = track;
    patch.sla_days = track === 'clinical' ? 5 : 3;
  }
  if (reviewer) patch.reviewer_name = reviewer;
  if (decision === 'approved' || decision === 'rejected') {
    patch.status = decision;
    patch.decided_at = today;
  } else if (decision === 'published') {
    patch.status = 'published';
    patch.published_at = today;
  } else if (decision === 'pending') {
    patch.status = 'pending';
    patch.decided_at = null;
    patch.published_at = null;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to change.' };

  // Friendly version of the DB rule: clinical content cannot be approved
  // without a NAMED reviewer (who becomes the page's reviewedBy).
  if (patch.status === 'approved' || patch.status === 'published') {
    const { data } = await db.from('mos_approvals').select('track, reviewer_name').eq('id', id).maybeSingle();
    const effTrack = (patch.track as string) ?? (data as { track?: string } | null)?.track;
    const effReviewer = reviewer ?? (data as { reviewer_name?: string } | null)?.reviewer_name;
    if (effTrack === 'clinical' && !effReviewer) {
      return { ok: false, error: 'Clinical content needs a named clinical reviewer before approval (E-E-A-T reviewedBy).' };
    }
  }

  const { error } = await db.from('mos_approvals').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/** Upsert one week of management-effort hours. */
export async function saveEffort(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const weekStart = text(formData.get('week_start'));
  if (!weekStart) return { ok: false, error: 'Week start date is required.' };

  const { error } = await db.from('mos_effort').upsert(
    {
      week_start: weekStart,
      hours_meetings: num(formData.get('hours_meetings')) ?? 0,
      hours_reviews: num(formData.get('hours_reviews')) ?? 0,
      hours_qa: num(formData.get('hours_qa')) ?? 0,
      rework_items: num(formData.get('rework_items')) ?? 0,
      total_items: num(formData.get('total_items')) ?? 0,
      loaded_rate_aed: num(formData.get('loaded_rate')),
    },
    { onConflict: 'week_start' },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/** Upsert one month of vendor/infra cost. */
export async function saveCost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;
  const db = getSupabaseAdmin()!;

  const month = text(formData.get('month'));
  if (!month) return { ok: false, error: 'Month is required.' };
  const first = `${month.slice(0, 7)}-01`;

  const { error } = await db.from('mos_costs').upsert(
    {
      month: first,
      zavis_fee_aed: num(formData.get('zavis_fee')),
      azure_cost_aed: num(formData.get('azure_cost')),
      other_aed: num(formData.get('other')),
      note: text(formData.get('note')),
    },
    { onConflict: 'month' },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}
