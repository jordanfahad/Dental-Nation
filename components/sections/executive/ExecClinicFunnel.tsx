import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { fmtAed } from './parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * The clinic conversion funnel — Booked → Showed up → Treatment (billed) → Paid,
 * traced PER PATIENT via the file number (Zavis appointment ↔ Practo bill). This
 * is the real, matchable end of the journey.
 *
 * Enquiries sit on top as CONTEXT only: the enquiry → booking hop isn't captured
 * in the data today, so it's shown with an explicit note and kept out of the
 * per-stage conversions (which are all same-population and therefore honest).
 */
export async function ExecClinicFunnel({
  range,
  clinic,
}: {
  range: { from: string; to: string };
  clinic?: ClinicFilterKey;
}) {
  const data = await getClinicFunnel({ from: range.from, to: range.to, clinic });
  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;

  if (data.source === 'empty') {
    return (
      <Card>
        <SectionHeader
          eyebrow="Executive dashboard · patient journey"
          title="Booked → Showed → Treated → Paid"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
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
  const rows = data.patients.slice(0, 50);

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · patient journey"
        title="Booked → Showed → Treated → Paid"
        right={<span className="text-[11px] text-ink-faint">{period}</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {/* Enquiries context — deliberately ABOVE the funnel, not a stage. */}
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-card border border-line bg-card px-4 py-3">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Enquiries (context)</span>{' '}
            <span className="tnum text-[16px] font-semibold text-ink">{int(data.enquiries)}</span>
          </div>
          <div className="text-[11.5px] leading-snug text-ink-faint">
            The enquiry → booking link isn&apos;t captured yet (lead phones match Zavis ~1%; the sheet&apos;s
            conversion column is ~98% blank), so this is top-of-funnel context — <strong>not</strong> a traced
            conversion into the bookings below.
          </div>
        </div>

        <FunnelViz stages={stages} />

        {/* Paid outcome — the AED that actually landed. */}
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
            <span className="tnum font-medium text-ink">{pct(data.billMatchRate)}</span> of booked patients tie to a
            Practo bill
          </div>
        </div>

        <Takeaway>
          This is the journey we can actually trace per patient — each booked patient is matched from the Zavis
          appointment to their Practo bill by <strong>file number</strong>. <strong>Showed up</strong> is
          evidence-based: Zavis marked <em>completed</em> <strong>or</strong> the patient has a Practo bill (a bill
          is proof they attended — the manual Zavis feed under-records <em>completed</em>). <strong>Treated</strong>{' '}
          = a matched bill; <strong>Paid</strong> = the bill was settled. <strong>{int(data.paid)}</strong> of{' '}
          <strong>{int(data.booked)}</strong> booked patients paid, for <strong>{fmtAed(data.paidAED)}</strong>{' '}
          collected. A booked patient with no file number can show up but can&apos;t be bill-matched — counted
          truthfully, never forced.
        </Takeaway>

        {/* Per-patient drill-down */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3 font-medium">Patient</th>
                <th className="py-2 pr-3 font-medium">File no.</th>
                <th className="py-2 pr-3 font-medium">Last appt</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Showed</th>
                <th className="py-2 pr-3 font-medium">Treatment / doctor</th>
                <th className="py-2 pr-3 font-medium">Billed</th>
                <th className="py-2 pl-3 text-right font-medium">Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.key} className="border-b border-line/60 last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">{p.name ?? '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">{p.fileNo ?? '—'}</td>
                  <td className="py-2 pr-3 tabular-nums text-ink-soft">
                    {p.lastApptDate ? dubaiDateLabel(p.lastApptDate) : '—'}
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">{p.status ?? '—'}</td>
                  <td className="py-2 pr-3">
                    {p.showed ? (
                      <span className="text-[11px] text-good">showed</span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-ink-soft">
                    {p.services ?? '—'}
                    {p.doctor ? <span className="block text-[10.5px] text-ink-faint">{p.doctor}</span> : null}
                  </td>
                  <td className="py-2 pr-3">
                    {p.paid ? (
                      <span className="text-[11px] text-good">paid</span>
                    ) : p.billed ? (
                      <span className="text-[11px] text-accent">billed</span>
                    ) : (
                      <span className="text-[11px] text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink">
                    {p.paidAmount > 0 ? fmtAed(p.paidAmount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.patients.length > rows.length ? (
            <p className="mt-2 text-[11.5px] text-ink-faint">
              Showing {int(rows.length)} of {int(data.patients.length)} booked patients (highest paid first).
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
