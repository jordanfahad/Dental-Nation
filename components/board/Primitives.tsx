import type { ReactNode } from 'react';
import type { Slot } from '@/config/handover';

/**
 * Shared display primitives for the board report and the handover document.
 *
 * The governing rule for both pages: an unknown number or name must LOOK
 * unknown. Every unconfirmed value renders through <Pending> — an amber,
 * dashed, unmistakably-provisional chip — so a half-filled report can never be
 * mistaken for a finished one at a glance, on screen or in print.
 */

/** An explicitly unconfirmed value. Never styled to blend in. */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-dashed border-watch/60 bg-watch-50 px-1.5 py-[1px] align-baseline text-[11.5px] font-medium leading-snug text-watch print:bg-transparent">
      <span aria-hidden className="text-[9px]">◇</span>
      {children}
    </span>
  );
}

/** Render a Slot: plain text when confirmed, a Pending chip when not. */
export function SlotText({ slot }: { slot: Slot }) {
  return slot.pending ? <Pending>{slot.value}</Pending> : <>{slot.value}</>;
}

/**
 * A metric card. Three states, and only three:
 *   - a live value (with its delta and source label),
 *   - "Data pending" when nothing is bound yet,
 * and never a fabricated number in either case.
 */
export function MetricCard({
  label,
  value,
  delta,
  deltaLabel,
  source,
  hero = false,
  polarity = 'up-good',
}: {
  label: string;
  value: string | null;
  /** Signed fractional change vs. the comparison period (0.12 = +12%). */
  delta?: number | null;
  deltaLabel?: string;
  source: string;
  hero?: boolean;
  /** Which direction is good for THIS metric — see DeltaChip. */
  polarity?: Polarity;
}) {
  const pending = value == null;
  return (
    <div
      className={`print-avoid-break rounded-card border bg-card px-4 py-3.5 ${
        hero ? 'border-accent/25' : 'border-line'
      }`}
    >
      <p className="eyebrow text-[10px] leading-tight">{label}</p>
      {pending ? (
        <p className="mt-1.5">
          <Pending>Data pending</Pending>
        </p>
      ) : (
        <p
          className={`tnum mt-1 font-semibold tracking-tight text-ink ${
            hero ? 'text-[30px] leading-[34px]' : 'text-[22px] leading-[26px]'
          }`}
        >
          {value}
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {!pending && delta != null && Number.isFinite(delta) ? (
          <DeltaChip delta={delta} polarity={polarity} />
        ) : null}
        {!pending && delta != null && deltaLabel ? (
          <span className="text-[10.5px] text-ink-faint">{deltaLabel}</span>
        ) : null}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-faint">{source}</p>
    </div>
  );
}

/**
 * Which direction counts as an improvement for a given metric.
 *
 * This exists because colour is read faster than the label. Cost per booking
 * falling by half is one of the best numbers on the page, and tinting it red
 * because the arrow points down would tell the board the opposite of the
 * truth. Spend and reach are inputs rather than results, so they carry no
 * judgement at all.
 */
export type Polarity = 'up-good' | 'down-good' | 'neutral';

/** ▲ / ▼ comparison chip. Grey at ±0 and for neutral metrics; never a fake sign. */
export function DeltaChip({ delta, polarity = 'up-good' }: { delta: number; polarity?: Polarity }) {
  const pct = Math.round(delta * 100);
  const flat = pct === 0;
  const up = pct > 0;
  const good = polarity === 'down-good' ? !up : up;
  const tone =
    flat || polarity === 'neutral' ? 'text-ink-faint' : good ? 'text-good' : 'text-stop';
  return (
    <span className={`tnum inline-flex items-center gap-0.5 text-[11px] font-semibold ${tone}`}>
      <span aria-hidden>{flat ? '—' : up ? '▲' : '▼'}</span>
      {flat ? '0%' : `${Math.abs(pct)}%`}
    </span>
  );
}

/** Section heading with the report's number rail. */
export function SectionHead({
  n,
  title,
  note,
  id,
}: {
  n: string;
  title: string;
  note?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="mb-3 mt-9 flex scroll-mt-24 items-baseline gap-2.5 border-b border-accent pb-2 first:mt-0"
    >
      <span className="tnum text-[11px] font-bold text-accent">{n}</span>
      <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      {note ? <span className="ml-auto hidden text-[11px] text-ink-faint sm:inline">{note}</span> : null}
    </div>
  );
}

/** The small "Source: … (Notion)" caption that carries the deck's provenance. */
export function SourceCaption({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[10.5px] italic leading-snug text-ink-ghost">Source: {children}</p>;
}

/** Responsive table shell — wide tables scroll on a phone, never the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1 print:overflow-visible">{children}</div>;
}

export const TH = 'whitespace-nowrap px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint';
export const THR = 'whitespace-nowrap px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint';
export const TD = 'px-2 py-[7px] text-[12px] leading-snug text-ink';
export const TDR = 'tnum whitespace-nowrap px-2 py-[7px] text-right text-[12px] leading-snug text-ink';
