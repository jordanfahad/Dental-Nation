import Link from 'next/link';
import { TrendChart } from '@/components/charts/Charts';
import { getLayerVisuals, type LayerKpi } from '@/lib/room/layerKpis';
import { C } from '@/components/board/design';
import {
  PLATFORM_LAYERS,
  STATUS_LABEL,
  type Capability,
  type CapabilityStatus,
  type EvidenceLink,
  type PlatformLayer,
} from '@/config/platform-layers';

/**
 * The six-layer platform navigation and the repeatable capability page —
 * Mr Akbar's "Platform Link-Page Structure" blueprint, built to its rules:
 *
 *   01 keep the 6-layer home            05 date everything
 *   02 one page component               06 allow cross-links, one primary home
 *   03 show status visibly (4 chips)    07 same backbone, two depth levels
 *   04 make sources clickable           08 works on mobile + desktop
 *
 * Every capability renders the SAME seven blocks in the SAME order:
 * Overview → What has been built → Coverage → Proof & KPIs → P&L pathway →
 * Evidence links → Accountability. A block with no approved content yet
 * renders as a VISIBLE gap naming the owner — the blueprint's instruction is
 * to show the gap, never hide it.
 */

const STATUS_STYLE: Record<CapabilityStatus, { bg: string; fg: string }> = {
  built: { bg: C.goodWash, fg: C.good },
  demonstrated: { bg: C.navyWash, fg: C.navyMid },
  'in-implementation': { bg: C.amberWash, fg: C.amber },
  validate: { bg: C.panel, fg: C.inkFaint },
};

function StatusChip({ status }: { status: CapabilityStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="shrink-0 rounded px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.fg }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const CTA_LABEL: Record<EvidenceLink['kind'], string> = {
  live: 'Open live system',
  kpi: 'View KPI',
  doc: 'Open evidence',
};

function EvidenceButtons({ base, links }: { base: string; links: EvidenceLink[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => {
        const href = l.href.startsWith('http') ? l.href : `${base}${l.href}`;
        const external = l.href.startsWith('http');
        return (
          <a
            key={`${l.kind}-${l.label}`}
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
            className="rounded-md border px-2.5 py-1.5 text-[11px] font-semibold no-underline transition hover:shadow-sm"
            style={{ borderColor: C.navyPale, background: C.navyWash, color: C.navyMid }}
          >
            {CTA_LABEL[l.kind]} · {l.label} →
          </a>
        );
      })}
    </div>
  );
}

/** A seven-block body row: label + content, or the visible pending-gap line. */
function Block({ n, label, children, pending }: { n: string; label: string; children?: React.ReactNode; pending?: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr] sm:gap-4">
      <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.inkFaint }}>
        <span className="mr-1.5 tabular-nums" style={{ color: C.navySoft }}>{n}</span>
        {label}
      </p>
      <div className="text-[12px] leading-snug" style={{ color: C.inkSoft }}>
        {children ?? (
          <p className="rounded border border-dashed px-2.5 py-1.5 text-[11px]" style={{ borderColor: C.rule, color: C.amber, background: C.amberWash }}>
            Pending from owner — {pending}
          </p>
        )}
      </div>
    </div>
  );
}

