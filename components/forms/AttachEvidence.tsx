"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, inputCls } from "@/components/ui/field";
import { uploadEvidenceAction } from "@/app/(app)/impact/actions";

export function AttachEvidence({
  projectId,
  componentId,
  label = "+ Attach file",
}: {
  projectId?: string;
  componentId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const hidden: Record<string, string> = {};
  if (projectId) hidden.project_id = projectId;
  if (componentId) hidden.component_id = componentId;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-panel"
      >
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Attach evidence">
        <ActionForm action={uploadEvidenceAction} submitLabel="Upload" onDone={() => setOpen(false)} hidden={hidden}>
          <Field label="File" hint="PDF, deck, export, image, etc.">
            <input type="file" name="file" className={inputCls} required />
          </Field>
          <Field label="Description">
            <input name="description" className={inputCls} placeholder="What this evidences" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="visible_to_ceo" defaultChecked /> Visible to CEO
          </label>
        </ActionForm>
      </Modal>
    </>
  );
}
