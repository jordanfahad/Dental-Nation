import type { Metadata } from "next";
import { getDashboardData } from "@/lib/impact/data";
import { computeSummary } from "@/lib/impact/metrics";
import { Hero } from "@/components/impact/Hero";
import { ProjectControl } from "@/components/impact/ProjectControl";
import { Swimlanes } from "@/components/impact/Swimlanes";
import { TasksTable } from "@/components/impact/TasksTable";
import { RoadmapTimeline } from "@/components/impact/RoadmapTimeline";
import { BlockersSection } from "@/components/impact/BlockersSection";
import { EffortAnalysis } from "@/components/impact/EffortAnalysis";
import { ImpactByFunction } from "@/components/impact/ImpactByFunction";
import { FlowchartsSection } from "@/components/impact/FlowchartsSection";
import { EvidenceLocker } from "@/components/impact/EvidenceLocker";
import { DashboardTabs } from "@/components/impact/DashboardTabs";
import { GrowthBuildsShowcase } from "@/components/impact/GrowthBuildsShowcase";
import { Y1PlanBanner } from "@/components/impact/Y1PlanBanner";
import { formatDate, formatRelativeTime } from "@/lib/impact/format";
import { redirect } from "next/navigation";
import { currentRole } from "@/lib/auth/role";
import { canSeeGrowthProjects } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fahad — Growth Projects Dashboard" };

export default async function ImpactPage() {
  const role = await currentRole();
  // Restricted staff (Dr Luvi & Gautam) cannot see Growth Projects (also blocked
  // in middleware — this is defense in depth).
  if (!canSeeGrowthProjects(role)) redirect("/");
  const data = await getDashboardData();
  const summary = computeSummary(data);
  const canEdit = role === "admin";
  const builds = data.projects.filter((p) => p.featured);

  const taskCounts: Record<string, number> = {};
  for (const t of data.tasks) {
    if (t.project_id) taskCounts[t.project_id] = (taskCounts[t.project_id] ?? 0) + 1;
  }

  // Cumulative logged effort over time.
  const byDate = new Map<string, number>();
  for (const e of data.effortLog) {
    byDate.set(e.log_date, (byDate.get(e.log_date) ?? 0) + Number(e.hours || 0));
  }
  let cum = 0;
  const effortByDate = [...byDate.keys()]
    .sort()
    .map((d) => {
      cum += byDate.get(d)!;
      return {
        date: new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        hours: Math.round(cum),
      };
    });

  return (
    <div className="bg-[linear-gradient(135deg,#F7F5EF,#ffffff_45%,#EEEFE1)]">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <DashboardTabs
          overview={
            <>
              <Hero summary={summary} />
              <Y1PlanBanner />
              <GrowthBuildsShowcase builds={builds} evidence={data.evidence} role={role} />
              <ProjectControl projects={data.projects} components={data.components} blockers={data.blockers} />
            </>
          }
          projects={
            <>
              <Swimlanes components={summary.components} taskCounts={taskCounts} />
              <RoadmapTimeline projects={data.projects} components={data.components} />
              <BlockersSection blockers={data.blockers} />
            </>
          }
          tasks={<TasksTable tasks={data.tasks} projects={data.projects} canEdit={canEdit} />}
          impact={
            <>
              <ImpactByFunction components={summary.components} snapshot={data.snapshot} />
              <EffortAnalysis effortByDate={effortByDate} components={summary.components} effort={summary.effort} />
            </>
          }
          operating={<FlowchartsSection flowcharts={data.flowcharts} />}
          evidence={<EvidenceLocker evidence={data.evidence} components={data.components} canEdit={canEdit} />}
        />

        <footer className="mt-10 border-t border-hairline pt-4 text-xs text-ink-3">
          <div className="flex flex-wrap justify-between gap-2">
            <span>Last updated {formatDate(new Date().toISOString())}</span>
            {data.lastApplied ? (
              <span>
                Most recent applied update: {data.lastApplied.source_type} ·{" "}
                {formatRelativeTime(data.lastApplied.applied_at)}
              </span>
            ) : (
              <span>No ingested updates applied yet</span>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
