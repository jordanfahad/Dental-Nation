import 'server-only';
import { getUnverifiedLeads } from '@/lib/ops/unverifiedLeads';
import { ARABY_LANES } from '@/lib/arabyads/report';

/**
 * Website enquiries that started the booking flow on an ArabyAds landing page
 * and never completed WhatsApp/OTP verification — the drop-off step *before* a
 * booking exists, aggregated per campaign lane for the external ads report.
 *
 * AGGREGATE ONLY, on purpose. The internal Clinical Operations worklist shows
 * names and click-to-call numbers because reception has to phone these people;
 * the ads vendor has no need for patient contact details, so nothing here
 * carries PII — only counts.
 *
 * Attribution reuses parseArabySource() (via UnverifiedLead.laneKey), the same
 * rule the bookings panel uses, so the two panels can't disagree about lanes.
 *
 * Test/invalid handling is inherited from getUnverifiedLeads(): rows the team
 * marked "Test Lead" in the feedback sheet are already gone before we count.
 */

export interface LaneDropOff {
  key: string;
  label: string;
  laneCode: string;
  /** Started the booking flow on this lane, never verified. */
  unverified: number;
}

export interface DropOffReport {
  /** 'missing' = bronze table absent · 'empty' = no unverified enquiries at all */
  source: 'live' | 'empty' | 'missing';
  /** True once at least one unverified enquiry carries an ArabyAds lane tag. */
  attributable: boolean;
  lanes: LaneDropOff[];
  /** Every real unverified enquiry in the window, tagged or not. */
  total: number;
  /** Those whose Source carries no ArabyAds campaign — can't be credited to a lane. */
  untagged: number;
}

export async function getArabyDropOff(range: { from?: string; to?: string } = {}): Promise<DropOffReport> {
  const base = ARABY_LANES.map((l) => ({ key: l.key, label: l.label, laneCode: l.laneCode, unverified: 0 }));

  const report = await getUnverifiedLeads(range).catch(() => null);
  if (!report || report.source === 'missing') {
    return { source: 'missing', attributable: false, lanes: base, total: 0, untagged: 0 };
  }

  // Keyed as plain string: UnverifiedLead.laneKey is string|null, while
  // ARABY_LANES keys are a narrower union.
  const byKey = new Map<string, LaneDropOff>(base.map((l) => [l.key as string, l]));
  let untagged = 0;
  for (const r of report.rows) {
    const lane = r.laneKey ? byKey.get(r.laneKey) : undefined;
    if (lane) lane.unverified += 1;
    else untagged += 1;
  }

  const total = report.rows.length;
  return {
    source: total === 0 ? 'empty' : 'live',
    attributable: base.some((l) => l.unverified > 0),
    lanes: base,
    total,
    untagged,
  };
}
