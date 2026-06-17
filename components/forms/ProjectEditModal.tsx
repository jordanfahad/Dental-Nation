"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ActionForm } from "@/components/forms/ActionForm";
import { ProjectFields } from "@/components/forms/ProjectFields";
import { deleteProjectAction, updateProjectAction } from "@/app/(app)/impact/actions";
import type { Component, Project } from "@/lib/impact/types";

export function ProjectEditModal({
  project,
  components,
}: {
  project: Project;
  components: Component[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong px-3 py-1.5 text-sm font-medium text-ink-2 hover:bg-panel"
      >
        Edit project
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit project" width="max-w-2xl">
        <ActionForm
          action={updateProjectAction}
          hidden={{ id: project.id }}
          submitLabel="Save project"
          onDone={() => setOpen(false)}
        >
          <ProjectFields components={components} project={project} showCompleted />
        </ActionForm>
        <div className="mt-4 border-t border-hairline pt-4">
          <ActionForm
            action={deleteProjectAction}
            hidden={{ id: project.id }}
            submitLabel="Delete project"
            destructive
            onDone={() => {
              setOpen(false);
              router.push("/impact");
            }}
          />
        </div>
      </Modal>
    </>
  );
}
