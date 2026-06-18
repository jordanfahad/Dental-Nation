import "server-only";
import { requireSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Recompute a project's effort rollup from effort_log (the canonical store of
 * hours, fed by Zoho logged-hours and manual entries).
 *
 * Honest sourcing (§2, non-negotiable): if there are no logged hours,
 * effort_hours is set to null and effort_source to null — the UI then falls
 * back to task/project counts. We NEVER synthesize an hour figure.
 */
export async function recomputeProjectEffort(projectId: string): Promise<void> {
  const db = requireSupabaseAdmin();
  const { data: logs } = await db
    .from("effort_log")
    .select("hours, source")
    .eq("project_id", projectId);

  if (!logs || logs.length === 0) {
    await db.from("projects").update({ effort_hours: null, effort_source: null }).eq("id", projectId);
    return;
  }

  const total = logs.reduce((a, l) => a + Number(l.hours || 0), 0);
  const sources = new Set(logs.map((l) => l.source).filter(Boolean));
  const source =
    sources.size === 1 ? [...sources][0] : sources.has("estimated") ? "estimated" : "manual";

  await db.from("projects").update({ effort_hours: total, effort_source: source }).eq("id", projectId);
}
