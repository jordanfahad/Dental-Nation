import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { Card, SectionHeader } from '@/components/ui/Card';
import { ownerFor } from '@/config/data-gap-owners';
import type { CrmReport } from '@/lib/crm/types';
import { fmtHours, fmtInt, fmtPct } from './format';

/**
 * Executive KPI band for CRM. Real values where sourced; an honest data-gap card
 * (value:null) where a source is missing — never a fabricated 0.
 */
export function CrmScorecards({ report }: { report: CrmReport }) {
  const { appointments: a, conversation: c } = report;

  const frHours = c?.avgFirstResponseHours ?? null;
  const frSlow = frHours != null && frHours >= 48;

  const items: KpiItem[] = [
    {
      label: 'Total appointments',
      value: a.total != null ? fmtInt(a.total) : null,
      hint: a.total != null ? 'real (non-test)' : undefined,
      gapDetail: 'No appointment export ingested',
      gapOwner: ownerFor('crm'),
    },
    {
      label: 'Completed (show)',
      value: a.completed != null ? fmtInt(a.completed) : null,
      hint: a.completionRate != null ? `${fmtPct(a.completionRate)} of resolved` : undefined,
      gapDetail: 'No appointment export ingested',
      gapOwner: ownerFor('attendance'),
    },
    {
      label: 'Cancellation rate',
      value: a.cancellationRate != null ? fmtPct(a.cancellationRate) : null,
      goodWhenUp: false,
      hint: a.cancel != null ? `${fmtInt(a.cancel)} cancelled` : undefined,
      gapDetail: 'No appointment export ingested',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'AI-agent bookings',
      value: a.aiAgentBookings != null ? fmtInt(a.aiAgentBookings) : null,
      hint: a.aiAgentBookings != null ? "source = 'aiAgent'" : undefined,
      gapDetail: 'No appointment export ingested',
      gapOwner: ownerFor('crm'),
    },
    {
      label: 'Conversations',
      value: c?.conversations != null ? fmtInt(c.conversations) : null,
      hint: c?.periodStart && c?.periodEnd ? `${c.periodStart} → ${c.periodEnd}` : undefined,
      gapDetail: 'No conversation summary ingested',
      gapOwner: ownerFor('pac'),
    },
    {
      label: 'Avg first response',
      value: frHours != null ? fmtHours(frHours) : null,
      hint: c?.avgFirstResponseText ?? undefined,
      sparkColor: frSlow ? '#B91C1C' : undefined,
      gapDetail: 'No conversation summary ingested',
      gapOwner: ownerFor('response_time'),
    },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="CRM — Zavis · scorecard"
        title="The numbers that decide the quarter"
      />
      <div className="px-5 pb-5 pt-3">
        <KpiBand items={items} />
        {frSlow ? (
          <p className="mt-3 text-[12px] leading-snug text-stop">
            Avg first response is {fmtHours(frHours)} — far beyond a conversion-safe window. Treat the
            “Avg first response” card as RED.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
