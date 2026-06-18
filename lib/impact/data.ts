import "server-only";
import { getSupabaseAdmin, type AdminClient } from "@/lib/supabase/server";
import { FIXED_COMPONENTS } from "@/lib/impact/constants";
import type {
  Component,
  EffortLog,
  EvidenceFile,
  IngestionJob,
  LaneESnapshot,
  Project,
  ProjectBlocker,
  Task,
} from "@/lib/impact/types";

/**
 * The Impact tab's read path. All reads run server-side via the service-role
 * client, which is bound to the `lane_e` schema (lib/supabase/server.ts) — the
 * same schema that holds the Lane E report tables, so the §7 cross-link to
 * daily_snapshot uses this very client.
 *
 * Like the Lane E report, this degrades gracefully: if Supabase is not
 * configured the getters return empty data (and the six fixed components from
 * the seed catalog) so the page renders its empty states instead of crashing.
 */

function fallbackComponents(): Component[] {
  return FIXED_COMPONENTS.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sort_order: c.sort_order,
    default_role: "owner",
  }));
}

export async function getComponents(db: AdminClient | null = getSupabaseAdmin()): Promise<Component[]> {
  if (!db) return fallbackComponents();
  const { data, error } = await db.from("components").select("*").order("sort_order");
  if (error || !data?.length) return fallbackComponents();
  return data as Component[];
}

export async function getProjects(db: AdminClient | null = getSupabaseAdmin()): Promise<Project[]> {
  if (!db) return [];
  const { data, error } = await db
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

export async function getTasks(): Promise<Task[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data, error } = await db
    .from("tasks")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) return [];
  return (data ?? []) as Task[];
}

export async function getTasksForProject(projectId: string): Promise<Task[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as Task[];
}

export interface BlockerWithProject extends ProjectBlocker {
  project_name: string | null;
  component_id: string | null;
}

export async function getBlockers(openOnly = false): Promise<BlockerWithProject[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  let query = db.from("project_blockers").select("*, projects(name, component_id)");
  if (openOnly) query = query.neq("status", "resolved");
  const { data, error } = await query;
  if (error) return [];
  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as ProjectBlocker & { projects?: { name: string; component_id: string } | null };
    return {
      ...r,
      project_name: r.projects?.name ?? null,
      component_id: r.projects?.component_id ?? null,
    };
  });
}

export async function getBlockersForProject(projectId: string): Promise<ProjectBlocker[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from("project_blockers").select("*").eq("project_id", projectId);
  return (data ?? []) as ProjectBlocker[];
}

export async function getEvidence(): Promise<EvidenceFile[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("evidence_files")
    .select("*")
    .order("uploaded_at", { ascending: false });
  return (data ?? []) as EvidenceFile[];
}

export async function getEvidenceForProject(projectId: string): Promise<EvidenceFile[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("evidence_files")
    .select("*")
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });
  return (data ?? []) as EvidenceFile[];
}

export async function getEffortLog(): Promise<EffortLog[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db.from("effort_log").select("*").order("log_date", { ascending: true });
  return (data ?? []) as EffortLog[];
}

export async function getEffortForProject(projectId: string): Promise<EffortLog[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("effort_log")
    .select("*")
    .eq("project_id", projectId)
    .order("log_date", { ascending: false });
  return (data ?? []) as EffortLog[];
}

/**
 * §7 cross-link — READ the EXISTING Lane E snapshot; never duplicate it.
 * lane_e.daily_snapshot stores funnel stages as a jsonb array (each
 * { key, label, today, total, ... }); we pull the "since launch" totals for
 * qualified inquiries + Glow Up bookings, plus the best channel. Resilient: no
 * snapshot (or unconfigured) → null, and the UI hides the "live — Lane E" tags.
 */
export async function getLaneESnapshot(): Promise<LaneESnapshot | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  try {
    const { data } = await db
      .from("daily_snapshot")
      .select("report_date, best_channel, funnel")
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const funnel = Array.isArray((data as { funnel?: unknown }).funnel)
      ? ((data as { funnel: Array<Record<string, unknown>> }).funnel)
      : [];
    const stageTotal = (key: string): number | null => {
      const s = funnel.find((f) => f.key === key);
      if (!s) return null;
      const v = (s.total ?? s.today) as number | null | undefined;
      return v == null ? null : Number(v);
    };
    return {
      snapshot_date: (data as { report_date: string }).report_date,
      qualified_inquiries: stageTotal("qualified_inquiries"),
      glow_up_bookings: stageTotal("glow_up_bookings"),
      best_channel: ((data as { best_channel?: string | null }).best_channel) ?? null,
      leads_total: stageTotal("inquiries") ?? stageTotal("total_inquiries"),
    };
  } catch {
    return null;
  }
}

export async function getIngestionJobs(): Promise<IngestionJob[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const { data } = await db
    .from("ingestion_jobs")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as IngestionJob[];
}

export async function getIngestionJob(id: string): Promise<IngestionJob | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("ingestion_jobs").select("*").eq("id", id).maybeSingle();
  return (data as IngestionJob) ?? null;
}

export async function getLastAppliedJob(): Promise<IngestionJob | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("ingestion_jobs")
    .select("*")
    .eq("status", "applied")
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as IngestionJob) ?? null;
}

export interface DashboardData {
  components: Component[];
  projects: Project[];
  tasks: Task[];
  blockers: BlockerWithProject[];
  evidence: EvidenceFile[];
  effortLog: EffortLog[];
  snapshot: LaneESnapshot | null;
  lastApplied: IngestionJob | null;
  pendingReviewCount: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [components, projects, tasks, blockers, evidence, effortLog, snapshot, lastApplied, jobs] =
    await Promise.all([
      getComponents(),
      getProjects(),
      getTasks(),
      getBlockers(),
      getEvidence(),
      getEffortLog(),
      getLaneESnapshot(),
      getLastAppliedJob(),
      getIngestionJobs(),
    ]);
  return {
    components,
    projects,
    tasks,
    blockers,
    evidence,
    effortLog,
    snapshot,
    lastApplied,
    pendingReviewCount: jobs.filter((j) => j.status === "pending_review").length,
  };
}
