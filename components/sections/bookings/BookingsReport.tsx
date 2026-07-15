import type { getRangeReport } from '@/lib/report';
import { getRecentWidgetBookings } from '@/lib/bookings/recent';
import { getBookingEventsReport } from '@/lib/bookings/events';
import { BookingEventsByOffer } from './BookingEventsByOffer';
import { BookingsSubNav } from './BookingsSubNav';
import { resolveBookingsSub } from './subtabs';
import { BookingsPlatforms } from './BookingsPlatforms';
import { ClinicJourneyStrip } from '@/components/sections/shared/ClinicJourneyStrip';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  HBarChart,
  TOKENS,
  TrendChart,
  type BarDatum,
  type TrendSeries,
} from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

type RangeReport = Awaited<ReturnType<typeof getRangeReport>>;

/**
 * Website Bookings tab — the on-site booking-widget lens. Consumes the page's
 * range-aware report (`.bookings` + `.series` + `.range`) so it honors the date
 * picker like every other tab. This is its OWN population: the website booking
 * widget, distinct from CRM appointments and Practo finalized bills — never
 * fused into one cross-source funnel.
 *
 * Honest by construction (CLAUDE.md §15): empty → owned data gap, null-guarded
 * derived metrics (avg booking value), never a fabricated 0.
 */

/**
 * Website Bookings dispatcher — renders the sub-nav (Booking widget · Platforms)
 * and the active sub-view. Only the chosen sub-view's data is fetched, so the
 * heavier widget reads don't run while viewing Platforms.
 */
export async function BookingsReport({ report, sub }: { report: RangeReport; sub?: string }) {
  const active = resolveBookingsSub(sub);
  return (
    <div className="space-y-5">
      <BookingsSubNav active={active} />
      {active === 'platforms' ? <BookingsPlatforms report={report} /> : <BookingsWidgetView report={report} />}
      {/* Where these bookings actually land at the clinic — same on both sub-tabs.
          Full per-patient drill-down lives on the Executive & Practo tabs. */}
      <ClinicJourneyStrip range={report.range} eyebrow="Website Bookings · clinic outcome" />
    </div>
  );
}

