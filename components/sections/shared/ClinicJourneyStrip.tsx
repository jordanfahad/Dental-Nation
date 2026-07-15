import { getClinicFunnel } from '@/lib/executive/clinicFunnel';
import type { ClinicFilterKey } from '@/config/clinics';
import { Card, SectionHeader } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';
import { fmtAed } from '@/components/sections/executive/parts';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Compact clinic-journey summary — the Booked → Showed → Treated → Paid funnel,
 * collected AED and the new/existing split, WITHOUT the heavy per-patient table.
 * Dropped on the Website Bookings and Marketing tabs so they stay fast while
 * still showing where bookings actually land; the full drill-down lives on the
 * Executive & Practo tabs.
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

  return (
    <Card>
      <SectionHeader eyebrow={eyebrow} title={title} right={<span className="text-[11px] text-ink-faint">{period}</span>} />
      <div className="px-5 pb-5 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
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

        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-[12.5px]">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Collected</span>{' '}
            <span className="tnum font-semibold text-ink">{fmtAed(data.paidAED)}</span>
            <span className="ml-1 text-[11px] text-ink-faint">(Practo paid bills)</span>
          </div>
          <div className="text-ink-faint">Full patient drill-down on the Executive &amp; Practo tabs.</div>
        </div>
      </div>
    </Card>
  );
}
