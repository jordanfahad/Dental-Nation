import { Field, inputCls } from "@/components/ui/field";
import type { Project, ProjectBlocker } from "@/lib/impact/types";

export function BlockerFields({
  projects,
  blocker,
  defaultProjectId,
  lockProject = false,
  showResolution = false,
}: {
  projects: Project[];
  blocker?: Partial<ProjectBlocker>;
  defaultProjectId?: string;
  lockProject?: boolean;
  showResolution?: boolean;
}) {
  const projectId = blocker?.project_id ?? defaultProjectId ?? "";
  return (
    <div className="space-y-4">
      <Field label="What's blocking impact?">
        <textarea
          name="description"
          rows={2}
          className={inputCls}
          defaultValue={blocker?.description ?? ""}
          required
        />
      </Field>

      {lockProject ? (
        <input type="hidden" name="project_id" value={projectId} />
      ) : (
        <Field label="Project">
          <select name="project_id" className={inputCls} defaultValue={projectId}>
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Severity">
          <select name="severity" className={inputCls} defaultValue={blocker?.severity ?? "medium"}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Status">
          <select name="status" className={inputCls} defaultValue={blocker?.status ?? "open"}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </Field>
      </div>

      <Field label="What's needed to unblock — and from whom?">
        <input name="needs" className={inputCls} defaultValue={blocker?.needs ?? ""} />
      </Field>
      <Field label="Owner (who must act)">
        <input name="owner" className={inputCls} defaultValue={blocker?.owner ?? ""} />
      </Field>

      {showResolution && (
        <Field label="Resolution">
          <textarea
            name="resolution"
            rows={2}
            className={inputCls}
            defaultValue={blocker?.resolution ?? ""}
          />
        </Field>
      )}
    </div>
  );
}
