import * as XLSX from "xlsx";

/**
 * Zoho Projects exports vary by account config, so we map by header name.
 * INTROSPECTION: on first import, log the header row + a few sample rows
 * (the /api/ingest route does this) and extend the candidate lists below as
 * needed. Each canonical field maps to the lowercased header names we accept.
 */
export const ZOHO_FIELD_HEADERS: Record<string, string[]> = {
  external_id: ["task id", "id", "taskid", "task id#", "task_id"],
  name: ["task name", "task", "name", "title", "subject"],
  project_group: ["task list", "tasklist", "task list name", "project", "project name", "milestone"],
  status: ["status", "task status"],
  progress: ["% completed", "percent complete", "completion", "% complete", "progress"],
  owner: ["owner", "assignee", "assigned to", "owner name"],
  start_date: ["start date", "start", "start date(mm/dd/yyyy)"],
  due_date: ["due date", "end date", "due", "deadline", "due date(mm/dd/yyyy)"],
  completed_date: ["completed date", "completion date", "closed date"],
  effort_hours: ["work", "logged hours", "work hours", "hours", "actual time", "log hours", "time spent"],
  description: ["description", "details"],
  tags: ["tags", "tag"],
};

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

/** field -> column index, for whatever headers were present. */
export function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [field, candidates] of Object.entries(ZOHO_FIELD_HEADERS)) {
      if (map[field] === undefined && candidates.includes(n)) map[field] = i;
    }
  });
  return map;
}

/** A tabular file is treated as a Zoho export when it has a task name + (id|status|grouping). */
export function looksLikeZoho(headers: string[]): boolean {
  const m = mapHeaders(headers);
  return (
    m.name !== undefined &&
    (m.external_id !== undefined || m.status !== undefined || m.project_group !== undefined)
  );
}

export function parseTabular(
  data: Buffer | string,
  isCsv: boolean
): { headers: string[]; rows: string[][] } {
  const wb = XLSX.read(data, { type: isCsv ? "string" : "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  const headers = ((aoa[0] as unknown[]) ?? []).map((c) => String(c).trim());
  const rows = aoa.slice(1).map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c))));
  return { headers, rows };
}

/** Map a Zoho status string onto our task status vocabulary. */
export function mapZohoStatus(s: string): "open" | "in_progress" | "done" | "blocked" {
  const n = norm(s);
  if (["completed", "closed", "done", "complete"].includes(n)) return "done";
  if (n.includes("progress") || n.includes("started") || n.includes("active")) return "in_progress";
  if (n.includes("block") || n.includes("hold") || n.includes("waiting")) return "blocked";
  return "open";
}
