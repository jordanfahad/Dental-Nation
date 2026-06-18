"use client";

import { useActionState } from "react";
import { deleteIngestionJobAction } from "@/app/(app)/impact/review/actions";
import type { ActionState } from "@/lib/impact/action-types";

/** Small delete button for an ingestion job (queue rows). Discards the staged
 *  proposal + its raw upload; never touches projects/tasks. */
export function JobDeleteButton({ jobId }: { jobId: string }) {
  const [, action, pending] = useActionState<ActionState, FormData>(deleteIngestionJobAction, null);
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={pending}
        title="Delete this ingestion job"
        className="rounded-md border border-hairline-strong px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-bad/40 hover:bg-bad-weak hover:text-bad disabled:opacity-50"
      >
        {pending ? "…" : "Delete"}
      </button>
    </form>
  );
}
