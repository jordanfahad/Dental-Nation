import type { Ownership } from "@/lib/impact/types";

/** Consistent ownership encoding everywhere: dashed border + chip for collaborator. */
export function ownershipBorderClass(ownership: Ownership): string {
  return ownership === "collaborator" ? "collab-border" : "owned-border";
}

export function CollabChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-hairline-strong px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-2">
      collab
    </span>
  );
}

/** "— — collaborator · —— owned" legend, shown wherever both can appear. */
export function OwnershipLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-xs text-ink-3 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block w-6 border-t-[1.5px] border-dashed border-hairline-strong"
          aria-hidden
        />
        collaborator
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block w-6 border-t border-ink" aria-hidden />
        owned
      </span>
    </div>
  );
}
