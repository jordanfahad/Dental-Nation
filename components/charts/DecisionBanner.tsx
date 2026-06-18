import type { ReactNode } from 'react';

/**
 * The answer-first hero banner for a report tab — the one thing a CEO reads
 * first: the decision, in plain language, with its reasoning. Tone is driven by
 * the verdict (Scale/Continue = good, Fix = watch, Stop = stop, Hold = neutral).
 */

export type BannerTone = 'good' | 'watch' | 'stop' | 'neutral';

const TONE: Record<BannerTone, { bar: string; chipBg: string; chipText: string; dot: string }> = {
  good: { bar: 'bg-good', chipBg: 'bg-good/10', chipText: 'text-good', dot: 'bg-good' },
  watch: { bar: 'bg-watch', chipBg: 'bg-watch/10', chipText: 'text-watch', dot: 'bg-watch' },
  stop: { bar: 'bg-stop', chipBg: 'bg-stop/10', chipText: 'text-stop', dot: 'bg-stop' },
  neutral: { bar: 'bg-na', chipBg: 'bg-na/10', chipText: 'text-ink-soft', dot: 'bg-na' },
};

export function DecisionBanner({
  eyebrow,
  verdict,
  tone,
  headline,
  meta,
  suggested = true,
  right,
}: {
  eyebrow: string;
  verdict: string;
  tone: BannerTone;
  headline: string;
  meta?: string;
  suggested?: boolean;
  right?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <section className="card print-avoid-break relative overflow-hidden">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${t.bar}`} aria-hidden />
      <div className="flex flex-col gap-4 px-5 py-4 pl-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[17px] font-semibold ${t.chipBg} ${t.chipText}`}
            >
              <span className={`h-2 w-2 rounded-full ${t.dot}`} />
              {verdict}
            </span>
            {suggested ? (
              <span className="rounded bg-na/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                Suggested — reviewer overrides
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-snug text-ink-soft">{headline}</p>
          {meta ? <p className="mt-1 text-[11.5px] text-ink-faint">{meta}</p> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </section>
  );
}
