import 'server-only';
import { isGoogleConfigured } from '@/lib/sync/google-auth';
import { fetchGa4BookingByOffer, type Ga4BookingByOffer } from '@/lib/sync/adapters/ga4-adapter';
import { BOOKING_FUNNEL, type BookingFunnelStage } from '@/config/ga4';

/**
 * Website-booking funnel & events BY OFFER (GA4), for the Website Bookings tab.
 * Wraps the GA4 adapter with the config check and honest degradation: when GA4
 * isn't configured or the API fails, returns { configured, report: null } so the
 * UI shows an owned data gap instead of a fabricated 0.
 */
export interface BookingEventsReport {
  configured: boolean;
  report: Ga4BookingByOffer | null;
  funnel: BookingFunnelStage[];
}

export async function getBookingEventsReport(range: {
  from: string;
  to: string;
}): Promise<BookingEventsReport> {
  if (!isGoogleConfigured()) return { configured: false, report: null, funnel: BOOKING_FUNNEL };
  try {
    const report = await fetchGa4BookingByOffer(range.from, range.to);
    return { configured: true, report, funnel: BOOKING_FUNNEL };
  } catch {
    return { configured: true, report: null, funnel: BOOKING_FUNNEL };
  }
}
