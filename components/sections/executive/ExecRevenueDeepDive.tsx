import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAed } from './parts';

/**
 * Revenue deep-dive — top treatments by revenue and revenue by doctor (falling
 * back to appointments-by-doctor from the CRM when Practo has no per-doctor
 * split). Each panel shows an owned data gap when its source is absent.
 */
export function ExecRevenueDeepDive({ report }: { report: ExecutiveReport }) {
  const { practo, crm } = report;

  const treatments: BarDatum[] = practo.byTreatment.map((r) => ({ label: r.label, value: r.value }));

  const doctorIsRevenue = practo.byDoctor.length > 0;
  const doctors: BarDatum[] = doctorIsRevenue
    ? practo.byDoctor.map((r) => ({ label: r.label, value: r.value }))
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
        </div>
      </div>
      {practo.revenue > 0 ? (
        <div className="px-5 pb-5">
          <Takeaway>
            Finalized clinic revenue totals {fmtAed(practo.revenue)} across {practo.billCount.toLocaleString('en-US')} bills
            {practo.avgBill != null ? ` at an average bill of ${fmtAed(practo.avgBill)}` : ''}. Concentration by
            treatment and {doctorIsRevenue ? 'doctor' : 'practitioner'} shows where the clinic earns most.
          </Takeaway>
        </div>
      ) : null}
    </Card>
  );
}
