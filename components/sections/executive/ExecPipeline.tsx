import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelViz, type FunnelStageViz } from '@/components/charts/FunnelViz';
import { fmtAed } from './parts';

/**
 * Acquisition → revenue pipeline. A big horizontal flow from marketing spend
 * through website sessions, leads, appointments booked + completed, to clinic
 * revenue. These are DISTINCT populations (each from its own system), so we frame
 * the read honestly: it is the shape of the business, stage by stage — not a
 * single fused conversion funnel. A null stage shows as an owned data gap.
 */
export function ExecPipeline({ report }: { report: ExecutiveReport }) {
  const { kpis } = report;

  const stages: FunnelStageViz[] = [
    { label: 'Marketing spend (AED)', value: kpis.marketingSpend, hint: 'no ad-spend source' },
    { label: 'Website sessions', value: kpis.websiteSessions, hint: 'GA4 not connected' },
    { label: 'Leads generated', value: kpis.leadsGenerated, hint: 'lead tracker not sourced' },
    { label: 'Appointments booked', value: kpis.appointmentsBooked, hint: 'no CRM export' },
    { label: 'Completed (attended)', value: kpis.appointmentsCompleted, hint: 'no CRM export' },
    { label: 'Clinic revenue (AED)', value: kpis.clinicRevenue, hint: 'no clinic-PMS source' },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · the pipeline"
        title="From ad spend to clinic revenue"
      />
      <div className="px-5 pb-5 pt-4">
        <FunnelViz stages={stages} />
        <Takeaway>
          The business pipeline, each stage read from its own system — paid media, GA4, the lead
          tracker, the CRM, and finalized clinic bills. They are distinct populations, so the
          stage-to-stage figures show shape and scale, not a single fused conversion rate.
          {kpis.clinicRevenue != null
            ? ` All-time clinic revenue stands at ${fmtAed(kpis.clinicRevenue)}.`
            : ''}
        </Takeaway>
      </div>
    </Card>
  );
}
