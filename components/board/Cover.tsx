import { C } from './design';
import type { KeyMessage } from '@/lib/board/insights';

/**
 * The cover block — a dark navy masthead carrying ONE finding, then the
 * headline figures beneath it.
 *
 * A board document earns its first thirty seconds here. The cover states the
 * result; everything after it is evidence. The hero figures are the four the
 * argument rests on, and each carries its own comparison so the reader is
 * never asked to take a number on trust.
 */
export function Cover({
  headline,
  periodLabel,
  windowLabel,
  compareLabel,
  stats,
  lastUpdated,
}: {
  headline: string;
  periodLabel: string;
  windowLabel: string;
  compareLabel: string | null;
  stats: { label: string; value: string | null; delta?: string; deltaTone?: 'good' | 'stop' | 'flat' }[];
  lastUpdated: string | null;
}) {
  return (
    <header className="print-avoid-break">
      <div
        className="print-exact rounded-card px-6 py-7 sm:px-9 sm:py-10"
        style={{ background: C.navyDeep }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: C.navyPale }}>
              Dental Nation · Growth
            </p>
            <h1 className="mt-2 text-[34px] font-semibold leading-[1.02] tracking-[-0.028em] text-white sm:text-[46px]">
              Growth Report
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.navyPale }}>
              Reporting period
            </p>
            <p className="mt-1 text-[13px] font-medium text-white">{periodLabel}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: C.navyPale }}>
              Mr. Akbar · Board &amp; Investors
            </p>
          </div>
        </div>

        <p className="mt-7 max-w-[54ch] border-l-2 pl-4 text-[16px] font-medium leading-[1.45] text-white sm:text-[19px]"
           style={{ borderColor: C.amberSoft }}>
          {headline}
        </p>

        <div className="mt-8 grid gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-4"
             style={{ borderColor: 'rgba(255,255,255,0.16)' }}>
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.navyPale }}>
                {s.label}
              </p>
              {s.value ? (
                <p className="tnum mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em] text-white sm:text-[30px]">
                  {s.value}
                </p>
              ) : (
                <p className="mt-1.5 text-[13px] font-medium" style={{ color: C.amberSoft }}>
                  Data pending
                </p>
              )}
              {s.delta ? (
                <p
                  className="tnum mt-1.5 text-[11px] font-semibold"
                  style={{
                    color: s.deltaTone === 'good' ? '#6EE7A8' : s.deltaTone === 'stop' ? '#FCA5A5' : C.navyPale,
                  }}
                >
                  {s.delta}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[10.5px] text-ink-faint">
          Metrics window <span className="font-medium text-ink-soft">{windowLabel}</span>
          {compareLabel ? ` · ${compareLabel}` : ' · no prior period'}
        </p>
        <p className="text-[10.5px] text-ink-faint">
          {lastUpdated ? `Live data — last synced ${lastUpdated}` : 'Live data — awaiting first sync'}
        </p>
      </div>
    </header>
  );
}

/**
 * The executive summary as KEY MESSAGES — the four things a board member must
 * leave with. Numbered, each with a supporting figure, each readable alone.
 * This replaces the paragraph nobody reads.
 */
export function KeyMessages({ messages }: { messages: KeyMessage[] }) {
  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {messages.map((m) => (
        <div key={m.n} className="print-avoid-break flex gap-3.5 border-t border-ink pt-3.5">
          <span className="tnum shrink-0 text-[22px] font-semibold leading-none tracking-tight text-accent">
            {String(m.n).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{m.kicker}</p>
            <p className="mt-1 text-[13.5px] font-semibold leading-[1.35] text-ink">{m.headline}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{m.detail}</p>
            {m.stat ? (
              <p className="mt-2 flex items-baseline gap-1.5">
                <span className="tnum text-[19px] font-semibold leading-none tracking-tight text-ink">{m.stat}</span>
                <span className="text-[10.5px] text-ink-faint">{m.statLabel}</span>
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
