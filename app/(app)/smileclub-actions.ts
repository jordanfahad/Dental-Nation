'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { editableFor, loadReviews, loadTracker, seedRows } from '@/lib/smileclub/tracker';
import { DENTISTS, scriptHash } from '@/lib/smileclub/scripts';
import { REVIEWER_BY_USER, type Decision, type ReviewEntry } from '@/lib/smileclub/review';
import { mailDecision, mailSentForReview } from '@/lib/smileclub/reviewMail';
import { alertBlocked, previewAlert } from '@/lib/smileclub/alerts';
import {
  CAL_WINDOW,
  COMPANY_TYPES,
  STAGES,
  STAGE_ORDER,
  kindOf,
  matchCompany,
  parseIcs,
  taskFor,
  type EventKind,
  type Stage,
} from '@/lib/smileclub/corporate';
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
  if (status === 'blocked' && prevStatus !== 'blocked') await alertBlocked(task, note, actor).catch(() => undefined);

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

/**
 * Review comment on any team task. Anyone signed in to the plan may comment
 * (the team reviews each other's work — e.g. Mohan's videos); only owners
 * move steps. Comments are appended to lane_e.task_events.
 */
export async function commentTeamTaskAction(input: { key: string; text: string }): Promise<ProgressResult> {
  const task = TASK_BY_KEY[input.key];
  if (!task) return { ok: false, error: 'Unknown task.' };
  const { canEdit, viewer } = await editableFor();
  if (!viewer && canEdit !== 'all') return { ok: false, error: 'Sign in to comment.' };
  const text = (input.text ?? '').trim().slice(0, 1000);
  if (!text) return { ok: false, error: 'Write a comment first.' };
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const { data: row } = await sb.from('tasks').select('id,raw').eq('source', TRACKER_SOURCE).eq('external_id', externalIdFor(task.key)).maybeSingle();
  if (!row) return { ok: false, error: 'Task not found in the tracker.' };
  const stage = Number((row.raw as { stage?: number } | null)?.stage ?? 0);
  const { error } = await sb.from('task_events').insert({ task_id: row.id, actor: viewer ?? 'Fahad (admin)', from_stage: stage, to_stage: stage, status: 'comment', note: text });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true, state: await loadTracker() };
}

/* ── Gautam's company pipeline + calendar import (25 Sep) ── */

async function canRunCorporate() {
  const { canEdit, viewer } = await editableFor();
  const ok = canEdit === 'all' || canEdit.includes('gautam');
  return { ok, actor: viewer ?? 'Fahad (admin)' };
}

const TYPE_IDS = new Set<string>([...COMPANY_TYPES.map((t) => t.id), 'unsorted']);
const STAGE_IDS = new Set<string>(STAGES.map((x) => x.id));
const clip = (v: unknown, n: number) => {
  const t = String(v ?? '').trim().slice(0, n);
  return t || null;
};

/** Add or update one company in Gautam's pipeline. Gautam and Fahad only. */
export async function saveCompanyAction(input: {
  id?: string;
  name: string;
  type: string;
  area?: string;
  staffBand?: string;
  source?: string;
  stage: string;
  nextStep?: string;
  nextDate?: string;
  members?: number;
  note?: string;
}): Promise<ProgressResult> {
  const { ok, actor } = await canRunCorporate();
  if (!ok) return { ok: false, error: 'Only Gautam (or Fahad) can edit the company pipeline.' };
  const name = clip(input.name, 120);
  if (!name) return { ok: false, error: 'Company name is required.' };
  if (!TYPE_IDS.has(input.type)) return { ok: false, error: 'Choose a company type.' };
  if (!STAGE_IDS.has(input.stage)) return { ok: false, error: 'Choose a stage.' };
  const nextDate = input.nextDate && /^\d{4}-\d{2}-\d{2}$/.test(input.nextDate) ? input.nextDate : null;
  const members = Math.max(0, Math.min(5000, Math.round(Number(input.members ?? 0)) || 0));
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const row = {
    name, type: input.type, area: clip(input.area, 80), staff_band: clip(input.staffBand, 40), source: clip(input.source, 80),
    stage: input.stage, next_step: clip(input.nextStep, 200), next_date: nextDate, members, note: clip(input.note, 500),
    updated_at: new Date().toISOString(), updated_by: actor,
  };
  const { error } = input.id
    ? await sb.from('sc_companies').update(row).eq('id', input.id)
    : await sb.from('sc_companies').insert(row);
  if (error) return { ok: false, error: /duplicate|unique/i.test(error.message) ? 'That company is already in the pipeline.' : error.message };
  revalidatePath('/');
  return { ok: true, state: await loadTracker() };
}

