/**
 * Marketing OS — static reference data from the build spec (31 Jul 2026):
 * measurement-integrity flags, the risk register, and the standing asks from
 * Zavis. Time-series and queue data live in lane_e.mos_* tables; this file
 * holds what is POLICY rather than data, so changing a flag's status is a
 * reviewed code change, not a quiet DB edit.
 */

export interface IntegrityFlag {
  key: string;
  title: string;
  detail: string;
  status: 'open' | 'fixed';
  owner: string;
  /**
   * Benchmark KPI keys (config/kpi-benchmarks.ts) whose CURRENT value is
   * corrupted by this artifact. While the flag is open, those rows display
   * "unreliable denominator" instead of an ahead/behind verdict — a wrong
   * number judged confidently is worse than no judgement.
   */
  affects: string[];
}

/** §9.3 — artifacts in the current benchmark window that would corrupt any
 *  Marketing OS evaluation. Rendered on the Overview BEFORE any Zavis verdict. */
export const INTEGRITY_FLAGS: IntegrityFlag[] = [
  {
    key: 'enquiry-denominator',
    title: 'Enquiry → booking runs over 100% (239%)',
    detail:
      '588 bookings ÷ 246 enquiries: bookings arrive via channels not captured as enquiries (walk-ins, direct calls, booking widget). The denominator is incomplete, so channel-level enquiry→booking rates are unreliable until enquiry capture is fixed.',
    status: 'open',
    owner: 'DN-Marketing',
    affects: ['fu.enq2book'],
  },
  {
    key: 'affiliate-attribution',
    title: 'Affiliate shows "2 booked of 0 leads"',
    detail:
      'Attribution inconsistency between the Araby Ads tab and the Growth Platform — bookings match to the affiliate while its lead count reads zero in the same window.',
    status: 'open',
    owner: 'DN-Marketing',
    affects: ['af.conv'],
  },
  {
    key: 'paid-tagging-window',
    title: 'Paid-search CPL inflated by the tagging start date',
    detail:
      'Click-to-enquiry tagging went live 29 Jul; any window starting earlier under-counts enquiries, which inflates CPL (seen: AED 69,108) and deflates click→enquiry. Do not present these as performance until the window is fully post-29-Jul.',
    status: 'open',
    owner: 'DN-Marketing',
    affects: ['ps.cpl', 'ps.conv', 'ps.cpb'],
  },
  {
    key: 'gsc-unavailable',
    title: 'Search Console access — landed',
    detail:
      'GSC property access landed 17 Aug (service account added, API enabled) — impressions, CTR, position and queries now feed the Digital tab and the investor deck. Remaining gap: no sitemap submitted, so the indexed-pages count is a floor, not exact.',
    status: 'fixed',
    owner: 'Zavis',
    affects: [],
  },
];

export interface RiskItem {
  key: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  owner: string;
}

/** Overview §4.6 + §8 — the risk register. */
export const MOS_RISKS: RiskItem[] = [
  {
    key: 'pseo-unverified',
    title: '14,000 pSEO pages claimed, unverified',
    detail: 'No GSC export yet — published vs indexed vs impressions unproven. Until verified, page counts are vendor claims, not assets.',
    severity: 'high',
    owner: 'Zavis',
  },
  {
    key: 'thin-content',
    title: '3,451 dentist-profile pages — thin-content / YMYL risk',
    detail: 'Large template sets with little unique content risk algorithmic devaluation on medical (YMYL) queries; a prune/noindex plan must be ready if indexation quality is poor.',
    severity: 'high',
    owner: 'DN-Marketing',
  },
  {
    key: 'vendor-mirror',
    title: 'Vendor-domain mirror is indexable',
    detail: 'dn-concierge.zavisinternaltools.in serves index,follow with canonical only — mitigated, not fixed. Needs noindex or an agreed sunset date.',
    severity: 'medium',
    owner: 'Zavis',
  },
  {
    key: 'list-burn',
    title: 'WhatsApp list-burn risk',
    detail: 'Broadcasts to 25 segments without the opt-out guard rail burning the list — the kill-switch (>2% opt-out on any broadcast pauses the segment) is policy from day one. UAE PDPL consent hygiene applies.',
    severity: 'medium',
    owner: 'DN-Marketing',
  },
];

/** §8 — standing asks from Zavis, surfaced as a checklist on the Risk Register. */
export const ZAVIS_ASKS: { key: string; ask: string }[] = [
  { key: 'gsc', ask: 'GSC property access + full pSEO indexation export (published vs indexed vs impressions)' },
  { key: 'segments', ask: 'Segment usage log — which of 105 used in live campaigns, with dates' },
  { key: 'azure', ask: 'Azure tenant admin access; written confirmation data + IP in DN tenant' },
  { key: 'mirror', ask: 'dn-concierge.zavisinternaltools.in → noindex or sunset date' },
  { key: 'publish-path', ask: 'Content OS: publish path confirmed (where do approved runs go live — dentalnation.com blog?)' },
];

/** SLA days per approval track (§ pipeline 1). */
export const MOS_SLA_DAYS: Record<'seo' | 'clinical', number> = { seo: 3, clinical: 5 };

/** A benchmark KPI key → the open integrity flag covering it (null when clean). */
export function openFlagFor(benchmarkKey: string): IntegrityFlag | null {
  return INTEGRITY_FLAGS.find((f) => f.status === 'open' && f.affects.includes(benchmarkKey)) ?? null;
}
