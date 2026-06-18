import type { ProjectStatus, Severity, TaskStatus } from "@/lib/impact/types";

// NOTE: class strings below are written as literals so Tailwind's scanner
// generates them. Never build these dynamically (e.g. `bg-${tone}-weak`).
//
// Colours map onto Lane E's palette (tailwind.config.ts): ok=good, warn=watch,
// bad=stop, muted=na, accent=ink-blue. Hex values (used by Recharts) are the
// exact Lane E semantic hexes — one shared visual language across both tabs.

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  "in_progress",
  "completed",
  "blocked",
  "on_hold",
  "not_started",
];

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; pill: string; dot: string; hex: string }
> = {
  completed: { label: "Completed", pill: "bg-ok-weak text-ok", dot: "bg-ok", hex: "#15803D" },
  in_progress: {
    label: "In progress",
    pill: "bg-accent-weak text-accent-strong",
    dot: "bg-accent",
    hex: "#1F3A5F",
  },
  blocked: { label: "Blocked", pill: "bg-bad-weak text-bad", dot: "bg-bad", hex: "#B91C1C" },
  on_hold: { label: "On hold", pill: "bg-warn-weak text-warn", dot: "bg-warn", hex: "#B45309" },
  not_started: {
    label: "Not started",
    pill: "bg-muted-weak text-ink-2",
    dot: "bg-muted",
    hex: "#9CA3AF",
  },
};

export const TASK_STATUS_META: Record<TaskStatus, { label: string; pill: string }> = {
  open: { label: "Open", pill: "bg-muted-weak text-ink-2" },
  in_progress: { label: "In progress", pill: "bg-accent-weak text-accent-strong" },
  done: { label: "Done", pill: "bg-ok-weak text-ok" },
  blocked: { label: "Blocked", pill: "bg-bad-weak text-bad" },
};

export const SEVERITY_META: Record<Severity, { label: string; pill: string; rank: number }> = {
  high: { label: "High", pill: "bg-bad-weak text-bad", rank: 0 },
  medium: { label: "Medium", pill: "bg-warn-weak text-warn", rank: 1 },
  low: { label: "Low", pill: "bg-muted-weak text-ink-2", rank: 2 },
};

export const PRIORITY_META: Record<string, { label: string; pill: string }> = {
  high: { label: "High priority", pill: "bg-bad-weak text-bad" },
  medium: { label: "Medium", pill: "bg-warn-weak text-warn" },
  low: { label: "Low", pill: "bg-muted-weak text-ink-2" },
};

// Lane E discipline: ONE structural accent, no rainbow. The "by component"
// charts render monochrome in the accent; components are told apart by label.
export const DEFAULT_HUE = "#1F3A5F";
export const COMPONENT_HUE: Record<string, string> = {
  online_marketing: DEFAULT_HUE,
  seo: DEFAULT_HUE,
  ai_seo: DEFAULT_HUE,
  website_growth: DEFAULT_HUE,
  lead_gen: DEFAULT_HUE,
  hiring: DEFAULT_HUE,
};

// Lane E cross-link applies to these components (§7).
export const LANE_E_COMPONENTS = new Set(["lead_gen", "online_marketing"]);

// Fixed catalog — mirrors the seed in migration 0002. Used as a graceful
// fallback so the swimlane scaffold still renders when Supabase is unconfigured.
export const FIXED_COMPONENTS: {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}[] = [
  { id: "online_marketing", name: "Online Marketing", description: "Paid + organic acquisition across channels", sort_order: 1 },
  { id: "seo", name: "SEO", description: "Organic search ranking & visibility", sort_order: 2 },
  { id: "ai_seo", name: "AI SEO", description: "Answer-engine / LLM visibility", sort_order: 3 },
  { id: "website_growth", name: "Website Growth", description: "Sites, landing pages & conversion", sort_order: 4 },
  { id: "lead_gen", name: "Lead Generation", description: "Pipeline & qualified inquiries", sort_order: 5 },
  { id: "hiring", name: "Hiring / Talent", description: "Recruiting & team build-out", sort_order: 6 },
];

export function statusMeta(status: string) {
  return STATUS_META[status as ProjectStatus] ?? STATUS_META.not_started;
}
