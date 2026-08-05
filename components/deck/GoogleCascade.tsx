import { C, fmt } from '@/components/board/design';
import type { GoogleDetail } from '@/lib/deck/commandDeck';

/**
 * Google Ads, opened up in waterfall style: spend cascading by campaign TYPE,
 * then by individual campaign, then what the clicks actually bought.
 *
 * Bar width is share of spend, so a reader can see instantly where the money
 * went without reading a single number — and every number is printed anyway.
 */

const aed = (n: number | null): string => (n == null ? '—' : `AED ${Math.round(n).toLocaleString('en-US')}`);
const int = (n: number | null): string => (n == null ? '—' : Math.round(n).toLocaleString('en-US'));

function Row({
  label,
  sublabel,
  spend,
  share,
  clicks,
  impressions,
  conversions,
  accent,
}: {
  label: string;
  sublabel?: string | null;
  spend: number | null;
  share: number | null;
  clicks: number | null;
  impressions: number | null;
  conversions: number | null;
  accent?: boolean;
}) {
  const pct = share != null ? Math.max(share * 100, 0.6) : 0;
  const cpc = spend != null && clicks ? spend / clicks : null;
  return (
    <div className="border-t py-2" style={{ borderColor: C.ruleSoft }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="min-w-0 flex-1 text-[11.5px] font-medium" style={{ color: C.ink }}>
          {label}
          {sublabel ? (
            <span className="ml-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-semibold" style={{ background: C.navyWash, color: C.navyMid }}>
              {sublabel}
            </span>
          ) : null}
        </p>
        <p className="text-[12px] font-semibold tabular-nums" style={{ color: accent ? C.amber : C.ink }}>
          {aed(spend)}
          {share != null ? (
            <span className="ml-1 text-[10px] font-normal" style={{ color: C.inkFaint }}>
              {Math.round(share * 100)}%
            </span>
          ) : null}
        </p>
      </div>
      <div className="mt-1 h-[6px] w-full overflow-hidden rounded-sm" style={{ background: C.ruleSoft }}>
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: accent ? C.amber : C.navy }} />
      </div>
      <p className="mt-1 text-[10px] tabular-nums" style={{ color: C.inkFaint }}>
        {int(impressions)} impressions · {int(clicks)} clicks · {cpc != null ? `${aed(cpc)} per click` : '—'} ·{' '}
        {int(conversions)} conversions reported
      </p>
    </div>
  );
}

export function GoogleCascade({ g }: { g: GoogleDetail }) {
  if (g.byType.length === 0) {
    return (
      <p className="text-[11.5px]" style={{ color: C.inkFaint }}>
        No Google Ads activity recorded in this window.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <p className="text-[17px] font-semibold tabular-nums leading-none">{aed(g.totalSpend)}</p>
          <p className="mt-1 text-[9.5px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
            Total spend
          </p>
        </div>
        <div>
          <p className="text-[17px] font-semibold tabular-nums leading-none">{int(g.totalConversions)}</p>
          <p className="mt-1 text-[9.5px] uppercase tracking-wide" style={{ color: C.inkFaint }}>
            Conversions reported by Google
          </p>
        </div>
      </div>

      <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
        By campaign type
      </p>
      {g.byType.map((r) => (
        <Row key={r.label} {...r} accent={r.label === 'Performance Max'} />
      ))}

      <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
        By campaign · top {g.byCampaign.length} by spend
      </p>
      {g.byCampaign.map((r) => (
        <Row key={r.label} {...r} />
      ))}

      {g.clickTypes.length > 0 ? (
        <>
          <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: C.inkFaint }}>
            What the clicks actually were
          </p>
          {g.clickTypes.map((c) => (
            <div key={c.label} className="border-t py-1.5" style={{ borderColor: C.ruleSoft }}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11.5px]" style={{ color: C.ink }}>
                  {c.label}
                </p>
                <p className="text-[11.5px] font-semibold tabular-nums" style={{ color: C.ink }}>
                  {fmt.int(c.clicks)}
                  <span className="ml-1 text-[10px] font-normal" style={{ color: C.inkFaint }}>
                    {Math.round(c.share * 100)}%
                  </span>
                </p>
              </div>
              <div className="mt-1 h-[5px] w-full overflow-hidden rounded-sm" style={{ background: C.ruleSoft }}>
                <div className="h-full rounded-sm" style={{ width: `${Math.max(c.share * 100, 0.6)}%`, background: C.navySoft }} />
              </div>
            </div>
          ))}
        </>
      ) : null}

      <p
        className="mt-3 rounded border-l-2 px-3 py-2 text-[10.5px] leading-snug"
        style={{ borderColor: C.amberSoft, background: C.amberWash, color: C.inkSoft }}
      >
        {g.typeNote}
      </p>
    </div>
  );
}
