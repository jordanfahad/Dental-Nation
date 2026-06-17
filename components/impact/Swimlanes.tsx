import { ProjectCard } from "./ProjectCard";
import { OwnershipLegend } from "@/components/ui/Ownership";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ComponentBreakdown } from "@/lib/impact/metrics";

export function Swimlanes({
  components,
  taskCounts,
}: {
  components: ComponentBreakdown[];
  taskCounts: Record<string, number>;
}) {
  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Surface area"
        title="Six functions, owned"
        description="Every project under each function. Collaborator work is marked; everything else is owned outright."
        right={<OwnershipLegend className="no-print" />}
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {components.map((c) => (
          <div key={c.id} className="card flex flex-col p-4 print-avoid-break">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hue }} />
                <h3 className="text-sm font-semibold text-ink">{c.name}</h3>
              </div>
              <span className="tnum text-xs text-ink-3">
                {c.hasEffort
                  ? `${Math.round(c.effortHours ?? 0)} hrs`
                  : `${c.projectCount} proj · ${c.taskCount} tasks`}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5">
              {c.projects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-hairline px-3 py-4 text-center text-xs text-ink-3">
                  No projects yet
                </p>
              ) : (
                c.projects.map((p) => (
                  <ProjectCard key={p.id} project={p} hue={c.hue} taskCount={taskCounts[p.id] ?? 0} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
      {components.every((c) => c.projects.length === 0) && (
        <div className="mt-4">
          <EmptyState
            title="No projects yet"
            hint="Use “Add update” to paste a report, import a Zoho export, or create a project directly."
          />
        </div>
      )}
    </section>
  );
}
