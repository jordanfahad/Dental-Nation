import { Field, inputCls } from "@/components/ui/field";
import type { Component, Project } from "@/lib/impact/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
];

export function ProjectFields({
  components,
  project,
  showCompleted = false,
}: {
  components: Component[];
  project?: Partial<Project>;
  showCompleted?: boolean;
}) {
  return (
    <div className="space-y-4">
      <Field label="Project name">
        <input name="name" className={inputCls} defaultValue={project?.name ?? ""} required />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Function">
          <select name="component_id" className={inputCls} defaultValue={project?.component_id ?? ""}>
            <option value="">— Unassigned —</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ownership" hint="Collaborator projects render dotted">
          <select name="ownership" className={inputCls} defaultValue={project?.ownership ?? "owner"}>
            <option value="owner">Owner</option>
            <option value="collaborator">Collaborator</option>
          </select>
        </Field>
      </div>

      <Field label="Owner" hint="Who's driving this — type any name to add them">
        <input
          name="owner"
          className={inputCls}
          defaultValue={project?.owner ?? ""}
          placeholder="e.g. Fahad Siddiqui"
        />
      </Field>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Status">
          <select name="status" className={inputCls} defaultValue={project?.status ?? "not_started"}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority" className={inputCls} defaultValue={project?.priority ?? ""}>
            <option value="">—</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </Field>
        <Field label="Progress %">
          <input
            name="progress_pct"
            type="number"
            min={0}
            max={100}
            className={inputCls}
            defaultValue={project?.progress_pct ?? 0}
          />
        </Field>
      </div>

      <Field label="Impact / outcome" hint="The business result this drove — leads the dashboard">
        <textarea
          name="impact_summary"
          rows={2}
          className={inputCls}
          defaultValue={project?.impact_summary ?? ""}
          placeholder="e.g. Shipped 3 conversion-optimized landing pages → +18% form fills"
        />
      </Field>

      <Field label="Link (G-Drive / URL)" hint="A Drive folder, doc, deck, sheet…">
        <input
          name="link"
          type="url"
          className={inputCls}
          defaultValue={project?.link ?? ""}
          placeholder="https://drive.google.com/…"
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          rows={2}
          className={inputCls}
          defaultValue={project?.description ?? ""}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start date">
          <input name="start_date" type="date" className={inputCls} defaultValue={project?.start_date ?? ""} />
        </Field>
        <Field label="Target date" hint="Timelines are yours to set">
          <input name="target_date" type="date" className={inputCls} defaultValue={project?.target_date ?? ""} />
        </Field>
      </div>

      {showCompleted && (
        <Field label="Completed date">
          <input
            name="completed_date"
            type="date"
            className={inputCls}
            defaultValue={project?.completed_date ?? ""}
          />
        </Field>
      )}
    </div>
  );
}
