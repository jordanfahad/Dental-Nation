import { requireSupabaseAdmin } from "@/lib/supabase/server";
import { mapHeaders, mapZohoStatus, parseHours, parseZohoDate } from "@/config/zoho-mapping";
import type { Component, ExtractionResult, Project } from "@/lib/impact/types";

/**
 * Zoho structural import (§5b) — NO LLM for the parse. Task data is trusted:
 * tasks are upserted by external_id (re-import updates, never duplicates) and
 * land as orphans (project_id null). Only the GROUPING (which project each task
 * belongs to + the component) is a suggestion, routed through the review gate.
 */
export async function importZoho(opts: {
  headers: string[];
  rows: string[][];
  filename: string;
  components: Component[];
  projects: Project[];
}): Promise<{ extracted: ExtractionResult; upserted: number }> {
  const db = requireSupabaseAdmin();
  const m = mapHeaders(opts.headers);
  // Dedupe on the globally-unique "Task System ID" when present (the human "Task ID"
  // like "G-1-T4" is only unique within a project), so re-imports never duplicate.
  const sysIdx = opts.headers.findIndex((h) => h.trim().toLowerCase() === "task system id");
  if (sysIdx >= 0) m.external_id = sysIdx;
  const get = (row: string[], field: string) => (m[field] !== undefined ? row[m[field]] ?? "" : "");

  type Rec = {
    external_id: string | null;
    name: string;
    status: string | null;
    owner: string | null;
    effort_hours: number | null;
    start_date: string | null;
    due_date: string | null;
    completed_date: string | null;
    group: string;
    raw: Record<string, string>;
  };

  const recs: Rec[] = [];
  for (const row of opts.rows) {
    const name = get(row, "name").trim();
    if (!name) continue;
    recs.push({
      external_id: get(row, "external_id").trim() || null,
      name,
      status: get(row, "status") ? mapZohoStatus(get(row, "status")) : null,
      owner: get(row, "owner").trim() || null,
      effort_hours: parseHours(get(row, "effort_hours")),
      start_date: parseZohoDate(get(row, "start_date")),
      due_date: parseZohoDate(get(row, "due_date")),
      completed_date: parseZohoDate(get(row, "completed_date")),
      group: get(row, "project_group").trim() || "Imported tasks",
      raw: Object.fromEntries(opts.headers.map((h, i) => [h, row[i] ?? ""])),
    });
  }

  const withId = recs.filter((r) => r.external_id);
  const withoutId = recs.filter((r) => !r.external_id);
  let upserted = 0;

  // Dedupe by external_id done in-code (partial unique index can't be an ON CONFLICT target).
  const existing = new Map<string, string>();
  if (withId.length) {
    const ids = withId.map((r) => r.external_id!) as string[];
    const { data } = await db.from("tasks").select("id, external_id").in("external_id", ids);
    (data ?? []).forEach((t) => existing.set((t as { external_id: string }).external_id, (t as { id: string }).id));
  }
  for (const r of withId) {
    const payload = {
      name: r.name,
      status: r.status,
      owner: r.owner,
      effort_hours: r.effort_hours,
      start_date: r.start_date,
      due_date: r.due_date,
      completed_date: r.completed_date,
      source: "zoho",
      raw: r.raw,
    };
    if (existing.has(r.external_id!)) {
      await db.from("tasks").update(payload).eq("external_id", r.external_id!);
    } else {
      await db.from("tasks").insert({ external_id: r.external_id, ...payload });
    }
    upserted++;
  }
  if (withoutId.length) {
    await db.from("tasks").insert(
      withoutId.map((r) => ({
        name: r.name,
        status: r.status,
        owner: r.owner,
        effort_hours: r.effort_hours,
        start_date: r.start_date,
        due_date: r.due_date,
        completed_date: r.completed_date,
        source: "zoho",
        raw: r.raw,
      }))
    );
    upserted += withoutId.length;
  }

  // Build grouping proposals from the Zoho project/tasklist column.
  const groups = new Map<string, string[]>();
  for (const r of withId) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r.external_id!);
  }

  const matched: ExtractionResult["matched_projects"] = [];
  const newProjects: ExtractionResult["new_projects"] = [];
  for (const [group, extIds] of groups.entries()) {
    const existingProj = opts.projects.find((p) => p.name.toLowerCase() === group.toLowerCase());
    if (existingProj) {
      matched.push({
        project_id: existingProj.id,
        proposed_updates: {},
        evidence: `Zoho task list "${group}"`,
        confidence: 0.9,
        zoho_task_external_ids: extIds,
      });
    } else {
      newProjects.push({
        component_id: guessComponent(group, opts.components),
        name: group,
        description: `Imported from Zoho export (${opts.filename})`,
        suggested_status: "in_progress",
        ownership: "owner",
        rationale: `Zoho task list "${group}" doesn't match an existing project`,
        confidence: 0.6,
        zoho_task_external_ids: extIds,
      });
    }
  }

  const unmapped = withoutId.length
    ? [`${withoutId.length} task(s) had no Zoho Task ID — imported, but assign them to a project manually.`]
    : [];

  return {
    extracted: {
      matched_projects: matched,
      new_projects: newProjects,
      new_tasks: [],
      unmapped,
      notes: `Structural Zoho import: ${upserted} task(s) upserted by external_id (re-import dedupes). The grouping below is a suggestion — approving creates/assigns the projects.`,
    },
    upserted,
  };
}

function guessComponent(group: string, components: Component[]): string {
  const g = group.toLowerCase();
  const rules: [string, string][] = [
    ["ai seo", "ai_seo"],
    ["llm", "ai_seo"],
    ["answer engine", "ai_seo"],
    ["seo", "seo"],
    ["website", "website_growth"],
    ["landing", "website_growth"],
    ["web ", "website_growth"],
    ["cro", "website_growth"],
    ["lead", "lead_gen"],
    ["outbound", "lead_gen"],
    ["pipeline", "lead_gen"],
    ["hir", "hiring"],
    ["recruit", "hiring"],
    ["talent", "hiring"],
    ["ads", "online_marketing"],
    ["email", "online_marketing"],
    ["social", "online_marketing"],
    ["market", "online_marketing"],
  ];
  for (const [kw, id] of rules) {
    if (g.includes(kw) && components.find((c) => c.id === id)) return id;
  }
  return components[0]?.id ?? "online_marketing";
}
