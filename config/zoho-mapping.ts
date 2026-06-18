import * as XLSX from "xlsx";

/**
 * Zoho Projects exports vary by account config, so we map by header name.
 * INTROSPECTION: on first import, log the header row + a few sample rows
 * (the /api/ingest route does this) and extend the candidate lists below as
 * needed. Each canonical field maps to the lowercased header names we accept.
 */
export const ZOHO_FIELD_HEADERS: Record<string, string[]> = {
  // "Task System ID" is the globally-unique id; importZoho prefers it when present.
  external_id: ["task system id", "task id", "id", "taskid", "task id#", "task_id"],
  name: ["task name", "task", "name", "title", "subject"],
  project_group: ["project name", "task list name", "task list", "tasklist", "project", "milestone", "project group"],
  status: ["custom status", "status", "task status"],
  progress: ["% completed", "percent complete", "completion", "% complete", "progress"],
  owner: ["owner", "assignee", "assigned to", "owner name"],
  start_date: ["start date", "start", "start date(mm/dd/yyyy)"],
  due_date: ["due date", "end date", "due", "deadline", "due date(mm/dd/yyyy)"],
  completed_date: ["completion date", "completed date", "closed date"],
  // Logged time only (honest, §2). Zoho's "Work hours" is an ESTIMATE — excluded so
  // imported effort reflects actual logged time ("Total Log Hours"), not estimates.
  effort_hours: ["total log hours", "log hours", "logged hours", "actual time", "time spent"],
  description: ["task description", "description", "details"],
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

/**
 * Find the real header row. Zoho exports prepend title rows ("Portal :", "Date :")
 * before the headers, so row 0 isn't reliable — scan the first rows for the one
 * that looks like a Zoho header (task name + id/status/grouping). Falls back to 0
 * (preserving plain-Excel behaviour when no Zoho-shaped header row exists).
 */
function findHeaderRow(aoa: unknown[][]): number {
  const limit = Math.min(aoa.length, 15);
  for (let i = 0; i < limit; i++) {
    const row = ((aoa[i] as unknown[]) ?? []).map((c) => String(c ?? ""));
    if (looksLikeZoho(row)) return i;
  }
  return 0;
}

export function parseTabular(
  data: Buffer | string,
  isCsv: boolean
): { headers: string[]; rows: string[][] } {
  const wb = XLSX.read(data, { type: isCsv ? "string" : "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  const hdr = findHeaderRow(aoa as unknown[][]);
  const headers = ((aoa[hdr] as unknown[]) ?? []).map((c) => String(c).trim());
  const rows = aoa.slice(hdr + 1).map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c))));
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

/** Parse Zoho effort like "32:00"/"1:30" (HH:MM) or a decimal into hours. blank/"-"/0 → null (honest). */
export function parseHours(s: string): number | null {
  const t = (s ?? "").trim();
  if (!t || t === "-") return null;
  let val: number;
  if (t.includes(":")) {
    const [h, m] = t.split(":");
    const hh = Number(h);
    if (isNaN(hh)) return null;
    val = hh + (isNaN(Number(m)) ? 0 : Number(m) / 60);
  } else {
    val = parseFloat(t);
  }
  if (isNaN(val) || val <= 0) return null;
  return Math.round(val * 100) / 100;
}

/** Parse a Zoho date: dd/mm/yyyy or mm/dd/yyyy (disambiguated by value; ambiguous → dd/mm), or ISO. blank/"-" → null. */
export function parseZohoDate(s: string): string | null {
  const t = (s ?? "").trim();
  if (!t || t === "-") return null;
  const slash = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const y = slash[3];
    let day: number;
    let mon: number;
    if (a > 12) {
      day = a;
      mon = b;
    } else if (b > 12) {
      day = b;
      mon = a;
    } else {
      day = a; // ambiguous → Zoho's dd/mm default
      mon = b;
    }
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
