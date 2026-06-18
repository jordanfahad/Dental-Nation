import type { RangeReport } from '@/lib/types';
import { Card, Eyebrow, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DecisionPill, ImpactDot } from '@/components/ui/pills';
import { Scorecard } from '@/components/ui/Scorecard';
import { MixList } from '@/components/ui/MixList';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * Executive tab — the CEO consolidated one-glance view for the selected range.
 * Decision pill + reasoning + founder flag (latest in-range snapshot), a
 * scorecard grid across ALL FOUR sources with Δ vs comparison, top inquiry
 * channels, and open high-impact blockers (§G). Sources are shown side-by-side
 * as labelled scorecards — NEVER fused into one cross-source funnel.
 */
export function ExecutiveTab({ report }: { report: RangeReport }) {
  const { snapshot: s, paid, leads, bookings, ga4, blockers } = report;
  const amber = s?.founder_decision_needed ?? false;

  const openHigh = blockers
    .filter((b) => b.impact === 'high' && b.status !== 'done')
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Decision hero */}
      <Card highlight={amber} className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <Eyebrow>Consolidated decision · selected range</Eyebrow>
            {s ? (
              <>
                <div className="mt-2 flex items-center gap-3">
                  <DecisionPill decision={s.decision} />
                  <span className="text-sm text-ink-soft">
                    <span className="rounded bg-na/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                      Suggested
                    </span>{' '}
                    reviewer overrides
                  </span>
                </div>
                <p className="mt-3 text-[15px] leading-snug text-ink">{s.decision_reason}</p>
              </>
            ) : (
              <p className="mt-3 text-[13px] text-ink-faint">
                No daily decision snapshot falls in this range yet.
              </p>
            )}
          </div>

          {amber && s ? (
            <div className="rounded-lg border border-watch/40 bg-watch/5 p-3 md:max-w-xs">
              <p className="eyebrow text-watch">Founder decision needed · Yes</p>
              <p className="mt-1 text-[13px] font-medium text-ink">{s.founder_decision}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-na/5 p-3 md:max-w-xs">
              <p className="eyebrow">Founder decision needed · No</p>
              <p className="mt-1 text-[13px] text-ink-soft">No founder input required.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Scorecard grid across all sources */}
      <Card>
        <SectionHeader
          eyebrow="All sources · selected range"
          title="Executive scorecards"
          right={
            <span className="tnum text-[11px] text-ink-faint">vs previous period</span>
          }
        />
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-3">
          <Scorecard label="Paid spend" metric={paid.spend} prefix="AED" />
          <Scorecard label="Paid leads" metric={paid.leads} />
          <Scorecard
            label="Cost / paid lead"
            metric={paid.costPerLead}
            prefix="AED"
            decimals={0}
            invert
            gapDetail="No paid leads in range"
            gapOwner={ownerFor('cost')}
          />
          <Scorecard
            label="Website sessions"
            metric={ga4 ? ga4.sessions : nullMetric}
            gapDetail="GA4 unavailable"
            gapOwner={ownerFor('tracking')}
          />
          <Scorecard
            label="Website conversions"
            metric={ga4 ? ga4.conversions : nullMetric}
            gapDetail="GA4 unavailable"
            gapOwner={ownerFor('tracking')}
          />
          <Scorecard label="Tracked inquiries" metric={leads.total} />
          <Scorecard label="Bookings" metric={bookings.booked} />
          <Scorecard label="Revenue" metric={bookings.revenue} prefix="AED" />
          <Scorecard label="Cancellations" metric={bookings.cancellations} invert />
        </div>
        {ga4?.fellBack ? (
          <div className="px-5 pb-4">
            <Takeaway>{ga4.note}</Takeaway>
          </div>
        ) : null}
        <div className="border-t border-line px-5 py-3">
          <p className="text-[11.5px] leading-snug text-ink-faint">
            These are FOUR distinct populations (paid ad leads · website analytics · tracked
            inquiries · booking-widget bookings) shown side-by-side — not a single funnel. Do not
            read cross-source conversion rates between them.
          </p>
        </div>
      </Card>

      {/* Top inquiry channels + open high-impact blockers */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Attribution" title="Top inquiry channels" />
          <div className="p-5">
            <MixList rows={leads.byChannel} />
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Execution"
            title="Open high-impact blockers"
            right={
              <span
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                  openHigh.length > 0 ? 'bg-stop/10 text-stop' : 'bg-good/10 text-good'
                }`}
              >
                {openHigh.length} open
              </span>
            }
          />
          <div className="p-5">
            {openHigh.length > 0 ? (
              <ul className="space-y-2.5">
                {openHigh.map((b) => (
                  <li key={b.id} className="flex items-start justify-between gap-3 text-[12.5px]">
                    <div>
                      <p className="font-medium text-ink">{b.blocker ?? '—'}</p>
                      <p className="text-ink-faint">
                        {b.owner ?? '—'}
                        {b.fix ? ` · ${b.fix}` : ''}
                      </p>
                    </div>
                    <ImpactDot impact={b.impact} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-good">No open high-impact blockers.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

const nullMetric = { value: null, prev: null, deltaPct: null };
