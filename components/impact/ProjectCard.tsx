import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CollabChip, ownershipBorderClass } from "@/components/ui/Ownership";
import { cn } from "@/components/ui/cn";
import { formatHours, relativeTarget } from "@/lib/impact/format";
import type { Project } from "@/lib/impact/types";

const TONE_TEXT: Record<string, string> = {
  ok: "text-ink-3",
  warn: "text-warn",
  bad: "text-bad",
  muted: "text-ink-3",
};

export function ProjectCard({
  project,
  hue,
  taskCount,
}: {
  project: Project;
  hue: string;
  taskCount: number;
}) {
  const rel = relativeTarget(project.target_date);
  return (
    <Link
      href={`/impact/projects/${project.id}`}
      className={cn(
        "block rounded-xl bg-paper p-3.5 transition-shadow hover:shadow-sm print-avoid-break",
        ownershipBorderClass(project.ownership)
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-ink">{project.name}</h4>
        {project.ownership === "collaborator" && <CollabChip />}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <StatusPill status={project.status} />
        {project.priority === "high" && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-bad">High</span>
        )}
      </div>

      <div className="mt-2.5">
        <ProgressBar value={project.progress_pct} color={hue} />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={TONE_TEXT[rel.tone]}>{rel.label}</span>
        <span className="tnum text-ink-3">
          {project.effort_hours != null
            ? `${formatHours(project.effort_hours)} hrs`
            : `${taskCount} task${taskCount === 1 ? "" : "s"}`}
        </span>
      </div>

      {project.impact_summary && (
        <p className="mt-2 line-clamp-2 text-xs text-ink-2">{project.impact_summary}</p>
      )}
    </Link>
  );
}
