import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { OwnershipLegend } from "@/components/ui/Ownership";
import { COMPONENT_HUE, DEFAULT_HUE } from "@/lib/impact/constants";
import { formatDate } from "@/lib/impact/format";
import type { Component, Project } from "@/lib/impact/types";

const DAY = 86_400_000;
const ts = (d: string) => new Date(d.length <= 10 ? d + "T00:00:00" : d).getTime();

// Lightweight custom Gantt — bars positioned by date math (no chart library).
export function RoadmapTimeline({
  projects,
  components,
}: {
  projects: Project[];
  components: Component[];
}) {
  const dated = projects.filter((p) => p.start_date || p.target_date);

  if (dated.length === 0) {
    return (
      <section className="print-break">
        <SectionHeading eyebrow="Roadmap" title="What's pending — and by when" />
        <EmptyState
          title="No dated projects yet"
          hint="Set start / target dates on projects to populate the roadmap."
        />
      </section>
    );
  }

  const now = Date.now();
  const stamps: number[] = [now];
  for (const p of dated) {
    if (p.start_date) stamps.push(ts(p.start_date));
    if (p.target_date) stamps.push(ts(p.target_date));
  }
  let min = Math.min(...stamps);
  let max = Math.max(...stamps);
  const pad = (max - min) * 0.04 || DAY * 7;
  min -= pad;
  max += pad;
  const range = Math.max(max - min, DAY);
  const pct = (x: number) => ((x - min) / range) * 100;

  // Month ticks
  const months: { t: number; label: string }[] = [];
  const cursor = new Date(min);
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= max) {
    const tm = cursor.getTime();
    if (tm >= min) months.push({ t: tm, label: cursor.toLocaleDateString("en-US", { month: "short" }) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const order = components.map((c) => c.id);
  const groups = components
    .map((c) => ({
      id: c.id,
      name: c.name,
      hue: COMPONENT_HUE[c.id] ?? DEFAULT_HUE,
      projects: dated.filter((p) => p.component_id === c.id),
    }))
    .filter((g) => g.projects.length > 0);
  const orphans = dated.filter((p) => !p.component_id || !order.includes(p.component_id));
  if (orphans.length) groups.push({ id: "_none", name: "Unassigned", hue: DEFAULT_HUE, projects: orphans });

  const todayPct = pct(now);

  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Roadmap"
        title="What's pending — and by when"
        description="Projects positioned by start → target. Dotted bars are collaborator work; the line marks today."
        right={<OwnershipLegend className="no-print" />}
      />
      <div className="card overflow-x-auto p-4 print-avoid-break">
        <div className="relative min-w-[640px]">
          {/* Month axis */}
          <div className="relative mb-2 ml-[12.5rem] h-4">
            {months.map((m, i) => (
              <span
                key={i}
                style={{ left: `${pct(m.t)}%` }}
                className="absolute -translate-x-1/2 text-[10px] text-ink-3"
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Today marker overlay (spans all rows, offset past the label column) */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="pointer-events-none absolute bottom-0 left-[12.5rem] right-0 top-6">
              <div className="absolute bottom-0 top-0 w-px bg-accent/50" style={{ left: `${todayPct}%` }}>
                <span className="absolute -top-px -translate-x-1/2 rounded bg-accent px-1 text-[9px] font-medium text-white">
                  today
                </span>
              </div>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.id} className="mt-3">
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: g.hue }} />
                <span className="text-xs font-semibold text-ink">{g.name}</span>
              </div>
              {g.projects.map((p) => {
                const s = p.start_date
                  ? ts(p.start_date)
                  : p.target_date
                  ? ts(p.target_date) - DAY * 14
                  : min;
                const e = p.target_date
                  ? ts(p.target_date)
                  : p.start_date
                  ? ts(p.start_date) + DAY * 14
                  : max;
                const lo = Math.min(s, e);
                const hi = Math.max(s, e);
                const left = pct(lo);
                const width = Math.max(pct(hi) - left, 1.2);
                const collab = p.ownership === "collaborator";
                return (
                  <div key={p.id} className="flex items-center gap-2 py-1">
                    <div className="w-[12rem] shrink-0 truncate pr-2 text-xs text-ink-2" title={p.name}>
                      {p.name}
                    </div>
                    <div className="relative h-5 flex-1 rounded bg-panel">
                      <div
                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px]"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: collab ? "transparent" : g.hue,
                          border: collab ? `1.5px dashed ${g.hue}` : "none",
                        }}
                        title={`${formatDate(p.start_date)} → ${formatDate(p.target_date)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
