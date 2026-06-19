import { getSiteSpeedReport } from '@/lib/analytics/site-speed';
import type { CwvCategory, FieldMetric, StrategyResult } from '@/lib/sync/adapters/pagespeed-adapter';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { ownerFor } from '@/config/data-gap-owners';

const scoreColor = (s: number) => (s >= 90 ? 'text-good' : s >= 50 ? 'text-watch' : 'text-stop');
const scoreRing = (s: number) => (s >= 90 ? 'border-good' : s >= 50 ? 'border-watch' : 'border-stop');
const CAT_CLASS: Record<CwvCategory, string> = {
  FAST: 'bg-good/10 text-good',
  AVERAGE: 'bg-watch/10 text-watch',
  SLOW: 'bg-stop/10 text-stop',
  NONE: 'bg-na/10 text-ink-faint',
};
const CAT_LABEL: Record<CwvCategory, string> = { FAST: 'Good', AVERAGE: 'Needs work', SLOW: 'Poor', NONE: 'n/a' };

const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
const cls = (v: number) => (v / 100).toFixed(2);

function Vital({ name, m, format }: { name: string; m: FieldMetric | null; format: (v: number) => string }) {
  const cat: CwvCategory = m?.category ?? 'NONE';
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{name}</span>
        <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-medium ${CAT_CLASS[cat]}`}>{CAT_LABEL[cat]}</span>
      </div>
      <div className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{m ? format(m.value) : '—'}</div>
    </div>
  );
}

function StrategyCard({ r }: { r: StrategyResult }) {
  const score = r.performanceScore;
  const hasField = r.field.lcp || r.field.inp || r.field.cls;
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center gap-3">
        {score != null ? (
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] ${scoreRing(score)}`}>
            <span className={`text-[18px] font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-[3px] border-na">
            <span className="text-[12px] text-ink-faint">n/a</span>
          </div>
        )}
        <div>
          <div className="text-[13px] font-semibold capitalize text-ink">{r.strategy}</div>
          <div className="text-[11px] text-ink-faint">Lighthouse performance score</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
          Field data (real users · 28-day)
        </div>
        {hasField ? (
          <div className="grid grid-cols-3 gap-2">
            <Vital name="LCP" m={r.field.lcp} format={ms} />
            <Vital name="INP" m={r.field.inp} format={ms} />
            <Vital name="CLS" m={r.field.cls} format={cls} />
          </div>
        ) : (
          <p className="text-[11.5px] leading-snug text-ink-faint">
            No Chrome UX field data yet — the site needs more real-user traffic before Google reports
            it. Lab metrics below still apply.
          </p>
        )}
      </div>

      {r.lab.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Lab (Lighthouse)</div>
          <ul className="space-y-1">
            {r.lab.map((l) => (
              <li key={l.key} className="flex items-center justify-between gap-3 text-[12px]">
                <span className="text-ink-soft">{l.label}</span>
                <span className="font-medium tabular-nums text-ink">{l.display}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Site Speed (Core Web Vitals) — streamed into the GA tab via Suspense. */
export async function SiteSpeed() {
  const data = await getSiteSpeedReport();
  const host = (() => {
    try {
      return new URL(data.url).host;
    } catch {
      return data.url;
    }
  })();

  return (
    <Card>
      <SectionHeader
        tag="GA2"
        eyebrow="Core Web Vitals"
        title="Site Speed"
        right={<span className="text-[11px] text-ink-faint">{host}</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {!data.mobile && !data.desktop ? (
          <DataGapInline
            detail={data.error ?? 'PageSpeed Insights returned no result'}
            owner={ownerFor('tracking')}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {data.mobile ? <StrategyCard r={data.mobile} /> : null}
              {data.desktop ? <StrategyCard r={data.desktop} /> : null}
            </div>
            <Takeaway>
              Measured live by Google PageSpeed Insights on <span className="font-medium text-ink">{host}</span>.
              <span className="font-medium text-good"> Field data</span> is what real Chrome users
              actually experienced (the ranking signal); lab metrics are a controlled Lighthouse run.
              Targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. Cached 6h.
            </Takeaway>
          </>
        )}
      </div>
    </Card>
  );
}
