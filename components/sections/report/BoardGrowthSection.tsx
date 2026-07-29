import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { CHANNEL_GROUPS } from '@/config/growth-channels';

/**
 * Growth Platform digest for the Board Report — the ⭐ channel P&L compressed
 * to board altitude: one row per channel with activity, the funnel headline,
 * and the three-lens enquiry reconciliation. Same read layer as the live tab,
 * so the board pack can never disagree with the dashboard. Print-first markup
 * (plain table, no interactivity).
 */

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(1)}k` : `AED ${Math.round(n)}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

export async function BoardGrowthSection({ from, to, isAll }: { from: string; to: string; isAll: boolean }) {
  const report = await getChannelPerformance(isAll ? {} : { from, to });
  const t = report.totals;
  if (report.source === 'empty') return null;

  const ps = report.channels.find((c) => c.key === 'paid-search');
  const modelled = ps?.estEnquiries ?? 0;
  const rows = report.channels.filter((c) => c.booked + c.enquiries + c.revenue > 0 || c.spend != null);
  const groupLabel = new Map(CHANNEL_GROUPS.map((g) => [g.key, g.label]));

  const th = 'py-1.5 px-2 text-right text-[10px] font-medium uppercase tracking-wide text-ink-faint';
  const td = 'py-1.5 px-2 text-right text-[11.5px] tabular-nums text-ink';

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Enquiries (net, deduped)</p>
          <p className="text-[20px] font-semibold tabular-nums text-ink">{int(t.enquiries)}</p>
          {modelled > 0 ? <p className="text-[10.5px] text-watch">+≈{int(modelled)} Markov-modelled phone enquiries</p> : null}
        </div>
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Booked (Practo)</p>
          <p className="text-[20px] font-semibold tabular-nums text-ink">{int(t.booked)}</p>
        </div>
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Treated (billed)</p>
          <p className="text-[20px] font-semibold tabular-nums text-ink">{int(t.treated)}</p>
        </div>
        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-ink-faint">Attributed revenue</p>
          <p className="text-[20px] font-semibold tabular-nums text-ink">{t.revenue > 0 ? aedShort(t.revenue) : '—'}</p>
          {report.unattributedRevenue > 0 ? (
            <p className="text-[10.5px] text-ink-faint">+{aedShort(report.unattributedRevenue)} unattributed (no channel trace)</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr>
              <th className="py-1.5 px-2 text-left text-[10px] font-medium uppercase tracking-wide text-ink-faint">Channel</th>
              <th className={th}>Enquiries</th>
              <th className={th}>Booked</th>
              <th className={th}>Showed</th>
              <th className={th}>Treated</th>
              <th className={th}>Revenue</th>
              <th className={th}>Spend · economics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className="border-t border-line/60">
                <td className="py-1.5 px-2 text-[11.5px] text-ink">
                  <span className="font-medium">{c.label}</span>
                  <span className="ml-1.5 text-[10px] text-ink-faint">{groupLabel.get(c.group)}</span>
                  {c.key === 'paid-search' && (c.estExtraBookings ?? 0) > 0 ? (
                    <span className="ml-1.5 text-[10px] text-watch">+ ≈ Markov phone path</span>
                  ) : null}
                </td>
                <td className={td}>{int(c.enquiries)}{c.estEnquiries ? <span className="text-watch"> +≈{int(c.estEnquiries)}</span> : null}</td>
                <td className={td}>{int(c.booked)}{c.estExtraBookings ? <span className="text-watch"> +≈{int(c.estExtraBookings)}</span> : null}</td>
                <td className={td}>{int(c.showed)}{c.estShowed ? <span className="text-watch"> +≈{int(c.estShowed)}</span> : null}</td>
                <td className={td}>{int(c.treated)}{c.estTreated ? <span className="text-watch"> +≈{int(c.estTreated)}</span> : null}</td>
                <td className={td}>{c.revenue > 0 ? aedShort(c.revenue) : '—'}{c.estRevenue ? <span className="text-watch"> +≈{aedShort(c.estRevenue)}</span> : null}</td>
                <td className="py-1.5 px-2 text-right text-[10.5px] leading-snug text-ink-soft">
                  {c.spend != null ? (
                    <>
                      <span className="font-medium tabular-nums text-ink">{aedShort(c.spend)}</span>
                      {c.key === 'paid-search' && c.estCostPerBooked != null
                        ? ` · booking ≈${aed(c.estCostPerBooked)}`
                        : c.costPerBooked != null
                          ? ` · booking ${aed(c.costPerBooked)}`
                          : c.costPerEnquiry != null
                            ? ` · enquiry ${aed(c.costPerEnquiry)}`
                            : ''}
                      {c.key === 'paid-search' && c.estRoas != null ? ` · ROAS ≈${c.estRoas.toFixed(1)}×` : c.roas != null ? ` · ROAS ${c.roas.toFixed(1)}×` : ''}
                      {c.spendThrough ? <span className="block text-[9.5px] text-watch">spend synced to {c.spendThrough}</span> : null}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-ink-faint">
        Same attribution engine as the live Growth Platform (first-match waterfall: hard traces beat inference beats the
        Direct/Walk-in default; confidence in this window — {int(report.confidence.tagged)} hard-traced,{' '}
        {int(report.confidence.inferred)} inferred, {int(report.confidence.defaulted)} defaulted). Net figures are
        measured and deduped by phone; ≈ figures are the Markov-chain phone-path model (benchmark transition rates,
        reconciled only against untraced Dental Nation Al Wasl patients). The raw lead-tracker count
        ({int(report.trackerLeadRows)} rows) differs from net enquiries by design — it is one source before
        cross-source dedup.
      </p>
    </>
  );
}
