/**
 * Group Revenue sub-tab definitions + resolver — a PLAIN module (NOT 'use
 * client'), so the server page resolves the active clinic while the client
 * sub-nav imports the same definitions (mirrors the Practo/Bookings subtabs).
 *
 * The sub-tabs are the clinic selector: ALL (portfolio) or one clinic (detail).
 * 'growth' is the odd one out — not a clinic but the Growth Platform channel-
 * performance view, parked under the Group tab so it inherits the same
 * per-user grant the CEO already has (Group Revenue), no new ACL needed.
 */
export const GROUP_SUBTABS = [
  { key: 'all', label: 'All clinics' },
  { key: 'dn-alwasl', label: 'Dental Nation Al Wasl' },
  { key: 'dr-tosun', label: 'Dr Tosun Dental' },
  { key: 'al-maher', label: 'AMC' },
  { key: 'growth', label: 'Growth Platform' },
  { key: 'kpis', label: 'KPI Benchmarks' },
  { key: 'mos', label: 'Marketing OS' },
] as const;

export type GroupSubTab = (typeof GROUP_SUBTABS)[number]['key'];

export function resolveGroupSub(v: string | undefined): GroupSubTab {
  return (GROUP_SUBTABS.find((t) => t.key === v)?.key as GroupSubTab) ?? 'all';
}
