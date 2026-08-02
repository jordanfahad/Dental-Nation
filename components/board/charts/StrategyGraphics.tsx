import { C } from '../design';
import { DEMAND_ENGINE, LANES, type Command } from '@/config/growth-os';
import type { TimelineEntry } from '@/config/growth-execution';

/**
 * Part 2's strategy graphics.
 *
 * A demand-lane table is a list; a positioned matrix is an argument. These
 * turn the deck's tables into the exhibits a partner would actually present:
 * where the money should go, in what order, and what the system does with it.
 */

const COMMAND_COLOR: Record<Command, string> = {
  OWN: C.navyDeep,
  BUILD: C.navySoft,
  PILOT: C.amber,
  RUN: C.inkGhost,
};

// ── 2×2 portfolio matrix ─────────────────────────────────────────────────────

const MW = 760;
const MH = 430;
const MP = { top: 22, right: 26, bottom: 46, left: 62 };
const MPW = MW - MP.left - MP.right;
const MPH = MH - MP.top - MP.bottom;

/**
 * Demand lanes plotted on market size × return, bubble = funding command.
 *
 * The whole 13-lane architecture reduces to one readable question here: which
 * lanes are both large and efficient, and are we funding those first? The
 * top-right quadrant is the answer, and the OWN lanes should be sitting in it.
 */
