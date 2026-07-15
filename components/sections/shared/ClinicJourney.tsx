import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { ClinicJourneyView } from './ClinicJourneyView';

/**
 * Full clinic patient-journey — Booked → Showed → Treated → Paid with the
 * per-patient detail split by new vs existing (clickable cohort filter, colour
 * funnel, booking channel, show-up + next appointment, treatment, revenue,
 * follow-ups). Server wrapper: fetches, then hands off to the interactive view.
 * Used on the Executive & Practo tabs. Honors the date range + clinic filter.
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

  return <ClinicJourneyView report={data} eyebrow={eyebrow} title={title} />;
}
