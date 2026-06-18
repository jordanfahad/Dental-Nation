import { DecisionBanner, type BannerTone } from '@/components/charts/DecisionBanner';
import type { CrmReport } from '@/lib/crm/types';
import { fmtHours, fmtInt, fmtPct } from './format';

/**
 * Answer-first CRM health banner. The verdict is driven by the conversation
 * first-response time (the booking engine's biggest leak): >7 days = Stop,
 * >2 days = Fix, else neutral/good. Honest meta line; no fabricated numbers.
 */
export function CrmHeader({ report }: { report: CrmReport }) {
  const { appointments, conversation } = report;
  const frHours = conversation?.avgFirstResponseHours ?? null;
  const frDays = frHours == null ? null : frHours / 24;

  let tone: BannerTone = 'neutral';
  let verdict = 'Monitor';
  let headline: string;

  if (frDays != null && frDays >= 7) {
    tone = 'stop';
    verdict = 'Fix the response gap';
    headline = `First response averaging ${frDays.toFixed(0)} days — the booking engine is leaking at the conversation stage. Patients message and wait days for a reply.`;
  } else if (frDays != null && frDays >= 2) {
    tone = 'watch';
    verdict = 'Tighten response time';
    headline = `First response averaging ${fmtHours(frHours)} — slow enough to lose warm enquiries before they book.`;
  } else if (frHours != null) {
    tone = 'good';
    verdict = 'Response time healthy';
    headline = `First response averaging ${fmtHours(frHours)} — fast enough to convert enquiries while intent is warm.`;
  } else {
    tone = 'neutral';
    verdict = 'Conversations not measured';
    headline =
      'Appointment data is present, but conversation response times are not sourced — upload a Zavis conversation summary to judge the engagement stage.';
  }

  const metaParts: string[] = [];
  if (appointments.total != null) metaParts.push(`${fmtInt(appointments.total)} real appointments`);
  if (appointments.completionRate != null)
    metaParts.push(`${fmtPct(appointments.completionRate)} completion`);
  if (appointments.cancellationRate != null)
    metaParts.push(`${fmtPct(appointments.cancellationRate)} cancellation`);

  return (
    <DecisionBanner
      eyebrow="CRM — Zavis · health"
      verdict={verdict}
      tone={tone}
      headline={headline}
      meta={metaParts.length ? metaParts.join(' · ') : undefined}
      suggested={false}
    />
  );
}
