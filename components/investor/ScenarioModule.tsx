'use client';

import { useMemo, useState } from 'react';
import { SAMPLE_ASSUMPTIONS, SAMPLE_BASELINE_BUDGET } from '@/lib/investor/sample';

/**
 * Growth scenarios — the budget ask (spec §6).
 *
 * This is the most dangerous module on the page, because it is the one that
 * produces numbers nobody has measured. Four rules keep it honest:
 *
 *  1. Every output is a RANGE, never a single point. A single number invites
 *     the reader to treat a model as a promise.
 *  2. Projections never borrow the visual style of live actuals — outlined and
 *     hatched, tagged "projected", in the accent reserved for modelling.
 *  3. The assumptions card is ALWAYS visible, not tucked into a tooltip, and
 *     each constant carries its source.
 *  4. Conservative mode switches itself ON above 3× and inflates the cost per
 *     inquiry by 30%, because acquisition gets more expensive as you scale and
 *     a straight-line multiplication is the classic way these models lie.
 */

const CPL_LOW = 120;
const CPL_HIGH = 350;
const BOOK_LOW = 0.45;
const BOOK_HIGH = 0.55;
const SHOW_LOW = 0.7;
const SHOW_HIGH = 0.85;
const TREAT_LOW = 0.55;
const TREAT_HIGH = 0.7;
const CASE_LOW = 1000;
const CASE_HIGH = 2400;
const CONSERVATIVE_CPL_UPLIFT = 0.3;

const MULTIPLIERS = [0.5, 1, 2, 3, 5, 10];

