"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, inputCls } from "@/components/ui/field";
import { addEffortAction } from "@/app/(app)/impact/actions";
import type { Task } from "@/lib/impact/types";

export function EffortModal({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-panel"
      >
        + Log effort
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log effort (manual)">
        <ActionForm
          action={addEffortAction}
          hidden={{ project_id: projectId }}
          submitLabel="Add hours"
          onDone={() => setOpen(false)}
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hours">
              <input name="hours" type="number" step="0.25" min="0" className={inputCls} required />
            </Field>
            <Field label="Date">
              <input name="log_date" type="date" className={inputCls} defaultValue={today} />
            </Field>
          </div>
          <Field label="Task (optional)">
            <select name="task_id" className={inputCls} defaultValue="">
              <option value="">— None —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note">
            <input name="note" className={inputCls} placeholder="What the time went to" />
          </Field>
          <p className="text-[11px] text-ink-3">
            Manual entries are sourced as <code>manual</code> and roll up into the project&apos;s
            effort total.
          </p>
        </ActionForm>
      </Modal>
    </>
  );
}
