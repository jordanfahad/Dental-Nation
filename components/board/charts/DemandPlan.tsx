import { C } from '../design';
import { DEMAND_PLAN } from '@/config/demand-plan';

/**
 * The demand generation plan as a cascade + allocation exhibit.
 *
 * The plan's own logic is a cascade — 2,500 leads becomes 500 patients becomes
 * AED 500K — so the exhibit leads with that chain and then shows how the 2,500
 * is sourced. Reading the channel split as a single stacked bar makes the
 * concentration obvious: 70% of the target rides on digital, which is the
 * part under direct marketing ownership.
 */
export function DemandCascade() {
  const c = DEMAND_PLAN.cascade;
  const steps = [
    { v: c.leads, u: c.leadsUnit, tone: C.navyDeep },
    { v: c.patients, u: c.patientsUnit, tone: C.navy },
    { v: c.revenue, u: c.revenueUnit, tone: C.amber },
  ];
  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {steps.map((s, i) => (
        <div key={s.u} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="print-exact min-w-0 flex-1 rounded-[3px] px-4 py-3.5" style={{ background: s.tone }}>
            <p className="tnum text-[24px] font-semibold leading-none tracking-tight text-white">{s.v}</p>
            <p className="mt-1 text-[10.5px] leading-snug text-white/75">{s.u}</p>
          </div>
          {i < steps.length - 1 ? (
            <span aria-hidden className="shrink-0 text-[15px] text-ink-ghost">→</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Where the 2,500 comes from — one stacked bar, then the digital breakdown. */
export function DemandChannelSplit() {
  const ch = DEMAND_PLAN.channels;
  const tones = [C.navyDeep, C.navySoft, C.navyPale];
  const digital = ch[0];

  return (
    <div>
      <div className="flex h-[38px] w-full overflow-hidden rounded-[3px]">
        {ch.map((c2, i) => (
          <div
            key={c2.name}
            className="print-exact flex items-center justify-center px-2"
            style={{ width: `${c2.share}%`, background: tones[i] }}
          >
            <span className={`truncate text-[11px] font-semibold ${i === 2 ? 'text-ink' : 'text-white'}`}>
              {c2.name} {c2.share}%
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {ch.map((c2, i) => (
          <div key={c2.name} className="border-t-2 pt-2" style={{ borderColor: tones[i] }}>
            <p className="text-[12px] font-semibold text-ink">{c2.name}</p>
            <p className="tnum mt-0.5 text-[17px] font-semibold leading-none text-ink">
              {c2.leads.toLocaleString('en-US')}
              <span className="ml-1 text-[10px] font-normal text-ink-faint">leads / mo</span>
            </p>
            <p className="mt-1 text-[11px] leading-snug text-ink-soft">{c2.detail}</p>
            <p className="mt-1 text-[10.5px] text-ink-faint">Owner: {c2.owner}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 mb-2 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        Inside digital — three engines, three jobs
      </p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {digital.sub.map((s) => (
          <div key={s.name} className="rounded-card border border-line bg-card px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[12px] font-semibold text-ink">{s.name}</p>
              <p className="tnum text-[11px] font-semibold text-accent">{s.share}%</p>
            </div>
            <p className="text-[10px] uppercase tracking-wide text-ink-ghost">{s.role}</p>
            <p className="tnum mt-1.5 text-[15px] font-semibold leading-none text-ink">
              {s.leads}
              <span className="ml-1 text-[10px] font-normal text-ink-faint">leads / mo</span>
            </p>
            <p className="mt-1.5 text-[10.5px] leading-snug text-ink-soft">{s.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Segment targets — the March plan's lane set. */
export function DemandLaneTargets() {
  const max = Math.max(...DEMAND_PLAN.lanes.map((l) => l.leads));
  return (
    <div className="space-y-2">
      {DEMAND_PLAN.lanes.map((l) => (
        <div key={l.lane} className="flex items-center gap-2.5">
          <span className="w-[104px] shrink-0 truncate text-[11.5px] text-ink-soft sm:w-[148px]">
            <span className="font-bold text-accent">{l.lane}</span> · {l.name}
          </span>
          <div className="flex h-[20px] min-w-0 flex-1 items-center rounded-sm bg-panel">
            <div
              className="print-exact flex h-full min-w-[42px] items-center justify-end rounded-sm pr-2"
              style={{ width: `${(l.leads / max) * 100}%`, background: C.navy }}
            >
              <span className="tnum text-[10px] font-semibold text-white">{l.leads}</span>
            </div>
          </div>
          <span className="tnum w-[74px] shrink-0 text-right text-[11px] font-semibold text-ink">{l.revenue}</span>
          <span className="hidden w-[92px] shrink-0 truncate text-[10.5px] text-ink-faint sm:inline">{l.primary}</span>
        </div>
      ))}
      <p className="pt-1 text-[10.5px] leading-snug text-ink-faint">{DEMAND_PLAN.alwaysOn}</p>
    </div>
  );
}
