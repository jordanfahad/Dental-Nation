import Link from "next/link";
import type { LaneESnapshot } from "@/lib/impact/types";

/** Read-only attributable impact from the Lane E report (§7). Hidden if no snapshot.
 *  In this app the Lane E report lives at "/", so the tag links there. */
export function LaneETag({
  snapshot,
  compact = false,
}: {
  snapshot: LaneESnapshot | null;
  compact?: boolean;
}) {
  if (!snapshot || snapshot.qualified_inquiries == null) return null;
  return (
    <div className="rounded-lg border border-ok/25 bg-ok-weak/60 p-3">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ok"
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
        live — from Lane E report
      </Link>
      <div className={compact ? "mt-1.5 flex gap-5" : "mt-2 flex flex-wrap gap-6"}>
        <Stat value={snapshot.qualified_inquiries} label="qualified inquiries" />
        {snapshot.glow_up_bookings != null && (
          <Stat value={snapshot.glow_up_bookings} label="Glow Up bookings" />
        )}
        {snapshot.best_channel && (
          <div>
            <div className="text-sm font-semibold text-ink">{snapshot.best_channel}</div>
            <div className="text-[11px] text-ink-3">best channel</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="tnum text-sm font-semibold text-ink">{value.toLocaleString("en-US")}</div>
      <div className="text-[11px] text-ink-3">{label}</div>
    </div>
  );
}
