import { StatusDonut } from "@/components/charts/StatusDonut";
import { ComponentBar } from "@/components/charts/ComponentBar";
import type { ImpactSummary } from "@/lib/impact/metrics";

export function Hero({ summary }: { summary: ImpactSummary }) {
  const barData = summary.components.map((c) => ({
    name: c.name,
    value: c.projectCount,
    hue: c.hue,
  }));

  return (
    <section className="card overflow-hidden p-6 print-avoid-break">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-3">
        Growth Manager · Impact
      </div>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
        One growth manager, six functions.
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-2">
        Online Marketing · SEO · AI SEO · Website Growth · Lead Generation · Hiring — owned end to
        end. The case isn&apos;t activity; it&apos;s the outcomes below.
      </p>

      {/* Headline outcomes — the heroes (largest figures) */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {summary.headline.map((h) => (
          <div key={h.key} className="rounded-xl bg-panel p-4">
            <div className="tnum text-3xl font-semibold text-ink">{h.value}</div>
            <div className="mt-1 text-sm font-medium text-ink">{h.label}</div>
            <div className="mt-0.5 text-xs text-ink-3">{h.sub}</div>
            {h.live && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ok">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                live — Lane E
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Surface area + effort (supporting, smaller) */}
      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hairline pt-4">
        <Stat value={String(summary.componentsOwned)} label="functions owned" />
        <Stat value={String(summary.activeProjects)} label="active projects" />
        <Stat
          value={`${summary.completedThisPeriod} / ${summary.completedAllTime}`}
          label="completed (90d / all-time)"
        />
        <Stat value={String(summary.openBlockers)} label="open blockers" tone={summary.openBlockers > 0 ? "bad" : undefined} />
        <div className="ml-auto max-w-xs text-right">
          <div className="text-xs font-medium text-ink-2">Total effort</div>
          <div className="text-xs text-ink-3">{summary.effort.label}</div>
        </div>
      </div>

      {/* Status mix + surface-area picture */}
      <div className="mt-6 grid grid-cols-1 gap-6 border-t border-hairline pt-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-ink">Project status mix</h3>
          <StatusDonut data={summary.statusMix} />
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-ink">Projects by function</h3>
          <ComponentBar data={barData} unit="projects" />
        </div>
      </div>
    </section>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "bad";
}) {
  return (
    <div>
      <div className={`tnum text-xl font-semibold ${tone === "bad" ? "text-bad" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-xs text-ink-3">{label}</div>
    </div>
  );
}
