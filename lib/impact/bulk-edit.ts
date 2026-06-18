import * as XLSX from "xlsx";
import { mapZohoStatus, parseZohoDate } from "@/config/zoho-mapping";
import type {
  BulkEditProposal,
  BulkFieldChange,
  BulkRowUpdate,
  BulkUnmatched,
  Project,
  ProjectStatus,
  Task,
} from "@/lib/impact/types";

/**
 * The Excel round-trip ("bulk edit"): export every project + task to one
 * workbook the manager can edit in Excel/Sheets, then re-import it. Matching is
 * by the stable IDs in the file (no LLM, no fuzzy match) — so it's exact and
 * cheap. The import never writes directly: it builds a diff proposal that is
 * confirmed on the bulk-edit review screen (honors the "nothing writes without
 * a human confirm" rule).
 *
 * Editable fields mirror what the manager asked for — status, progress,
 * timeline (dates), a G-Drive/URL link — plus name/owner/impact and (for tasks)
 * project reassignment. Logged hours are EXPORTED for context but read-only on
 * import (logged effort stays sourced from Zoho/effort_log — honest, §2).
 */

type ColType = "text" | "date" | "int" | "pstatus" | "tstatus";
interface ColDef {
  header: string;
  field: string; // projects/tasks column, or a "__display" synthetic
  editable: boolean;
  type?: ColType;
}

export const PROJECT_COLUMNS: ColDef[] = [
  { header: "Project ID", field: "id", editable: false },
  { header: "Function", field: "__component", editable: false },
  { header: "Project", field: "name", editable: true, type: "text" },
  { header: "Status", field: "status", editable: true, type: "pstatus" },
  { header: "Progress %", field: "progress_pct", editable: true, type: "int" },
  { header: "Owner", field: "owner", editable: true, type: "text" },
  { header: "Start Date", field: "start_date", editable: true, type: "date" },
  { header: "Target Date", field: "target_date", editable: true, type: "date" },
  { header: "Link (G-Drive/URL)", field: "link", editable: true, type: "text" },
  { header: "Impact / Outcome", field: "impact_summary", editable: true, type: "text" },
];

export const TASK_COLUMNS: ColDef[] = [
  { header: "Task ID", field: "id", editable: false },
  { header: "Project ID", field: "project_id", editable: true, type: "text" },
  { header: "Project", field: "__project", editable: false },
  { header: "Task", field: "name", editable: true, type: "text" },
  { header: "Status", field: "status", editable: true, type: "tstatus" },
  { header: "Owner", field: "owner", editable: true, type: "text" },
  { header: "Logged Hours (read-only)", field: "effort_hours", editable: false },
  { header: "Start Date", field: "start_date", editable: true, type: "date" },
  { header: "Due Date", field: "due_date", editable: true, type: "date" },
  { header: "Completed Date", field: "completed_date", editable: true, type: "date" },
  { header: "Link (G-Drive/URL)", field: "link", editable: true, type: "text" },
];

const PROJECT_STATUSES = ["not_started", "in_progress", "blocked", "on_hold", "completed"];

function mapProjectStatus(s: string): ProjectStatus | null {
  const n = s.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (PROJECT_STATUSES.includes(n)) return n as ProjectStatus;
  if (n.includes("complete") || n === "done" || n === "closed") return "completed";
  if (n.includes("progress") || n.includes("active") || n.includes("started")) return "in_progress";
  if (n.includes("block")) return "blocked";
  if (n.includes("hold") || n.includes("paused")) return "on_hold";
  if (n.includes("not") || n.includes("backlog") || n.includes("todo")) return "not_started";
  return null;
}

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

// ----------------------------- EXPORT ----------------------------------

function exportValue(
  row: Project | Task,
  col: ColDef,
  ctx: { componentName?: string; projectName?: string },
): string {
  if (col.field === "__component") return ctx.componentName ?? "";
  if (col.field === "__project") return ctx.projectName ?? "";
  const v = (row as unknown as Record<string, unknown>)[col.field];
  if (v == null) return "";
  return String(v);
}

