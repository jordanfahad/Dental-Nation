import type { MetricDelta } from '@/lib/types';
import { fmtInt } from '@/lib/format';

/**
 * A KPI scorecard (Step 2): a label, a big tabular value, and the Δ vs the
 * comparison period (green ▲ up / red ▼ down, %). Honest by construction — when
 * the metric value is null it renders an explicit data-gap, and when the
 * comparison is missing/zero it shows a clean "—" instead of a fabricated 0.
 *
 * `unit` adds a suffix ('AED', '%'); `prefix` puts 'AED' in front. `invert` flips
 * delta colouring for "lower is better" metrics (cost-per-lead, cancellations).
 */
export function Scorecard({
  label,
  metric,
  unit,
  prefix,
  decimals = 0,
  invert = false,
  gapDetail,
  gapOwner,
}: {
  label: string;
  metric: MetricDelta;
  unit?: string;
  prefix?: string;
  decimals?: number;
  invert?: boolean;
  /** When the value is null, what's missing + who owns it (data-gap state). */
  gapDetail?: string;
  gapOwner?: string;
}) {
  const { value, deltaPct } = metric;

  if (value == null) {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-line bg-card px-4 py-3">
        <span className="eyebrow">{label}</span>
        <span className="text-base font-semibold text-watch">Data gap</span>
        {gapDetail ? (
          <span className="text-[10.5px] leading-tight text-ink-faint">
            {gapDetail}
            {gapOwner ? ` · owner: ${gapOwner}` : ''}
          </span>
        ) : null}
      </div>
    );
  }

  const formatted = formatValue(value, decimals);
  const tone = deltaToneFor(deltaPct, invert);
  const arrow = deltaPct == null ? '' : deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '';
  const toneClass = tone === 'good' ? 'text-good' : tone === 'stop' ? 'text-stop' : 'text-ink-faint';

  return (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-card px-4 py-3">
      <span className="eyebrow">{label}</span>
      <div className="flex items-baseline gap-1">
        {prefix ? <span className="text-[12px] font-medium text-ink-faint">{prefix}</span> : null}
        <span className="tnum text-kpi font-semibold leading-none text-ink">{formatted}</span>
        {unit ? <span className="text-[12px] font-medium text-ink-faint">{unit}</span> : null}
      </div>
      <span className={`tnum text-[12px] font-medium ${toneClass}`}>
        {deltaPct == null ? (
          <span className="text-ink-ghost">— vs prev</span>
        ) : (
          <>
            {arrow} {fmtSignedPct(deltaPct)} vs prev
          </>
        )}
      </span>
    </div>
  );
}

function formatValue(value: number, decimals: number): string {
  if (decimals > 0) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  return fmtInt(value);
}

function fmtSignedPct(deltaPct: number): string {
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${(deltaPct * 100).toFixed(0)}%`;
}

/** Up is good by default; invert for cost/cancellation-style metrics. A 0 delta
 *  is neutral ("na"). null is handled by the caller (clean "—"). */
function deltaToneFor(deltaPct: number | null, invert: boolean): 'good' | 'stop' | 'na' {
  if (deltaPct == null || deltaPct === 0) return 'na';
  const positive = deltaPct > 0;
  const good = invert ? !positive : positive;
  return good ? 'good' : 'stop';
}
