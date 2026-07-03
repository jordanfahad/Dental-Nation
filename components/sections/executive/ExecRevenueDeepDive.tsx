import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAed } from './parts';

/**
 * Revenue deep-dive — top treatments by revenue and revenue by doctor (falling
 * back to appointments-by-doctor from the CRM when Practo has no per-doctor
 * split). When Practo carries per-doctor revenue we also surface an
 * "Unattributed" bar for charge revenue with no doctor on the bill, so the
 * per-doctor split reconciles to the total instead of appearing to lose money.
 * Each panel shows an owned data gap when its source is absent.
 */
export function ExecRevenueDeepDive({ report }: { report: ExecutiveReport }) {
  const { practo, crm } = report;

  const treatments: BarDatum[] = practo.byTreatment.map((r) => ({ label: r.label, value: r.value }));

  const doctorIsRevenue = practo.byDoctor.length > 0;
  const attributed = practo.byDoctor.reduce((sum, r) => sum + r.value, 0);
  const unattributed = practo.doctorUnattributed;
  const attributable = attributed + unattributed;
  const attributedPct = attributable > 0 ? Math.round((attributed / attributable) * 100) : null;

  const doctors: BarDatum[] = doctorIsRevenue
    ? [
        ...practo.byDoctor.map((r) => ({ label: r.label, value: r.value })),
        ...(unattributed > 0
          ? [
              {
                label: 'Unattributed — no doctor on bill',
                value: unattributed,
                color: TOKENS.na,
                note:
                  attributable > 0
                    ? `${Math.round((unattributed / attributable) * 100)}% of revenue`
                    : undefined,
              },
            ]
          : []),
      ]
    : crm.appointments.byDoctor.map((r) => ({ label: r.label, value: r.value }));

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · clinic value"
        title="What drives clinic revenue"
      />
      <div className="grid gap-x-8 gap-y-5 px-5 pb-5 pt-4 md:grid-cols-2">
        <div>
          <p className="mb-3 text-[12px] font-medium text-ink">Top treatments by revenue</p>
          {treatments.length === 0 ? (
            <DataGapInline detail="no clinic-PMS revenue source" owner={ownerFor('clinic')} />
          ) : (
            <HBarChart data={treatments} valueFormat="aed" accent={TOKENS.accent} />
          )}
        </div>
        <div>
          <p className="mb-3 text-[12px] font-medium text-ink">
            {doctorIsRevenue ? 'Revenue by doctor' : 'Appointments by doctor'}
          </p>
          {doctors.length === 0 ? (
            <DataGapInline detail="no per-doctor source ingested" owner={ownerFor('clinic')} />
          ) : (
            <HBarChart
              data={doctors}
              valueFormat={doctorIsRevenue ? 'aed' : 'int'}
              accent={TOKENS.accent600}
            />
          )}
          {doctorIsRevenue && unattributed > 0 ? (
            <p className="mt-3 text-[11px] leading-snug text-ink-faint">
              Only {fmtAed(attributed)}
              {attributedPct != null ? ` (${attributedPct}%)` : ''} of charge revenue is tied to a named
              doctor; {fmtAed(unattributed)} has no doctor recorded on the bill — a clinic-PMS data-entry gap,
              not a dashboard miscount. Named doctors + unattributed reconcile to the revenue total.
            </p>
          ) : null}
        </div>
      </div>
      {practo.revenue > 0 ? (
        <div className="px-5 pb-5">
          <Takeaway>
            Finalized clinic revenue totals {fmtAed(practo.revenue)} across {practo.billCount.toLocaleString('en-US')} bills
            {practo.avgBill != null ? ` at an average bill of ${fmtAed(practo.avgBill)}` : ''}.{' '}
            {doctorIsRevenue && attributedPct != null ? (
              <>
                Just {attributedPct}% is attributed to a named doctor — the rest carries no doctor on the bill,
                so treat the per-doctor split as a floor until clinic-PMS entry improves.
              </>
            ) : (
              <>Concentration by treatment and {doctorIsRevenue ? 'doctor' : 'practitioner'} shows where the clinic earns most.</>
            )}
          </Takeaway>
        </div>
      ) : null}
    </Card>
  );
}
