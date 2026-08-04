'use client';

import { STAGES, projectsForStage, type ProjectState, type StageId } from '@/config/investor-funnel';
import type { SampleStageValue } from '@/lib/investor/sample';

/**
 * The drill-down behind a funnel stage (spec §4), in the spec's order:
 * what it means → the number and its trend → where it came from → the projects
 * powering it → the data source.
 *
 * The load-bearing rule is the LIVE / PIPELINE / FUTURE distinction. A reader
 * must never mistake a projection for a measurement, so the three states are
 * separated by SHAPE, not colour: solid card, outlined card, dashed card. That
 * survives greyscale printing and colour blindness, which colour alone does
 * not — and this page gets printed for board packs.
 */

const STATE_STYLE: Record<ProjectState, { box: string; chip: string; label: string }> = {
  LIVE: {
    box: 'border border-dn-line bg-white',
    chip: 'border border-dn-green/40 bg-dn-green/10 text-dn-green',
    label: 'Live now',
  },
  PIPELINE: {
    box: 'border-2 border-dn-navy/35 bg-transparent',
    chip: 'border border-dn-navy/40 bg-dn-navy/5 text-dn-navy',
    label: 'In pipeline',
  },
  FUTURE: {
    box: 'border-2 border-dashed border-dn-grey/60 bg-transparent',
    chip: 'border border-dashed border-dn-grey bg-transparent text-dn-ink/60',
    label: 'Future unlock',
  },
};

const fmtVal = (n: number, unit: string): string =>
  unit === 'aed'
    ? n >= 1_000_000
      ? `AED ${(n / 1_000_000).toFixed(2)}M`
      : `AED ${Math.round(n).toLocaleString('en-US')}`
    : Math.round(n).toLocaleString('en-US');

export function StagePanel({ id, data }: { id: StageId; data: SampleStageValue }) {
  const st = STAGES.find((s) => s.id === id)!;
  const projects = projectsForStage(id);
  const maxCh = Math.max(...data.channels.map((c) => c.value), 1);
  const maxSeries = Math.max(...data.series.map((s) => s.value), 1);

  return (
    <div className="border-t-2 border-dn-navy bg-dn-off px-4 py-5 sm:px-6 sm:py-6">
      {/* 1 · What this means */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-dn-gold">
        Stage {String(st.n).padStart(2, '0')} · {st.caption}
      </p>
      <h3 className="display mt-1.5 text-[21px] leading-tight text-dn-navy sm:text-[26px]">{st.label}</h3>
      <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed text-dn-ink/80">{st.meaning}</p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* 2 · The number + trend */}
        <div>
          <div className="flex items-baseline gap-3">
            <span className="tnum text-[34px] font-bold leading-none tracking-tight text-dn-navy">
              {data.pending ? '—' : fmtVal(data.value, st.unit)}
            </span>
            {data.delta != null && !data.pending ? (
              <span
                className={`tnum text-[12.5px] font-semibold ${
                  data.delta >= 0 ? 'text-dn-green' : 'text-dn-red'
                }`}
              >
                {data.delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(data.delta * 100))}% vs. prior period
              </span>
            ) : null}
          </div>
          {data.pending ? (
            <p className="mt-2 inline-block rounded border border-dashed border-dn-amber/50 bg-dn-amber/5 px-2 py-1 text-[11px] font-medium text-dn-amber">
              Connecting data — this stage has no live feed yet
            </p>
          ) : null}

          {/* Month-by-month since Dec 2025 */}
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
            Month by month since Dec 2025
          </p>
          <div className="mt-2 flex h-[64px] items-end gap-[5px]">
            {data.series.map((p) => (
              <div key={p.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-[2px] bg-dn-navy/75"
                  style={{ height: `${Math.max((p.value / maxSeries) * 52, 2)}px` }}
                  title={`${p.month}: ${fmtVal(p.value, st.unit)}`}
                />
                <span className="text-[9px] text-dn-ink/45">{p.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 · Where this comes from */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
            Where this comes from
          </p>
          <ul className="mt-2.5 space-y-2">
            {data.channels.map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span className="w-[124px] shrink-0 truncate text-[11.5px] text-dn-ink/75 sm:w-[168px]">
                  {c.name}
                </span>
                <span className="flex h-[16px] min-w-0 flex-1 items-center rounded-sm bg-dn-navy/8">
                  <span
                    className="h-full rounded-sm bg-dn-soft"
                    style={{ width: `${Math.max((c.value / maxCh) * 100, 3)}%` }}
                  />
                </span>
                <span className="tnum w-[62px] shrink-0 text-right text-[11.5px] font-semibold text-dn-ink">
                  {fmtVal(c.value, st.unit)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4 · Projects powering this stage */}
      <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
        What powers this stage
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const s = STATE_STYLE[p.state];
          return (
            <div key={p.name} className={`rounded-card px-3.5 py-3 ${s.box}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12.5px] font-semibold leading-snug text-dn-ink">
                  {p.name}
                  {p.pending ? <span className="ml-1 text-dn-amber" title="Name to confirm">◇</span> : null}
                </p>
                <span
                  className={`shrink-0 whitespace-nowrap rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${s.chip}`}
                >
                  {s.label}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-dn-ink/70">{p.note}</p>
              {p.projected ? (
                <p className="mt-1.5 border-t border-dashed border-dn-line pt-1.5 text-[10.5px] leading-snug text-dn-ink/60">
                  <span className="font-semibold uppercase tracking-wide text-dn-ink/45">Projected · </span>
                  {p.projected}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-2.5 text-[10px] text-dn-ink/45">
        Solid = live and measured · outlined = in pipeline, projected · dashed = future unlock. Projections are never
        shown in the same style as measured results.
      </p>

      {/* 5 · Data source */}
      <p className="mt-4 border-t border-dn-line pt-2.5 text-[10px] italic text-dn-ink/45">
        Source: {st.source} · updated daily
      </p>
    </div>
  );
}
