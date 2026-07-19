/**
 * Practo Insta sub-tab definitions + resolver — a PLAIN module (NOT 'use
 * client'), so the server page can resolve the active sub-tab while the client
 * sub-nav imports the same definitions (mirrors the Bookings/Marketing subtabs).
 */
export const PRACTO_SUBTABS = [
  { key: 'revenue', label: 'Clinic Revenue' },
  { key: 'appointments', label: 'Appointment Analytics' },
] as const;

export type PractoSubTab = (typeof PRACTO_SUBTABS)[number]['key'];

export function resolvePractoSub(v: string | undefined): PractoSubTab {
  return (PRACTO_SUBTABS.find((t) => t.key === v)?.key as PractoSubTab) ?? 'revenue';
}
