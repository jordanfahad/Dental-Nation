import type { WeeklyDecision } from '@/lib/metrics/weekly';

/** Compact Scale/Fix/Hold/Stop chip for the weekly tables. Reuses the same
 *  good/watch/na/stop palette as the daily DecisionPill (Scale ↔ good). */
const STYLES: Record<WeeklyDecision, string> = {
  Scale: 'bg-good/10 text-good ring-good/20',
  Fix: 'bg-watch/10 text-watch ring-watch/20',
  Hold: 'bg-na/10 text-ink-soft ring-na/30',
  Stop: 'bg-stop/10 text-stop ring-stop/20',
};

export function WeeklyDecisionChip({ decision }: { decision: WeeklyDecision }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ${STYLES[decision]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {decision}
    </span>
  );
}
