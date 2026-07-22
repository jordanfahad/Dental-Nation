import { getArabyPractoOutcome, type ApptOutcome } from '@/lib/arabyads/practoOutcome';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { dubaiDateLabel } from '@/lib/dates';

/**
 * ArabyAds real bookings → Practo outcome. Matches each billable ArabyAds
 * booking (by phone) to the clinic's Practo appointment book, so the ads team
 * sees whether a billed booking actually attended, no-showed or cancelled.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number | null) => (n == null ? '—' : `AED ${int(n)}`);

const OUTCOME: Record<ApptOutcome, { label: string; cls: string }> = {
  attended: { label: 'Attended', cls: 'bg-good/10 text-good' },
  upcoming: { label: 'Upcoming', cls: 'bg-accent/10 text-accent' },
  noshow: { label: 'No-show', cls: 'bg-watch/10 text-watch' },
  cancelled: { label: 'Cancelled', cls: 'bg-panel-2 text-ink-soft' },
  notfound: { label: 'Not in Practo', cls: 'bg-stop/10 text-stop' },
};

export async function ArabyPractoOutcome({ range }: { range?: { from?: string; to?: string } }) {
  const data = await getArabyPractoOutcome(range ?? {});

  if (data.source === 'empty') {
    return (
      <Card className="mt-5">
        <SectionHeader eyebrow="Bookings" title="Real bookings → Practo outcome" />
        <div className="px-5 pb-5 pt-4">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[12.5px] text-ink-soft">
            No real ArabyAds bookings matched yet — needs the booking-widget feed and the Practo appointment sync.
          </p>
        </div>
      </Card>
    );
  }

  const kpis: KpiItem[] = [
    { label: 'Real bookings', value: int(data.total), hint: 'billable · non-test' },
    { label: 'In Practo', value: int(data.inPracto), hint: 'reached the PMS' },
    { label: 'Attended', value: int(data.attended), hint: 'arrived / completed' },
    { label: 'No-show', value: int(data.noshow) },
    { label: 'Cancelled', value: int(data.cancelled) },
    { label: 'Not in Practo', value: int(data.notFound), hint: 'never reached PMS' },
  ];

  return (
    <Card className="mt-5">
      <SectionHeader
        eyebrow="Bookings"
        title="Real bookings → Practo outcome"
        right={<span className="text-[11px] text-ink-faint">matched by phone</span>}
      />
      <div className="px-5 pb-5 pt-4">
        <KpiBand items={kpis} />
        <Takeaway>
          Each billable ArabyAds booking matched by phone to the clinic&apos;s Practo appointment book — so a booking that was
          billed but <span className="font-medium text-ink-soft">no-showed</span>, cancelled or never reached Practo is visible,
          not just the booking count.
        </Takeaway>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 text-left font-medium">Booked on</th>
                <th className="py-2 pr-3 text-left font-medium">Lane</th>
                <th className="py-2 pr-3 text-left font-medium">Patient</th>
                <th className="py-2 pr-3 text-left font-medium">Phone</th>
                <th className="py-2 pr-3 text-right font-medium">Price</th>
                <th className="py-2 pr-3 text-left font-medium">Practo outcome</th>
                <th className="py-2 pr-3 text-left font-medium">Appt. date</th>
                <th className="py-2 pr-3 text-left font-medium">Doctor</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.key} className="border-b border-line/60 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{r.bookedOn ? dubaiDateLabel(r.bookedOn) : '—'}</td>
                  <td className="py-2 pr-3 text-ink-soft">{r.lane ?? '—'}</td>
                  <td className="py-2 pr-3 text-ink">{r.name ?? '—'}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{r.phone ?? '—'}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{aed(r.price)}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${OUTCOME[r.outcome].cls}`}>
                      {OUTCOME[r.outcome].label}
                    </span>
                    {r.practoStatus ? <span className="ml-1 text-[10px] text-ink-faint">({r.practoStatus})</span> : null}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{r.apptDate ? dubaiDateLabel(r.apptDate) : '—'}</td>
                  <td className="py-2 pr-3 text-ink-soft">{r.doctor ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
          Outcome from the live Practo book: Attended = arrived/completed · Upcoming = confirmed/booked, not yet seen ·
          No-show / Cancelled as recorded · Not in Practo = the phone never reached the PMS.
        </p>
      </div>
    </Card>
  );
}
