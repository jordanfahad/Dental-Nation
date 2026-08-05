import 'server-only';
import { cache } from 'react';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  PIPELINE,
  PIPELINE_GROUPS,
  type Initiative,
  type PipelineModel,
} from '@/config/pipeline';

/**
 * The forward-view projection engine.
 *
 * ONE IDEA CARRIES THE WHOLE THING: an initiative is only ever allowed to
 * assume how much DEMAND it creates. What that demand is worth is not an
 * assumption — it is the conversion chain the business already runs at,
 * measured from our own trading history:
 *
 *     enquiry ──47%──▶ booking ──46%──▶ attended ──AED 1,339──▶ billed
 *
 * so one net enquiry is worth about AED 291 of billed revenue, and one
 * recovered booking about AED 619. Those constants are computed here at
 * request time rather than written down anywhere, so the forward view moves
 * when the business moves and can never drift away from the measured page
 * above it.
 *
 * The constants are deliberately computed over the FULL trading history rather
 * than the window selected at the top of the page. A forecast that changed
 * every time a reader moved a date filter would be noise, not a forecast — and
 * a short window would let a good fortnight set the rate for a two-year plan.
 */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface MeasuredChain {
  from: string | null;
  to: string | null;
  days: number;
  enquiries: number;
  bookings: number;
  attended: number;
  bills: number;
  revenue: number;
  /** enquiry → booking */
  enquiryToBooking: number | null;
  /** booking → attended */
  bookingToAttended: number | null;
  revenuePerAttended: number | null;
  revenuePerBooking: number | null;
  revenuePerEnquiry: number | null;
  averageBill: number | null;
  available: boolean;
}

/** The measured conversion chain, from the whole trading history. */
export const getMeasuredChain = cache(async (): Promise<MeasuredChain> => {
  const empty: MeasuredChain = {
    from: null,
    to: null,
    days: 0,
    enquiries: 0,
    bookings: 0,
    attended: 0,
    bills: 0,
    revenue: 0,
    enquiryToBooking: null,
    bookingToAttended: null,
    revenuePerAttended: null,
    revenuePerBooking: null,
    revenuePerEnquiry: null,
    averageBill: null,
    available: false,
  };

  const db = getSupabaseAdmin();
  if (!db) return empty;

  const { data, error } = await db.from('board_deck_daily').select('*').limit(5000);
  if (error || !data || data.length === 0) return empty;

  let enquiries = 0;
  let bookings = 0;
  let attended = 0;
  let bills = 0;
  let revenue = 0;
  let min: string | null = null;
  let max: string | null = null;

  for (const r of data) {
    const day = String(r.day);
    if (min == null || day < min) min = day;
    if (max == null || day > max) max = day;
    enquiries += num(r.enquiries_total);
    bookings += num(r.booked);
    attended += num(r.showed);
    bills += num(r.treatments);
    revenue += num(r.revenue);
  }

  const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

  return {
    from: min,
    to: max,
    days: data.length,
    enquiries,
    bookings,
    attended,
    bills,
    revenue,
    enquiryToBooking: ratio(bookings, enquiries),
    bookingToAttended: ratio(attended, bookings),
    revenuePerAttended: ratio(revenue, attended),
    revenuePerBooking: ratio(revenue, bookings),
    revenuePerEnquiry: ratio(revenue, enquiries),
    averageBill: ratio(revenue, bills),
    available: revenue > 0 && enquiries > 0,
  };
});

/* ──────────────────────────────────────────────────────────── projection ── */

export interface Case {
  /** Incremental monthly revenue at the modelled run rate. */
  monthlyRevenue: number | null;
  /** Twelve months at that run rate — NOT year-one, which is lower. */
  annualRevenue: number | null;
  /** How the figure was arrived at, in arithmetic a reader can follow. */
  workings: string | null;
}

export interface ProjectedInitiative {
  initiative: Initiative;
  low: Case;
  base: Case;
  high: Case;
  /** Total monthly cost, recurring only. */
  monthlyCost: number | null;
  /** Base-case monthly revenue ÷ monthly cost. Null when either is unknown. */
  returnMultiple: number | null;
  /** Months of base-case contribution to repay the one-off cost. */
  paybackMonths: number | null;
  /** True when even the base case does not cover its own monthly cost. */
  belowCost: boolean;
  /** True when the low case loses money — the band crosses zero return. */
  lowCaseLoses: boolean;
}

export interface PipelineGroup {
  name: string;
  items: ProjectedInitiative[];
  monthlyCost: number;
  baseMonthlyRevenue: number;
}

export interface PipelineView {
  chain: MeasuredChain;
  groups: PipelineGroup[];
  /** Totals across everything that carries a revenue model. */
  totalMonthlyCost: number;
  totalLow: number;
  totalBase: number;
  totalHigh: number;
  /** Committed and proposed spend that produces no projected revenue line. */
  unmeasurableMonthlyCost: number;
  available: boolean;
}

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const n0 = (n: number): string => Math.round(n).toLocaleString('en-US');
const n1 = (n: number): string => (Math.round(n * 10) / 10).toLocaleString('en-US');

/**
 * Convert one case of a model into money, showing the arithmetic.
 * `which` picks the low/base/high leg of every band together — a case is
 * internally consistent, never a mix of optimistic volume and pessimistic
 * quality.
 */
