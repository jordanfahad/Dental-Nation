import type { ExecutiveReport } from '@/lib/executive/types';
import { dubaiDateLabel } from '@/lib/dates';
import { DecisionBanner, type BannerTone } from '@/components/charts/DecisionBanner';
import { CoverageStrip, fmtAed, fmtInt, type CoveragePill } from './parts';

/**
 * Build a confident, investor-ready one-line narrative from the real figures.
 * Honest: only sourced (non-null) numbers are woven in; nothing is fabricated.
 */
function execNarrative(k: ExecutiveReport['kpis']): string | null {
  const parts: string[] = [];
  if (k.clinicRevenue != null) parts.push(`${fmtAed(k.clinicRevenue)} in finalized clinic revenue`);
  if (k.appointmentsCompleted != null) parts.push(`${fmtInt(k.appointmentsCompleted)} completed appointments`);
  if (k.appointmentsBooked != null) parts.push(`${fmtInt(k.appointmentsBooked)} appointments booked`);
  if (k.leadsGenerated != null) parts.push(`${fmtInt(k.leadsGenerated)} tracked leads`);
  if (k.marketingSpend != null) parts.push(`${fmtAed(k.marketingSpend)} of measured media spend`);
  if (k.conversationsHandled != null) parts.push(`${fmtInt(k.conversationsHandled)} patient conversations`);
  if (parts.length < 2) return null;
  const last = parts.pop();
  return `${parts.join(', ')} and ${last} — one instrumented funnel from ad spend to the dental chair.`;
}

/**
 * Executive Dashboard hero — the investor-grade landing header. A confident title,
 * the period covered, a coverage strip of live engines, and an answer-first
 * decision banner summarising the state of the acquisition-to-revenue machine.
 */
export function ExecHero({ report }: { report: ExecutiveReport }) {
  const { range, coverage, kpis, source } = report;

  const pills: CoveragePill[] = [
    { label: 'Paid media', live: coverage.paid },
    { label: 'Lead tracker', live: coverage.leads },
    { label: 'Website / GA4', live: coverage.ga4 },
    { label: 'Booking widget', live: coverage.bookings },
    { label: 'Zavis CRM', live: coverage.crm },
    { label: 'Clinic revenue', live: coverage.practo },
  ];
  const liveCount = pills.filter((p) => p.live).length;

  // Answer-first tone: how complete + healthy is the instrumented engine.
  let tone: BannerTone = 'good';
  let verdict = 'Engine instrumented';
  if (source === 'mock') {
    tone = 'neutral';
    verdict = 'Preview — sample data';
  } else if (liveCount <= 2) {
    tone = 'watch';
    verdict = 'Partial coverage';
  }

  const narrative = source === 'mock' ? null : execNarrative(kpis);
  const headline =
    source === 'mock'
      ? 'Preview mode — showing representative sample numbers. On the live deployment this reads every connected engine end to end.'
      : narrative ??
        `A measured, multi-channel patient-acquisition system — ${liveCount} of ${pills.length} engines live, from ad spend through clinic revenue, instrumented end to end.`;

  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)} · full history, each engine over its own measured window`;

  return (
    <div className="space-y-4">
      <header className="rounded-card border border-line bg-card px-5 py-6 md:px-7 md:py-8">
        <p className="eyebrow text-accent">Dental Nation · Performance Report</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-none tracking-tight text-ink md:text-hero">
          Executive Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-snug text-ink-soft">
          Dental Nation · All Lanes — from ad spend to clinic revenue. One picture across paid media,
          website, lead tracking, CRM &amp; AI booking, and finalized clinic bills.
        </p>
        <p className="mt-3 text-[11.5px] font-medium uppercase tracking-wide text-ink-faint">{period}</p>
        <div className="mt-5">
          <p className="mb-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
            Engine coverage
          </p>
          <CoverageStrip pills={pills} />
        </div>
      </header>

      <DecisionBanner
        eyebrow="Executive dashboard · all lanes"
        verdict={verdict}
        tone={tone}
        headline={headline}
        meta={
          kpis.clinicRevenue != null
            ? `Clinic revenue, leads, appointments and conversations all roll up from their own systems.`
            : 'Each metric reports from its own source — null where a source is not yet wired.'
        }
        suggested={false}
      />
    </div>
  );
}
