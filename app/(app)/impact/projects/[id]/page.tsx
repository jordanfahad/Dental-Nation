import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlockersForProject,
  getComponents,
  getEffortForProject,
  getEvidenceForProject,
  getProject,
  getTasksForProject,
} from "@/lib/impact/data";
import { StatusPill, TaskStatusPill, SeverityPill } from "@/components/ui/StatusPill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CollabChip, ownershipBorderClass } from "@/components/ui/Ownership";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskModal } from "@/components/forms/TaskModal";
import { BlockerModal } from "@/components/forms/BlockerModal";
import { EffortModal } from "@/components/forms/EffortModal";
import { ProjectEditModal } from "@/components/forms/ProjectEditModal";
import { AttachEvidence } from "@/components/forms/AttachEvidence";
import { COMPONENT_HUE, DEFAULT_HUE } from "@/lib/impact/constants";
import { cn } from "@/components/ui/cn";
import { clampPct, formatDate, formatHours } from "@/lib/impact/format";
import { currentRole } from "@/lib/auth/role";

export const dynamic = "force-dynamic";

const SOURCE_PILL: Record<string, string> = {
  zoho: "bg-accent-weak text-accent-strong",
  manual: "bg-ok-weak text-ok",
  estimated: "bg-warn-weak text-warn",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, components, tasks, blockers, evidence, effortLogs] = await Promise.all([
    getProject(id),
    getComponents(),
    getTasksForProject(id),
    getBlockersForProject(id),
    getEvidenceForProject(id),
    getEffortForProject(id),
  ]);
  if (!project) notFound();
  const canEdit = (await currentRole()) === "admin";

  const component = components.find((c) => c.id === project.component_id);
  const hue = component ? COMPONENT_HUE[component.id] ?? DEFAULT_HUE : DEFAULT_HUE;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/impact" className="text-sm text-ink-2 hover:text-ink">
        ← Impact
      </Link>

      {/* Header */}
      <div className={cn("mt-3 rounded-xl bg-paper p-5", ownershipBorderClass(project.ownership))}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
              <span className="h-2 w-2 rounded-full" style={{ background: hue }} />
              {component?.name ?? "Unassigned"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{project.name}</h1>
              {project.ownership === "collaborator" && <CollabChip />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={project.status} />
              {project.priority && (
                <span className="text-xs font-medium capitalize text-ink-2">{project.priority} priority</span>
              )}
              {project.owner && (
                <span className="text-xs font-medium text-ink-2">· Owner: {project.owner}</span>
              )}
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-accent-weak px-2 py-0.5 text-xs font-medium text-accent-strong hover:underline"
                >
                  ↗ Link
                </a>
              )}
            </div>
          </div>
          {canEdit && <ProjectEditModal project={project} components={components} />}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
          <Meta label="Progress">
            <div className="flex items-center gap-2">
              <ProgressBar value={project.progress_pct} color={hue} className="flex-1" />
              <span className="tnum text-xs text-ink-2">{clampPct(project.progress_pct)}%</span>
            </div>
          </Meta>
          <Meta label="Timeline">
            <span className="tnum text-sm text-ink">
              {formatDate(project.start_date)} → {formatDate(project.target_date)}
            </span>
          </Meta>
          <Meta label="Effort">
            {project.effort_hours != null ? (
              <span className="flex items-center gap-1.5">
                <span className="tnum text-sm font-medium text-ink">
                  {formatHours(project.effort_hours)} hrs
                </span>
                {project.effort_source && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      SOURCE_PILL[project.effort_source] ?? "bg-muted-weak text-ink-2"
                    )}
                  >
                    {project.effort_source}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-sm text-ink-3">
                {tasks.length} task{tasks.length === 1 ? "" : "s"} · hours not tracked
              </span>
            )}
          </Meta>
          <Meta label="Source">
            <span className="text-sm capitalize text-ink">{project.source.replace("_", " ")}</span>
          </Meta>
        </div>
      </div>

      {/* Impact / outcome */}
      {project.impact_summary && (
        <div className="mt-6 rounded-xl border-l-2 border-accent bg-accent-weak/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-accent-strong">
            Impact / outcome
          </div>
          <p className="mt-1 text-sm text-ink">{project.impact_summary}</p>
        </div>
      )}
      {project.description && (
        <p className="mt-4 text-sm text-ink-2">{project.description}</p>
      )}

      {/* Tasks */}
      <Section title="Tasks" count={tasks.length} action={canEdit ? <TaskModal projectId={project.id} /> : undefined}>
        {tasks.length === 0 ? (
          <EmptyState title="No tasks yet" hint="Add tasks directly or import them from a Zoho export." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-hairline bg-panel text-left text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2 font-medium">Task</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Owner</th>
                  <th className="px-4 py-2 text-right font-medium">Hrs</th>
                  <th className="px-4 py-2 font-medium">Due</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 text-ink">{t.name}</td>
                    <td className="px-4 py-2.5">
                      <TaskStatusPill status={t.status} />
                    </td>
                    <td className="px-4 py-2.5 text-ink-2">{t.owner ?? "—"}</td>
                    <td className="tnum px-4 py-2.5 text-right text-ink-2">
                      {t.effort_hours != null ? formatHours(t.effort_hours) : "—"}
                    </td>
                    <td className="tnum px-4 py-2.5 text-ink-2">{formatDate(t.due_date)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && <TaskModal projectId={project.id} task={t} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Blockers */}
      <Section
        title="Blockers"
        count={blockers.length}
        action={canEdit ? <BlockerModal projectId={project.id} /> : undefined}
      >
        {blockers.length === 0 ? (
          <EmptyState title="No blockers" hint="Raise one if something is slowing this project." />
        ) : (
          <div className="card divide-y divide-hairline">
            {blockers.map((b) => (
              <div key={b.id} className="flex items-start gap-4 p-4">
                <div className="w-16 shrink-0 pt-0.5">
                  <SeverityPill severity={b.severity} />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm", b.status === "resolved" ? "text-ink-3 line-through" : "text-ink")}>
                    {b.description}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-ink-3">
                    {b.needs && <span>Needs: {b.needs}</span>}
                    {b.owner && <span>Who: {b.owner}</span>}
                    <span className="capitalize">{b.status.replace("_", " ")}</span>
                  </div>
                </div>
                {canEdit && <BlockerModal projectId={project.id} blocker={b} />}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Effort */}
      <Section
        title="Effort log"
        count={effortLogs.length}
        action={canEdit ? <EffortModal projectId={project.id} tasks={tasks} /> : undefined}
      >
        {effortLogs.length === 0 ? (
          <EmptyState
            title="No logged hours"
            hint="Log hours manually, or import Zoho logged hours. Until then the dashboard shows task counts, not invented hours."
          />
        ) : (
          <div className="card divide-y divide-hairline">
            {effortLogs.map((e) => (
              <div key={e.id} className="flex items-center gap-4 p-3 text-sm">
                <span className="tnum w-24 text-ink-3">{formatDate(e.log_date)}</span>
                <span className="tnum w-16 font-medium text-ink">{formatHours(e.hours)} hrs</span>
                <span className="flex-1 text-ink-2">{e.note ?? "—"}</span>
                <span className="text-xs capitalize text-ink-3">{e.source ?? "manual"}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Evidence */}
      <Section
        title="Evidence"
        count={evidence.length}
        action={canEdit ? <AttachEvidence projectId={project.id} componentId={project.component_id ?? undefined} /> : undefined}
      >
        {evidence.length === 0 ? (
          <EmptyState title="No files attached" hint="Attach files from the Add-update drawer." />
        ) : (
          <div className="card divide-y divide-hairline">
            {evidence.map((f) => (
              <a
                key={f.id}
                href={`/api/evidence/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 text-sm hover:bg-panel"
              >
                <span className="font-medium text-ink">{f.filename}</span>
                <span className="text-xs text-ink-3">{formatDate(f.uploaded_at)}</span>
              </a>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-ink-3">{label}</div>
      {children}
    </div>
  );
}

function Section({
  title,
  count,
  action,
  children,
}: {
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          {title} <span className="tnum ml-1 font-normal text-ink-3">{count}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
