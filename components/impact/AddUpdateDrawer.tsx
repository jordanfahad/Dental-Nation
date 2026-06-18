"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { ActionForm } from "@/components/forms/ActionForm";
import { ProjectFields } from "@/components/forms/ProjectFields";
import { TaskFields } from "@/components/forms/TaskFields";
import { AuthoringInput } from "./AuthoringInput";
import { cn } from "@/components/ui/cn";
import { createProjectAction, createTaskAction } from "@/app/(app)/impact/actions";
import type { Component, Project } from "@/lib/impact/types";

type Tab = "ingest" | "project" | "task";
const TABS: [Tab, string][] = [
  ["ingest", "Paste / Upload"],
  ["project", "New project"],
  ["task", "New task"],
];

export function AddUpdateDrawer({
  open,
  onClose,
  components,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  components: Component[];
  projects: Project[];
}) {
  const [tab, setTab] = useState<Tab>("ingest");
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Add update"
      subtitle="Paste a report, drop a file, or add a project/task directly"
    >
      <div className="mb-5 flex gap-1 rounded-lg bg-panel p-1">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === k ? "bg-paper text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ingest" && <AuthoringInput onClose={onClose} />}

      {tab === "project" && (
        <ActionForm action={createProjectAction} submitLabel="Create project" onDone={onClose}>
          <ProjectFields components={components} />
        </ActionForm>
      )}

      {tab === "task" && (
        <ActionForm action={createTaskAction} submitLabel="Create task" onDone={onClose}>
          <TaskFields projects={projects} />
        </ActionForm>
      )}
    </Drawer>
  );
}
