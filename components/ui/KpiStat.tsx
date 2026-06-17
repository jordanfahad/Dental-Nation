import { Sparkline } from '@/components/charts/Sparkline';

const TONE_TEXT = {
  good: 'text-good',
  stop: 'text-stop',
  na: 'text-ink-faint',
} as const;

/** One KPI in the §A strip: big tabular figure, delta-vs-yesterday arrow,
 *  trailing-7 sparkline. */
export function KpiStat({
  label,
  value,
  delta,
  deltaTone = 'na',
  sparkData,
  sparkTone = 'accent',
}: {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'good' | 'stop' | 'na';
  sparkData: number[];
  sparkTone?: 'accent' | 'good' | 'stop' | 'watch';
}) {
  const arrow = deltaTone === 'good' ? '▲' : deltaTone === 'stop' ? '▼' : '';
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <span className="eyebrow">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="tnum text-kpi font-semibold leading-none text-ink">{value}</span>
        {delta ? (
          <span className={`tnum text-[12px] font-medium ${TONE_TEXT[deltaTone]}`}>
            {arrow} {delta}
          </span>
        ) : null}
      </div>
      <Sparkline data={sparkData} tone={sparkTone} />
    </div>
  );
}
