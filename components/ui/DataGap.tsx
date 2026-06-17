import type { DataGap } from '@/lib/types';

/** Inline "Data gap" state — used wherever a metric can't be computed. NEVER a
 *  silent zero (§15): always names what's missing and who owns it. */
export function DataGapInline({ detail, owner }: { detail: string; owner: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-watch/10 px-2 py-1 text-[11px] font-medium text-watch">
      <span className="h-1.5 w-1.5 rounded-full bg-watch" />
      Data gap
      <span className="font-normal text-watch/80">· {detail} · owner: {owner}</span>
    </span>
  );
}

/** A "Data gap" value placeholder for a KPI/metric card. */
export function DataGapValue({ label, owner }: { label: string; owner: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold text-watch">Data gap</span>
      <span className="text-[11px] text-ink-faint">
        {label} · owner: {owner}
      </span>
    </div>
  );
}

export function DataGapList({ gaps }: { gaps: DataGap[] }) {
  if (gaps.length === 0) {
    return <p className="text-[13px] text-good">No open data gaps — every metric is sourced.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {gaps.map((g, i) => (
        <li key={i} className="flex items-start gap-2 text-[12.5px]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-watch" />
          <span className="text-ink-soft">
            <span className="font-medium text-ink">{g.area}</span> — {g.detail}
            <span className="text-ink-faint"> · owner: {g.owner}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
