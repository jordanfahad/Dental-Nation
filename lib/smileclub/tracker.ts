import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { currentUser } from '@/lib/auth/role';
import {
  EDITORS,
  OWNER_LABEL,
  TEAM_TASKS,
  TRACKER_SOURCE,
  externalIdFor,
  type Person,
  type TaskEvent,
  type TaskProgress,
  type TrackerState,
  type VerifyResult,
} from '@/lib/smileclub/team';
import type { CalEvent, Company, CompanyType, CorpState, EventKind, Stage } from '@/lib/smileclub/corporate';
import type { ReviewEntry } from '@/lib/smileclub/review';

/** Calendar day in Dubai — the clinics' day, independent of server timezone. */
export function dubaiToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
}

/** Which people's tasks the signed-in user may update. */
export async function editableFor(): Promise<{ canEdit: Person[] | 'all'; viewer: string | null }> {
  const u = await currentUser();
  if (!u) return { canEdit: [], viewer: null };
  if (u.role === 'admin') return { canEdit: 'all', viewer: u.name ?? 'Fahad (admin)' };
  return { canEdit: (u.name && EDITORS[u.name]) || [], viewer: u.name };
}

interface TaskRow {
  id: string;
  external_id: string;
  status: string | null;
  raw: { stage?: number; note?: string | null; updated_by?: string | null; verify?: VerifyResult | null } | null;
  updated_at: string | null;
}

/** Live progress + activity trail for every team task. Never throws: an
 *  unreachable database renders the plan with every task at stage 0. */
export async function loadTracker(): Promise<TrackerState> {
  const today = dubaiToday();
  const { canEdit, viewer } = await editableFor();
  const empty: TrackerState = { progress: {}, events: [], canEdit, viewer, today, live: false };
  const sb = getSupabaseAdmin();
  if (!sb) return empty;

  const { data: rows, error } = await sb
    .from('tasks')
    .select('id,external_id,status,raw,updated_at')
    .eq('source', TRACKER_SOURCE);
  if (error || !rows) return empty;

  const byId: Record<string, string> = {};
  const progress: Record<string, TaskProgress> = {};
  for (const r of rows as TaskRow[]) {
    const key = r.external_id.replace(/^sc-team:/, '');
    byId[r.id] = key;
    const s = r.status;
    progress[key] = {
      stage: Number(r.raw?.stage ?? 0),
      status: s === 'done' || s === 'blocked' || s === 'in_progress' ? s : 'open',
      note: r.raw?.note ?? null,
      updatedAt: r.updated_at,
      updatedBy: r.raw?.updated_by ?? null,
      verify: r.raw?.verify ?? null,
    };
  }

  const ids = Object.keys(byId);
  let events: TaskEvent[] = [];
  if (ids.length) {
    const { data: ev } = await sb
      .from('task_events')
      .select('task_id,at,actor,from_stage,to_stage,status,note')
      .in('task_id', ids)
      .order('at', { ascending: false })
      .limit(300);
    events = (ev ?? []).map((e) => ({
      key: byId[e.task_id as string],
      at: e.at as string,
      actor: e.actor as string,
      fromStage: Number(e.from_stage ?? 0),
      toStage: Number(e.to_stage ?? 0),
      status: (e.status as string) ?? 'open',
      note: (e.note as string | null) ?? null,
    }));
  }
  const [corp, reviews, al] = await Promise.all([
    loadCorp(sb),
    loadReviews(sb),
    sb.from('sc_alert_log').select('kind,day,sent_at,ok,note').order('sent_at', { ascending: false }).limit(12),
  ]);
  const alerts = (al.data ?? []).map((a) => ({ kind: a.kind as string, day: a.day as string, sentAt: a.sent_at as string, ok: !!a.ok, note: (a.note as string | null) ?? null }));
  return { progress, events, canEdit, viewer, today, live: true, corp, reviews, alerts };
}

/** Script sign-off trail (reminder bookkeeping rows excluded). */
export async function loadReviews(sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<ReviewEntry[]> {
  const { data } = await sb.from('sc_script_reviews').select('dentist_id,reviewer,decision,note,hash,actor,at').neq('decision', 'reminder').order('at');
  return (data ?? []).map((r) => ({
    dentistId: r.dentist_id as string,
    reviewer: r.reviewer as ReviewEntry['reviewer'],
    decision: r.decision as ReviewEntry['decision'],
    note: (r.note as string | null) ?? null,
    hash: r.hash as string,
    actor: r.actor as string,
    at: r.at as string,
  }));
}

/** Gautam's pipeline and the follow-ups imported from his calendar. */
export async function loadCorp(sb: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<CorpState> {
  const [{ data: cs }, { data: ev }] = await Promise.all([
    sb.from('sc_companies').select('id,name,type,area,staff_band,source,stage,next_step,next_date,members,note,updated_at,updated_by').order('name'),
    sb.from('sc_calendar_events').select('uid,starts_at,ends_at,title,location,company_id,kind,task_key,uploaded_at,uploaded_by').order('starts_at'),
  ]);
  const companies: Company[] = (cs ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    type: (c.type as CompanyType) ?? 'unsorted',
    area: (c.area as string | null) ?? null,
    staffBand: (c.staff_band as string | null) ?? null,
    source: (c.source as string | null) ?? null,
    stage: (c.stage as Stage) ?? 'target',
    nextStep: (c.next_step as string | null) ?? null,
    nextDate: (c.next_date as string | null) ?? null,
    members: Number(c.members ?? 0),
    note: (c.note as string | null) ?? null,
    updatedAt: (c.updated_at as string | null) ?? null,
    updatedBy: (c.updated_by as string | null) ?? null,
  }));
  const nameOf = Object.fromEntries(companies.map((c) => [c.id, c.name]));
  const rows = ev ?? [];
  const events: CalEvent[] = rows.map((e) => ({
    uid: e.uid as string,
    startsAt: e.starts_at as string,
    endsAt: (e.ends_at as string | null) ?? null,
    title: e.title as string,
    location: (e.location as string | null) ?? null,
    companyId: (e.company_id as string | null) ?? null,
    company: e.company_id ? nameOf[e.company_id as string] ?? null : null,
    kind: (e.kind as EventKind) ?? 'other',
    taskKey: e.task_key as string,
  }));
  const latest = rows.reduce<{ at: string; by: string } | null>((a, e) => (!a || (e.uploaded_at as string) > a.at ? { at: e.uploaded_at as string, by: (e.uploaded_by as string) ?? '' } : a), null);
  return { companies, events, lastUpload: latest };
}

/** Rows to seed lane_e.tasks with (one per team task), used by the seeder. */
export function seedRows(projectId: string) {
  return TEAM_TASKS.map((t) => ({
    project_id: projectId,
    external_id: externalIdFor(t.key),
    name: t.task,
    owner: ownerText(t.who),
    status: 'open',
    due_date: t.dueIso,
    source: TRACKER_SOURCE,
    link: '/?tab=smileclub',
    raw: { stage: 0, steps: t.steps.length, note: null, updated_by: null },
  }));
}

function ownerText(p: Person): string {
  return OWNER_LABEL[p];
}
