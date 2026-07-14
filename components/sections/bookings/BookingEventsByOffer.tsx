import type { BookingEventsReport } from '@/lib/bookings/events';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { TOKENS } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Booking funnel & events by offer (GA4). For each paid offer (Glow-Up / SOS /
 * Scan) it shows the on-site funnel — landing-page sessions → widget viewed →
 * visit type → treatment → lead → qualified → booking confirmed — plus a full
 * list of every event fired on that offer's pages, so nothing is hidden.
 *
 * Honest by construction: events are URL-attributed (by the offer= param), so a
 * stage that GA4 didn't record on the offer's pages reads 0 in the funnel while
 * the site-wide total for that event is shown alongside; when GA4 isn't
 * configured or the fetch fails, the whole section renders an owned data gap.
 */
function bar(count: number, top: number): string {
  if (top <= 0) return '0%';
  return `${Math.max(2, Math.round((count / top) * 100))}%`;
}

export function BookingEventsByOffer({
  data,
  tag = 'W6',
  eyebrow = 'Website widget · GA4',
}: {
  data: BookingEventsReport;
  tag?: string;
  eyebrow?: string;
}) {
  const period = data.report ? `${data.report.period.from} → ${data.report.period.to}` : null;

  return (
    <Card>
      <SectionHeader
        tag={tag}
        eyebrow={eyebrow}
        title="Booking funnel & events by offer"
        right={
          <span className="text-[11px] text-ink-faint">
            {data.configured ? (period ? `GA4 · ${period}` : 'GA4 live') : 'GA4 not connected'}
          </span>
        }
      />
      <div className="px-5 pb-5 pt-4">
        <p className="mb-4 text-[12.5px] leading-snug text-ink-soft">
          Each paid offer drives to its own landing page; clicking <strong>Book appointment</strong> opens the
          widget on <span className="font-mono text-[11.5px]">/en?offer=…</span>. This traces the on-site funnel
          per offer from GA4 — traffic, then each booking event through to <strong>Booking confirmed</strong> —
          plus every event fired on that offer&apos;s pages. Events are attributed by the{' '}
          <span className="font-mono text-[11.5px]">offer=</span> URL, so a step recorded on a page without it
          shows in the site-wide totals below rather than under an offer.
        </p>

        {!data.configured ? (
          <DataGapInline
            detail="GA4 not connected — set the Google service-account env to trace on-site booking events"
            owner={ownerFor('tracking')}
          />
        ) : !data.report ? (
          <DataGapInline detail="GA4 booking-event fetch unavailable for this range" owner={ownerFor('tracking')} />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              {data.report.offers.map((o) => {
                const top = Math.max(o.sessions, 1);
                const known = new Set(data.funnel.map((s) => s.event));
                const other = o.allEvents.filter((e) => !known.has(e.event));
                return (
                  <div key={o.key} className="rounded-card border border-line p-4">
                    <div className="mb-3 flex items-baseline justify-between">
                      <p className="text-[13px] font-semibold text-ink">{o.label}</p>
                      <span className="text-[10.5px] uppercase tracking-wide text-ink-faint">{o.laneCode}</span>
                    </div>

                    <div className="space-y-2">
                      {data.funnel.map((stage) => {
                        const count = stage.event === 'sessions' ? o.sessions : o.events[stage.event] ?? 0;
                        const conv = o.sessions > 0 ? count / o.sessions : null;
                        return (
                          <div key={stage.key}>
                            <div className="flex items-baseline justify-between text-[11.5px]">
                              <span className="text-ink-soft">{stage.label}</span>
                              <span className="tabular-nums text-ink">
                                {int(count)}
                                {stage.key !== 'landing' && conv != null ? (
                                  <span className="ml-1 text-[10.5px] text-ink-faint">{pct(conv)}</span>
                                ) : null}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-na/10">
                              <div
                                className="h-full rounded-full"
                                style={{ width: bar(count, top), background: TOKENS.accent }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {other.length ? (
                      <div className="mt-3 border-t border-line/60 pt-2">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                          Other events on this offer
                        </p>
                        <div className="space-y-0.5">
                          {other.slice(0, 6).map((e) => (
                            <div key={e.event} className="flex justify-between text-[11px] text-ink-faint">
                              <span className="font-mono">{e.event}</span>
                              <span className="tabular-nums">{int(e.count)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {data.report.siteEvents.length ? (
              <div className="mt-5">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Site-wide booking events (all offers &amp; direct)
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.report.siteEvents.map((e) => (
                    <span
                      key={e.event}
                      className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-soft"
                    >
                      <span className="font-mono text-ink-faint">{e.event}</span>{' '}
                      <span className="tabular-nums font-medium text-ink">{int(e.count)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <Takeaway>
              Conversion percentages are each stage over the offer&apos;s landing-page sessions — a funnel, not a
              booking count. &quot;Booking confirmed&quot; here is the GA4 event; finalized revenue still lives on
              the Practo tab. If a stage reads 0 for every offer but shows in the site-wide totals, that event
              fires on a URL without the <span className="font-mono text-[11px]">offer=</span> param.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}
