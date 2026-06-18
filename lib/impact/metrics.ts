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
  const { projects, snapshot } = data;
  const completedIn = (componentId: string) =>
    projects.filter((p) => p.component_id === componentId && p.status === "completed").length;

  const sitesShipped = completedIn("website_growth");
  const hiresMade = completedIn("hiring");
  const rankingWins = completedIn("seo") + completedIn("ai_seo");

  const results: HeadlineResult[] = [];

  // Leads generated — attributable to Lane E where a snapshot exists (§7).
  if (snapshot && snapshot.qualified_inquiries != null) {
    results.push({
      key: "leads",
      value: snapshot.qualified_inquiries.toLocaleString("en-US"),
      label: "Qualified inquiries",
      sub:
        snapshot.glow_up_bookings != null
          ? `${snapshot.glow_up_bookings.toLocaleString("en-US")} Glow Up bookings`
          : "since launch",
      source: "lane_e",
      live: true,
    });
  }

  results.push(
    {
      key: "sites",
      value: sitesShipped.toLocaleString("en-US"),
      label: "Sites shipped",
      sub: "Website Growth — completed",
      source: "derived",
      live: false,
    },
    {
      key: "hires",
      value: hiresMade.toLocaleString("en-US"),
      label: "Hires made",
      sub: "Hiring / Talent — completed",
      source: "derived",
      live: false,
    },
    {
      key: "ranking",
      value: rankingWins.toLocaleString("en-US"),
      label: "Ranking & visibility wins",
      sub: "SEO + AI SEO — completed",
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
