import { Card, SectionHeader } from '@/components/ui/Card';
import { Donut, HBarChart, type BarDatum } from '@/components/charts/Charts';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmMixRow, CrmReport } from '@/lib/crm/types';

/**
 * Breakdown row: appointments by source (Donut), by department (HBar), and top
 * doctors (HBar). Each panel falls back to an honest owned data-gap line when its
 * breakdown is empty.
 */
export function CrmBreakdowns({ report }: { report: CrmReport }) {
  const a = report.appointments;
  const toBars = (rows: CrmMixRow[]): BarDatum[] => rows.map((r) => ({ label: r.label, value: r.value }));

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card>
        <SectionHeader eyebrow="CRM — Zavis · mix" title="Appointments by source" />
        <div className="px-5 pb-5 pt-4">
          {a.bySource.length ? (
            <Donut data={toBars(a.bySource)} valueFormat="int" centerLabel="appts" height={180} />
          ) : (
            <DataGapInline detail="no source breakdown available" owner={ownerFor('crm')} />
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="CRM — Zavis · mix" title="By department" />
        <div className="px-5 pb-5 pt-4">
          {a.byDepartment.length ? (
            <HBarChart data={toBars(a.byDepartment)} valueFormat="int" />
          ) : (
            <DataGapInline
              detail="no department recorded on appointments"
              owner={ownerFor('clinic')}
            />
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="CRM — Zavis · mix" title="Top doctors" />
        <div className="px-5 pb-5 pt-4">
          {a.byDoctor.length ? (
            <HBarChart data={toBars(a.byDoctor)} valueFormat="int" />
          ) : (
            <DataGapInline detail="no professional recorded on appointments" owner={ownerFor('clinic')} />
          )}
        </div>
      </Card>
    </div>
  );
}
