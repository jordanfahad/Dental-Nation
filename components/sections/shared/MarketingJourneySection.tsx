import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { ClinicJourneyView } from './ClinicJourneyView';
import { ChannelJourneyView } from './ChannelJourneyView';

/**
 * Marketing tab clinic block — fetches the clinic funnel ONCE and renders both:
 *   1. the compact outcome strip (funnel + new/existing cohort filter), and
 *   2. the full journey by booking channel (ranked best→low) with a filterable
 *      per-patient table (booked / showed / not-shown / paid / re-booked).
 */
export async function MarketingJourneySection({
  range,
  clinic,
}: {
  range: { from: string; to: string };
  clinic?: ClinicFilterKey;
}) {
  const data = await getClinicFunnel({ from: range.from, to: range.to, clinic });

  if (data.source === 'empty') {
    const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;
    return (
      <Card>
        <SectionHeader
          eyebrow="Marketing · clinic outcome"
          title="Booked → Showed → Treated → Paid"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail="no booked patients in range" owner={ownerFor('clinic')} />
        </div>
      </Card>
    );
  }

  return (
    <>
      <ClinicJourneyView report={data} eyebrow="Marketing · clinic outcome" title="Booked → Showed → Treated → Paid" compact />
      <ChannelJourneyView report={data} />
    </>
  );
}
