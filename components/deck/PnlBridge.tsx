import { C } from '@/components/board/design';
import type { PnlView } from '@/lib/deck/commandDeck';

/**
 * The growth → P&L bridge — how growth activity lands on the financial line.
 *
 * Three exhibits, coarsest first:
 *   1. the headline economics (revenue vs growth investment, per-patient
 *      economics, the cost ratio);
 *   2. month by month — revenue bar with the investment bar under it, and the
 *      net line as a figure, so lumpy quarterly invoices read as lumps rather
 *      than trends;
 *   3. channel economics — spend against contribution with return multiples,
 *      carrying the traced/modelled split so a multiple built partly on an
 *      allocation can never pass as fully measured.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number): string => {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}AED ${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}AED ${Math.round(a / 1_000)}k`;
  return `${sign}AED ${Math.round(a)}`;
};
const monthLabel = (m: string): string => {
  const d = new Date(`${m}-01T00:00:00Z`);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

export function PnlBridge({ pnl }: { pnl: PnlView }) {
  const t = pnl.totals;
  const maxRevenue = Math.max(...pnl.months.map((m) => m.revenue), 1);

  return (
    <div>
      {/* ── 1 · headline economics ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          value={aedShort(t.revenue)}
          label="Billed revenue, full history"
          sub="Practice-system bills, all routes"
        />
        <Tile
          value={aedShort(t.investment)}
          label="Total growth investment"
          sub={`${aedShort(t.mediaSpend)} media + ${aedShort(t.buildCost)} build, platform & vendors (invoices entered to date)`}
        />
        <Tile
          value={t.netAfterGrowth >= 0 ? aedShort(t.netAfterGrowth) : aedShort(t.netAfterGrowth)}
          label="Net of growth investment"
          sub={
            t.returnMultiple != null
              ? `${t.returnMultiple.toFixed(1)}× revenue per dirham of growth spend`
              : 'return multiple pending cost data'
          }
          good={t.netAfterGrowth > 0}
        />
        <Tile
          value={t.costRatio != null ? `${(t.costRatio * 100).toFixed(1)}%` : '—'}
          label="Growth cost as % of revenue"
          sub={
            t.revenuePerPatient != null && t.investmentPerPatient != null
              ? `${aed(t.investmentPerPatient)} growth cost vs ${aed(t.revenuePerPatient)} revenue per attended patient`
              : 'per-patient economics pending'
          }
        />
      </div>

      {/* ── 2 · month by month ───────────────────────────────────────────── */}
      <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
        Month by month — revenue against growth investment
      </p>
      <div className="rounded border px-4 py-3" style={{ borderColor: C.rule }}>
        <div className="flex items-center gap-3 border-b pb-1 text-[9.5px] uppercase tracking-wide" style={{ borderColor: C.ruleSoft, color: C.inkFaint }}>
          <span className="w-[52px]">Month</span>
          <span className="flex-1">Revenue (navy) · growth investment (amber)</span>
          <span className="hidden w-[90px] text-right sm:block">Revenue</span>
          <span className="hidden w-[86px] text-right sm:block">Investment</span>
          <span className="w-[92px] text-right">Net</span>
          <span className="hidden w-[52px] text-right md:block">Cost %</span>
        </div>
        {pnl.months.map((m) => (
          <div key={m.month} className="flex items-center gap-3 border-b py-[6px] last:border-b-0" style={{ borderColor: C.ruleSoft }}>
            <span className="w-[52px] text-[11px] font-medium" style={{ color: C.ink }}>
              {monthLabel(m.month)}
            </span>
            <span className="relative h-[20px] flex-1">
              <span
                className="absolute left-0 top-0 h-[11px] rounded-r-sm"
                style={{ width: `${Math.max((m.revenue / maxRevenue) * 100, 0.5)}%`, background: C.navy }}
              />
              <span
                className="absolute bottom-0 left-0 h-[7px] rounded-r-sm"
                style={{ width: `${Math.max((m.investment / maxRevenue) * 100, m.investment > 0 ? 0.5 : 0)}%`, background: C.amberSoft }}
              />
            </span>
            <span className="hidden w-[90px] text-right text-[11px] tabular-nums sm:block" style={{ color: C.ink }}>
              {aedShort(m.revenue)}
            </span>
            <span className="hidden w-[86px] text-right text-[11px] tabular-nums sm:block" style={{ color: C.inkSoft }}>
              {aedShort(m.investment)}
            </span>
            <span
              className="w-[92px] text-right text-[11.5px] font-semibold tabular-nums"
              style={{ color: m.netAfterGrowth >= 0 ? C.good : C.stop }}
            >
              {aedShort(m.netAfterGrowth)}
            </span>
            <span className="hidden w-[52px] text-right text-[10.5px] tabular-nums md:block" style={{ color: C.inkFaint }}>
              {m.costRatio != null ? `${Math.round(m.costRatio * 100)}%` : '—'}
            </span>
          </div>
        ))}
      </div>

      {/* ── 3 · channel economics ────────────────────────────────────────── */}
      <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
        Channel economics — spend against contribution, in the selected window
      </p>
      <div className="scroll-x overflow-x-auto rounded border" style={{ borderColor: C.rule }}>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr style={{ background: C.navyWash }}>
              <th className="px-3 py-2 text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Channel</th>
              <th className="px-3 py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Media spend</th>
              <th className="px-3 py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Traced revenue</th>
              <th className="px-3 py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Modelled share</th>
              <th className="px-3 py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Contribution</th>
              <th className="px-3 py-2 text-right text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: C.navyMid }}>Return on spend</th>
            </tr>
          </thead>
          <tbody>
            {pnl.channels.map((c, i) => (
              <tr key={c.key} className="border-t align-middle" style={{ borderColor: C.ruleSoft, background: i % 2 ? C.paper : undefined }}>
                <td className="px-3 py-2 text-[11.5px] font-medium" style={{ color: C.ink }}>{c.label}</td>
                <td className="px-3 py-2 text-right text-[11.5px] tabular-nums" style={{ color: c.spend != null ? C.ink : C.inkGhost }}>
                  {c.spend != null ? aedShort(c.spend) : 'no media'}
                </td>
                <td className="px-3 py-2 text-right text-[11.5px] tabular-nums" style={{ color: c.traced ? C.ink : C.inkGhost }}>
                  {c.traced ? aedShort(c.traced) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-[11.5px] tabular-nums" style={{ color: c.allocated > 0 ? C.inkSoft : C.inkGhost }}>
                  {c.allocated > 0 ? aedShort(c.allocated) : '—'}
                </td>
                <td className="px-3 py-2 text-right text-[11.5px] font-semibold tabular-nums" style={{ color: C.ink }}>
                  {aedShort(c.contribution)}
                </td>
                <td className="px-3 py-2 text-right text-[11.5px] font-bold tabular-nums" style={{ color: c.returnMultiple == null ? C.inkGhost : c.returnMultiple >= 1 ? C.good : C.stop }}>
                  {c.returnMultiple != null ? `${c.returnMultiple.toFixed(1)}×` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 max-w-[920px] rounded border-l-2 px-3 py-2 text-[10.5px] leading-snug" style={{ borderColor: C.amberSoft, background: C.amberWash, color: C.inkSoft }}>
        {pnl.note}
      </p>
    </div>
  );
}

function Tile({ value, label, sub, good }: { value: string; label: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-lg border bg-white p-3.5" style={{ borderColor: C.rule }}>
      <p className="text-[20px] font-semibold tabular-nums leading-none" style={{ color: good ? C.good : C.ink }}>
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: C.inkFaint }}>
        {label}
      </p>
      <p className="mt-1 text-[10px] leading-snug" style={{ color: C.inkSoft }}>
        {sub}
      </p>
    </div>
  );
}