export function LanePortfolioMatrix() {
  const maxTam = Math.max(...LANES.map((l) => l.tam));
  const maxLtv = Math.max(...LANES.map((l) => l.ltvCac));
  const midTam = maxTam / 2;
  const midLtv = maxLtv / 2;

  const x = (tam: number) => MP.left + (tam / maxTam) * MPW;
  const y = (ltv: number) => MP.top + MPH - (ltv / maxLtv) * MPH;
  const r = (l: (typeof LANES)[number]) => (l.command === 'OWN' ? 15 : l.command === 'BUILD' ? 11.5 : 9);

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <svg viewBox={`0 0 ${MW} ${MH}`} className="h-auto w-full min-w-[580px]" role="img" aria-label="Demand lanes by market size and return">
        {/* quadrant wash — top-right is where OWN belongs */}
        <rect x={x(midTam)} y={MP.top} width={MPW - (x(midTam) - MP.left)} height={y(midLtv) - MP.top} fill={C.navyWash} />

        {/* quadrant dividers */}
        <line x1={x(midTam)} x2={x(midTam)} y1={MP.top} y2={MP.top + MPH} stroke={C.rule} strokeDasharray="3 3" />
        <line x1={MP.left} x2={MP.left + MPW} y1={y(midLtv)} y2={y(midLtv)} stroke={C.rule} strokeDasharray="3 3" />

        {/* axes */}
        <line x1={MP.left} x2={MP.left + MPW} y1={MP.top + MPH} y2={MP.top + MPH} stroke={C.inkGhost} strokeWidth={1.25} />
        <line x1={MP.left} x2={MP.left} y1={MP.top} y2={MP.top + MPH} stroke={C.inkGhost} strokeWidth={1.25} />

        {/* quadrant caption */}
        <text x={MP.left + MPW - 8} y={MP.top + 15} textAnchor="end" fontSize={9.5} fontWeight={600} fill={C.navySoft}>
          LARGE MARKET · HIGH RETURN
        </text>

        {/* bubbles */}
        {LANES.map((l) => (
          <g key={l.lane}>
            <circle cx={x(l.tam)} cy={y(l.ltvCac)} r={r(l)} fill={COMMAND_COLOR[l.command]} fillOpacity={0.92} />
            <text
              x={x(l.tam)}
              y={y(l.ltvCac) + 3.6}
              textAnchor="middle"
              fontSize={10.5}
              fontWeight={700}
              fill={l.command === 'RUN' ? C.ink : '#FFFFFF'}
            >
              {l.lane}
            </text>
          </g>
        ))}

        {/* axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={`tx${t}`} x={MP.left + t * MPW} y={MP.top + MPH + 16} textAnchor="middle" fontSize={9.5} fill={C.inkFaint}>
            {Math.round(maxTam * t)}
          </text>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <text key={`ty${t}`} x={MP.left - 9} y={MP.top + MPH - t * MPH + 3.5} textAnchor="end" fontSize={9.5} fill={C.inkFaint}>
            {Math.round(maxLtv * t)}×
          </text>
        ))}

        {/* axis titles */}
        <text x={MP.left + MPW / 2} y={MH - 8} textAnchor="middle" fontSize={10} fontWeight={600} fill={C.inkSoft}>
          Dubai addressable market (AED millions)
        </text>
        <text
          x={-(MP.top + MPH / 2)}
          y={15}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize={10}
          fontWeight={600}
          fill={C.inkSoft}
        >
          Target LTV : CAC
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {(Object.keys(COMMAND_COLOR) as Command[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <span aria-hidden className="inline-block rounded-full" style={{ width: 10, height: 10, background: COMMAND_COLOR[k] }} />
            <span className="font-semibold text-ink-soft">{k}</span>
            {k === 'OWN' ? 'unrestricted' : k === 'BUILD' ? 'quarterly budget' : k === 'PILOT' ? 'capped AED 15K/mo' : 'no spend'}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Chevron roadmap ──────────────────────────────────────────────────────────

/**
 * The execution timeline as a chevron sequence rather than a list of dates.
 * Filled chevrons are corroborated by the dashboard's own ingested records;
 * outlined ones are awaiting confirmation, and look it.
 */
export function RoadmapChevrons({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="space-y-1.5">
      {entries.map((t, i) => (
        <li key={`${t.period}-${i}`} className="print-avoid-break flex items-stretch gap-0">
          <div
            className={`relative flex w-[96px] shrink-0 items-center justify-center px-2 py-2 text-center sm:w-[124px] ${
              t.evidenced ? 'text-white' : 'text-ink-soft'
            }`}
            style={{
              background: t.evidenced ? C.navy : C.panel,
              clipPath: 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%)',
            }}
          >
            <span className="text-[10.5px] font-semibold leading-tight">{t.period}</span>
          </div>
          <div className="min-w-0 flex-1 border-b border-line py-2 pl-4">
            <p className="text-[12.5px] leading-snug text-ink">{t.milestone}</p>
            {t.evidence ? (
              <p className="mt-0.5 flex gap-1 text-[10px] leading-snug text-good">
                <span aria-hidden>✓</span>
                {t.evidence}
              </p>
            ) : null}
            {t.pending ? (
              <p className="mt-0.5 text-[10px] leading-snug text-watch">◇ Exact month to confirm</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── Demand-engine flywheel ───────────────────────────────────────────────────

const FW = 620;
const FH = 300;

/**
 * The five-layer demand engine as a closed loop — because the point of the
 * model is that layer 5 feeds layer 1. A numbered list cannot say that; a
 * ring can.
 */
export function DemandFlywheel() {
  const layers = DEMAND_ENGINE.layers;
  const cx = 168;
  const cy = FH / 2;
  const rad = 104;
  const n = layers.length;

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <div className="flex min-w-[560px] items-center gap-6">
        <svg viewBox={`0 0 336 ${FH}`} className="h-auto w-[336px] shrink-0" role="img" aria-label="Five-layer demand generation flywheel">
          <circle cx={cx} cy={cy} r={rad} fill="none" stroke={C.rule} strokeWidth={22} />
          {layers.map((l, i) => {
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.045;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 - 0.045;
            const p0 = [cx + rad * Math.cos(a0), cy + rad * Math.sin(a0)];
            const p1 = [cx + rad * Math.cos(a1), cy + rad * Math.sin(a1)];
            const mid = (a0 + a1) / 2;
            return (
              <g key={l.n}>
                <path
                  d={`M ${p0[0]} ${p0[1]} A ${rad} ${rad} 0 0 1 ${p1[0]} ${p1[1]}`}
                  fill="none"
                  stroke={C.navy}
                  strokeOpacity={1 - i * 0.13}
                  strokeWidth={22}
                  strokeLinecap="butt"
                />
                <text
                  x={cx + rad * Math.cos(mid)}
                  y={cy + rad * Math.sin(mid) + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={700}
                  fill="#FFFFFF"
                >
                  {l.n}
                </text>
              </g>
            );
          })}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.ink}>
            Demand
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize={12} fontWeight={600} fill={C.ink}>
            Engine
          </text>
          <text x={cx} y={cy + 26} textAnchor="middle" fontSize={9} fill={C.inkFaint}>
            five layers, one loop
          </text>
        </svg>

        <ol className="min-w-0 flex-1 space-y-2">
          {layers.map((l, i) => (
            <li key={l.n} className="flex gap-2.5">
              <span
                className="mt-[1px] flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                style={{ background: C.navy, opacity: 1 - i * 0.13 }}
              >
                {l.n}
              </span>
              <span className="min-w-0">
                <span className="text-[12.5px] font-semibold text-ink">{l.name}</span>
                <span className="ml-1.5 text-[10.5px] uppercase tracking-wide text-ink-ghost">{l.role}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{l.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
