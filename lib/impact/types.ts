// Domain types for the Growth Manager Impact Dashboard (Tab 2).
// These mirror the lane_e.* Impact tables (see supabase/migrations/0002).

export type Ownership = "owner" | "collaborator";
export type ProjectStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "on_hold"
  | "completed";
export type TaskStatus = "open" | "in_progress" | "done" | "blocked";
export type Severity = "high" | "medium" | "low";
export type Priority = "high" | "medium" | "low";
export type EffortSource = "zoho" | "manual" | "estimated" | null;
export type ProjectSource =
  | "manual"
  | "zoho"
  | "pdf"
  | "excel"
  | "csv"
  | "html_report"
  | "text";
export type IngestionSourceType =
  | "text"
  | "pdf"
  | "excel"
  | "csv"
  | "html_report"
  | "zoho";
export type IngestionStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "applied";

export interface Component {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  default_role: Ownership;
}

export interface Project {
  id: string;
  component_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  ownership: Ownership;
  owner: string | null;
  progress_pct: number | null;
  effort_hours: number | null;
  effort_source: EffortSource;
  impact_summary: string | null;
  priority: Priority | null;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  source: ProjectSource;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  external_id: string | null;
  name: string;
  status: TaskStatus | null;
  owner: string | null;
  effort_hours: number | null;
  start_date: string | null;
  due_date: string | null;
  completed_date: string | null;
  source: string;
  raw: unknown;
  updated_at: string;
}

export interface ProjectBlocker {
  id: string;
  project_id: string | null;
  description: string;
  severity: Severity | null;
  needs: string | null;
  owner: string | null;
  raised_date: string | null;
  status: "open" | "in_progress" | "resolved";
  resolution: string | null;
}

export interface EvidenceFile {
  id: string;
  project_id: string | null;
  task_id: string | null;
  component_id: string | null;
  filename: string;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  description: string | null;
  visible_to_ceo: boolean;
  uploaded_at: string;
}

export interface EffortLog {
  id: number;
  project_id: string | null;
  task_id: string | null;
  log_date: string;
  hours: number;
  note: string | null;
  source: string | null;
}

/**
 * Lane E cross-link (§7). NOT a table in this schema — this is the shape we
 * READ from the EXISTING lane_e.daily_snapshot (its `funnel` jsonb + columns),
 * mapped to the few fields the Impact dashboard attributes. See lib/impact/data.ts.
 */
export interface LaneESnapshot {
  snapshot_date: string;
  qualified_inquiries: number | null;
  glow_up_bookings: number | null;
  best_channel: string | null;
  leads_total: number | null;
}

// ---- Ingestion / review-gate payload (§5) ----
export interface MatchedProjectProposal {
  project_id: string;
  proposed_updates: {
    status?: ProjectStatus;
    progress_pct?: number;
    impact_summary?: string;
    target_date?: string;
  };
  evidence?: string;
  confidence?: number;
  // Zoho structural import: existing tasks (by Zoho external_id) to assign here.
  zoho_task_external_ids?: string[];
}

export interface NewProjectProposal {
  component_id: string;
  name: string;
  description?: string;
  suggested_status?: ProjectStatus;
  suggested_target_date?: string;
  ownership?: Ownership;
  rationale?: string;
  confidence?: number;
  zoho_task_external_ids?: string[];
}

export interface NewTaskProposal {
  project_ref: string; // existing project_id OR new_project name
  name: string;
  status?: TaskStatus;
  effort_hours?: number | null;
  due_date?: string;
}

export interface ExtractionResult {
  matched_projects: MatchedProjectProposal[];
  new_projects: NewProjectProposal[];
  new_tasks: NewTaskProposal[];
  unmapped: string[];
  notes?: string;
  // populated only when JSON parsing failed, so the review screen can surface it
  parse_error?: string;
  raw_output?: string;
}

export interface IngestionJob {
  id: string;
  source_type: IngestionSourceType;
  source_ref: string | null;
  status: IngestionStatus;
  extracted: ExtractionResult;
  storage_path: string | null;
  created_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
}
