import type { ReactNode } from 'react';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';

/* Shared formatters + small presentational widgets for the Executive Dashboard.
 * Honest by construction: a null metric renders an em-dash or an owned data gap,
 * never a fabricated 0. */

export const fmtInt = (n: number | null | undefined): string =>
  n == null ? '—' : Math.round(n).toLocaleString('en-US');

export const fmtAed = (n: number | null | undefined): string =>
  n == null ? '—' : `AED ${Math.round(n).toLocaleString('en-US')}`;

export const fmtPct = (n: number | null | undefined): string =>
  n == null ? '—' : `${Math.round(n * 100)}%`;

/** Compact AED for big headline numbers, e.g. 1,240,000 → "AED 1.24M". */
export function fmtAedCompact(n: number | null | undefined): string {
  if (n == null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${Math.round(n).toLocaleString('en-US')}`;
}

/** Hours → human label, mirroring the CRM tab's read. */
export function fmtHours(hours: number | null): string {
  if (hours == null) return '—';
  if (hours >= 48) return `${(hours / 24).toFixed(1)} days`;
  if (hours >= 1) return `${hours.toFixed(1)} hrs`;
  return `${Math.round(hours * 60)} min`;
}

/* ----------------------------------------------------------- Coverage pill --- */

export interface CoveragePill {
  label: string;
  live: boolean;
}

/** A row of small pills narrating which engines are wired/live. */
export function CoverageStrip({ pills }: { pills: CoveragePill[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((p) => (
        <span
          key={p.label}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            p.live
              ? 'border-good/30 bg-good/5 text-good'
              : 'border-line bg-na/5 text-ink-faint'
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] leading-none ${
              p.live ? 'bg-good text-white' : 'bg-na/40 text-white'
            }`}
            aria-hidden
          >
            {p.live ? '✓' : '·'}
          </span>
          {p.label}
        </span>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Stat card --- */

/** A clean hairline stat tile: label, big value (or owned data gap), sub-hint. */
export function StatCard({
  label,
  value,
  hint,
  tone = 'ink',
  gapDetail,
  gapArea,
}: {
  label: string;
  value: string | null;
  hint?: ReactNode;
  tone?: 'ink' | 'good' | 'watch' | 'stop' | 'accent';
  gapDetail?: string;
  gapArea?: string;
}) {
  const toneClass =
    tone === 'good'
      ? 'text-good'
      : tone === 'watch'
        ? 'text-watch'
        : tone === 'stop'
          ? 'text-stop'
          : tone === 'accent'
            ? 'text-accent'
            : 'text-ink';
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      {value == null ? (
        <div className="mt-2">
          <DataGapInline detail={gapDetail ?? 'not sourced'} owner={ownerFor(gapArea ?? 'tracking')} />
        </div>
      ) : (
        <>
          <p className={`mt-1.5 text-[24px] font-semibold leading-none tracking-tight tabular-nums ${toneClass}`}>
            {value}
          </p>
          {hint ? <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">{hint}</p> : null}
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Metric callout --- */

/** A larger emphasis tile for an operational highlight (rate / count). */
export function MetricCallout({
  label,
  value,
  caption,
  tone = 'accent',
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: 'accent' | 'good' | 'watch' | 'stop';
}) {
  const bar =
    tone === 'good'
      ? 'bg-good'
      : tone === 'watch'
        ? 'bg-watch'
        : tone === 'stop'
          ? 'bg-stop'
          : 'bg-accent';
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-card p-4 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden />
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight tabular-nums text-ink">
        {value}
      </p>
      {caption ? <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">{caption}</p> : null}
    </div>
  );
}
