/**
 * Default owner per data-gap area (§15). Every gap auto-routes to a responsible
 * team so the report is honest about what it doesn't know AND who must fix it.
 */
export const DATA_GAP_OWNERS = {
  spend: 'Acquisition',
  cost: 'Acquisition',
  attribution: 'Data/Analytics',
  utm: 'Data/Analytics',
  tracking: 'Data/Analytics',
  response_time: 'PAC',
  pac: 'PAC',
  attendance: 'Clinic ops',
  clinic: 'Clinic ops',
  content: 'Content/Studio',
  creative: 'Content/Studio',
  channel: 'Acquisition',
} as const;

export type DataGapArea = keyof typeof DATA_GAP_OWNERS;

/** Resolve an owner for an area, defaulting to Data/Analytics if unknown. */
export function ownerFor(area: string): string {
  const key = area.toLowerCase().replace(/[\s-]+/g, '_') as DataGapArea;
  return DATA_GAP_OWNERS[key] ?? 'Data/Analytics';
}
