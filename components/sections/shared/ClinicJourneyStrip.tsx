import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { ClinicJourneyView } from './ClinicJourneyView';

/**
 * Compact clinic-journey summary — the same interactive, colour funnel with the
 * clickable new/existing cohort filter and collected total, but WITHOUT the
 * heavy per-patient table (dropped for the Website Bookings & Marketing tabs so
 * they stay fast). The full drill-down lives on the Executive & Practo tabs.
 */
export async function ClinicJourneyStrip({
  range,
  clinic,
  eyebrow = 'Clinic outcome',
  title = 'Booked → Showed → Treated → Paid',
}: {
  range: { from: string; to: string };
  clinic?: ClinicFilterKey;
  eyebrow?: string;
  title?: string;
}) {
  const data = await getClinicFunnel({ from: range.from, to: range.to, clinic });

  if (data.source === 'empty') {
    const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;
    return (
      <Card>
        <SectionHeader eyebrow={eyebrow} title={title} right={<span className="text-[11px] text-ink-faint">{period}</span>} />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail="no booked patients in range" owner={ownerFor('clinic')} />
        </div>
      </Card>
    );
  }

  return <ClinicJourneyView report={data} eyebrow={eyebrow} title={title} compact />;
}
