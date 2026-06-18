import type { RangeReport } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { Scorecard } from '@/components/ui/Scorecard';
import { MixList } from '@/components/ui/MixList';
import { DataGapInline } from '@/components/ui/DataGap';
import { fmtInt } from '@/lib/format';

/**
 * Bookings tab — the booking-widget detail for the range: bookings, revenue,
 * cancellations (scorecards with Δ), by-clinic, by-treatment, and the recent
 * bookings table. Its OWN honest population — not the paid funnel.
 */
function fmtAed(n: number | null | undefined): string {
  if (n == null) return '—';
  return `AED ${fmtInt(n)}`;
}

export function BookingsTab({ report }: { report: RangeReport }) {
  const { bookings: b } = report;
  const booked = b.booked.value ?? 0;
  const revenue = b.revenue.value ?? 0;
  const avgValue = booked > 0 ? revenue / booked : null;

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          eyebrow="Bookings · website widget · selected range"
          title="Website bookings"
          right={
            <span className="tnum text-[11px] text-ink-faint">real bookings · not the paid funnel</span>
          }
        />
        <div className="grid grid-cols-3 gap-3 p-5">
          <Scorecard label="Bookings" metric={b.booked} />
          <Scorecard label="Revenue" metric={b.revenue} prefix="AED" />
          <Scorecard label="Cancellations" metric={b.cancellations} invert />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader eyebrow="Clinic" title="Bookings by clinic" />
          <div className="p-5">
            {b.empty ? (
              <DataGapInline detail="No bookings in this range" owner="Clinic ops" />
            ) : (
              <MixList rows={b.byClinic} />
            )}
          </div>
        </Card>
        <Card>
          <SectionHeader eyebrow="Treatment" title="Bookings by treatment" />
          <div className="p-5">
            {b.empty ? (
              <DataGapInline detail="No bookings in this range" owner="Clinic ops" />
            ) : (
              <MixList rows={b.byTreatment} />
            )}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Detail" title="Recent bookings" />
        <div className="px-5 pb-2 pt-4">
          {b.recent.length > 0 ? (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-faint">
                  <th className="py-1.5 font-medium">Date</th>
                  <th className="py-1.5 font-medium">Treatment</th>
                  <th className="py-1.5 font-medium">Clinic</th>
                  <th className="py-1.5 font-medium">Doctor</th>
                  <th className="py-1.5 text-right font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {b.recent.map((r, i) => (
                  <tr key={i} className="border-b border-line/60 last:border-0">
                    <td className="tnum py-1.5 text-ink-soft">{r.date ?? '—'}</td>
                    <td className="py-1.5 text-ink">{r.treatment ?? '—'}</td>
                    <td className="py-1.5 text-ink-soft">{r.clinic ?? '—'}</td>
                    <td className="py-1.5 text-ink-soft">{r.doctor ?? '—'}</td>
                    <td className="tnum py-1.5 text-right font-medium text-ink">
                      {r.price != null ? fmtAed(r.price) : <span className="text-ink-faint">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <DataGapInline detail="No booking rows in this range" owner="Clinic ops" />
          )}
        </div>
        <div className="px-5 pb-5">
          <Takeaway>
            {booked > 0
              ? `${fmtInt(booked)} website bookings totalling ${fmtAed(revenue)}${
                  avgValue != null ? ` (avg ${fmtAed(Math.round(avgValue))})` : ''
                }.`
              : 'No website bookings in this range.'}{' '}
            A separate population from the paid funnel and GA4.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}