export type CalendarResult =
  | { ok: true; state: TrackerState; summary: { filed: number; newCompanies: number; ignored: number; removed: number } }
  | { ok: false; error: string };

/**
 * Import Gautam's calendar (.ics). Only entries named "SC – Company – …" or
 * naming a pipeline company, dated inside the programme window, are stored;
 * everything else in the file is ignored and never saved. Each entry is filed
 * against its company and the matching corporate task; company stages move
 * forward (never back) from the entries already held.
 */
export async function uploadCalendarAction(formData: FormData): Promise<CalendarResult> {
  const { ok, actor } = await canRunCorporate();
  if (!ok) return { ok: false, error: 'Only Gautam (or Fahad) can upload the calendar.' };
  const f = formData.get('file');
  if (!f || typeof f === 'string' || !(f as File).size) return { ok: false, error: 'Choose the calendar file (.ics) first.' };
  const file = f as File;
  if (file.size > 2_000_000) return { ok: false, error: 'File is too large (max 2 MB).' };
  if (!/\.ics$/i.test(file.name) && file.type !== 'text/calendar') return { ok: false, error: 'Upload the calendar export as an .ics file.' };
  const text = await file.text();
  if (!/BEGIN:VCALENDAR/.test(text)) return { ok: false, error: 'This does not look like a calendar file (.ics).' };

  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const { data: cs } = await sb.from('sc_companies').select('id,name,stage');
  const companies = (cs ?? []).map((c) => ({ id: c.id as string, name: c.name as string, stage: (c.stage as Stage) ?? 'target' }));

  const all = parseIcs(text);
  const from = `${CAL_WINDOW.from}T00:00:00+04:00`;
  const to = `${CAL_WINDOW.to}T23:59:59+04:00`;
  let ignored = 0;
  let newCompanies = 0;
  const cancelled: string[] = [];
  const rows: { uid: string; owner: string; starts_at: string; ends_at: string | null; title: string; location: string | null; company_id: string | null; kind: EventKind; task_key: string; uploaded_at: string; uploaded_by: string }[] = [];
  const now = new Date().toISOString();
  for (const ev of all) {
    const t = Date.parse(ev.start);
    if (!Number.isFinite(t) || t < Date.parse(from) || t > Date.parse(to)) { ignored += 1; continue; }
    const m = matchCompany(ev, companies);
    if (!m || !m.name) { ignored += 1; continue; }
    if (ev.cancelled) { cancelled.push(ev.uid); continue; }
    let companyId = m.id;
    if (!companyId) {
      const { data: created, error } = await sb.from('sc_companies')
        .insert({ name: m.name.slice(0, 120), type: 'unsorted', stage: 'contacted', source: 'calendar', updated_by: actor })
        .select('id').single();
      if (error || !created) { ignored += 1; continue; }
      companyId = created.id as string;
      companies.push({ id: companyId, name: m.name, stage: 'contacted' });
      newCompanies += 1;
    }
    const kind = kindOf(m.kindText);
    rows.push({ uid: ev.uid, owner: 'gautam', starts_at: new Date(t).toISOString(), ends_at: ev.end ? new Date(Date.parse(ev.end)).toISOString() : null,
      title: ev.summary, location: ev.location, company_id: companyId, kind, task_key: taskFor(kind, new Date(t + 4 * 3600_000).toISOString()), uploaded_at: now, uploaded_by: actor });
  }
  if (rows.length) {
    const { error } = await sb.from('sc_calendar_events').upsert(rows, { onConflict: 'uid' });
    if (error) return { ok: false, error: error.message };
  }
  // Future entries that were deleted or cancelled in the calendar are removed here too.
  const keep = new Set(rows.map((r) => r.uid));
  const { data: future } = await sb.from('sc_calendar_events').select('uid').eq('owner', 'gautam').gte('starts_at', now);
  const drop = [...new Set([...cancelled, ...(future ?? []).map((r) => r.uid as string).filter((u) => !keep.has(u))])];
  if (drop.length) await sb.from('sc_calendar_events').delete().in('uid', drop);

  // Move company stages forward from past entries; set the next step from the next entry.
  const { data: held } = await sb.from('sc_calendar_events').select('company_id,starts_at,title,kind').eq('owner', 'gautam').order('starts_at');
  const REACH: Partial<Record<EventKind, Stage>> = { visit: 'contacted', 'follow-up': 'contacted', meeting: 'meeting', proposal: 'proposal', launch: 'launched' };
  for (const c of companies) {
    const mine = (held ?? []).filter((e) => e.company_id === c.id);
    if (!mine.length) continue;
    let stage: Stage = c.stage;
    for (const e of mine) {
      const s2 = REACH[e.kind as EventKind];
      if (e.starts_at as string <= now && s2 && stage !== 'lost' && STAGE_ORDER[s2] > STAGE_ORDER[stage]) stage = s2;
    }
    const next = mine.find((e) => (e.starts_at as string) > now);
    await sb.from('sc_companies').update({
      stage, next_step: next ? (next.title as string).slice(0, 200) : null,
      next_date: next ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date(next.starts_at as string)) : null,
      updated_at: now, updated_by: actor,
    }).eq('id', c.id);
  }

  // One activity-log line per corporate task that received entries.
  const perTask: Record<string, number> = {};
  for (const r of rows) perTask[r.task_key] = (perTask[r.task_key] ?? 0) + 1;
  for (const [key, n] of Object.entries(perTask)) {
    const { data: tr } = await sb.from('tasks').select('id,raw').eq('source', TRACKER_SOURCE).eq('external_id', externalIdFor(key)).maybeSingle();
    if (!tr) continue;
    const stg = Number((tr.raw as { stage?: number } | null)?.stage ?? 0);
    await sb.from('task_events').insert({ task_id: tr.id, actor, from_stage: stg, to_stage: stg, status: 'calendar', note: `Calendar upload: ${n} company ${n === 1 ? 'entry' : 'entries'} filed to this task.` });
  }

  revalidatePath('/');
  return { ok: true, state: await loadTracker(), summary: { filed: rows.length, newCompanies, ignored, removed: drop.length } };
}

