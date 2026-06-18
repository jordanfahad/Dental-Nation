"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EVIDENCE_BUCKET, requireSupabaseAdmin } from "@/lib/supabase/server";
import { recomputeProjectEffort } from "@/lib/impact/effort";
import { isAdmin, READ_ONLY_ERROR } from "@/lib/auth/role";
import type { ActionState } from "@/lib/impact/action-types";

/**
 * ============================ THE ONE HUMAN GATE ============================
 * HARD RULE (do not weaken): the live dashboard reflects ONLY data that exists
 * in `projects`/`tasks`. The ONLY path from an ingestion job to those tables is
 * an explicit Approve here. There is no auto-apply and no "high-confidence
 * shortcut". Reject writes nothing; "do nothing" (navigating away) writes
 * nothing. "Anything missing gets added" means PROPOSED as a new project,
 * pending this approval.
 * ===========================================================================
 */

function db() {
  return requireSupabaseAdmin();
}

interface ApplyPayload {
  newProjects: Array<{
    include: boolean;
    component_id: string | null;
    name: string;
    description?: string | null;
    status: string;
    ownership: string;
    target_date?: string | null;
    zoho_task_external_ids?: string[];
  }>;
  matched: Array<{
    include: boolean;
    project_id: string;
    updates: { status?: string; progress_pct?: number; impact_summary?: string; target_date?: string };
    zoho_task_external_ids?: string[];
  }>;
  newTasks: Array<{
    include: boolean;
    project_ref: string;
    name: string;
    status?: string | null;
    effort_hours?: number | null;
    due_date?: string | null;
  }>;
  flowcharts?: Array<{
    include: boolean;
    key?: string | null;
    title: string;
    subtitle?: string | null;
    layers: unknown;
  }>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "flowchart";
}

function projectSource(jobSource: string): string {
  switch (jobSource) {
    case "zoho":
      return "zoho";
    case "pdf":
      return "pdf";
    case "excel":
    case "csv":
      return "excel";
    case "html_report":
      return "html_report";
    default:
      return "manual";
  }
}

/** Assign existing (Zoho) tasks to a project by external_id and roll their logged hours into effort_log. */
async function assignZohoTasks(projectId: string, externalIds: string[]) {
  if (!externalIds.length) return;
  const { data: tasks } = await db()
    .from("tasks")
    .select("id, effort_hours, completed_date, due_date")
    .in("external_id", externalIds);
  const ids = (tasks ?? []).map((t) => (t as { id: string }).id);
  if (!ids.length) return;

  await db().from("tasks").update({ project_id: projectId }).in("id", ids);

  // Rebuild effort_log entries for these tasks (avoids double counting on re-approval).
  await db().from("effort_log").delete().in("task_id", ids);
  const today = new Date().toISOString().slice(0, 10);
  const logs = (tasks ?? [])
    .filter((t) => Number((t as { effort_hours: number | null }).effort_hours) > 0)
    .map((t) => {
      const tt = t as { id: string; effort_hours: number; completed_date: string | null; due_date: string | null };
      return {
        project_id: projectId,
        task_id: tt.id,
        log_date: tt.completed_date ?? tt.due_date ?? today,
        hours: tt.effort_hours,
        source: "zoho",
      };
    });
  if (logs.length) await db().from("effort_log").insert(logs);
  await recomputeProjectEffort(projectId);
}

