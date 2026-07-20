import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { TOKENS } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAedCompact, fmtInt } from './parts';

/**
 * Headline cross-source KPI band — the answer-first strip a CEO reads first.
 * Marketing spend, leads, appointments booked + completed, clinic revenue and
 * conversations handled. Sparklines come from the monthly roll-up; a null KPI
 * renders an honest owned data-gap card (never a fabricated 0).
 */
export function ExecKpiBand({ report }: { report: ExecutiveReport }) {
  const { kpis, monthly } = report;

  const spendSpark = monthly.map((m) => m.spend);
  const leadsSpark = monthly.map((m) => m.leads);
  const apptSpark = monthly.map((m) => m.appointments);
  const revSpark = monthly.map((m) => m.revenue);

  const items: KpiItem[] = [
    {
      label: 'Marketing spend',
      value: kpis.marketingSpend == null ? null : fmtAedCompact(kpis.marketingSpend),
      spark: spendSpark,
      sparkColor: TOKENS.accent400,
      goodWhenUp: false,
      hint: 'Meta + Google · live',
      gapDetail: 'no ad-spend source',
      gapOwner: ownerFor('spend'),
    },
    {
      label: 'Leads generated',
      value: kpis.leadsGenerated == null ? null : fmtInt(kpis.leadsGenerated),
      spark: leadsSpark,
      sparkColor: TOKENS.accent,
      hint: kpis.costPerLead != null ? `AED ${Math.round(kpis.costPerLead)} / lead · manual tracker` : 'manual tracker',
      gapDetail: 'lead tracker not sourced',
      gapOwner: ownerFor('attribution'),
    },
    {
      label: 'Appointments booked',
      value: kpis.appointmentsBooked == null ? null : fmtInt(kpis.appointmentsBooked),
      spark: apptSpark,
      sparkColor: TOKENS.accent600,
      hint: kpis.aiAgentBookings != null ? `${fmtInt(kpis.aiAgentBookings)} by AI agent` : 'CRM (real, non-test)',
      gapDetail: 'no appointment export ingested',
      gapOwner: ownerFor('crm'),
    },
    {
      label: 'Appointments completed',
      value: kpis.appointmentsCompleted == null ? null : fmtInt(kpis.appointmentsCompleted),
      sparkColor: TOKENS.good,
      hint: kpis.completionRate != null ? `${Math.round(kpis.completionRate * 100)}% of concluded` : 'attended',
      gapDetail: 'no appointment export ingested',
      gapOwner: ownerFor('attendance'),
    },
    {
      label: 'Clinic revenue',
      value: kpis.clinicRevenue == null ? null : fmtAedCompact(kpis.clinicRevenue),
      spark: revSpark,
      sparkColor: TOKENS.good,
      hint: kpis.avgBillValue != null ? `AED ${Math.round(kpis.avgBillValue).toLocaleString('en-US')} avg bill` : 'finalized bills',
      gapDetail: 'no clinic-PMS revenue source',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Conversations handled',
      value: kpis.conversationsHandled == null ? null : fmtInt(kpis.conversationsHandled),
      sparkColor: TOKENS.accent400,
      hint: 'Zavis CRM',
      gapDetail: 'no conversation summary ingested',
      gapOwner: ownerFor('pac'),
    },
  ];

  return (
    <Card>
      <SectionHeader
        eyebrow="Executive dashboard · headline metrics"
        title="The whole business on one line"
      />
      <div className="px-5 pb-5 pt-3">
        <KpiBand items={items} />
      </div>
    </Card>
  );
}
