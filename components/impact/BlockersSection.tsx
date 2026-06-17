import { SeverityPill } from "@/components/ui/StatusPill";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { SEVERITY_META } from "@/lib/impact/constants";
import type { BlockerWithProject } from "@/lib/impact/data";

export function BlockersSection({ blockers }: { blockers: BlockerWithProject[] }) {
  const open = blockers
    .filter((b) => b.status !== "resolved")
    .sort(
      (a, b) =>
        (SEVERITY_META[a.severity ?? "low"]?.rank ?? 9) -
        (SEVERITY_META[b.severity ?? "low"]?.rank ?? 9)
    );

  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Accountability"
        title="What's slowing impact — and who must act"
        description="Open blockers by severity. Each names what's required to unblock and from whom — accountability, not excuses."
      />
      {open.length === 0 ? (
        <EmptyState title="No open blockers" hint="Nothing is currently blocking delivery." />
      ) : (
        <div className="card divide-y divide-hairline overflow-hidden print-avoid-break">
          {open.map((b) => (
            <div key={b.id} className="flex gap-4 p-4">
              <div className="w-16 shrink-0 pt-0.5">
                <SeverityPill severity={b.severity} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{b.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-3">
                  {b.project_name && (
                    <span>
                      Project: <span className="text-ink-2">{b.project_name}</span>
                    </span>
                  )}
                  {b.needs && (
                    <span>
                      Needs: <span className="text-ink-2">{b.needs}</span>
                    </span>
                  )}
                  {b.owner && (
                    <span>
                      Who must act: <span className="text-ink-2">{b.owner}</span>
                    </span>
                  )}
                  <span className="capitalize">Status: {b.status.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
