import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { CollabChip } from "@/components/ui/Ownership";
import { clampPct, formatDate, relativeTarget } from "@/lib/impact/format";
import type { BlockerWithProject } from "@/lib/impact/data";
import type { Component, Project } from "@/lib/impact/types";

type Rag = "red" | "amber" | "green" | "grey";
const RAG_HEX: Record<Rag, string> = { red: "#B42318", amber: "#B54708", green: "#2E7D32", grey: "#ADAC99" };
const RAG_LABEL: Record<Rag, string> = { red: "At risk", amber: "In motion", green: "On track", grey: "Not started" };

function ragOf(p: Project, hasOpenBlocker: boolean): Rag {
  if (p.status === "completed") return "green";
  const overdue = !!p.target_date && new Date(p.target_date + "T00:00:00").getTime() < Date.now();
  if (p.status === "blocked" || hasOpenBlocker || overdue) return "red";
  if (p.status === "in_progress" || p.status === "on_hold") return "amber";
  return "grey";
}

/**
 * Project control — RAG status cards per project, grouped by function. Reference
 * "phase card" styling, but data-driven from projects + open blockers (RAG is
 * derived from status / target date / blockers — never hand-set).
 */
export function ProjectControl({
  projects,
  components,
  blockers,
}: {
  projects: Project[];
  components: Component[];
  blockers: BlockerWithProject[];
}) {
  const openByProject = new Map<string, BlockerWithProject[]>();
  for (const b of blockers) {
    if (b.status === "resolved" || !b.project_id) continue;
    const arr = openByProject.get(b.project_id) ?? [];
    arr.push(b);
    openByProject.set(b.project_id, arr);
  }

  const groups = components
    .map((c) => ({ component: c, items: projects.filter((p) => p.component_id === c.id) }))
    .filter((g) => g.items.length > 0);
  const orphans = projects.filter((p) => !p.component_id || !components.some((c) => c.id === p.component_id));

  if (projects.length === 0) {
    return (
      <section className="print-break">
        <Heading />
        <div className="rounded-2xl border border-dashed border-dn-line bg-white/70 px-6 py-10 text-center text-sm text-dn-navy/70">
          No projects yet — import a Zoho export or add one from “Add update”.
        </div>
      </section>
    );
  }

  return (
    <section id="project-control" className="scroll-mt-28 print-break">
      <Heading />
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.component.id} id={`pc-${g.component.id}`} className="scroll-mt-28">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#244260" }} />
              <h3 className="text-sm font-semibold text-dn-navy">{g.component.name}</h3>
              <span className="text-xs text-dn-ink/50">{g.items.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {g.items.map((p) => (
                <Card key={p.id} project={p} openBlockers={openByProject.get(p.id) ?? []} />
              ))}
            </div>
          </div>
        ))}

        {orphans.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-dn-navy">Unassigned</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {orphans.map((p) => (
                <Card key={p.id} project={p} openBlockers={openByProject.get(p.id) ?? []} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Heading() {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-dn-soft">Project control</div>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-dn-navy">Status, timeline & what&apos;s blocking each project</h2>
    </div>
  );
}

function Card({ project: p, openBlockers }: { project: Project; openBlockers: BlockerWithProject[] }) {
  const rag = ragOf(p, openBlockers.length > 0);
  const hex = RAG_HEX[rag];
  const rel = relativeTarget(p.target_date);
  return (
    <Link
      href={`/impact/projects/${p.id}`}
      className="block rounded-2xl border border-dn-line bg-white p-4 shadow-[0_8px_22px_rgba(36,66,96,.06)] transition-shadow hover:shadow-[0_12px_30px_rgba(36,66,96,.12)] print-avoid-break"
      style={{ borderLeft: `5px solid ${hex}` }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: hex }} />
        <h4 className="text-sm font-semibold leading-snug text-dn-navy">{p.name}</h4>
        {p.ownership === "collaborator" && <CollabChip />}
        <span
          className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide"
          style={{ background: `${hex}1a`, color: hex }}
        >
          {RAG_LABEL[rag]}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <StatusPill status={p.status} />
        <span className="tnum text-xs text-dn-ink/55">{clampPct(p.progress_pct)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EEF2F0]">
        <span className="block h-full rounded-full bg-gradient-to-r from-dn-soft to-dn-mint" style={{ width: `${clampPct(p.progress_pct)}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <Meta label="Timeline" value={`${formatDate(p.start_date)} → ${formatDate(p.target_date)}`} />
        <Meta label="Owner" value={p.owner ?? "—"} />
        <Meta label="Target" value={rel.label} tone={rel.tone} />
        <Meta label="Effort" value={p.effort_hours != null ? `${Math.round(p.effort_hours)} hrs` : "counts only"} />
      </div>

      {openBlockers.length > 0 && (
        <div className="mt-3 rounded-lg bg-[#FEF3F2] px-2.5 py-1.5 text-[11px] text-dn-red">
          <span className="font-semibold">Blocked:</span> {openBlockers[0].description}
          {openBlockers.length > 1 ? ` (+${openBlockers.length - 1})` : ""}
        </div>
      )}
      {p.impact_summary && !openBlockers.length && (
        <p className="mt-2 line-clamp-2 text-[11px] text-dn-ink/65">{p.impact_summary}</p>
      )}
    </Link>
  );
}

const TONE: Record<string, string> = { ok: "text-dn-green", warn: "text-dn-amber", bad: "text-dn-red", muted: "text-dn-ink/55" };

function Meta({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "muted" }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-dn-ink/45">{label}</div>
      <div className={`mt-0.5 font-medium ${tone ? TONE[tone] : "text-dn-ink/80"}`}>{value}</div>
    </div>
  );
}
