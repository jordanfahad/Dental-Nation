/**
 * Website Bookings sub-tab definitions + resolver — a PLAIN module (NOT
 * 'use client'), so the server page can resolve the active sub-tab while the
 * client sub-nav imports the same definitions (mirrors components/tabs.ts and
 * the Marketing subtabs).
 */
export const BOOKINGS_SUBTABS = [
  { key: 'widget', label: 'Booking widget' },
  { key: 'platforms', label: 'Platforms' },
] as const;

export type BookingsSubTab = (typeof BOOKINGS_SUBTABS)[number]['key'];

export function resolveBookingsSub(v: string | undefined): BookingsSubTab {
  return (BOOKINGS_SUBTABS.find((t) => t.key === v)?.key as BookingsSubTab) ?? 'widget';
}