const aed = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n / 1000)}K`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

export function ScenarioModule() {
  const [mult, setMult] = useState(1);
  const [includePipeline, setIncludePipeline] = useState(false);
  const [includeFuture, setIncludeFuture] = useState(false);
  const [conservativeTouched, setConservativeTouched] = useState(false);
  const [conservativeManual, setConservativeManual] = useState(true);

  // Defaults ON above 3× unless the reader has deliberately overridden it.
  const conservative = conservativeTouched ? conservativeManual : mult > 3;

  const model = useMemo(() => {
    const budget = SAMPLE_BASELINE_BUDGET * mult;
    const uplift = conservative ? 1 + CONSERVATIVE_CPL_UPLIFT : 1;
    // Pipeline and future projects improve conversion rather than volume —
    // they are systems, not media spend.
    const convBoost = 1 + (includePipeline ? 0.08 : 0) + (includeFuture ? 0.06 : 0);

    const inqHigh = budget / (CPL_LOW * uplift);
    const inqLow = budget / (CPL_HIGH * uplift);
    const bookLow = inqLow * BOOK_LOW * convBoost;
    const bookHigh = inqHigh * BOOK_HIGH * convBoost;
    const showLow = bookLow * SHOW_LOW;
    const showHigh = bookHigh * SHOW_HIGH;
    const treatLow = showLow * TREAT_LOW;
    const treatHigh = showHigh * TREAT_HIGH;
    const revLow = treatLow * CASE_LOW;
    const revHigh = treatHigh * CASE_HIGH;

    return { budget, inqLow, inqHigh, bookLow, bookHigh, showLow, showHigh, treatLow, treatHigh, revLow, revHigh };
  }, [mult, conservative, includePipeline, includeFuture]);

  const rows = [
    { label: 'People who ask about treatment', low: model.inqLow, high: model.inqHigh, unit: 'count' },
    { label: 'Appointments booked', low: model.bookLow, high: model.bookHigh, unit: 'count' },
    { label: 'Patients who walk in', low: model.showLow, high: model.showHigh, unit: 'count' },
    { label: 'Treatments started', low: model.treatLow, high: model.treatHigh, unit: 'count' },
    { label: 'Revenue produced', low: model.revLow, high: model.revHigh, unit: 'aed' },
  ];

  return (
    <section id="scenarios" className="scroll-mt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">Growth scenarios</p>
      <h2 className="display mt-2 max-w-[24ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
        What more fuel does to the machine
      </h2>
      <p className="mt-3 max-w-[70ch] text-[13px] leading-relaxed text-dn-ink/75">
        Move the slider to see what the same machine produces on a bigger monthly marketing budget. This is a{' '}
        <span className="font-semibold text-dn-ink">model, not a forecast</span> — every figure is shown as a range,
        and the assumptions behind it are printed below rather than hidden.
      </p>

      {/* Controls */}
      <div className="mt-6 rounded-card border border-dn-line bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="budget-mult" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-dn-ink/55">
            Monthly marketing budget
          </label>
          <p className="tnum text-[13px] text-dn-ink/70">
            <span className="text-[20px] font-bold text-dn-navy">{mult}×</span> · about{' '}
            <span className="font-semibold text-dn-ink">{aed(model.budget)}</span> a month
          </p>
        </div>

        <input
          id="budget-mult"
          type="range"
          min={0}
          max={MULTIPLIERS.length - 1}
          step={1}
          value={MULTIPLIERS.indexOf(mult)}
          onChange={(e) => setMult(MULTIPLIERS[Number(e.target.value)])}
          className="mt-3 h-[36px] w-full accent-dn-navy"
          aria-valuetext={`${mult} times current budget`}
        />
        <div className="flex justify-between px-0.5">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMult(m)}
              className={`tnum min-h-[30px] px-1 text-[11px] font-semibold ${
                m === mult ? 'text-dn-navy' : 'text-dn-ink/40'
              }`}
            >
              {m}×
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-dn-line pt-3">
          <Toggle checked={includePipeline} onChange={setIncludePipeline} label="Include pipeline projects" />
          <Toggle checked={includeFuture} onChange={setIncludeFuture} label="Include future unlocks" />
          <Toggle
            checked={conservative}
            onChange={(v) => {
              setConservativeTouched(true);
              setConservativeManual(v);
            }}
            label="Conservative mode"
            hint="adds 30% to acquisition cost at scale"
          />
        </div>
        {mult > 3 && !conservative ? (
          <p className="mt-2 text-[11px] text-dn-amber">
            Conservative mode is off above 3×. Acquisition normally gets more expensive as budget grows — these
            figures are optimistic.
          </p>
        ) : null}
      </div>

      {/* Projected funnel — visually distinct from every live number on the page */}
      <div className="mt-4 rounded-card border-2 border-dn-navy/35 bg-white/60 px-4 py-4 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="rounded border border-dn-navy/40 bg-dn-navy/5 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-dn-navy">
            Projected
          </span>
          <p className="text-[11px] text-dn-ink/55">Outlined throughout — never shown like a measured result</p>
        </div>

        <ul className="mt-3 space-y-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-dashed border-dn-line pb-2.5 last:border-0">
              <span className="text-[12.5px] text-dn-ink/80">{r.label}</span>
              <span className="tnum text-[15px] font-bold text-dn-navy">
                {r.unit === 'aed' ? `${aed(r.low)} – ${aed(r.high)}` : `${int(r.low)} – ${int(r.high)}`}
                <span className="ml-1.5 text-[10px] font-normal text-dn-ink/45">per month</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Return on spend, stated explicitly.
            Without this row the card showed, at 1x, "AED 3K – AED 46K revenue"
            against a 7,000 budget and never put the two side by side — so a
            reader could not see that the BOTTOM of the range is a loss before
            a single clinical cost. A budget ask that hides its own downside is
            not a budget ask an investor should trust. */}
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-dn-line pt-3">
          <span className="text-[12.5px] font-semibold text-dn-ink">
            Revenue for every dirham of marketing spend
          </span>
          <span className="tnum text-[15px] font-bold text-dn-navy">
            {(model.revLow / model.budget).toFixed(1)}× – {(model.revHigh / model.budget).toFixed(1)}×
          </span>
        </div>
        {model.revLow < model.budget ? (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-dn-amber">
            Read the bottom of that range honestly: at the low end the model returns less than the media spend
            itself, before any clinical cost. The upside case is what the machine is built to reach — it is not the
            expected case.
          </p>
        ) : null}

        <p className="mt-3 border-t border-dn-line pt-3 text-[13px] leading-relaxed text-dn-ink">
          At <span className="font-semibold">{mult}× budget</span> — about{' '}
          <span className="font-semibold">{aed(model.budget)} a month</span> — the model projects{' '}
          <span className="font-semibold">
            {int(model.bookLow)}–{int(model.bookHigh)} bookings
          </span>{' '}
          and{' '}
          <span className="font-semibold">
            {aed(model.revLow)}–{aed(model.revHigh)} revenue
          </span>{' '}
          per month.
        </p>
      </div>

      {/* Assumptions — always visible, never a tooltip */}
      <div className="mt-4 rounded-card border border-dn-line bg-dn-off px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/55">
          The assumptions behind these figures
        </p>
        <dl className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {SAMPLE_ASSUMPTIONS.map((a) => (
            <div key={a.key} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-dn-line/70 pb-1.5">
              <dt className="text-[11.5px] text-dn-ink/75">{a.key}</dt>
              <dd className="tnum text-[12px] font-semibold text-dn-ink">{a.value}</dd>
              <dd className="w-full text-[9.5px] italic text-dn-ink/45">{a.source}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11.5px] italic leading-relaxed text-dn-ink/60">
          Illustrative model based on documented lane benchmarks — actual results depend on execution and market
          conditions.
        </p>
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex min-h-[36px] cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[16px] w-[16px] accent-dn-navy"
      />
      <span className="text-[12px] text-dn-ink/80">
        {label}
        {hint ? <span className="block text-[10px] text-dn-ink/45">{hint}</span> : null}
      </span>
    </label>
  );
}
