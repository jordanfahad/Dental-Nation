import type { ReportView } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { DataGapValue } from '@/components/ui/DataGap';
import { biggestLeakage } from '@/lib/metrics/funnel';
import { fmtInt, fmtPct } from '@/lib/format';
import { ownerFor } from '@/config/data-gap-owners';

/** §D — Daily Funnel. Horizontal funnel + today/yesterday/since-launch compare,
 *  biggest-leakage callout, and cost cards (explicit data-gap state if unmapped).
 *  Vanity metrics (likes/views) are deliberately absent. */
export function DailyFunnel({ view }: { view: ReportView }) {
  const { snapshot: s } = view;
  const leak = biggestLeakage(s.funnel);
  const measured = s.funnel.filter((f) => !f.upstream);

  return (
    <Card>
      <SectionHeader tag="D" eyebrow="Funnel" title="Daily funnel — inquiry to proof" />
      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <FunnelChart stages={s.funnel} />
          {leak ? (
            <div className="mt-3 rounded-md border border-watch/30 bg-watch/5 px-3 py-2 text-[12.5px] text-watch">
              <span className="font-semibold">Biggest leakage:</span> {leak.from} → {leak.to} (
              {fmtPct(leak.drop)} drop)
            </div>
          ) : null}
          <Takeaway>
            Top-of-funnel volume (reach / impressions / clicks) has no source in Sheets-v1 — shown as
            data gaps, not zeros. The spine inquiry → proof is fully measured.
          </Takeaway>
        </div>

        <div className="space-y-4">
          <div>
            <p className="eyebrow mb-2">Today vs. yesterday vs. since launch</p>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-faint">
                  <th className="py-1.5 font-medium">Stage</th>
                  <th className="py-1.5 text-right font-medium">Today</th>
                  <th className="py-1.5 text-right font-medium">Yest.</th>
                  <th className="py-1.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {measured.map((f) => (
                  <tr key={f.key} className="border-b border-line/60 last:border-0">
                    <td className="py-1.5 text-ink">{f.label}</td>
                    <td className="tnum py-1.5 text-right font-medium text-ink">{fmtInt(f.today)}</td>
                    <td className="tnum py-1.5 text-right text-ink-faint">{fmtInt(f.yesterday)}</td>
                    <td className="tnum py-1.5 text-right text-ink-faint">{fmtInt(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-line p-3">
              <p className="eyebrow">Cost / inquiry</p>
              <div className="mt-1">
                {s.cost_per_inquiry == null ? (
                  <DataGapValue label="no spend source" owner={ownerFor('cost')} />
                ) : (
                  <span className="tnum text-xl font-semibold text-ink">
                    {s.cost_per_inquiry.toFixed(0)} AED
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="eyebrow">Cost / booking</p>
              <div className="mt-1">
                {s.cost_per_booking == null ? (
                  <DataGapValue label="no spend source" owner={ownerFor('cost')} />
                ) : (
                  <span className="tnum text-xl font-semibold text-ink">
                    {s.cost_per_booking.toFixed(0)} AED
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
