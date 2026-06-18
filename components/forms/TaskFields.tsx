import { Field, inputCls } from "@/components/ui/field";
import type { Project, Task } from "@/lib/impact/types";

const TASK_STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

export function TaskFields({
  projects,
  task,
  defaultProjectId,
  lockProject = false,
}: {
  projects: Project[];
  task?: Partial<Task>;
  defaultProjectId?: string;
  lockProject?: boolean;
}) {
  const projectId = task?.project_id ?? defaultProjectId ?? "";
  return (
    <div className="space-y-4">
      <Field label="Task name">
        <input name="name" className={inputCls} defaultValue={task?.name ?? ""} required />
      </Field>

      {lockProject ? (
        <input type="hidden" name="project_id" value={projectId} />
      ) : (
        <Field label="Project">
          <select name="project_id" className={inputCls} defaultValue={projectId}>
            <option value="">— Unassigned —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <select name="status" className={inputCls} defaultValue={task?.status ?? "open"}>
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <input name="owner" className={inputCls} defaultValue={task?.owner ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Effort (hrs)">
          <input
            name="effort_hours"
            type="number"
            step="0.25"
            min={0}
            className={inputCls}
            defaultValue={task?.effort_hours ?? ""}
          />
        </Field>
        <Field label="Due date">
          <input name="due_date" type="date" className={inputCls} defaultValue={task?.due_date ?? ""} />
        </Field>
        <Field label="Completed">
          <input
            name="completed_date"
            type="date"
            className={inputCls}
            defaultValue={task?.completed_date ?? ""}
          />
        </Field>
      </div>

      <Field label="Link (G-Drive / URL)">
        <input
          name="link"
          type="url"
          className={inputCls}
          defaultValue={task?.link ?? ""}
          placeholder="https://drive.google.com/…"
        />
      </Field>
    </div>
  );
}
