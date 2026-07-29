import { getChannelPerformance, type ChannelPerf, type GrowthReport } from '@/lib/growth/channelPerformance';
import { CHANNEL_GROUPS } from '@/config/growth-channels';
import { WATERFALL_RULES } from '@/lib/growth/attribution';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { FunnelViz } from '@/components/charts/FunnelViz';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';

/**
 * Growth Platform — the CEO's channel-performance view: every acquisition
 * channel (paid → organic → referral → collaboration), each mapped down ONE
 * funnel — visibility → enquiry → booked (Practo) → showed up → treated →
 * revenue — with attribution confidence shown, never hidden.
 *
 * Reads like a McKinsey one-pager on purpose: answer first (KPI band), then
 * the group funnel, then the channel P&L table, then HOW attribution works
 * (the ordered waterfall, verbatim from the engine), then honest caveats.
 * Server component; pure CSS visuals so it prints into the board pack.
 */

const aed = (n: number): string => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number): string => {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(1)}k`;
  return `AED ${Math.round(n)}`;
};
const int = (n: number): string => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null): string => (n == null ? '—' : `${Math.round(n * 100)}%`);

const GROUP_ACCENT: Record<string, string> = {
  paid: '#B45309',
  organic: '#1F3A5F',
  referral: '#2E7D32',
  collab: '#7C3AED',
  retention: '#64748B',
};

function EvidenceBar({ tagged, inferred }: { tagged: number; inferred: number }) {
  const total = tagged + inferred;
  if (total === 0) return null;
  const t = (tagged / total) * 100;
  return (
    <span className="mt-1 flex h-1.5 w-full max-w-[72px] overflow-hidden rounded-full bg-na/20" title={`${tagged} hard-traced · ${inferred} inferred`}>
      <span className="h-full bg-good" style={{ width: `${t}%` }} />
      <span className="h-full bg-watch/70" style={{ width: `${100 - t}%` }} />
    </span>
  );
}

/* One channel row of the P&L table. */
function ChannelRow({ p }: { p: ChannelPerf }) {
  const muted = p.untracked || (p.booked === 0 && p.enquiries === 0 && p.revenue === 0);
  return (
    <tr className={`border-t border-line/70 ${muted ? 'opacity-60' : ''}`}>
      <td className="py-2.5 pl-3 pr-2 align-top">
        <span className="block text-[12.5px] font-medium leading-tight text-ink">{p.label}</span>
        <span className="mt-0.5 block max-w-[230px] text-[10.5px] leading-snug text-ink-faint">{p.detail}</span>
        {p.untracked ? (
          <span className="mt-1 inline-block rounded-full border border-dashed border-watch/50 px-2 py-0.5 text-[10px] font-medium text-watch">
            not tracked yet
          </span>
        ) : null}
      </td>
      <Num v={p.impressions == null ? null : int(p.impressions)} />
      <Num v={int(p.enquiries)} dim={p.enquiries === 0} />
      <td className="px-2 py-2.5 text-right align-top">
        <span className={`text-[12.5px] font-semibold tabular-nums ${p.booked === 0 ? 'text-ink-faint' : 'text-ink'}`}>{int(p.booked)}</span>
        <span className="block text-[10px] text-ink-faint">{p.bookedPatients > 0 ? `${int(p.bookedPatients)} patients` : ''}</span>
        <span className="flex justify-end"><EvidenceBar tagged={p.taggedBooked} inferred={p.inferredBooked} /></span>
      </td>
      <Num v={int(p.showed)} dim={p.showed === 0} />
      <Num v={int(p.treated)} dim={p.treated === 0} />
      <td className="px-2 py-2.5 text-right align-top">
        <span className={`text-[12.5px] font-semibold tabular-nums ${p.revenue === 0 ? 'text-ink-faint' : 'text-ink'}`}>
          {p.revenue > 0 ? aedShort(p.revenue) : '—'}
        </span>
      </td>
      <td className="py-2.5 pl-2 pr-3 text-right align-top">
        {p.spend != null ? (
          <>
            <span className="text-[12px] font-medium tabular-nums text-ink">{aedShort(p.spend)}</span>
            <span className="block text-[10px] leading-snug text-ink-faint">
              {p.costPerEnquiry != null ? `CPL ${aed(p.costPerEnquiry)}` : ''}
              {p.costPerPatient != null ? ` · CAC ${aed(p.costPerPatient)}` : ''}
              {p.roas != null ? ` · ROAS ${p.roas.toFixed(1)}×` : ''}
            </span>
            {p.spendThrough ? <span className="block text-[10px] text-watch">spend synced to {p.spendThrough}</span> : null}
          </>
        ) : (
          <span className="text-[11px] text-ink-faint">—</span>
        )}
      </td>
    </tr>
  );
}

function Num({ v, dim = false }: { v: string | null; dim?: boolean }) {
  return (
    <td className="px-2 py-2.5 text-right align-top">
      <span className={`text-[12.5px] tabular-nums ${v == null || dim ? 'text-ink-faint' : 'font-medium text-ink'}`}>{v ?? '—'}</span>
    </td>
  );
}

function ConfidenceCard({ report }: { report: GrowthReport }) {
  const { tagged, inferred, defaulted } = report.confidence;
  const total = tagged + inferred + defaulted;
  const seg = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <Card>
      <SectionHeader
        eyebrow="How to read this"
        title="Attribution — how each patient is routed"
        tag="G2"
      />
      <div className="px-5 pb-5 pt-3">
        {total > 0 ? (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-na/15">
              <span className="h-full bg-good" style={{ width: `${seg(tagged)}%` }} title={`Hard-traced: ${tagged}`} />
              <span className="h-full bg-watch/80" style={{ width: `${seg(inferred)}%` }} title={`Inferred: ${inferred}`} />
              <span className="h-full bg-na/60" style={{ width: `${seg(defaulted)}%` }} title={`Defaulted: ${defaulted}`} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-good" />Hard evidence — {int(tagged)} ({pct(total ? tagged / total : null)})</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-watch/80" />Inferred by logic — {int(inferred)} ({pct(total ? inferred / total : null)})</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-na/60" />Default (Direct / Walk-in) — {int(defaulted)} ({pct(total ? defaulted / total : null)})</span>
            </div>
          </>
        ) : null}
        <ol className="mt-4 space-y-1.5">
          {WATERFALL_RULES.map((r, i) => (
            <li key={r.id} className="flex items-start gap-2.5 text-[12px] leading-snug text-ink-soft">
              <span className="mt-px inline-flex h-[18px] w-7 shrink-0 items-center justify-center rounded bg-accent/5 text-[10px] font-semibold text-accent">
                {i + 1}
              </span>
              <span>
                {r.text}{' '}
                <span className={`text-[10px] font-medium ${r.evidence === 'tagged' ? 'text-good' : 'text-watch'}`}>
                  {r.evidence === 'tagged' ? 'hard evidence' : 'inferred'}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <Takeaway>
          Rules run top to bottom; the first match wins. Hard traces (a campaign tag, a matching phone number)
          always beat inference; only a patient with no trace at all falls to Direct / Walk-in — the default we agreed.
          Tagging bookings better (e.g. writing “smile club” or “influencer” on the booking) moves patients up this ladder automatically.
        </Takeaway>
      </div>
    </Card>
  );
}

export async function GrowthPlatform({ range }: { range?: { from?: string; to?: string } } = {}) {
  const report = await getChannelPerformance(range ?? {});
  const t = report.totals;

  const kpis: KpiItem[] = [
    { label: 'Enquiries', value: int(t.enquiries), hint: 'all channels, deduped by phone' },
    { label: 'Booked (Practo)', value: int(t.booked), hint: 'appointments in window' },
    { label: 'Show-up rate', value: pct(t.showRate), hint: 'arrived ÷ decided appointments' },
    { label: 'Treated (billed)', value: int(t.treated), hint: 'distinct billed patients' },
    { label: 'Attributed revenue', value: t.revenue > 0 ? aedShort(t.revenue) : '—', hint: 'joined patient → channel' },
  ];

  // Group subtotals for the at-a-glance bar (revenue by group).
  const groupRevenue: BarDatum[] = CHANNEL_GROUPS.map((g) => ({
    label: g.label,
    value: Math.round(report.channels.filter((c) => c.group === g.key).reduce((a, c) => a + c.revenue, 0)),
    color: GROUP_ACCENT[g.key] ?? TOKENS.accent,
  })).filter((d) => d.value > 0);

  return (
    <div className="space-y-4">
      <Card>
        <SectionHeader
          tag="G"
          eyebrow="Growth Platform"
          title="Channel performance — enquiry to revenue"
        />
        <div className="px-5 pb-5 pt-3">
          <KpiBand items={kpis} />
          <div className="mt-5 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">The one funnel every channel maps into</p>
              <FunnelViz
                stages={[
                  { label: 'Enquiries', value: t.enquiries },
                  { label: 'Booked (Practo)', value: t.booked },
                  { label: 'Showed up', value: t.showed },
                  { label: 'Treated (billed)', value: t.treated },
                ]}
              />
              <Takeaway>
                Revenue attributed to channels in this window: <span className="font-semibold text-ink">{aed(t.revenue)}</span>
                {report.unattributedRevenue > 0 ? (
                  <> · a further {aedShort(report.unattributedRevenue)} from {report.unattributedPatients} billed patients has no channel trace (counted honestly as unattributed, not sprinkled across channels).</>
                ) : null}
              </Takeaway>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Revenue by channel group</p>
              {groupRevenue.length > 0 ? (
                <HBarChart data={groupRevenue} valueFormat="aed" />
              ) : (
                <p className="rounded-card border border-dashed border-line px-4 py-6 text-center text-[12px] text-ink-soft">
                  No billed revenue joins to a channel in this window.
                </p>
              )}
              {report.ga4 ? (
                <p className="mt-3 rounded-card border border-line bg-panel/40 px-3 py-2 text-[11px] leading-snug text-ink-soft">
                  <span className="font-medium">Visibility context:</span> {int(report.ga4.sessions)} website sessions{' '}
                  {report.ga4.periodStart}–{report.ga4.periodEnd} (GA4, latest sync) — top sources{' '}
                  {report.ga4.channels.slice(0, 3).map((c) => `${c.channel} ${int(c.sessions)}`).join(' · ')}.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeader
          tag="G1"
          eyebrow="Channel P&L"
          title="Every channel, one row — visibility to revenue"
        />
        <div className="overflow-x-auto px-5 pb-4 pt-2">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pl-3 pr-2 text-left font-medium">Channel</th>
                <th className="px-2 py-2 text-right font-medium">Ad views</th>
                <th className="px-2 py-2 text-right font-medium">Enquiries</th>
                <th className="px-2 py-2 text-right font-medium">Booked</th>
                <th className="px-2 py-2 text-right font-medium">Showed</th>
                <th className="px-2 py-2 text-right font-medium">Treated</th>
                <th className="px-2 py-2 text-right font-medium">Revenue</th>
                <th className="py-2 pl-2 pr-3 text-right font-medium">Spend · economics</th>
              </tr>
            </thead>
            {CHANNEL_GROUPS.map((g) => {
              const rows = report.channels.filter((c) => c.group === g.key);
              if (rows.length === 0) return null;
              return (
                <tbody key={g.key}>
                  <tr>
                    <td colSpan={8} className="pb-1 pl-3 pt-4">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: GROUP_ACCENT[g.key] }} />
                        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink">{g.label}</span>
                        <span className="text-[10.5px] text-ink-faint">{g.funnelRole}</span>
                      </span>
                    </td>
                  </tr>
                  {rows.map((p) => <ChannelRow key={p.key} p={p} />)}
                </tbody>
              );
            })}
          </table>
          <p className="mt-2 px-3 text-[10.5px] leading-snug text-ink-faint">
            The small green/amber bar under “Booked” shows how much of that channel’s attribution rests on hard
            evidence (green) vs inference (amber). “Treated” = distinct patients with a finalized bill in the window.
          </p>
        </div>
      </Card>

      <ConfidenceCard report={report} />

      {report.notes.length > 0 ? (
        <Card>
          <SectionHeader eyebrow="Data honesty" title="Coverage notes" tag="G3" />
          <ul className="space-y-1.5 px-5 pb-5 pt-3">
            {report.notes.map((n) => (
              <li key={n} className="flex items-start gap-2 text-[12px] leading-snug text-ink-soft">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-watch" />
                {n}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
