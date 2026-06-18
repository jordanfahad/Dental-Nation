import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Donut, type BarDatum } from '@/components/charts/Charts';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';

/**
 * Three composition donuts side by side — clinic revenue by department, CRM
 * appointments by source (including the AI-agent slice), and lead channel mix.
 * Each donut self-handles an empty dataset; we add an owned data-gap note when a
 * whole source is absent so the gap is explicit, never a silent blank.
 */
function DonutPanel({
  title,
  data,
  valueFormat,
  centerLabel,
  gapDetail,
  gapArea,
}: {
  title: string;
  data: BarDatum[];
  valueFormat: 'int' | 'aed';
  centerLabel: string;
  gapDetail: string;
  gapArea: string;
}) {
  const rows = data.filter((d) => d.value > 0);
  return (
    <div className="rounded-card border border-line bg-card p-4">
      <p className="text-[12px] font-medium text-ink">{title}</p>
      <div className="mt-3">
        {rows.length === 0 ? (
          <DataGapInline detail={gapDetail} owner={ownerFor(gapArea)} />
        ) : (
          <Donut data={rows} valueFormat={valueFormat} centerLabel={centerLabel} height={168} />
        )}
      </div>
    </div>
  );
}

export function ExecMixRow({ report }: { report: ExecutiveReport }) {
  const { practo, crm, leads } = report;

  const revByDept: BarDatum[] = practo.byDepartment.map((r) => ({ label: r.label, value: r.value }));
  const apptBySource: BarDatum[] = crm.appointments.bySource.map((r) => ({ label: r.label, value: r.value }));
  const leadMix: BarDatum[] = leads.byChannel.map((r) => ({ label: r.label, value: r.value }));

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · composition"
        title="Where revenue, appointments & leads come from"
      />
      <div className="grid gap-3 px-5 pb-5 pt-3 md:grid-cols-3">
        <DonutPanel
          title="Clinic revenue by department"
          data={revByDept}
          valueFormat="aed"
          centerLabel="revenue"
          gapDetail="no clinic-PMS revenue source"
          gapArea="clinic"
        />
        <DonutPanel
          title="Appointments by source"
          data={apptBySource}
          valueFormat="int"
          centerLabel="appts"
          gapDetail="no appointment export ingested"
          gapArea="crm"
        />
        <DonutPanel
          title="Lead channel mix"
          data={leadMix}
          valueFormat="int"
          centerLabel="leads"
          gapDetail="lead tracker not sourced"
          gapArea="attribution"
        />
      </div>
    </Card>
  );
}
