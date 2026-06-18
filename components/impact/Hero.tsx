import { StatusDonut } from "@/components/charts/StatusDonut";
import { ComponentBar } from "@/components/charts/ComponentBar";
import type { ImpactSummary } from "@/lib/impact/metrics";

export function Hero({ summary }: { summary: ImpactSummary }) {
  const barData = summary.components.map((c) => ({
    name: c.name,
    value: c.projectCount,
    hue: c.hue,
  }));

  // Outcome KPIs (the heroes) + a surface-area tile, reference-deck style.
  const tiles = [
    ...summary.headline.map((h) => ({ value: h.value, label: h.label, sub: h.sub, live: h.live })),
    {
      value: String(summary.activeProjects),
      label: "Active projects",
      sub: `${summary.totalProjects} total · ${summary.completedAllTime} done`,
      live: false,
    },
  ].slice(0, 5);

  return (
    <section className="print-avoid-break">
      {/* Navy hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-dn-navy to-dn-navy2 p-7 text-dn-off shadow-[0_18px_45px_rgba(36,66,96,.18)] sm:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-dn-mint/15" />
        <div className="pointer-events-none absolute right-16 -bottom-32 h-64 w-64 rounded-full bg-dn-soft/20" />
        <div className="relative">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-dn-mint">
            Fahad · Growth Projects Dashboard
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.05] tracking-tight sm:text-[42px]">
            One growth manager, six functions — owned end to end.
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-dn-off/85">
            Online Marketing · SEO · AI SEO · Website Growth · Lead Generation · Hiring. The case
            isn&apos;t activity; it&apos;s the outcomes below.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {tiles.map((t, i) => (
              <div key={i} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <div className="tnum text-3xl font-extrabold leading-none text-dn-mint">{t.value}</div>
                <div className="mt-2 text-sm font-medium text-dn-off">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-dn-off/70">{t.sub}</div>
                {t.live && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-dn-mint">
                    <span className="h-1.5 w-1.5 rounded-full bg-dn-mint" />
                    live — Lane E
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-white/15 pt-4 text-sm">
            <Stat value={String(summary.componentsOwned)} label="functions owned" />
            <Stat value={`${summary.completedThisPeriod}/${summary.completedAllTime}`} label="completed 90d / all-time" />
            <Stat value={String(summary.openBlockers)} label="open blockers" alert={summary.openBlockers > 0} />
            <div className="ml-auto text-right">
              <div className="text-xs font-medium text-dn-off/90">Total effort</div>
              <div className="text-xs text-dn-mint">{summary.effort.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio mix — white cards under the hero */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-dn-line bg-white p-5 shadow-[0_10px_30px_rgba(36,66,96,.06)]">
          <h3 className="mb-3 text-sm font-semibold text-dn-navy">Project status mix</h3>
          <StatusDonut data={summary.statusMix} />
        </div>
        <div className="rounded-2xl border border-dn-line bg-white p-5 shadow-[0_10px_30px_rgba(36,66,96,.06)]">
          <h3 className="mb-1 text-sm font-semibold text-dn-navy">Projects by function</h3>
          <ComponentBar data={barData} unit="projects" />
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label, alert }: { value: string; label: string; alert?: boolean }) {
  return (
    <div>
      <div className={`tnum text-xl font-bold ${alert ? "text-dn-mint" : "text-dn-off"}`}>{value}</div>
      <div className="text-[11px] text-dn-off/70">{label}</div>
    </div>
  );
}
