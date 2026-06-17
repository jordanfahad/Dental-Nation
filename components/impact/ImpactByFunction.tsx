import { SectionHeading } from "@/components/ui/SectionHeading";
import { LaneETag } from "./LaneETag";
import { StatusPill } from "@/components/ui/StatusPill";
import { LANE_E_COMPONENTS } from "@/lib/impact/constants";
import type { ComponentBreakdown } from "@/lib/impact/metrics";
import type { LaneESnapshot } from "@/lib/impact/types";

export function ImpactByFunction({
  components,
  snapshot,
}: {
  components: ComponentBreakdown[];
  snapshot: LaneESnapshot | null;
}) {
  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="The case"
        title="Impact by function"
        description="The concrete results behind each function, with the Lane E numbers wired in under Lead Gen and Marketing — the salary argument, in outcomes."
      />
      <div className="space-y-4">
        {components.map((c) => {
          const outcomes = c.projects
            .filter((p) => p.impact_summary)
            .sort((a, b) => (a.status === "completed" ? -1 : 0) - (b.status === "completed" ? -1 : 0));
          const isLaneE = LANE_E_COMPONENTS.has(c.id);
          return (
            <div key={c.id} className="card p-5 print-avoid-break">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hue }} />
                  <h3 className="text-base font-semibold text-ink">{c.name}</h3>
                </div>
                <div className="flex gap-6 text-right text-[11px] text-ink-3">
                  <span>
                    <span className="tnum block text-base font-semibold text-ink">{c.completedCount}</span>
                    completed
                  </span>
                  <span>
                    <span className="tnum block text-base font-semibold text-ink">{c.activeCount}</span>
                    active
                  </span>
                  <span>
                    <span className="tnum block text-base font-semibold text-ink">
                      {c.hasEffort ? Math.round(c.effortHours ?? 0) : c.taskCount}
                    </span>
                    {c.hasEffort ? "hrs" : "tasks"}
                  </span>
                </div>
              </div>

              {isLaneE && snapshot && (
                <div className="mt-3">
                  <LaneETag snapshot={snapshot} />
                </div>
              )}

              {outcomes.length ? (
                <ul className="mt-3 space-y-2.5">
                  {outcomes.map((p) => (
                    <li key={p.id} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: c.hue }}
                      />
                      <span className="text-ink-2">
                        <span className="font-medium text-ink">{p.name}</span>
                        <span className="mx-1.5 inline-block align-middle">
                          <StatusPill status={p.status} />
                        </span>
                        <span className="block sm:inline">— {p.impact_summary}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-3">No outcome write-ups captured yet for this function.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
