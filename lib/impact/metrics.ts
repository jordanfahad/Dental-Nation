import { COMPONENT_HUE, DEFAULT_HUE, PROJECT_STATUS_ORDER, STATUS_META } from "@/lib/impact/constants";
import type { DashboardData } from "@/lib/impact/data";
import type { Component, Project, ProjectStatus, Task } from "@/lib/impact/types";

export const PERIOD_DAYS = 90;

const ACTIVE_STATUSES: ProjectStatus[] = ["in_progress", "blocked", "on_hold"];

function withinPeriod(dateStr: string | null, days = PERIOD_DAYS): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr.length <= 10 ? dateStr + "T00:00:00" : dateStr).getTime();
  if (isNaN(d)) return false;
  return Date.now() - d <= days * 24 * 60 * 60 * 1000;
}

export interface StatusSlice {
  status: ProjectStatus;
  label: string;
  count: number;
  hex: string;
}

export function statusMix(projects: Project[]): StatusSlice[] {
  return PROJECT_STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_META[status].label,
    count: projects.filter((p) => p.status === status).length,
    hex: STATUS_META[status].hex,
  })).filter((s) => s.count > 0);
}

export interface ComponentBreakdown {
  id: string;
  name: string;
  description: string | null;
  hue: string;
  projects: Project[];
  projectCount: number;
  activeCount: number;
  completedCount: number;
  taskCount: number;
  effortHours: number | null;
  hasEffort: boolean;
}

export function componentBreakdown(
  components: Component[],
  projects: Project[],
  tasks: Task[]
): ComponentBreakdown[] {
  return components.map((c) => {
    const ps = projects.filter((p) => p.component_id === c.id);
    const projectIds = new Set(ps.map((p) => p.id));
    const taskCount = tasks.filter((t) => t.project_id && projectIds.has(t.project_id)).length;
    const hoursVals = ps.map((p) => p.effort_hours).filter((h): h is number => h != null);
    const effortHours = hoursVals.length ? hoursVals.reduce((a, b) => a + b, 0) : null;
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      hue: COMPONENT_HUE[c.id] ?? DEFAULT_HUE,
      projects: ps,
      projectCount: ps.length,
      activeCount: ps.filter((p) => ACTIVE_STATUSES.includes(p.status)).length,
      completedCount: ps.filter((p) => p.status === "completed").length,
      taskCount,
      effortHours,
      hasEffort: effortHours != null,
    };
  });
}

export interface EffortRollup {
  totalHours: number | null;
  hasHours: boolean;
  label: string; // headline string carrying its source inline (§2)
  taskCount: number;
  projectCount: number;
}

export function effortRollup(projects: Project[], taskCount: number): EffortRollup {
  const withHours = projects.filter((p) => p.effort_hours != null);
  const total = withHours.reduce((a, p) => a + (p.effort_hours ?? 0), 0);
  const sources = new Set(withHours.map((p) => p.effort_source).filter(Boolean));
  const projectCount = projects.length;

  if (withHours.length === 0 || total === 0) {
    // Honest fallback — never invent hours.
    return {
      totalHours: null,
      hasHours: false,
      label: `${taskCount} task${taskCount === 1 ? "" : "s"} across ${projectCount} project${
        projectCount === 1 ? "" : "s"
      } — hours not tracked`,
      taskCount,
      projectCount,
    };
  }

  const rounded = Math.round(total);
  let sourceLabel: string;
  if (sources.size === 1) {
    const only = [...sources][0];
    sourceLabel =
      only === "zoho"
        ? "logged hrs (Zoho)"
        : only === "manual"
        ? "hrs (manual log)"
        : "hrs (estimated — task-volume proxy)";
  } else if (sources.has("estimated")) {
    sourceLabel = "hrs (mixed — incl. estimated)";
  } else {
    sourceLabel = "hrs (Zoho + manual)";
  }

  return {
    totalHours: rounded,
    hasHours: true,
    label: `${rounded.toLocaleString("en-US")} ${sourceLabel}`,
    taskCount,
    projectCount,
  };
}

export interface HeadlineResult {
  key: string;
  value: string;
  label: string;
  sub: string;
  source: "lane_e" | "derived";
  live: boolean;
}

export function headlineResults(data: DashboardData): HeadlineResult[] {
  const { snapshot, outcomes } = data;
  const results: HeadlineResult[] = [];

  // Leads — the deduplicated all-channel actual from the live KPI feed (the
  // same number the KPI tab shows). The old Lane E funnel snapshot went stale
  // in March; it remains only as a clearly-dated fallback.
  if (outcomes?.leads_ytd != null) {
    results.push({
      key: "leads",
      value: outcomes.leads_ytd.toLocaleString("en-US"),
      label: "Leads — all channels",
      sub: "2026 YTD · enquiry union, deduplicated",
      source: "lane_e",
      live: true,
    });
  } else if (snapshot && snapshot.qualified_inquiries != null) {
    results.push({
      key: "leads",
      value: snapshot.qualified_inquiries.toLocaleString("en-US"),
      label: "Qualified inquiries",
      sub: `Lane E snapshot · ${snapshot.snapshot_date}`,
      source: "lane_e",
      live: false,
    });
  }

  // Google reviews — the PUBLICLY VISIBLE count stays the headline. Learned
  // live 19 Sep 2026: the API (owner view) returns reviews Google filters
  // from PUBLIC display, so even the removal-reconciled sync runs above the
  // public profile (owner-view 61 vs public 58) and no API exposes the public
  // number. Headline = manually verified public figure (update value + date
  // together on re-check); the live owner-view count rides in the sub so
  // drift is visible without overstating what a visitor actually sees.
  results.push({
    key: "reviews",
    value: "58",
    label: "Google reviews",
    sub: `4.9★ · public profile · verified 19 Sep · grown from 40${
      outcomes?.reviews_count != null
        ? ` · owner-view sync: ${outcomes.reviews_count} (Google filters some from public)`
        : ""
    }`,
    source: "derived",
    live: false,
  });

  // Dated platform facts (same figures as the ZAVIS know-how page).
  results.push(
    {
      key: "seo_pages",
      value: "19,500+",
      label: "SEO pages live",
      sub: "programmatic knowledge base · ZAVIS, 12 Sep",
      source: "derived",
      live: false,
    },
    {
      key: "platforms",
      value: "6",
      label: "Platforms live",
      sub: "reporting platform + 5 Marketing OS products",
      source: "derived",
      live: false,
    }
  );

  return results;
}

export interface ImpactSummary {
  componentsOwned: number;
  totalProjects: number;
  activeProjects: number;
  completedAllTime: number;
  completedThisPeriod: number;
  openBlockers: number;
  evidenceCount: number;
  statusMix: StatusSlice[];
  components: ComponentBreakdown[];
  effort: EffortRollup;
  headline: HeadlineResult[];
}

export function computeSummary(data: DashboardData): ImpactSummary {
  const { components, projects, tasks, blockers, evidence } = data;
  const comps = componentBreakdown(components, projects, tasks);
  return {
    componentsOwned: components.length,
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => ACTIVE_STATUSES.includes(p.status)).length,
    completedAllTime: projects.filter((p) => p.status === "completed").length,
    completedThisPeriod: projects.filter(
      (p) => p.status === "completed" && withinPeriod(p.completed_date)
    ).length,
    openBlockers: blockers.filter((b) => b.status !== "resolved").length,
    evidenceCount: evidence.length,
    statusMix: statusMix(projects),
    components: comps,
    effort: effortRollup(projects, tasks.length),
    headline: headlineResults(data),
  };
}
