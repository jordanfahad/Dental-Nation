import { SectionHeading } from "@/components/ui/SectionHeading";
import { EffortArea } from "@/components/charts/EffortArea";
import { ComponentBar } from "@/components/charts/ComponentBar";
import type { ComponentBreakdown, EffortRollup } from "@/lib/impact/metrics";

export function EffortAnalysis({
  effortByDate,
  components,
  effort,
}: {
  effortByDate: { date: string; hours: number }[];
  components: ComponentBreakdown[];
  effort: EffortRollup;
}) {
  const hasHours = effort.hasHours;
  const compData = components.map((c) => ({
    name: c.name,
    value: hasHours ? Math.round(c.effortHours ?? 0) : c.taskCount,
    hue: c.hue,
  }));

  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Effort"
        title={hasHours ? "Effort analysis" : "Activity volume"}
        description={
          hasHours
            ? `Effort over time and by function — ${effort.label}.`
            : "Hours aren't tracked for these projects — showing project & task volume, not invented hours."
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4 print-avoid-break">
          <h3 className="mb-2 text-sm font-semibold text-ink">Logged effort over time</h3>
          {effortByDate.length ? (
            <EffortArea data={effortByDate} />
          ) : (
            <p className="py-16 text-center text-sm text-ink-3">
              No logged hours yet — add effort on a project, or import Zoho logged hours.
            </p>
          )}
        </div>
        <div className="card p-4 print-avoid-break">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            {hasHours ? "Effort by function (hrs)" : "Tasks by function"}
          </h3>
          <ComponentBar data={compData} unit={hasHours ? "hrs" : "tasks"} />
        </div>
      </div>
    </section>
  );
}