/* ── Script sign-off: Fahad pre-final → Ms Shadi, Dr Luvi, Gautam approve (25 Sep) ── */

export type ReviewResult = { ok: true; state: TrackerState; mail: string } | { ok: false; error: string };

/**
 * Approve, request changes on, or add input to one dentist's scripts. Approvals
 * and change requests only from the named reviewers, signed in as themselves;
 * Fahad (admin) may add input. Each decision is pinned to the current wording
 * (scriptHash) and emailed to Fahad and the other reviewers.
 */
export async function reviewScriptAction(input: { dentistId: string; decision: string; note?: string; onBehalf?: string }): Promise<ReviewResult> {
  const d = DENTISTS.find((x) => x.id === input.dentistId);
  if (!d) return { ok: false, error: 'Unknown dentist.' };
  const { canEdit, viewer } = await editableFor();
  const isAdmin = canEdit === 'all';
  // Fahad may record a decision a reviewer sent by email (marked as such in the trail).
  const behalf = isAdmin && input.onBehalf && ['shadi', 'luvi', 'gautam'].includes(input.onBehalf) ? (input.onBehalf as 'shadi' | 'luvi' | 'gautam') : undefined;
  const reviewer = behalf ?? (viewer ? REVIEWER_BY_USER[viewer] : undefined);
  const decision = input.decision as Decision;
  if (!['approved', 'changes', 'input'].includes(decision)) return { ok: false, error: 'Invalid decision.' };
  if (decision !== 'input' && !reviewer) return { ok: false, error: 'Only Ms Shadi, Dr Luvi or Gautam can approve or request changes — signed in as themselves.' };
  if (!reviewer && !isAdmin) return { ok: false, error: 'Only the reviewers and Fahad can add input here.' };
  const note = (input.note ?? '').trim().slice(0, 1500) || null;
  if (decision !== 'approved' && !note) return { ok: false, error: 'Write what should change first.' };
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const actorName = behalf ? `${{ shadi: 'Ms Shadi', luvi: 'Dr Luvi', gautam: 'Gautam' }[behalf]} (by email, recorded by Fahad)` : viewer ?? 'Fahad (admin)';
  const row = { dentist_id: d.id, reviewer: reviewer ?? 'fahad', decision, note, hash: scriptHash(d), actor: actorName };
  const { error } = await sb.from('sc_script_reviews').insert(row);
  if (error) return { ok: false, error: error.message };
  const entries = await loadReviews(sb);
  const entry: ReviewEntry = { dentistId: row.dentist_id, reviewer: row.reviewer as ReviewEntry['reviewer'], decision, note, hash: row.hash, actor: row.actor, at: new Date().toISOString() };
  const m = await mailDecision(entry, entries);
  revalidatePath('/');
  return { ok: true, state: await loadTracker(), mail: m.note + (m.missing.length ? ` No address on record for: ${m.missing.join(', ')}.` : '') };
}

