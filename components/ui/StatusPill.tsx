import { statusMeta, TASK_STATUS_META, SEVERITY_META } from "@/lib/impact/constants";
import type { Severity, TaskStatus } from "@/lib/impact/types";
import { cn } from "./cn";

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const m = statusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        m.pill,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function TaskStatusPill({ status }: { status?: TaskStatus | null }) {
  const m = status ? TASK_STATUS_META[status] : null;
  if (!m) return <span className="text-xs text-ink-3">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", m.pill)}>
      {m.label}
    </span>
  );
}

export function SeverityPill({ severity }: { severity?: Severity | null }) {
  const m = severity ? SEVERITY_META[severity] : null;
  if (!m) return null;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", m.pill)}>
      {m.label}
    </span>
  );
}
