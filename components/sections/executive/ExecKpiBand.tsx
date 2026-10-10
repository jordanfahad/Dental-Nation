import type { ExecutiveReport } from '@/lib/executive/types';
import { Card, SectionHeader } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { TOKENS } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { fmtAedCompact, fmtInt } from './parts';

/**
 * Headline cross-source KPI band — the answer-first strip a CEO reads first.
 * Marketing spend, enquiries (unique people), Practo appointments booked and
 * attended, clinic revenue and conversations handled. Sparklines come from the
 * monthly roll-up; a null KPI renders an honest owned data-gap card (never a
 * fabricated 0).
 */
const dayMonth = (iso: string | null) => {
  if (!iso) return '?';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export function ExecKpiBand({ report }: { report: ExecutiveReport }) {
  const { kpis, monthly, practo } = report;
  const convPeriod = kpis.conversationsPeriod
    ? `${dayMonth(kpis.conversationsPeriod.start)} to ${dayMonth(kpis.conversationsPeriod.end)}`
    : null;

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
      label: 'Enquiries',
      value: kpis.leadsGenerated == null ? null : fmtInt(kpis.leadsGenerated),
      spark: leadsSpark,
      sparkColor: TOKENS.accent,
      hint: kpis.enquiriesUnique
        ? `unique people · lead tracker, website and AI agent, each person once${kpis.costPerLead != null ? ` · AED ${Math.round(kpis.costPerLead)} of ad spend per enquiry` : ''}`
        : 'lead-tracker rows (not yet deduped)',
      gapDetail: 'enquiries come through Dental Nation Al Wasl channels',
      gapOwner: ownerFor('attribution'),
    },
    {
      label: 'Appointments booked',
      value: kpis.appointmentsBooked == null ? null : fmtInt(kpis.appointmentsBooked),
      spark: apptSpark,
      sparkColor: TOKENS.accent600,
      hint: `Practo · every channel${kpis.aiAgentBookings ? ` · ${fmtInt(kpis.aiAgentBookings)} by the AI agent` : ''}`,
      gapDetail: 'no Practo appointments in this period',
      gapOwner: ownerFor('crm'),
    },
    {
      label: 'Appointments attended',
      value: kpis.appointmentsCompleted == null ? null : fmtInt(kpis.appointmentsCompleted),
      sparkColor: TOKENS.good,
      hint:
        kpis.completionRate != null
          ? `${Math.round(kpis.completionRate * 100)}% of appointments that happened or were missed (no-shows and cancellations count)`
          : 'arrived or completed',
      gapDetail: 'no Practo appointments in this period',
      gapOwner: ownerFor('attendance'),
    },
    {
      label: 'Clinic revenue',
      value: kpis.clinicRevenue == null ? null : fmtAedCompact(kpis.clinicRevenue),
      spark: revSpark,
      sparkColor: TOKENS.good,
      hint:
        kpis.avgBillValue != null
          ? `AED ${Math.round(kpis.avgBillValue).toLocaleString('en-US')} per paid bill · ${fmtInt(practo.paidBills)} of ${fmtInt(practo.billCount)} bills charged (the rest are no-charge visits)`
          : 'Practo bills',
      gapDetail: 'no clinic-PMS revenue source',
      gapOwner: ownerFor('clinic'),
    },
    {
      label: 'Conversations handled',
      value: kpis.conversationsHandled == null ? null : fmtInt(kpis.conversationsHandled),
      sparkColor: TOKENS.accent400,
      hint: convPeriod ? `CRM-DN · export for ${convPeriod}` : 'CRM-DN',
      gapDetail: convPeriod ? `the CRM-DN export covers ${convPeriod} only` : 'no conversation summary ingested',
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
