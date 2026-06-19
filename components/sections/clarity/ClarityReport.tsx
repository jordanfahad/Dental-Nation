import { getClarityReport } from '@/lib/analytics/clarity';
import type { ClaritySignal } from '@/lib/sync/adapters/clarity-adapter';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ownerFor } from '@/config/data-gap-owners';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null) => (n == null ? null : `${n.toFixed(1)}%`);
const dur = (sec: number | null) => {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

function LinkButton({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  const cls = primary
    ? 'bg-accent text-white hover:bg-accent-600'
    : 'border border-line text-ink hover:bg-panel';
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[12.5px] font-medium transition-colors ${cls}`}
    >
      {label}
      <span aria-hidden className="text-[11px] opacity-70">↗</span>
    </a>
  );
}

function SignalTile({ s }: { s: ClaritySignal }) {
  const has = s.sessionsPct != null || s.count != null;
  return (
    <div className="rounded-lg border border-line px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{s.label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[20px] font-semibold tabular-nums text-ink">{has ? (pct(s.sessionsPct) ?? '—') : '—'}</span>
        <span className="text-[11px] text-ink-faint">of sessions</span>
      </div>
      {s.count != null ? <div className="text-[11px] text-ink-soft">{int(s.count)} total</div> : null}
    </div>
  );
}

function SetupSteps() {
  const step = 'flex gap-2 text-[12.5px] leading-snug text-ink-soft';
  const numCls = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-semibold text-accent';
  return (
    <ol className="space-y-2">
      <li className={step}>
        <span className={numCls}>1</span>
        <span>In Microsoft Clarity, open your project → <span className="font-medium text-ink">Settings → Data export</span> → <span className="font-medium text-ink">Generate new API token</span>. Copy it.</span>
      </li>
      <li className={step}>
        <span className={numCls}>2</span>
        <span>Grab the project id from the dashboard URL: <code className="rounded bg-panel px-1 text-[11px]">clarity.microsoft.com/projects/view/<span className="font-semibold text-ink">&lt;projectId&gt;</span>/dashboard</code>.</span>
      </li>
      <li className={step}>
        <span className={numCls}>3</span>
        <span>In Vercel → Project → Settings → Environment Variables, add <code className="rounded bg-panel px-1 text-[11px]">CLARITY_API_TOKEN</code> and <code className="rounded bg-panel px-1 text-[11px]">CLARITY_PROJECT_ID</code>, then redeploy. Metrics light up here automatically.</span>
      </li>
    </ol>
  );
}

/**
 * Heatmaps & Recordings tab — Microsoft Clarity. Deep-links into the actual
 * heatmaps/recordings (which can't be embedded) plus live behavioural metrics
 * from the Clarity Data Export API.
 */
export async function ClarityReport() {
  const { connected, hasToken, links, insights, note } = await getClarityReport();

  const kpis: KpiItem[] = insights
    ? [
        { label: 'Sessions', value: int(insights.traffic.sessions), hint: `last ${insights.numOfDays} days` },
        { label: 'Distinct users', value: int(insights.traffic.users) },
        { label: 'Bot sessions', value: int(insights.traffic.bots), hint: 'excluded from analysis' },
        { label: 'Pages / session', value: insights.traffic.pagesPerSession != null ? insights.traffic.pagesPerSession.toFixed(1) : null, gapDetail: 'not reported', gapOwner: ownerFor('tracking') },
        { label: 'Avg scroll depth', value: pct(insights.scrollDepth), gapDetail: 'not reported', gapOwner: ownerFor('tracking') },
        { label: 'Avg active time', value: dur(insights.engagementTime.activeSec), gapDetail: 'not reported', gapOwner: ownerFor('tracking') },
      ]
    : [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="HM" eyebrow="Microsoft Clarity" title="Heatmaps & Session Recordings"
          right={links ? <span className="text-[11px] text-ink-faint">live</span> : null}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Microsoft Clarity records real visitor sessions and builds click/scroll heatmaps for the
            website. The recordings and heatmaps live in Clarity (they can&apos;t be embedded here) —
            jump straight to them below, with the behavioural summary pulled in via Clarity&apos;s API.
          </p>
          {links ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href={links.heatmaps} label="Open Heatmaps" primary />
              <LinkButton href={links.recordings} label="Open Recordings" primary />
              <LinkButton href={links.dashboard} label="Clarity Dashboard" />
              <LinkButton href={links.settings} label="Settings" />
            </div>
          ) : (
            <div className="mt-4">
              <DataGapInline detail="Set CLARITY_PROJECT_ID to enable deep links to heatmaps & recordings" owner={ownerFor('tracking')} />
            </div>
          )}
        </div>
      </Card>

      {connected && insights ? (
        <>
          <Card>
            <SectionHeader tag="HM1" eyebrow="Scorecard" title="Behaviour at a glance" />
            <div className="px-5 pb-5 pt-4"><KpiBand items={kpis} /></div>
          </Card>

          <Card>
            <SectionHeader tag="HM2" eyebrow="Frustration signals" title="Where visitors struggle" />
            <div className="px-5 pb-5 pt-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {insights.signals.map((s) => <SignalTile key={s.key} s={s} />)}
              </div>
              <Takeaway>
                These are Clarity&apos;s friction signals over the last {insights.numOfDays} days —
                rage/dead clicks, excessive scrolling, quick-backs and JS errors. High percentages flag
                pages worth opening in the <span className="font-medium text-ink">Recordings</span> and{' '}
                <span className="font-medium text-ink">Heatmaps</span> above to see exactly what&apos;s breaking.
              </Takeaway>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <SectionHeader tag="HM1" eyebrow="Setup" title="Connect Clarity metrics" />
          <div className="px-5 pb-5 pt-4">
            {hasToken ? (
              <div className="mb-3"><DataGapInline detail={note ?? 'Clarity API returned no data'} owner={ownerFor('tracking')} /></div>
            ) : null}
            <p className="mb-3 text-[12.5px] leading-snug text-ink-soft">
              The heatmaps and recordings work from the buttons above as soon as the project id is set.
              To also pull the behavioural summary into this dashboard, connect Clarity&apos;s Data Export API:
            </p>
            <SetupSteps />
            <p className="mt-3 text-[11px] leading-snug text-ink-faint">
              Note: the export API only covers the last 1–3 days and allows 10 calls/day, so this summary
              is cached for 6 hours. It complements — it doesn&apos;t replace — the full recordings in Clarity.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
