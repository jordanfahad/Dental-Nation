import type { BookingsSummary } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { fmtInt } from '@/lib/format';

/**
 * §Bookings — Website booking-widget summary. Its OWN honest lens: these are
 * real on-site bookings (+ revenue + cancellations) from the booking widget,
 * a DIFFERENT population from the paid funnel and GA4. Deliberately NOT folded
 * into the per-date paid funnel. Near-monochrome, single-accent, hairline
 * aesthetic to match the rest of the report (§14).
 */

function KpiCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="eyebrow">{label}</span>
      <span className="tnum text-kpi font-semibold leading-none text-ink">{value}</span>
    </div>
  );
}

function fmtAed(n: number | null | undefined): string {
  if (n == null) return '—';
  return `AED ${fmtInt(n)}`;
}

export function BookingsWidget({ bookings }: { bookings: BookingsSummary | null }) {
  if (!bookings) {
    return (
      <Card>
        <SectionHeader
          eyebrow="Bookings · website widget"
          title="Website bookings"
        />
        <div className="px-5 pb-5 pt-3">
          <DataGapInline
            detail="Website bookings unavailable — booking-widget sheet not synced"
            owner="Clinic ops"
          />
        </div>
      </Card>
    );
  }

  const { total, revenue, cancellations, recent, byClinic } = bookings;
  const topClinic = byClinic[0] ?? null;
  const avgValue = total > 0 ? revenue / total : null;

  return (
    <Card>
      <SectionHeader
        eyebrow="Bookings · website widget"
        title="Website bookings"
        right={
          <span className="tnum text-[11px] text-ink-faint">
            real bookings · not the paid funnel
          </span>
        }
      />

      {/* KPI strip */}
      <div className="mx-5 mt-4 grid grid-cols-3 divide-x divide-line rounded-md border border-line">
        <KpiCell label="Bookings" value={fmtInt(total)} />
        <KpiCell label="Revenue" value={fmtAed(revenue)} />
        <KpiCell label="Cancellations" value={fmtInt(cancellations)} />
      </div>

      <div className="px-5 pb-2 pt-5">
        <p className="eyebrow mb-3">Recent bookings</p>
        {recent.length > 0 ? (
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
              {recent.map((r, i) => (
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
          <DataGapInline detail="No booking rows returned" owner="Clinic ops" />
        )}
      </div>

      <div className="px-5 pb-5">
        <Takeaway>
          {total > 0
            ? `${fmtInt(total)} website bookings totalling ${fmtAed(revenue)}${
                avgValue != null ? ` (avg ${fmtAed(Math.round(avgValue))})` : ''
              }${topClinic ? `, led by ${topClinic.clinic}` : ''}`
            : 'No website bookings recorded yet'}
          {cancellations > 0
            ? `; ${fmtInt(cancellations)} cancellation${cancellations === 1 ? '' : 's'} logged separately.`
            : '; no cancellations logged.'}{' '}
          A separate population from the paid funnel and GA4.
        </Takeaway>
      </div>
    </Card>
  );
}
