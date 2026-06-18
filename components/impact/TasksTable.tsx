"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { TaskFields } from "@/components/forms/TaskFields";
import { AttachEvidence } from "@/components/forms/AttachEvidence";
import { TaskStatusPill } from "@/components/ui/StatusPill";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { createTaskAction, updateTaskAction } from "@/app/(app)/impact/actions";
import { formatDate, formatHours } from "@/lib/impact/format";
import type { Project, Task } from "@/lib/impact/types";

/**
 * The full task list — every task across all projects, plus orphan/Zoho tasks
 * (project_id null) so nothing is hidden. Add a task or edit any task inline
 * (including reassigning it to a project — how imported Zoho tasks get triaged).
 */
export function TasksTable({
  tasks,
  projects,
  canEdit = true,
}: {
  tasks: Task[];
  projects: Project[];
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));

  // Unassigned first (they need triage), then by due date.
  const ordered = [...tasks].sort((a, b) => {
    const au = a.project_id ? 1 : 0;
    const bu = b.project_id ? 1 : 0;
    if (au !== bu) return au - bu;
    return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  });
  const unassigned = tasks.filter((t) => !t.project_id).length;

  return (
    <section className="print-break">
      <SectionHeading
        eyebrow="Task list"
        title="All tasks"
        description={
          unassigned > 0
            ? `${tasks.length} tasks — ${unassigned} unassigned (open one to assign it to a project).`
            : `${tasks.length} tasks across every function.`
        }
        right={
          canEdit ? (
            <button
              onClick={() => setEditing("new")}
              className="no-print inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
            >
              + New task
            </button>
          ) : undefined
        }
      />

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          hint="Add one with “New task”, or import a Zoho export from the Add-update drawer."
        />
      ) : (
        <div className="card overflow-x-auto print-avoid-break">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="border-b border-hairline bg-panel text-left text-xs text-ink-3">
              <tr>
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Project</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 text-right font-medium">Hrs</th>
                <th className="px-4 py-2 font-medium">Due</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {ordered.map((t) => (
                <tr key={t.id} className="hover:bg-panel/50">
                  <td className="px-4 py-2.5 text-ink">{t.name}</td>
                  <td className="px-4 py-2.5">
                    {t.project_id ? (
                      <span className="text-ink-2">{projectName.get(t.project_id) ?? "—"}</span>
                    ) : (
                      <span className="rounded-full bg-warn-weak px-2 py-0.5 text-xs font-medium text-warn">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <TaskStatusPill status={t.status} />
                  </td>
                  <td className="px-4 py-2.5 text-ink-2">{t.owner ?? "—"}</td>
                  <td className="tnum px-4 py-2.5 text-right text-ink-2">
                    {t.effort_hours != null ? formatHours(t.effort_hours) : "—"}
                  </td>
                  <td className="tnum px-4 py-2.5 text-ink-2">{formatDate(t.due_date)}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-ink-3">{t.source}</td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit ? (
                      <div className="flex items-center justify-end gap-1">
                        <AttachEvidence taskId={t.id} componentId={undefined} label="+ File" />
                        <button
                          onClick={() => setEditing(t)}
                          className="no-print rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-panel"
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-3">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New task" : "Edit task"}
      >
        {editing !== null && (
          <ActionForm
            action={editing === "new" ? createTaskAction : updateTaskAction}
            hidden={editing !== "new" ? { id: (editing as Task).id } : undefined}
            submitLabel={editing === "new" ? "Create task" : "Save task"}
            onDone={() => setEditing(null)}
          >
            <TaskFields projects={projects} task={editing === "new" ? undefined : (editing as Task)} />
          </ActionForm>
        )}
      </Modal>
    </section>
  );
}