export async function applyReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, error: READ_ONLY_ERROR };
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { ok: false, error: "Missing job id" };

  let payload: ApplyPayload;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { ok: false, error: "Could not read the review selections." };
  }

  const { data: job } = await db().from("ingestion_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, error: "Ingestion job not found." };
  if ((job as { status: string }).status === "applied") {
    return { ok: false, error: "This job was already applied." };
  }
  const jobSource = (job as { source_type: string }).source_type;
  const src = projectSource(jobSource);

  const createdByName = new Map<string, string>();

  // 1) New projects
  for (const p of payload.newProjects ?? []) {
    if (!p.include || !p.name?.trim()) continue;
    const { data, error } = await db()
      .from("projects")
      .insert({
        component_id: p.component_id || null,
        name: p.name.trim(),
        description: p.description || null,
        status: p.status || "in_progress",
        ownership: p.ownership === "collaborator" ? "collaborator" : "owner",
        target_date: p.target_date || null,
        source: src,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: `Project "${p.name}": ${error.message}` };
    const newId = (data as { id: string }).id;
    createdByName.set(p.name.trim().toLowerCase(), newId);
    if (p.zoho_task_external_ids?.length) await assignZohoTasks(newId, p.zoho_task_external_ids);
  }

  // 2) Updates to existing projects (only the accepted fields are present)
  for (const m of payload.matched ?? []) {
    if (!m.include) continue;
    const patch: Record<string, unknown> = {};
    if (m.updates.status) patch.status = m.updates.status;
    if (m.updates.progress_pct !== undefined) patch.progress_pct = m.updates.progress_pct;
    if (m.updates.impact_summary) patch.impact_summary = m.updates.impact_summary;
    if (m.updates.target_date) patch.target_date = m.updates.target_date;
    if (Object.keys(patch).length) {
      const { error } = await db().from("projects").update(patch).eq("id", m.project_id);
      if (error) return { ok: false, error: `Update failed: ${error.message}` };
    }
    if (m.zoho_task_external_ids?.length) await assignZohoTasks(m.project_id, m.zoho_task_external_ids);
  }

  // 3) New tasks
  for (const t of payload.newTasks ?? []) {
    if (!t.include || !t.name?.trim()) continue;
    let projectId: string | null = null;
    if (createdByName.has(t.project_ref?.trim().toLowerCase())) {
      projectId = createdByName.get(t.project_ref.trim().toLowerCase())!;
    } else if (t.project_ref) {
      // treat project_ref as an existing project id if it resolves
      const { data } = await db().from("projects").select("id").eq("id", t.project_ref).maybeSingle();
      if (data) projectId = (data as { id: string }).id;
    }
    const { error } = await db()
      .from("tasks")
      .insert({
        project_id: projectId,
        name: t.name.trim(),
        status: t.status || "open",
        effort_hours: t.effort_hours ?? null,
        due_date: t.due_date || null,
        source: "manual",
      });
    if (error) return { ok: false, error: `Task "${t.name}": ${error.message}` };
  }

  // 4) Flowcharts — upsert by key (refreshes the operating-architecture / roadmap diagrams).
  for (const fc of payload.flowcharts ?? []) {
    if (!fc.include || !fc.title?.trim() || !Array.isArray(fc.layers)) continue;
    const key = (fc.key?.trim() || slugify(fc.title));
    const { error } = await db()
      .from("flowcharts")
      .upsert(
        {
          key,
          title: fc.title.trim(),
          subtitle: fc.subtitle || null,
          spec: { layers: fc.layers },
          source: src,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) return { ok: false, error: `Flowchart "${fc.title}": ${error.message}` };
  }

  const now = new Date().toISOString();
  await db().from("ingestion_jobs").update({ status: "applied", reviewed_at: now, applied_at: now }).eq("id", jobId);

  revalidatePath("/impact");
  revalidatePath("/");
  redirect("/impact");
}

export async function rejectReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, error: READ_ONLY_ERROR };
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { ok: false, error: "Missing job id" };
  // Reject writes NOTHING to projects/tasks.
  await db()
    .from("ingestion_jobs")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", jobId);
  revalidatePath("/impact");
  redirect("/impact");
}

/** Delete an ingestion job outright (also removes its stored raw upload). Writes
 *  nothing to projects/tasks — it only discards the staged proposal. */
export async function deleteIngestionJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, error: READ_ONLY_ERROR };
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return { ok: false, error: "Missing job id" };
  const { data: job } = await db()
    .from("ingestion_jobs")
    .select("storage_path")
    .eq("id", jobId)
    .maybeSingle();
  const sp = (job as { storage_path?: string } | null)?.storage_path;
  if (sp) await db().storage.from(EVIDENCE_BUCKET).remove([sp]);
  await db().from("ingestion_jobs").delete().eq("id", jobId);
  revalidatePath("/impact");
  redirect("/impact/review");
}
