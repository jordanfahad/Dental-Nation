import type { DataGap } from '@/lib/types';
import { ownerFor } from '@/config/data-gap-owners';

/** Null-safe division: returns null (not 0, not NaN) when the denominator is 0. */
export function safeRate(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  return numerator / denominator;
}

export interface RateInputs {
  qualified_inquiries: number;
  glow_up_bookings: number;
  attended_visits: number;
  valid_inquiries: number;
  /** Spend is out of scope for Sheets-v1 unless a sheet maps it. */
  total_spend: number | null;
}

export interface RateOutputs {
  lead_to_booking_rate: number | null;
  show_rate: number | null;
  cost_per_inquiry: number | null;
  cost_per_booking: number | null;
  dataGaps: DataGap[];
}

export function computeRates(input: RateInputs): RateOutputs {
  const gaps: DataGap[] = [];

  const lead_to_booking_rate = safeRate(input.glow_up_bookings, input.qualified_inquiries);
  const show_rate = safeRate(input.attended_visits, input.glow_up_bookings);

  // Spend is the canonical example of "never fabricate" — if unmapped, the cost
  // metrics are an explicit, owned data gap, not a zero (§10/§15).
  let cost_per_inquiry: number | null = null;
  let cost_per_booking: number | null = null;
  if (input.total_spend == null) {
    gaps.push({ area: 'cost', detail: 'No ad-spend source mapped', owner: ownerFor('cost') });
  } else {
    cost_per_inquiry = safeRate(input.total_spend, input.valid_inquiries);
    cost_per_booking = safeRate(input.total_spend, input.glow_up_bookings);
  }

  return { lead_to_booking_rate, show_rate, cost_per_inquiry, cost_per_booking, dataGaps: gaps };
}