async function BookingsWidgetView({ report }: { report: RangeReport }) {
  const b = report.bookings;
  const range = report.range;
  const isEmpty = b.empty;

  // Live widget submissions from the Zavis feed (incl. test orders, flagged) —
  // scoped to the same window as the rest of the tab.
  const widget = await getRecentWidgetBookings({ from: range.from, to: range.to });
  // GA4 on-site booking funnel + events, per offer landing page.
  const events = await getBookingEventsReport({ from: range.from, to: range.to });

  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;

  const booked = b.booked.value;
  const revenue = b.revenue.value;
  const avg = booked != null && booked > 0 && revenue != null ? revenue / booked : null;

  const kpis: KpiItem[] = [
    {
      label: 'Bookings',
      value: booked != null ? int(booked) : null,
      deltaPct: b.booked.deltaPct,
      gapDetail: 'no widget rows in range',
      gapOwner: ownerFor('website'),
    },
    {
      label: 'Revenue',
      value: revenue != null ? aed(revenue) : null,
      deltaPct: b.revenue.deltaPct,
      gapDetail: 'no priced bookings in range',
      gapOwner: ownerFor('website'),
    },
    {
      label: 'Cancellations',
      value: b.cancellations.value != null ? int(b.cancellations.value) : null,
      deltaPct: b.cancellations.deltaPct,
      goodWhenUp: false,
      gapDetail: 'no cancellation rows in range',
      gapOwner: ownerFor('website'),
    },
    {
      label: 'Avg booking value',
      value: avg != null ? aed(avg) : null,
      gapDetail: 'no priced bookings to average',
      gapOwner: ownerFor('website'),
      hint: avg != null && booked != null ? `over ${int(booked)} bookings` : undefined,
    },
  ];

  const trendData = report.series.map((d) => ({
    date: d.date,
    bookings: d.bookings,
    revenue: Math.round(d.revenue),
  }));
  const trendSeries: TrendSeries[] = [
    { key: 'bookings', label: 'Bookings', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' },
    { key: 'revenue', label: 'Revenue (AED)', color: TOKENS.accent400, kind: 'line', axis: 'right', valueFormat: 'aed' },
  ];

  const byClinic: BarDatum[] = b.byClinic.map((r) => ({ label: r.label, value: r.value }));
  const byTreatment: BarDatum[] = b.byTreatment.map((r) => ({ label: r.label, value: r.value }));

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="W"
          eyebrow="On-site widget · Website Bookings"
          title="Website Booking Widget — leads & bookings"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            This is the on-site website booking widget — its own population, distinct from the CRM appointment
            funnel and the Practo finalized-bill clinic revenue. Do not fuse it with them.{' '}
            <span className="text-ink-faint">Period: {period}.</span>
          </p>
          {isEmpty ? (
            <div className="mt-4">
              <DataGapInline detail="no website-booking-widget rows in range" owner={ownerFor('website')} />
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="W1" eyebrow="Scorecard" title="Bookings at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="W2" eyebrow="Daily" title="Bookings & revenue over time" />
        <div className="px-5 pb-5 pt-4">
          {trendData.length === 0 ? (
            <DataGapInline detail="no dated booking activity to chart" owner={ownerFor('website')} />
          ) : (
            <>
              <TrendChart data={trendData} series={trendSeries} leftFormat="int" rightFormat="aed" />
              <ChartLegend
                items={[
                  { label: 'Bookings', color: TOKENS.accent },
                  { label: 'Revenue (AED)', color: TOKENS.accent400 },
                ]}
              />
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="W3" eyebrow="Mix" title="Where bookings come from" />
        <div className="px-5 pb-5 pt-4">
          {isEmpty ? (
            <DataGapInline detail="no bookings to break down in range" owner={ownerFor('website')} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Bookings by clinic
                </p>
                <Donut data={byClinic} valueFormat="int" centerLabel="bookings" height={200} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  Bookings by treatment
                </p>
                <HBarChart data={byTreatment} valueFormat="int" />
              </div>
            </div>
          )}
        </div>
      </Card>

      <BookingEventsByOffer data={events} />

      <Card>
        <SectionHeader tag="W4" eyebrow="Detail" title="Recent bookings" />
        <div className="px-5 pb-5 pt-4">
          {b.recent.length === 0 ? (
            <DataGapInline detail="no recent booking rows in range" owner={ownerFor('website')} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Treatment</th>
                      <th className="py-2 pr-3 font-medium">Clinic</th>
                      <th className="py-2 pr-3 font-medium">Doctor</th>
                      <th className="py-2 pl-3 text-right font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.recent.map((r, i) => (
                      <tr key={i} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-3 tabular-nums text-ink-soft">
                          {r.date ? dubaiDateLabel(r.date) : '—'}
                        </td>
                        <td className="py-2 pr-3 text-ink">{r.treatment ?? '—'}</td>
                        <td className="py-2 pr-3 text-ink-soft">{r.clinic ?? '—'}</td>
                        <td className="py-2 pr-3 text-ink-soft">{r.doctor ?? '—'}</td>
                        <td className="py-2 pl-3 text-right tabular-nums text-ink">
                          {r.price != null ? aed(r.price) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Takeaway>
                These are real website-booking-widget rows — a self-serve lead signal that runs ahead of CRM
                follow-up and clinic billing. Treat the counts as widget submissions, not finalized revenue.
              </Takeaway>
            </>
          )}
        </div>
      </Card>

      {/* Live website-widget submissions, read straight from the fresh sheet
          mirror (raw_zavis) — the FAST path: a booking shows within one sync
          cycle, carries the Source column (col T → ArabyAds attribution) and
          INCLUDES test/seed orders (flagged) so a test lead can be confirmed end
          to end. Website widget only; excluded from the KPIs above (is_test). */}
      <Card>
        <SectionHeader
          tag="W5"
          eyebrow="Detail · live website widget"
          title="Recent website-widget submissions (incl. test)"
          right={
            <span className="text-[11px] text-ink-faint">
              {widget.real} real · {widget.test} test
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="mb-3 text-[12.5px] leading-snug text-ink-soft">
            The raw on-site booking-widget stream from the Google Sheet mirror, refreshed on the sync — every
            submission as it lands, with its <strong>Source</strong> (ArabyAds landing page + PID/SUB when
            applicable) and <strong>test/seed orders</strong> flagged. Ordered by when it was booked. This is
            website-widget only (WhatsApp &amp; Practo-direct bookings arrive through the CRM/Practo feeds), and
            test rows are excluded from the scorecard above.
          </p>
          {widget.rows.length === 0 ? (
            <DataGapInline detail="no website-widget submissions in range" owner={ownerFor('website')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Booked on</th>
                    <th className="py-2 pr-3 font-medium">Patient</th>
                    <th className="py-2 pr-3 font-medium">Appointment</th>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    <th className="py-2 pr-3 font-medium">Treatment</th>
                    <th className="py-2 pr-3 font-medium">Clinic</th>
                    <th className="py-2 pr-3 font-medium">Doctor</th>
                    <th className="py-2 pr-3 text-right font-medium">Price</th>
                    <th className="py-2 pl-3 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {widget.rows.map((r, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">{r.bookedOnLabel ?? '—'}</td>
                      <td className="py-2 pr-3 font-medium text-ink">{r.patientName}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">{r.apptLabel ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">
                        {r.sourceLabel}
                        {r.pid || r.sub ? (
                          <span className="block text-[10.5px] text-ink-faint">
                            {[r.pid ? `PID ${r.pid}` : null, r.sub ? `SUB ${r.sub}` : null].filter(Boolean).join(' · ')}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-ink-soft">{r.treatment ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.clinic}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.doctor ?? '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">
                        {r.price != null ? aed(r.price) : '—'}
                      </td>
                      <td className="py-2 pl-3">
                        {r.isTest ? (
                          <span className="text-[11px] text-watch">test</span>
                        ) : (
                          <span className="text-[11px] text-good">real</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {widget.total > widget.rows.length ? (
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Showing {int(widget.rows.length)} of {int(widget.total)} submissions (most recent first).
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