/** Fahad marks dentists' scripts as created and reviewed (pre-final) and emails the three reviewers. */
export async function sendScriptsForReviewAction(input: { dentistIds: string[] }): Promise<ReviewResult> {
  const { canEdit, viewer } = await editableFor();
  if (canEdit !== 'all') return { ok: false, error: 'Only Fahad can send scripts for sign-off.' };
  const ds = DENTISTS.filter((d) => input.dentistIds.includes(d.id));
  if (!ds.length) return { ok: false, error: 'Choose at least one dentist.' };
  const sb = getSupabaseAdmin();
  if (!sb) return { ok: false, error: 'Tracking database unavailable.' };
  const { error } = await sb.from('sc_script_reviews').insert(ds.map((d) => ({ dentist_id: d.id, reviewer: 'fahad', decision: 'sent', note: null, hash: scriptHash(d), actor: viewer ?? 'Fahad (admin)' })));
  if (error) return { ok: false, error: error.message };
  const m = await mailSentForReview(ds.map((d) => d.id));
  revalidatePath('/');
  return { ok: true, state: await loadTracker(), mail: m.note + (m.missing.length ? ` No address on record for: ${m.missing.join(', ')}.` : '') };
}

/** Fahad only: email himself a preview of any Smile Club alert. */
export async function previewAlertAction(kind: 'shoot' | 'gautam' | 'luvi' | 'mohan'): Promise<{ ok: boolean; message: string }> {
  const { canEdit } = await editableFor();
  if (canEdit !== 'all') return { ok: false, message: 'Only Fahad can send previews.' };
  if (!['shoot', 'gautam', 'luvi', 'mohan'].includes(kind)) return { ok: false, message: 'Unknown alert.' };
  return { ok: true, message: await previewAlert(kind) };
}