function evaluate(model: PipelineModel, chain: MeasuredChain, which: 'low' | 'base' | 'high'): Case {
  if (model.kind === 'capability') {
    return { monthlyRevenue: null, annualRevenue: null, workings: null };
  }

  if (model.kind === 'recurring') {
    const v = model[which];
    return {
      monthlyRevenue: v,
      annualRevenue: v * 12,
      workings: `${aed(v)} of recurring revenue a month, taken directly from the membership model rather than converted through the enquiry chain.`,
    };
  }

  if (model.kind === 'bookings') {
    const bookings = model[which];
    const rpb = chain.revenuePerBooking;
    if (rpb == null) return { monthlyRevenue: null, annualRevenue: null, workings: null };
    const monthly = bookings * rpb;
    return {
      monthlyRevenue: monthly,
      annualRevenue: monthly * 12,
      workings: `${n1(bookings)} recovered bookings a month × ${aed(rpb)} measured revenue per booking = ${aed(monthly)} a month.`,
    };
  }

  // Enquiries — the full measured chain, with the initiative's own quality and
  // value adjustments applied explicitly rather than folded into one number.
  const enq = model[which];
  const quality = model.quality[which];
  const value = model.value[which];
  const e2b = chain.enquiryToBooking;
  const b2a = chain.bookingToAttended;
  const rpa = chain.revenuePerAttended;
  if (e2b == null || b2a == null || rpa == null) {
    return { monthlyRevenue: null, annualRevenue: null, workings: null };
  }

  const bookings = enq * e2b * quality;
  const attended = bookings * b2a;
  const monthly = attended * rpa * value;

  const qualityNote = quality === 1 ? '' : ` × ${quality.toFixed(2)} quality adjustment`;
  const valueNote = value === 1 ? '' : ` × ${value.toFixed(2)} case-value adjustment`;

  return {
    monthlyRevenue: monthly,
    annualRevenue: monthly * 12,
    workings: `${n1(enq)} enquiries a month × ${(e2b * 100).toFixed(1)}% booking rate${qualityNote} = ${n1(bookings)} bookings → × ${(b2a * 100).toFixed(1)}% attendance = ${n1(attended)} patients → × ${aed(rpa)} per attended patient${valueNote} = ${aed(monthly)} a month.`,
  };
}

export const getPipelineView = cache(async (): Promise<PipelineView> => {
  const chain = await getMeasuredChain();

  const projected: ProjectedInitiative[] = PIPELINE.map((initiative) => {
    const low = evaluate(initiative.model, chain, 'low');
    const base = evaluate(initiative.model, chain, 'base');
    const high = evaluate(initiative.model, chain, 'high');
    const monthlyCost = initiative.monthlyCost;

    const returnMultiple =
      base.monthlyRevenue != null && monthlyCost != null && monthlyCost > 0
        ? base.monthlyRevenue / monthlyCost
        : null;

    // Payback counts only the surplus over the recurring cost — a one-off is
    // not repaid by revenue that is already spoken for.
    const surplus =
      base.monthlyRevenue != null ? base.monthlyRevenue - (monthlyCost ?? 0) : null;
    const paybackMonths =
      initiative.oneOffCost != null && initiative.oneOffCost > 0 && surplus != null && surplus > 0
        ? initiative.oneOffCost / surplus
        : null;

    return {
      initiative,
      low,
      base,
      high,
      monthlyCost,
      returnMultiple,
      paybackMonths,
      belowCost: returnMultiple != null && returnMultiple < 1,
      lowCaseLoses:
        low.monthlyRevenue != null && monthlyCost != null && monthlyCost > 0
          ? low.monthlyRevenue < monthlyCost
          : false,
    };
  });

  const groups: PipelineGroup[] = PIPELINE_GROUPS.map((name) => {
    const items = projected.filter((p) => p.initiative.group === name);
    return {
      name,
      items,
      monthlyCost: items.reduce((a, p) => a + (p.monthlyCost ?? 0), 0),
      baseMonthlyRevenue: items.reduce((a, p) => a + (p.base.monthlyRevenue ?? 0), 0),
    };
  }).filter((g) => g.items.length > 0);

  // Spend that is being proposed WITHOUT a revenue projection is totalled
  // separately rather than hidden: it is the part of the plan that could not
  // be judged on evidence, and its size is the point.
  const unmeasurable = projected
    .filter((p) => p.base.monthlyRevenue == null && p.initiative.status !== 'proposed')
    .concat(projected.filter((p) => p.base.monthlyRevenue == null && p.initiative.status === 'proposed'))
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .reduce((a, p) => a + (p.monthlyCost ?? 0), 0);

  const sum = (pick: (p: ProjectedInitiative) => number | null): number =>
    projected.reduce((a, p) => a + (pick(p) ?? 0), 0);

  return {
    chain,
    groups,
    totalMonthlyCost: projected.reduce((a, p) => a + (p.monthlyCost ?? 0), 0),
    totalLow: sum((p) => p.low.monthlyRevenue),
    totalBase: sum((p) => p.base.monthlyRevenue),
    totalHigh: sum((p) => p.high.monthlyRevenue),
    unmeasurableMonthlyCost: unmeasurable,
    available: chain.available,
  };
});

export { n0, aed as aedFmt };
