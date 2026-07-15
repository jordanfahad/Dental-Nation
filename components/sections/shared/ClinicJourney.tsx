import { getClinicFunnel, type PatientClass } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { fmtAed } from '@/components/sections/executive/parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

const CLASS_STYLE: Record<PatientClass, string> = {
  new: 'text-good border-good/40 bg-good/5',
  existing: 'text-accent border-accent/40 bg-accent/5',
  upcoming: 'text-watch border-watch/40 bg-watch/5',
};
const CLASS_LABEL: Record<PatientClass, string> = { new: 'new', existing: 'existing', upcoming: 'upcoming' };

/**
 * Full clinic patient-journey view — Booked → Showed → Treated → Paid, plus the
 * per-patient detail split by NEW vs EXISTING, with the booking channel, show-up
 * (and the next appointment when they haven't yet), treatment, revenue and
 * follow-ups. Used on the Executive and Practo tabs. Honors the date range +
 * clinic filter.
 */
export async function ClinicJourney({
  range,
  clinic,
  eyebrow = 'Patient journey',
  title = 'Booked → Showed → Treated → Paid',
}: {
  range: { from: string; to: string };
  clinic?: ClinicFilterKey;
  eyebrow?: string;
  title?: string;
}) {
  const data = await getClinicFunnel({ from: range.from, to: range.to, clinic });
  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;

  if (data.source === 'empty') {
    return (
      <Card>
        <SectionHeader eyebrow={eyebrow} title={title} right={<span className="text-[11px] text-ink-faint">{period}</span>} />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail="no booked patients in range" owner={ownerFor('clinic')} />
        </div>
      </Card>
    );
  }

  const stages: FunnelStageViz[] = [
    { label: 'Booked', value: data.booked },
    { label: 'Showed up', value: data.showed },
    { label: 'Treatment (billed)', value: data.billed },
    { label: 'Paid', value: data.paid },
  ];
  const paidPerPatient = data.paid > 0 ? data.paidAED / data.paid : null;
  const rows = data.patients.slice(0, 80);

  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} right={<span className="text-[11px] text-ink-faint">{period}</span>} />
      <div className="px-5 pb-5 pt-4">
        {/* Enquiries context — above the funnel, not a stage. */}
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Enquiries (context)</span>{' '}
            <span className="tnum text-[16px] font-semibold text-ink">{int(data.enquiries)}</span>
          </div>
          <div className="text-[11.5px] leading-snug text-ink-faint">
            The enquiry → booking link isn&apos;t captured yet (lead phones match Zavis ~1%; the sheet&apos;s conversion
            column is ~98% blank), so this is top-of-funnel context — <strong>not</strong> a traced conversion.
          </div>
        </div>

        {/* New vs existing split of the booked population. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Of {int(data.booked)} booked:</span>
          <span className="rounded-full border border-good/40 bg-good/5 px-2.5 py-0.5 text-[11.5px] font-medium text-good">
            {int(data.newCount)} new
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/5 px-2.5 py-0.5 text-[11.5px] font-medium text-accent">
            {int(data.existingCount)} existing
          </span>
          {data.upcomingCount > 0 ? (
            <span className="rounded-full border border-watch/40 bg-watch/5 px-2.5 py-0.5 text-[11.5px] font-medium text-watch">
              {int(data.upcomingCount)} not yet visited
            </span>
          ) : null}
        </div>

        <FunnelViz stages={stages} />

        {/* Paid outcome. */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Collected</span>{' '}
            <span className="tnum text-[16px] font-semibold text-ink">{fmtAed(data.paidAED)}</span>
            <span className="ml-1 text-[11px] text-ink-faint">(Practo paid bills)</span>
          </div>
          {paidPerPatient != null ? (
            <div className="text-[12.5px] text-ink-soft">
              ≈ <span className="tnum font-medium text-ink">{fmtAed(paidPerPatient)}</span> per paying patient
            </div>
          ) : null}
          <div className="text-[12.5px] text-ink-soft">
            <span className="tnum font-medium text-ink">{pct(data.billMatchRate)}</span> of booked patients tie to a Practo bill
          </div>
        </div>

        <Takeaway>
          The per-patient journey we can actually trace — matched from the Zavis appointment to the Practo bill by{' '}
          <strong>file number</strong>. <strong>Showed up</strong> = Zavis <em>completed</em> or a bill (proof of
          attendance). <strong>Channel</strong> is how the booking was made (widget / AI / front-desk / walk-in) — the
          marketing platform (WhatsApp/Instagram) isn&apos;t on the booking record, so it stays an aggregate on the
          Platforms view. When a patient hasn&apos;t shown yet, their <strong>next appointment</strong> is their booked
          follow-up.
        </Takeaway>

        {/* Per-patient drill-down. */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Channel</th>
                <th className="py-2 pr-3 font-medium">Booked</th>
                <th className="py-2 pr-3 font-medium">Showed</th>
                <th className="py-2 pr-3 font-medium">Treatment / doctor</th>
                <th className="py-2 pr-3 text-right font-medium">Revenue</th>
                <th className="py-2 pl-3 font-medium">Next / follow-up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.key} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium text-ink">{p.name ?? '—'}</span>
                    {p.fileNo ? <span className="block text-[10.5px] tabular-nums text-ink-faint">{p.fileNo}</span> : null}
                  </td>
                  <td className="py-2 pr-3">
                    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${CLASS_STYLE[p.patientClass]}`}>
                      {CLASS_LABEL[p.patientClass]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{p.channel}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{p.bookedDate ? dubaiDateLabel(p.bookedDate) : '—'}</td>
                  <td className="py-2 pr-3">
                    {p.showed ? (
                      <span className="text-[11px] text-good">yes</span>
                    ) : p.nextAppt ? (
                      <span className="text-[11px] text-watch">
                        no · next {dubaiDateLabel(p.nextAppt)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">no</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">
                    {p.paid ? (
                      <span className="mr-1.5 text-[10.5px] text-good">paid</span>
                    ) : p.billed ? (
                      <span className="mr-1.5 text-[10.5px] text-accent">billed</span>
                    ) : null}
                    {p.services ?? '—'}
                    {p.doctor ? <span className="block text-[10.5px] text-ink-faint">{p.doctor}</span> : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{p.paidAmount > 0 ? fmtAed(p.paidAmount) : '—'}</td>
                  <td className="py-2 pl-3 tabular-nums text-ink-soft">
                    {p.nextAppt ? (
                      dubaiDateLabel(p.nextAppt)
                    ) : p.visits > 1 ? (
                      <span className="text-ink-faint">{int(p.visits)} visits</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.patients.length > rows.length ? (
            <p className="mt-2 text-[11.5px] text-ink-faint">
              Showing {int(rows.length)} of {int(data.patients.length)} booked patients (highest revenue first).
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
