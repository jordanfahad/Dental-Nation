import { getDashboardData } from "@/lib/impact/data";
import { computeSummary } from "@/lib/impact/metrics";
import { Hero } from "@/components/impact/Hero";
import { Swimlanes } from "@/components/impact/Swimlanes";
import { RoadmapTimeline } from "@/components/impact/RoadmapTimeline";
import { BlockersSection } from "@/components/impact/BlockersSection";
import { EffortAnalysis } from "@/components/impact/EffortAnalysis";
import { ImpactByFunction } from "@/components/impact/ImpactByFunction";
import { EvidenceLocker } from "@/components/impact/EvidenceLocker";
import { formatDate, formatRelativeTime } from "@/lib/impact/format";

export const dynamic = "force-dynamic";

export default async function ImpactPage() {
  const data = await getDashboardData();
  const summary = computeSummary(data);

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
    <div className="mx-auto max-w-7xl space-y-10 px-5 py-8">
      <Hero summary={summary} />
      <Swimlanes components={summary.components} taskCounts={taskCounts} />
      <RoadmapTimeline projects={data.projects} components={data.components} />
      <BlockersSection blockers={data.blockers} />
      <EffortAnalysis effortByDate={effortByDate} components={summary.components} effort={summary.effort} />
      <ImpactByFunction components={summary.components} snapshot={data.snapshot} />
      <EvidenceLocker evidence={data.evidence} components={data.components} />

      <footer className="border-t border-hairline pt-4 text-xs text-ink-3">
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
  );
}
