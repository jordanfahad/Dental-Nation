import type { ExecutiveReport } from '@/lib/executive/types';
import { Card } from '@/components/ui/Card';
import { fmtAedCompact, fmtInt } from './parts';

/**
 * Closing investor takeaway — a confident, honest one-paragraph summary of the
 * engine, anchored to whichever real figures are present.
 */
export function ExecClosing({ report }: { report: ExecutiveReport }) {
  const { kpis, coverage } = report;
  const liveEngines = Object.values(coverage).filter(Boolean).length;

  const facts: string[] = [];
  if (kpis.marketingSpend != null) facts.push(`${fmtAedCompact(kpis.marketingSpend)} in measured marketing spend`);
  if (kpis.leadsGenerated != null) facts.push(`${fmtInt(kpis.leadsGenerated)} tracked leads`);
  if (kpis.appointmentsBooked != null) facts.push(`${fmtInt(kpis.appointmentsBooked)} appointments`);
  if (kpis.clinicRevenue != null) facts.push(`${fmtAedCompact(kpis.clinicRevenue)} clinic revenue`);

  return (
    <Card className="border-accent/30 bg-accent-50/40">
      <div className="px-5 py-6 md:px-7">
        <p className="eyebrow text-accent">Executive dashboard · the bottom line</p>
        <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-ink">
          A patient-acquisition system, instrumented end to end
        </h2>
        <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-ink-soft">
          Dental Nation runs a measured, multi-channel patient-acquisition system spanning paid media,
          website, the CRM and AI booking agent, and clinic revenue — wired across {liveEngines} live
          engine{liveEngines === 1 ? '' : 's'} and reported from each source on its own honest footing.
          {facts.length > 0 ? ` It already accounts for ${facts.join(', ')}.` : ''} Every metric here is
          traceable to its system, and every gap is named and owned — the foundation for compounding,
          data-driven growth.
        </p>
      </div>
    </Card>
  );
}