/** One capability — the blueprint's single repeatable page component. */
export function CapabilityCard({ base, cap }: { base: string; cap: Capability }) {
  const anchor = `c-${cap.id.replace('.', '-')}`;
  return (
    <section id={anchor} className="rounded-lg border bg-white p-5" style={{ borderColor: C.rule }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[15px] font-semibold" style={{ color: C.ink }}>
          <span className="mr-2 tabular-nums" style={{ color: C.navySoft }}>{cap.id}</span>
          {cap.title}
        </h3>
        <StatusChip status={cap.status} />
      </div>

      <div className="mt-4 space-y-3.5">
        <Block n="01" label="Overview">
          <p>{cap.overview}</p>
        </Block>
        <Block n="02" label="What has been built" pending={cap.owner}>
          {cap.built ? <p>{cap.built}</p> : undefined}
        </Block>
        <Block n="03" label="Current coverage" pending={cap.owner}>
          {cap.coverage ? <p>{cap.coverage}</p> : undefined}
        </Block>
        <Block n="04" label="Proof & KPIs" pending={cap.owner}>
          {cap.evidence.length > 0 ? (
            <p>
              Verified figures live in the linked reports below — the room links to the live number rather than
              restating a copy that could drift.
            </p>
          ) : undefined}
        </Block>
        <Block n="05" label="P&L pathway" pending={`${cap.owner} · Mr Jawad Shafiq (finance)`}>
          {cap.pnl ? <p>{cap.pnl}</p> : undefined}
        </Block>
        <Block n="06" label="Evidence links" pending={cap.owner}>
          {cap.evidence.length > 0 ? <EvidenceButtons base={base} links={cap.evidence} /> : undefined}
        </Block>
        <Block n="07" label="Accountability">
          <p>
            <span className="font-semibold" style={{ color: C.ink }}>{cap.owner}</span>
            <span className="mx-1.5" style={{ color: C.inkGhost }}>·</span>
            refresh: {cap.refresh}
            <span className="mx-1.5" style={{ color: C.inkGhost }}>·</span>
            last updated {cap.updated}
          </p>
        </Block>
      </div>
    </section>
  );
}

/** Roll-up of a layer's capability statuses, for the home cards. */
function statusSummary(layer: PlatformLayer): string {
  const counts = new Map<CapabilityStatus, number>();
  for (const c of layer.capabilities) counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
  return (['built', 'demonstrated', 'in-implementation', 'validate'] as CapabilityStatus[])
    .filter((s) => counts.has(s))
    .map((s) => `${counts.get(s)} ${STATUS_LABEL[s].toLowerCase()}`)
    .join(' · ');
}

/**
 * The six layer cards — THE primary navigation of the room (Ms Shadi's
 * direction: the platform is the overarching structure; every report lives
 * under a layer). Shared by the room landing and the /platform page so the
 * two can never drift.
 */
export function LayerCardsGrid({ base }: { base: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORM_LAYERS.map((layer) => (
        <Link
          key={layer.slug}
          href={`${base}/platform/${layer.slug}`}
          className="group flex flex-col rounded-lg border bg-white p-4 no-underline transition hover:shadow-md"
          style={{ borderColor: C.rule }}
        >
          <p className="text-[11px] font-bold tabular-nums" style={{ color: C.navySoft }}>{layer.n}</p>
          <p className="mt-1 text-[14px] font-semibold leading-tight" style={{ color: C.ink }}>{layer.title}</p>
          <p className="mt-1 text-[11px]" style={{ color: C.inkFaint }}>{layer.tagline}</p>
          <p className="mt-2 text-[11.5px] font-medium" style={{ color: C.navyMid }}>{layer.promise}</p>
          {layer.reports.length > 0 ? (
            <div className="mt-2.5 flex flex-1 flex-wrap content-start gap-1">
              {layer.reports.map((rep) => (
                <span
                  key={rep.label}
                  className="rounded px-1.5 py-[2px] text-[9.5px] font-medium"
                  style={{ background: C.navyWash, color: C.navyMid }}
                >
                  {rep.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <p className="mt-3 text-[10.5px]" style={{ color: C.inkFaint }}>{statusSummary(layer)}</p>
          <p className="mt-2 text-[11.5px] font-semibold" style={{ color: C.navyMid }}>Open layer →</p>
        </Link>
      ))}
    </div>
  );
}

/** Platform Home — the six layer cards (blueprint page 3). */
export function PlatformHome({ base }: { base: string }) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-[20px] font-semibold" style={{ color: C.ink }}>The Operating Platform — six layers</h1>
        <p className="mt-1 max-w-[840px] text-[12px] leading-snug" style={{ color: C.inkSoft }}>
          The platform in six layers, each opening to its capability pages and the live reports that belong to it.
          Every capability answers the same seven questions in the same order, shows its owner, status and refresh
          cadence, and resolves its claims to a live system, a KPI or an evidence document — or shows the gap openly
          until the owner provides it.
        </p>
      </header>

      <LayerCardsGrid base={base} />

      <p className="rounded-lg border px-4 py-3 text-[11px] leading-snug" style={{ borderColor: C.rule, background: C.panel, color: C.inkSoft }}>
        <span className="font-semibold" style={{ color: C.ink }}>One data backbone, two views.</span> This investor view
        and the management / CEO dashboard read the same live source data — different depth and permissions, never a
        different version of the truth. Detailed operational drill-downs, targets and worklists live in the
        management view.
      </p>
    </div>
  );
}

/** The four status chips as a proportional readiness bar — the schematic
 *  read of how built-out a layer is, straight from its capability statuses. */
function ReadinessBar({ layer }: { layer: PlatformLayer }) {
  const order: CapabilityStatus[] = ['built', 'demonstrated', 'in-implementation', 'validate'];
  const total = layer.capabilities.length;
  if (total === 0) return null;
  const counts = order
    .map((st) => ({ st, n: layer.capabilities.filter((c) => c.status === st).length }))
    .filter((x) => x.n > 0);
  const SEG: Record<CapabilityStatus, string> = {
    built: C.good,
    demonstrated: C.navyMid,
    'in-implementation': C.amberSoft,
    validate: C.rule,
  };
  return (
    <div>
      <div className="flex h-[10px] w-full overflow-hidden rounded" style={{ background: C.ruleSoft }}>
        {counts.map(({ st, n }) => (
          <div key={st} style={{ width: `${(n / total) * 100}%`, background: SEG[st] }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {counts.map(({ st, n }) => (
          <span key={st} className="flex items-center gap-1 text-[10.5px]" style={{ color: C.inkSoft }}>
            <span className="h-[8px] w-[8px] rounded-sm" style={{ background: SEG[st] }} />
            {n} {STATUS_LABEL[st].toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A layer page — numbers first (Mr Akbar's feedback), then the capability
 *  pages: header → live KPI band → trend where the layer has one → readiness
 *  schematic → live reports → capabilities. */
export async function LayerPage({ base, layer }: { base: string; layer: PlatformLayer }) {
  const visuals = await getLayerVisuals(layer.slug).catch(() => ({ kpis: [] as LayerKpi[], trend: undefined }));
  const trend = 'trend' in visuals ? visuals.trend : undefined;
  return (
    <div className="space-y-4">
      <header className="rounded-lg px-5 py-5 text-white sm:px-6" style={{ background: C.navyDeep }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: C.navyPale }}>
          Platform layer {layer.n} · {layer.promise}
        </p>
        <h1 className="mt-1 text-[20px] font-semibold leading-tight sm:text-[24px]">{layer.title}</h1>
        <p className="mt-1.5 text-[12px]" style={{ color: C.navyPale }}>{layer.tagline}</p>
        <p className="mt-3 text-[11px]" style={{ color: C.navyPale }}>Report owner: {layer.owner}</p>
      </header>

      {visuals.kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visuals.kpis.map((k) => (
            <div key={k.label} className="rounded-lg border bg-white p-3.5" style={{ borderColor: C.rule }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.inkFaint }}>{k.label}</p>
              <p className="mt-1 text-[22px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: C.ink }}>
                {k.value}
              </p>
              {k.hint ? <p className="mt-1 text-[10px]" style={{ color: C.inkFaint }}>{k.hint}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {trend && trend.length > 0 ? (
        <div className="rounded-lg border bg-white p-4" style={{ borderColor: C.rule }}>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.inkFaint }}>
            Organic search demand — clicks &amp; impressions per day (last 28 days, Google)
          </p>
          <TrendChart
            data={trend}
            series={[
              { key: 'impressions', label: 'Impressions', color: C.navyPale, kind: 'area', axis: 'right', valueFormat: 'int' },
              { key: 'clicks', label: 'Clicks', color: C.navy, kind: 'line', axis: 'left', valueFormat: 'int' },
            ]}
            leftFormat="int"
          />
        </div>
      ) : null}

      <div className="rounded-lg border bg-white p-4" style={{ borderColor: C.rule }}>
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.inkFaint }}>
          Capability readiness — {layer.capabilities.length} capabilities in this layer
        </p>
        <ReadinessBar layer={layer} />
      </div>

      {layer.reports.length > 0 ? (
        <section className="rounded-lg border p-4" style={{ borderColor: C.navyPale, background: C.navyWash }}>
          <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: C.navyMid }}>
            Live reports in this layer
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {layer.reports.map((rep) => (
              <Link
                key={rep.label}
                href={`${base}${rep.href}`}
                className="rounded-md border bg-white px-2.5 py-1.5 text-[11.5px] font-semibold no-underline transition hover:shadow-sm"
                style={{ borderColor: C.navyPale, color: C.navyMid }}
              >
                {rep.label} →
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <nav className="flex flex-wrap gap-1.5">
        {layer.capabilities.map((c) => (
          <a
            key={c.id}
            href={`#c-${c.id.replace('.', '-')}`}
            className="rounded-md border px-2.5 py-1 text-[11px] font-medium no-underline"
            style={{ borderColor: C.rule, background: '#fff', color: C.navyMid }}
          >
            {c.id} {c.title}
          </a>
        ))}
      </nav>

      {layer.capabilities.map((cap) => (
        <CapabilityCard key={cap.id} base={base} cap={cap} />
      ))}
    </div>
  );
}