function aoaSheet(headers: string[], rows: string[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet([headers, ...rows]);
}

/** Build the downloadable workbook: Projects + Tasks + a "Read me" sheet. */
export function buildWorkbook(input: {
  projects: Project[];
  tasks: Task[];
  componentName: Map<string, string>;
  projectName: Map<string, string>;
}): Buffer {
  const wb = XLSX.utils.book_new();

  const pHeaders = PROJECT_COLUMNS.map((c) => c.header);
  const pRows = input.projects.map((p) =>
    PROJECT_COLUMNS.map((c) =>
      exportValue(p, c, { componentName: input.componentName.get(p.component_id ?? "") }),
    ),
  );
  XLSX.utils.book_append_sheet(wb, aoaSheet(pHeaders, pRows), "Projects");

  const tHeaders = TASK_COLUMNS.map((c) => c.header);
  const tRows = input.tasks.map((t) =>
    TASK_COLUMNS.map((c) =>
      exportValue(t, c, { projectName: t.project_id ? input.projectName.get(t.project_id) : "" }),
    ),
  );
  XLSX.utils.book_append_sheet(wb, aoaSheet(tHeaders, tRows), "Tasks");

  const readme: string[][] = [
    ["Growth Projects — bulk edit"],
    [""],
    ["1. Edit values in the Projects and Tasks sheets, then re-upload this file via", ""],
    ["   the Tasks tab → “Import edits”. You'll get a confirm screen before anything saves.", ""],
    ["2. DO NOT change or delete the “Project ID” / “Task ID” columns — they're how rows are matched.", ""],
    ["3. Dates: use YYYY-MM-DD (e.g. 2026-06-18). Empty a date cell to clear it.", ""],
    ["4. Project Status: one of  not_started, in_progress, blocked, on_hold, completed", ""],
    ["5. Task Status: one of  open, in_progress, done, blocked", ""],
    ["6. Progress %: a whole number 0–100.", ""],
    ["7. Link: paste any URL (Google Drive folder/doc, deck, sheet…).", ""],
    ["8. “Logged Hours” is read-only — it comes from logged time and is ignored on import.", ""],
    ["9. Move a task to another project by pasting that project's “Project ID” into the task row.", ""],
    ["10. Rows you don't change are ignored. New rows (no ID) are not created here — use “Add update”.", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "Read me");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ----------------------------- IMPORT ----------------------------------

interface ParsedRow {
  id: string;
  cells: Record<string, string>; // field -> raw cell text (editable cols present in the sheet)
}

function parseSheet(wb: XLSX.WorkBook, sheetName: string, cols: ColDef[]): ParsedRow[] {
  const realName = wb.SheetNames.find((n) => norm(n) === norm(sheetName));
  if (!realName) return [];
  const sheet = wb.Sheets[realName];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "", raw: false });
  if (!aoa.length) return [];
  const headers = (aoa[0] as unknown[]).map((c) => norm(c));
  // header text -> column index
  const idx: Record<string, number> = {};
  for (const col of cols) {
    const i = headers.indexOf(norm(col.header));
    if (i >= 0) idx[col.field] = i;
  }
  const idIdx = idx["id"];
  if (idIdx === undefined) return []; // no ID column → can't match anything safely
  const cell = (row: unknown[], i: number | undefined) =>
    i === undefined ? "" : String(row[i] ?? "").trim();

  const out: ParsedRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r] as unknown[];
    const id = cell(row, idIdx);
    if (!id) continue; // updates only — blank ID is ignored (see Read me)
    const cells: Record<string, string> = {};
    for (const col of cols) {
      if (!col.editable || col.field.startsWith("__")) continue;
      if (idx[col.field] === undefined) continue; // column not in the file → leave field untouched
      cells[col.field] = cell(row, idx[col.field]);
    }
    out.push({ id, cells });
  }
  return out;
}

export function parseBulkWorkbook(buf: Buffer): { Projects: ParsedRow[]; Tasks: ParsedRow[] } {
  const wb = XLSX.read(buf, { type: "buffer" });
  return {
    Projects: parseSheet(wb, "Projects", PROJECT_COLUMNS),
    Tasks: parseSheet(wb, "Tasks", TASK_COLUMNS),
  };
}

/** Canonicalize an incoming cell by type. ok=false means "skip this field" (invalid
 *  / not a clearable blank), value=null means "clear it". */
