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
  return { progress, events, canEdit, viewer, today, live: true };
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
