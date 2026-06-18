"use client";

import { ReactNode, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "@/lib/impact/action-types";
import { cn } from "@/components/ui/cn";

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Wraps a CRUD server action with React 19 useActionState: shows inline errors,
 * disables the button while pending, and on success refreshes the route and
 * fires onDone (used to close drawers/modals).
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  onDone,
  className,
  hidden,
  destructive,
}: {
  action: ServerAction;
  children?: ReactNode;
  submitLabel?: string;
  onDone?: () => void;
  className?: string;
  hidden?: Record<string, string>;
  destructive?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone?.();
    }
    // Only react to a new action result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {state?.error && (
        <p className="rounded-md bg-bad-weak px-3 py-2 text-sm text-bad">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50",
          destructive
            ? "bg-paper text-bad border border-bad/30 hover:bg-bad-weak"
            : "bg-accent text-white hover:bg-accent-strong"
        )}
      >
        {pending ? "Working…" : submitLabel}
      </button>
    </form>
  );
}
