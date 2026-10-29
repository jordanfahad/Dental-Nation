/**
 * One displayed number on the /next Overview (DN-032 mockups 01 and 05).
 * Server component: it renders a <button> whose data-proof attribute carries
 * the plain strings the ProofDrawer (the one client component) shows when the
 * figure is clicked. A null value renders "Unavailable" (or "Not yet"), never 0.
 */
import type { MetricId } from '@/lib/metrics/registry';
import type { ProofPayload } from './ProofDrawer';

const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const two = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const UNAVAILABLE = 'Unavailable';
/** A figure the source cannot give yet for a known reason (the DN Ortho "not yet" rule); never 0. */
export const NOT_YET_LABEL = 'Not yet';

/** "620" / "Unavailable". */
export const fmtCount = (n: number | null) => (n == null ? UNAVAILABLE : int.format(n));
/** "AED 120,000" / "Unavailable". */
export const fmtAed = (n: number | null) => (n == null ? UNAVAILABLE : `AED ${int.format(n)}`);
/** "AED 40.00" / "Unavailable" (cost per enquiry keeps its decimals). */
export const fmtAedExact = (n: number | null) => (n == null ? UNAVAILABLE : `AED ${two.format(n)}`);
/** "4.80" / "Unavailable". */
export const fmtRating = (n: number | null) => (n == null ? UNAVAILABLE : two.format(n));

export function Figure({
  id,
  display,
  dates,
  scope,
  url,
  note,
  size = 'small',
  align = 'start',
}: {
  id: MetricId;
  /** The figure exactly as shown ("AED 120,000" or "Unavailable"). */
  display: string;
  /** Exact Dubai dates for the figure. */
  dates: string;
  /** Clinic scope in plain words. */
  scope: string;
  /** The proof URL - the detail view that proves this figure. */
  url: string;
  /** Optional drawer line (why a figure is unavailable). */
  note?: string;
  size?: 'large' | 'small';
  align?: 'start' | 'end';
}) {
  const payload: ProofPayload = { id, value: display, dates, scope, url, ...(note ? { note } : {}) };
  const unavailable = display === UNAVAILABLE || display === NOT_YET_LABEL;
  return (
    <button
      type="button"
      data-proof={JSON.stringify(payload)}
      className={`group inline-flex flex-col rounded-[3px] text-left font-semibold tabular-nums ${
        unavailable ? 'text-[#647578]' : 'text-dn-navy'
      } ${align === 'end' ? 'items-end' : 'items-start'}`}
    >
      <span
        className={`underline-offset-4 group-hover:underline ${
          size === 'large' ? 'text-[23px] font-bold leading-tight tracking-[-0.7px] sm:text-[27px]' : 'text-sm'
        } ${unavailable && size === 'large' ? 'sm:text-[20px] text-[18px]' : ''}`}
      >
        {display}
      </span>
      <small className="text-[9px] font-medium leading-normal tracking-[0.04em] text-[#647578]">
        {id} <span aria-hidden="true">↗</span>
      </small>
    </button>
  );
}
