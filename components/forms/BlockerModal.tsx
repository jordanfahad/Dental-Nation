"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { BlockerFields } from "@/components/forms/BlockerFields";
import {
  createBlockerAction,
  deleteBlockerAction,
  updateBlockerAction,
} from "@/app/(app)/impact/actions";
import type { ProjectBlocker } from "@/lib/impact/types";

export function BlockerModal({
  projectId,
  blocker,
}: {
  projectId: string;
  blocker?: ProjectBlocker;
}) {
  const [open, setOpen] = useState(false);
  const editing = !!blocker;
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={
          editing
            ? "rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-panel"
            : "inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-panel"
        }
      >
        {editing ? "Edit" : "+ Raise blocker"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit blocker" : "Raise a blocker"}>
        <ActionForm
          action={editing ? updateBlockerAction : createBlockerAction}
          hidden={editing ? { id: blocker!.id, project_id: projectId } : { project_id: projectId }}
          submitLabel={editing ? "Save" : "Raise blocker"}
          onDone={() => setOpen(false)}
        >
          <BlockerFields
            projects={[]}
            blocker={blocker}
            defaultProjectId={projectId}
            lockProject
            showResolution={editing}
          />
        </ActionForm>
        {editing && (
          <div className="mt-4 border-t border-hairline pt-4">
            <ActionForm
              action={deleteBlockerAction}
              hidden={{ id: blocker!.id, project_id: projectId }}
              submitLabel="Delete blocker"
              destructive
              onDone={() => setOpen(false)}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
