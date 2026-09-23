'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { editableFor, loadTracker, seedRows } from '@/lib/smileclub/tracker';
import {
  CRM_TEST_SPEC,
  SMILECLUB_PROJECT_ID,
  TASK_BY_KEY,
  TRACKER_SOURCE,
  externalIdFor,
  type TrackerState,
  type VerifyResult,
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
  if (task.verify) {
    const sb0 = getSupabaseAdmin();
    const { data: cur } = sb0
      ? await sb0.from('tasks').select('raw').eq('source', TRACKER_SOURCE).eq('external_id', externalIdFor(task.key)).maybeSingle()
      : { data: null };
    const curStage = Number((cur?.raw as { stage?: number } | null)?.stage ?? 0);
    if (stage !== curStage) return { ok: false, error: 'This task completes from its evidence check — upload the file instead.' };
  }
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

/**
 * Evidence check for "Close out the old WhatsApp test": the owner uploads the
 * reconciliation spreadsheet; this stores it (private evidence bucket), checks
 * it against CRM_TEST_SPEC and moves the task to the stage the evidence
 * supports — complete only when every check passes.
 */
export async function verifyCrmTestAction(formData: FormData): Promise<ProgressResult> {
  const task = TASK_BY_KEY['g-crm-test'];
  const { canEdit, viewer } = await editableFor();
  if (canEdit !== 'all' && !canEdit.includes(task.who)) return { ok: false, error: 'Only Gautam (or Fahad) can upload this evidence.' };
  const f = formData.get('file');
  if (!f || typeof f === 'string' || !(f as File).size) return { ok: false, error: 'Choose the filled-in spreadsheet first.' };
  const file = f as File;
  if (file.size > 3_500_000) return { ok: false, error: 'File is too large (max 3.5 MB).' };

  const buf = Buffer.from(await file.arrayBuffer());
  let rows: Record<string, unknown>[] = [];
  try {
    const XLSX = await import('xlsx');
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  } catch {
    return { ok: false, error: 'Could not read the file — upload the template as .xlsx or .csv.' };
  }

  const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
  const data = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [norm(k).replace(/\s+/g, '_'), norm(v)])));
  const cols = new Set(data.length ? Object.keys(data[0]) : []);
  const missingCols = CRM_TEST_SPEC.columns.filter((c) => !cols.has(c));
  const replies = data.filter((r) => r.record_type === 'reply');
  const failures = data.filter((r) => r.record_type === 'failure');
  const badReply = replies.filter((r) => !CRM_TEST_SPEC.replyOutcomes.includes(r.outcome)).length;
  const badFail = failures.filter((r) => !CRM_TEST_SPEC.failureReasons.includes(r.outcome)).length;
  const unmatched = replies.filter((r) => !['yes', 'no'].includes(r.paid_membership)).length;
  const confirmed = replies.filter((r) => r.paid_membership === 'yes').length;

  const checks = [
    { label: 'File readable with the template columns', ok: missingCols.length === 0 && data.length > 0, detail: missingCols.length ? `Missing column(s): ${missingCols.join(', ')}` : `${data.length} rows read` },
    { label: `${CRM_TEST_SPEC.replies} replies classified`, ok: replies.length >= CRM_TEST_SPEC.replies && badReply === 0, detail: `${replies.length} of ${CRM_TEST_SPEC.replies} reply rows${badReply ? ` · ${badReply} without a valid outcome` : ''}` },
    { label: `${CRM_TEST_SPEC.failures} failures explained`, ok: failures.length >= CRM_TEST_SPEC.failures && badFail === 0, detail: `${failures.length} of ${CRM_TEST_SPEC.failures} failure rows${badFail ? ` · ${badFail} without a valid reason` : ''}` },
    { label: 'Every reply matched to payments', ok: replies.length > 0 && unmatched === 0, detail: unmatched ? `${unmatched} replies still need yes/no` : `${confirmed} paid membership(s) found` },
  ];
  const warnings: string[] = [];
  const phoneLike = data.some((r) => Object.values(r).some((v) => /(\+?971|\b05\d)[\d\s-]{7,}/.test(v)));
  if (phoneLike) warnings.push('The file appears to contain phone numbers — please use message/contact IDs instead next time.');

  // Stage = consecutive checks passed (the flow is sequential: upload → replies → failures → payments).
  let stage = 0;
  for (const c of checks) { if (c.ok) stage += 1; else break; }
  const pass = checks.every((c) => c.ok);
  if (pass) stage = task.steps.length;

  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `smileclub/crm-test/${Date.now()}-${safe}`;
  const up = await sb.storage.from('evidence').upload(path, buf, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (up.error) return { ok: false, error: up.error.message };

  const actor = viewer ?? 'Fahad (admin)';
  const result: VerifyResult = { at: new Date().toISOString(), by: actor, file: file.name, pass, checks, confirmed, warnings };
  const ext = externalIdFor(task.key);
  const { data: existing } = await sb.from('tasks').select('id,raw').eq('source', TRACKER_SOURCE).eq('external_id', ext).maybeSingle();
  if (!existing) return { ok: false, error: 'Task not found in the tracker.' };
  const prevStage = Number((existing.raw as { stage?: number } | null)?.stage ?? 0);
  const status = pass ? 'done' : stage > 0 ? 'in_progress' : 'open';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  const raw = { ...(existing.raw as object), stage, steps: task.steps.length, verify: result, updated_by: actor };
  const { error } = await sb.from('tasks').update({ status, raw, completed_date: pass ? today : null, updated_at: new Date().toISOString() }).eq('id', existing.id);
  if (error) return { ok: false, error: error.message };
  await sb.from('evidence_files').insert({
    project_id: SMILECLUB_PROJECT_ID, task_id: existing.id, filename: file.name, storage_path: path,
    mime: file.type || null, size_bytes: file.size, description: 'Smile Club — old WhatsApp test reconciliation (auto-checked)', visible_to_ceo: false,
  });
  const note = pass
    ? `Evidence verified automatically: ${confirmed} paid membership(s) from the test.`
    : `Evidence checked — not complete yet: ${checks.filter((c) => !c.ok).map((c) => c.detail).join('; ')}`;
  await sb.from('task_events').insert({ task_id: existing.id, actor, from_stage: prevStage, to_stage: stage, status, note });

  revalidatePath('/');
  revalidatePath('/impact');
  return { ok: true, state: await loadTracker() };
}
