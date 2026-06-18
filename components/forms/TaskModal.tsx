"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { TaskFields } from "@/components/forms/TaskFields";
import { createTaskAction, deleteTaskAction, updateTaskAction } from "@/app/(app)/impact/actions";
import type { Task } from "@/lib/impact/types";

export function TaskModal({ projectId, task }: { projectId: string; task?: Task }) {
  const [open, setOpen] = useState(false);
  const editing = !!task;
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
        {editing ? "Edit" : "+ Add task"}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit task" : "New task"}>
        <ActionForm
          action={editing ? updateTaskAction : createTaskAction}
          hidden={editing ? { id: task!.id, project_id: projectId } : { project_id: projectId }}
          submitLabel={editing ? "Save task" : "Create task"}
          onDone={() => setOpen(false)}
        >
          <TaskFields projects={[]} task={task} defaultProjectId={projectId} lockProject />
        </ActionForm>
        {editing && (
          <div className="mt-4 border-t border-hairline pt-4">
            <ActionForm
              action={deleteTaskAction}
              hidden={{ id: task!.id, project_id: projectId }}
              submitLabel="Delete task"
              destructive
              onDone={() => setOpen(false)}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