function normCell(type: ColType | undefined, raw: string): { ok: boolean; value: string | null } {
  const t = (raw ?? "").trim();
  switch (type) {
    case "int": {
      if (!t) return { ok: false, value: null }; // don't silently zero progress
      const n = parseInt(t.replace(/[^0-9-]/g, ""), 10);
      if (isNaN(n)) return { ok: false, value: null };
      return { ok: true, value: String(Math.max(0, Math.min(100, n))) };
    }
    case "date": {
      if (!t) return { ok: true, value: null }; // blank clears the date
      const iso = parseZohoDate(t);
      return iso ? { ok: true, value: iso } : { ok: false, value: null };
    }
    case "pstatus": {
      if (!t) return { ok: false, value: null };
      const s = mapProjectStatus(t);
      return s ? { ok: true, value: s } : { ok: false, value: null };
    }
    case "tstatus": {
      if (!t) return { ok: false, value: null };
      return { ok: true, value: mapZohoStatus(t) };
    }
    default: // text
      return { ok: true, value: t || null };
  }
}

/** Current value as a canonical string for comparison (progress null → "0"). */
function currentValue(row: Project | Task, col: ColDef): string | null {
  const v = (row as unknown as Record<string, unknown>)[col.field];
  if (col.field === "progress_pct") return String(v ?? 0);
  if (v == null) return null;
  return String(v).trim() || null;
}

function diffRow(
  parsed: ParsedRow,
  current: Project | Task,
  cols: ColDef[],
  opts: { validProjectIds?: Set<string>; noteParts: string[] },
): BulkRowUpdate | null {
  const changes: BulkFieldChange[] = [];
  for (const col of cols) {
    if (!col.editable || col.field.startsWith("__")) continue;
    const raw = parsed.cells[col.field];
    if (raw === undefined) continue; // column absent from the file
    const n = normCell(col.type, raw);
    if (!n.ok) continue;
    if (col.field === "name" && n.value == null) continue; // never clear a name
    if (col.field === "project_id" && n.value && opts.validProjectIds && !opts.validProjectIds.has(n.value)) {
      opts.noteParts.push(`Task "${(current as Task).name}": project id "${n.value}" not found — left unchanged.`);
      continue;
    }
    const cur = currentValue(current, col);
    if (n.value !== cur) changes.push({ field: col.field, label: col.header, from: cur, to: n.value });
  }
  if (!changes.length) return null;
  return { id: parsed.id, name: (current as { name: string }).name, changes };
}

/** Compare the uploaded workbook against current data → a confirmable proposal. */
export function buildProposal(
  parsed: { Projects: ParsedRow[]; Tasks: ParsedRow[] },
  projects: Project[],
  tasks: Task[],
): BulkEditProposal {
  const projectById = new Map(projects.map((p) => [p.id, p]));
  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const validProjectIds = new Set(projects.map((p) => p.id));
  const noteParts: string[] = [];
  const unmatched: BulkUnmatched[] = [];

  const projectUpdates: BulkRowUpdate[] = [];
  for (const row of parsed.Projects) {
    const cur = projectById.get(row.id);
    if (!cur) {
      unmatched.push({ sheet: "Projects", id: row.id, name: row.cells.name ?? "" });
      continue;
    }
    const u = diffRow(row, cur, PROJECT_COLUMNS, { noteParts });
    if (u) projectUpdates.push(u);
  }

  const taskUpdates: BulkRowUpdate[] = [];
  for (const row of parsed.Tasks) {
    const cur = taskById.get(row.id);
    if (!cur) {
      unmatched.push({ sheet: "Tasks", id: row.id, name: row.cells.name ?? "" });
      continue;
    }
    const u = diffRow(row, cur, TASK_COLUMNS, { validProjectIds, noteParts });
    if (u) taskUpdates.push(u);
  }

  return {
    kind: "bulk_edit",
    projectUpdates,
    taskUpdates,
    unmatched,
    notes: noteParts.length ? noteParts.join(" ") : undefined,
  };
}

/** Build the DB patch for an approved row from its recorded changes. */
export function patchFromChanges(changes: BulkFieldChange[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const c of changes) {
    patch[c.field] = c.field === "progress_pct" ? (c.to == null ? null : Number(c.to)) : c.to;
  }
  return patch;
}

/** Type guard: is this stored proposal an Excel bulk edit (vs an LLM/Zoho extraction)? */
export function isBulkEdit(x: unknown): x is BulkEditProposal {
  return !!x && typeof x === "object" && (x as { kind?: unknown }).kind === "bulk_edit";
}
