import type { LeadLike } from './funnel';
import { MIN_CHANNEL_VOLUME } from '@/config/decision-rules';
import { safeRate } from './rates';

const BOOKED = new Set(['booked', 'attended', 'no-show', 'rescheduled', 'cancelled']);
const isBooking = (l: LeadLike) =>
  Boolean(l.booking_date) || (l.booking_status != null && BOOKED.has(l.booking_status));

export interface ChannelMix {
  inquiries_by_channel: Record<string, number>;
  qualified_by_channel: Record<string, number>;
  bookings_by_channel: Record<string, number>;
}

export function computeChannelMix(leads: LeadLike[]): ChannelMix {
  const inquiries: Record<string, number> = {};
  const qualified: Record<string, number> = {};
  const bookings: Record<string, number> = {};
  for (const l of leads) {
    const ch = l.channel_source?.trim() || 'Unattributed';
    inquiries[ch] = (inquiries[ch] ?? 0) + 1;
    if (l.is_qualified) qualified[ch] = (qualified[ch] ?? 0) + 1;
    if (isBooking(l)) bookings[ch] = (bookings[ch] ?? 0) + 1;
  }
  return { inquiries_by_channel: inquiries, qualified_by_channel: qualified, bookings_by_channel: bookings };
}

/**
 * Rank channels by QUALITY (qualified → booking rate), not raw volume, and gate
 * by a minimum qualified volume so a 1-lead channel can't win/lose (§10).
 */
export function rankChannels(mix: ChannelMix): { best: string | null; worst: string | null } {
  const eligible = Object.keys(mix.qualified_by_channel).filter(
    (ch) => ch !== 'Unattributed' && (mix.qualified_by_channel[ch] ?? 0) >= MIN_CHANNEL_VOLUME,
  );
  if (eligible.length === 0) return { best: null, worst: null };

  const scored = eligible
    .map((ch) => ({
      ch,
      rate: safeRate(mix.bookings_by_channel[ch] ?? 0, mix.qualified_by_channel[ch] ?? 0) ?? 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  return { best: scored[0].ch, worst: scored[scored.length - 1].ch };
}
