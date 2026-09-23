'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { editableFor, loadTracker, seedRows } from '@/lib/smileclub/tracker';
import {
  SMILECLUB_PROJECT_ID,
  TASK_BY_KEY,
  TRACKER_SOURCE,
  externalIdFor,
  type TrackerState,
} from '@/lib/smileclub/team';

export type ProgressResult = { ok: true; state: TrackerState } | { ok: false; error: string };

const STATUSES = new Set(['open', 'in_progress', 'done', 'blocked']);

/**
 * Move one team task: set its completed-step count, flag it blocked, and/or
 * add a note. Server-side checks: the key exists, the stage is in range, and
 * the signed-in user owns that person's tasks (or is admin). Every accepted
 * change appends a row to lane_e.task_events — the audit trail Fahad reports
 * from.
 */
export async function updateTeamTaskAction(input: {
  key: string;
  stage: number;
  blocked?: boolean;
  note?: string;
}): Promise<ProgressResult> {
  const task = TASK_BY_KEY[input.key];
  if (!task) return { ok: false, error: 'Unknown task.' };
  const { canEdit, viewer } = await editableFor();
  if (!viewer && canEdit !== 'all') return { ok: false, error: 'Sign in to update tasks.' };
  if (canEdit !== 'all' && !canEdit.includes(task.who)) {
    return { ok: false, error: 'You can only update your own tasks.' };
  }
  const stage = Math.max(0, Math.min(task.steps.length, Math.round(Number(input.stage))));
  if (!Number.isFinite(stage)) return { ok: false, error: 'Invalid step.' };
  const note = (input.note ?? '').trim().slice(0, 500) || null;
  const status = stage >= task.steps.length ? 'done' : input.blocked ? 'blocked' : stage > 0 ? 'in_progress' : 'open';
  if (!STATUSES.has(status)) return { ok: false, error: 'Invalid status.' };

  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };

  const ext = externalIdFor(task.key);
  const { data: existing } = await sb
    .from('tasks')
    .select('id,raw,status')
    .eq('source', TRACKER_SOURCE)
    .eq('external_id', ext)
    .maybeSingle();

  const actor = viewer ?? 'Fahad (admin)';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  const prevStage = Number((existing?.raw as { stage?: number } | null)?.stage ?? 0);
  const prevStatus = (existing?.status as string | null) ?? 'open';
  const prevNote = (existing?.raw as { note?: string | null } | null)?.note ?? null;
  if (existing && prevStage === stage && prevStatus === status && !note) {
    return { ok: true, state: await loadTracker() };
  }

  const raw = { stage, steps: task.steps.length, note: note ?? prevNote, updated_by: actor };
  let taskId = existing?.id as string | undefined;
  if (taskId) {
    const { error } = await sb
      .from('tasks')
      .update({ status, raw, completed_date: status === 'done' ? today : null, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) return { ok: false, error: error.message };
  } else {
    const seed = seedRows(SMILECLUB_PROJECT_ID).find((r) => r.external_id === ext)!;
    const { data, error } = await sb
      .from('tasks')
      .insert({ ...seed, status, raw, completed_date: status === 'done' ? today : null })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'Could not create the task.' };
    taskId = data.id as string;
  }

  const { error: evErr } = await sb.from('task_events').insert({
    task_id: taskId,
    actor,
    from_stage: prevStage,
    to_stage: stage,
    status,
    note,
  });
  if (evErr) return { ok: false, error: evErr.message };

  revalidatePath('/');
  revalidatePath('/impact');
  return { ok: true, state: await loadTracker() };
}
