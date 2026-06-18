"use server";

import { revalidatePath } from "next/cache";
import { EVIDENCE_BUCKET, requireSupabaseAdmin } from "@/lib/supabase/server";
import { recomputeProjectEffort } from "@/lib/impact/effort";
import { isAdmin, READ_ONLY_ERROR } from "@/lib/auth/role";
import type { ActionState } from "@/lib/impact/action-types";

function db() {
  return requireSupabaseAdmin();
}

/** The write gate: viewer-role sessions cannot mutate anything (enforced here,
 *  server-side — not just hidden in the UI). */
async function denyIfViewer(): Promise<ActionState | null> {
  return (await isAdmin()) ? null : { ok: false, error: READ_ONLY_ERROR };
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
function nullable(v: FormDataEntryValue | null): string | null {
  const s = str(v);
  return s.length ? s : null;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = str(v);
  if (!s) return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function refresh(projectId?: string | null) {
  revalidatePath("/impact");
  revalidatePath("/"); // the Lane E report (cross-link surface) lives at "/"
  if (projectId) revalidatePath(`/impact/projects/${projectId}`);
}

// ----------------------------- PROJECTS --------------------------------
export async function createProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const name = str(formData.get("name"));
  if (!name) return { ok: false, error: "Project name is required" };
  const { data, error } = await db()
    .from("projects")
    .insert({
      name,
      component_id: nullable(formData.get("component_id")),
      description: nullable(formData.get("description")),
      status: str(formData.get("status")) || "not_started",
      ownership: str(formData.get("ownership")) || "owner",
      owner: nullable(formData.get("owner")),
      priority: nullable(formData.get("priority")),
      progress_pct: numOrNull(formData.get("progress_pct")) ?? 0,
      impact_summary: nullable(formData.get("impact_summary")),
      start_date: nullable(formData.get("start_date")),
      target_date: nullable(formData.get("target_date")),
      link: nullable(formData.get("link")),
      source: "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, id: data?.id };
}

export async function updateProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  if (!id) return { ok: false, error: "Missing project id" };
  const patch: Record<string, unknown> = {
    name: str(formData.get("name")),
    component_id: nullable(formData.get("component_id")),
    description: nullable(formData.get("description")),
    status: str(formData.get("status")) || "not_started",
    ownership: str(formData.get("ownership")) || "owner",
    owner: nullable(formData.get("owner")),
    priority: nullable(formData.get("priority")),
    progress_pct: numOrNull(formData.get("progress_pct")) ?? 0,
    impact_summary: nullable(formData.get("impact_summary")),
    start_date: nullable(formData.get("start_date")),
    target_date: nullable(formData.get("target_date")),
    completed_date: nullable(formData.get("completed_date")),
    link: nullable(formData.get("link")),
  };
  const { error } = await db().from("projects").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(id);
  return { ok: true, id };
}

export async function deleteProjectAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  if (!id) return { ok: false, error: "Missing project id" };
  const { error } = await db().from("projects").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// ------------------------------- TASKS ---------------------------------
export async function createTaskAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const name = str(formData.get("name"));
  const projectId = nullable(formData.get("project_id"));
  if (!name) return { ok: false, error: "Task name is required" };
  const { error } = await db()
    .from("tasks")
    .insert({
      name,
      project_id: projectId,
      status: nullable(formData.get("status")),
      owner: nullable(formData.get("owner")),
      effort_hours: numOrNull(formData.get("effort_hours")),
      start_date: nullable(formData.get("start_date")),
      due_date: nullable(formData.get("due_date")),
      completed_date: nullable(formData.get("completed_date")),
      link: nullable(formData.get("link")),
      source: "manual",
    });
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

export async function updateTaskAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  if (!id) return { ok: false, error: "Missing task id" };
  const projectId = nullable(formData.get("project_id"));
  const { error } = await db()
    .from("tasks")
    .update({
      name: str(formData.get("name")),
      project_id: projectId,
      status: nullable(formData.get("status")),
      owner: nullable(formData.get("owner")),
      effort_hours: numOrNull(formData.get("effort_hours")),
      due_date: nullable(formData.get("due_date")),
      completed_date: nullable(formData.get("completed_date")),
      link: nullable(formData.get("link")),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

export async function deleteTaskAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  const projectId = nullable(formData.get("project_id"));
  if (!id) return { ok: false, error: "Missing task id" };
  const { error } = await db().from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

// ----------------------------- BLOCKERS --------------------------------
export async function createBlockerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const description = str(formData.get("description"));
  const projectId = nullable(formData.get("project_id"));
  if (!description) return { ok: false, error: "Describe the blocker" };
  const { error } = await db()
    .from("project_blockers")
    .insert({
      project_id: projectId,
      description,
      severity: nullable(formData.get("severity")),
      needs: nullable(formData.get("needs")),
      owner: nullable(formData.get("owner")),
      raised_date: nullable(formData.get("raised_date")) ?? new Date().toISOString().slice(0, 10),
      status: str(formData.get("status")) || "open",
    });
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

export async function updateBlockerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  const projectId = nullable(formData.get("project_id"));
  if (!id) return { ok: false, error: "Missing blocker id" };
  const { error } = await db()
    .from("project_blockers")
    .update({
      description: str(formData.get("description")),
      severity: nullable(formData.get("severity")),
      needs: nullable(formData.get("needs")),
      owner: nullable(formData.get("owner")),
      status: str(formData.get("status")) || "open",
      resolution: nullable(formData.get("resolution")),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

export async function deleteBlockerAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  const projectId = nullable(formData.get("project_id"));
  if (!id) return { ok: false, error: "Missing blocker id" };
  const { error } = await db().from("project_blockers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

// ------------------------------ EFFORT ---------------------------------
export async function addEffortAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const projectId = nullable(formData.get("project_id"));
  const hours = numOrNull(formData.get("hours"));
  if (!projectId) return { ok: false, error: "Pick a project" };
  if (hours == null || hours <= 0) return { ok: false, error: "Enter hours" };
  const { error } = await db()
    .from("effort_log")
    .insert({
      project_id: projectId,
      task_id: nullable(formData.get("task_id")),
      log_date: nullable(formData.get("log_date")) ?? new Date().toISOString().slice(0, 10),
      hours,
      note: nullable(formData.get("note")),
      source: "manual",
    });
  if (error) return { ok: false, error: error.message };
  await recomputeProjectEffort(projectId);
  refresh(projectId);
  return { ok: true };
}

// ----------------------------- EVIDENCE --------------------------------
export async function uploadEvidenceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const fileEntry = formData.get("file");
  if (!fileEntry || typeof fileEntry === "string") return { ok: false, error: "Choose a file to upload" };
  const f = fileEntry as File;
  if (!f.size) return { ok: false, error: "The file is empty" };

  const buf = Buffer.from(await f.arrayBuffer());
  const projectId = nullable(formData.get("project_id"));
  const componentId = nullable(formData.get("component_id"));
  const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `evidence/${Date.now()}-${safe}`;

  const upload = await db().storage.from(EVIDENCE_BUCKET).upload(path, buf, {
    contentType: f.type || "application/octet-stream",
    upsert: false,
  });
  if (upload.error) return { ok: false, error: upload.error.message };

  const { error } = await db().from("evidence_files").insert({
    project_id: projectId,
    task_id: nullable(formData.get("task_id")),
    component_id: componentId,
    filename: f.name,
    storage_path: path,
    mime: f.type || null,
    size_bytes: f.size,
    description: nullable(formData.get("description")),
    visible_to_ceo: formData.get("visible_to_ceo") !== null,
  });
  if (error) return { ok: false, error: error.message };
  refresh(projectId);
  return { ok: true };
}

export async function deleteEvidenceAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const denied = await denyIfViewer();
  if (denied) return denied;
  const id = str(formData.get("id"));
  const projectId = nullable(formData.get("project_id"));
  if (!id) return { ok: false, error: "Missing file id" };
  const { data } = await db().from("evidence_files").select("storage_path").eq("id", id).maybeSingle();
  const sp = (data as { storage_path?: string } | null)?.storage_path;
  if (sp) await db().storage.from(EVIDENCE_BUCKET).remove([sp]);
  await db().from("evidence_files").delete().eq("id", id);
  refresh(projectId);
  return { ok: true };
}
