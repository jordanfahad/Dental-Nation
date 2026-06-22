import { getGa4AttributionReport } from '@/lib/analytics/attribution';
import type { ChannelStage } from '@/lib/sync/adapters/ga4-adapter';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { TOKENS } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

const ROLE_CLASS: Record<ChannelStage, string> = {
  Discovery: 'bg-accent/10 text-accent',
  Consideration: 'bg-watch/10 text-watch',
  'Lower funnel': 'bg-good/10 text-good',
  '—': 'bg-na/10 text-ink-faint',
};

const STAGE_COLOR = { discovery: TOKENS.accent, consideration: TOKENS.watch, conversion: TOKENS.good };

function StageCell({ value, total, color }: { value: number; total: number; color: string }) {
  const share = total > 0 ? value / total : 0;
  return (
    <td className="px-2 py-2 align-middle">
      <div className="text-right text-[12px] font-medium tabular-nums text-ink">{int(value)}</div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded bg-line">
        <div className="h-1 rounded" style={{ width: `${Math.round(share * 100)}%`, background: color }} />
      </div>
    </td>
  );
}

function Leader({ label, channel, hint, color }: { label: string; channel: string | null; hint: string; color: string }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</span>
      </div>
      <div className="mt-1.5 text-[18px] font-semibold text-ink">{channel ?? '—'}</div>
      <div className="text-[11px] leading-snug text-ink-faint">{hint}</div>
    </div>
  );
}

/**
 * Multi-touch attribution — channel funnel roles (discovery / consideration /
 * lower funnel) from GA4. Streamed into the GA tab via Suspense.
 */
export async function Ga4Attribution() {
  const { available, data, note } = await getGa4AttributionReport();

  if (!available || !data) {
    return (
      <Card>
        <SectionHeader tag="GA4·MTA" eyebrow="Attribution" title="Multi-touch attribution" />
        <div className="px-5 pb-5 pt-4">
          <DataGapInline detail={note ?? 'GA4 attribution data unavailable'} owner={ownerFor('attribution')} />
        </div>
      </Card>
    );
  }

  const { channels, totals, leaders } = data;
  const th = 'px-2 py-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint';

  return (
    <Card>
      <SectionHeader tag="GA4·MTA" eyebrow="Attribution" title="Multi-touch attribution — channel funnel roles" />
      <div className="px-5 pb-5 pt-4">
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Leader label="Discovery" channel={leaders.discovery} hint="first-touch — opens the journey" color={STAGE_COLOR.discovery} />
          <Leader label="Consideration" channel={leaders.consideration} hint="returning engaged — keeps them warm" color={STAGE_COLOR.consideration} />
          <Leader label="Lower funnel" channel={leaders.conversion} hint="last-touch — closes the lead" color={STAGE_COLOR.conversion} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className={th}>Channel</th>
                <th className={`${th} text-right`}>Discovery</th>
                <th className={`${th} text-right`}>Consideration</th>
                <th className={`${th} text-right`}>Lower funnel</th>
                <th className={`${th} text-right`}>Primary role</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel} className="border-b border-line/60 last:border-0">
                  <td className="px-2 py-2 text-[12px] font-medium text-ink">{c.channel}</td>
                  <StageCell value={c.discovery} total={totals.discovery} color={STAGE_COLOR.discovery} />
                  <StageCell value={c.consideration} total={totals.consideration} color={STAGE_COLOR.consideration} />
                  <StageCell value={c.conversion} total={totals.conversion} color={STAGE_COLOR.conversion} />
                  <td className="px-2 py-2 text-right">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${ROLE_CLASS[c.role]}`}>{c.role}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Takeaway>
          A directional read of where each channel sits in the funnel, from GA4:{' '}
          <span className="font-medium text-accent">Discovery</span> = first-touch new users,{' '}
          <span className="font-medium text-watch">Consideration</span> = returning engaged sessions,{' '}
          <span className="font-medium text-good">Lower funnel</span> = last-touch leads. Each channel&apos;s
          badge marks the stage it over-indexes on — so you can fund discovery channels for reach, nurture
          the consideration ones, and protect the closers. It&apos;s not a paid media-mix model (GA4
          doesn&apos;t expose full paths), but it reliably separates openers from closers.
        </Takeaway>
      </div>
    </Card>
  );
}
