"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { applyBulkEditAction, deleteIngestionJobAction } from "@/app/(app)/impact/review/actions";
import type { BulkEditProposal, BulkRowUpdate } from "@/lib/impact/types";

/**
 * The confirm step for an Excel bulk edit. Shows the field-level diff per row
 * (current → proposed) with an include toggle. Approve writes the ticked rows
 * (applyBulkEditAction); Discard removes the staged proposal. Nothing here is
 * applied automatically — same one-human-gate as every other ingest path.
 */
export function BulkEditReview({
  jobId,
  proposal,
  status,
  sourceRef,
  canEdit,
}: {
  jobId: string;
  proposal: BulkEditProposal;
  status: string;
  sourceRef: string | null;
  canEdit: boolean;
}) {
  const { projectUpdates, taskUpdates, unmatched, notes } = proposal;
  const total = projectUpdates.length + taskUpdates.length;
  const pending = status === "pending_review";
  const editable = pending && canEdit;

  return (
    <div className="mt-3 space-y-6">
      <SectionHeading
        eyebrow="The one human gate · Excel bulk edit"
        title="Review imported edits"
        description={`${total} row${total === 1 ? "" : "s"} changed in ${sourceRef ?? "the upload"}. Nothing saves until you confirm — untick any row to leave it as-is.`}
      />

      {!pending && (
        <p className="rounded-md bg-muted-weak px-3 py-2 text-sm text-ink-2">
          This import is <strong>{status}</strong> — shown for reference only.
        </p>
      )}

      {total === 0 ? (
        <p className="rounded-md bg-muted-weak px-3 py-2 text-sm text-ink-2">
          No field changes were detected in this file.
        </p>
      ) : editable ? (
        <ActionForm action={applyBulkEditAction} hidden={{ jobId }} submitLabel="Apply selected changes">
          <Diffs projectUpdates={projectUpdates} taskUpdates={taskUpdates} withCheckboxes />
        </ActionForm>
      ) : (
        <Diffs projectUpdates={projectUpdates} taskUpdates={taskUpdates} withCheckboxes={false} />
      )}

      {unmatched.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn-weak/50 p-4">
          <h3 className="text-sm font-semibold text-warn">{unmatched.length} row(s) not matched</h3>
          <p className="mt-1 text-xs text-ink-2">
            These IDs weren&apos;t found, so they&apos;re ignored (new rows aren&apos;t created here — use “Add update”):
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-ink-2">
            {unmatched.map((u, i) => (
              <li key={i}>
                · [{u.sheet}] {u.name || "(unnamed)"} <span className="text-ink-3">— {u.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && <p className="text-xs text-ink-3">{notes}</p>}

      {editable && (
        <ActionForm
          action={deleteIngestionJobAction}
          hidden={{ jobId }}
          submitLabel="Discard this import"
          destructive
        />
      )}
    </div>
  );
}

function Diffs({
  projectUpdates,
  taskUpdates,
  withCheckboxes,
}: {
  projectUpdates: BulkRowUpdate[];
  taskUpdates: BulkRowUpdate[];
  withCheckboxes: boolean;
}) {
  return (
    <div className="space-y-5">
      {projectUpdates.length > 0 && (
        <Group title="Projects" rows={projectUpdates} name="projectId" withCheckboxes={withCheckboxes} />
      )}
      {taskUpdates.length > 0 && (
        <Group title="Tasks" rows={taskUpdates} name="taskId" withCheckboxes={withCheckboxes} />
      )}
    </div>
  );
}

function Group({
  title,
  rows,
  name,
  withCheckboxes,
}: {
  title: string;
  rows: BulkRowUpdate[];
  name: string;
  withCheckboxes: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {title} <span className="text-ink-3">({rows.length})</span>
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-hairline bg-paper p-3">
            <label className="flex items-start gap-3">
              {withCheckboxes && (
                <input type="checkbox" name={name} value={r.id} defaultChecked className="mt-1 h-4 w-4" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink">{r.name}</div>
                <ul className="mt-1 space-y-0.5">
                  {r.changes.map((c, i) => (
                    <li key={i} className="text-xs text-ink-2">
                      <span className="font-medium text-ink-3">{c.label}:</span>{" "}
                      <span className="text-bad/80 line-through">{c.from ?? "—"}</span>{" "}
                      <span className="text-ink-3">→</span>{" "}
                      <span className="font-medium text-ok">{c.to ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
