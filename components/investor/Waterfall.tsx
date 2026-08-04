'use client';

import { useMemo, useState } from 'react';
import {
  CHANNEL_IMPACTS,
  PLAN_MONTHLY_PATIENTS,
  PLAN_MONTHLY_QLS,
  toPatients,
  toRevenue,
  type ImpactItem,
} from '@/config/impact-model';
import { PLAN_RATES } from '@/config/plan-model';

/**
 * THE WATERFALL — every action, translated into patients.
 *
 * This is the exhibit Mr. Akbar asked for: not a list of projects, but a
 * build-up. It starts at where the business is today, adds one bar per action,
 * and lands on the plan target. Switch an action off and the target visibly
 * fails to arrive — which is the entire argument for funding it.
 *
 * Three rules keep it honest:
 *
 *  1. Only CHANNELS are additive. Roles and systems appear elsewhere on the
 *     page as the things that make these bars reachable, never as extra bars
 *     — otherwise the same lead is counted twice and the total is fiction.
 *  2. The metric switch recomputes from the SAME lead figures using the plan's
 *     own conversion rates, so leads, patients and revenue can never disagree.
 *  3. Bars are shaped by state — solid for what is already running, outlined
 *     for pipeline, dashed for future — so nobody mistakes a plan for a result.
 */

type Metric = 'leads' | 'patients' | 'revenue';

const W = 1120;
const H = 380;
const PAD = { top: 28, right: 16, bottom: 96, left: 62 };
const PLOT_H = H - PAD.top - PAD.bottom;
const PLOT_W = W - PAD.left - PAD.right;

const STATE_FILL: Record<string, string> = { LIVE: '#244260', PIPELINE: '#5793A3', FUTURE: '#A9BCCE' };

const fmt = (v: number, m: Metric) => {
  if (m === 'revenue') {
    return v >= 1_000_000 ? `AED ${(v / 1_000_000).toFixed(2)}M` : `AED ${Math.round(v / 1000)}K`;
  }
  return Math.round(v).toLocaleString('en-US');
};

/** Today's measured starting point — the honest floor the build-up starts from. */
const BASELINE_LEADS = 612;

/**
 * `active` is owned by the page, not by this component, so the scenario module
 * further down can price the SAME selection. Switching on an organic channel
 * here has to move the return figure there — that connection is the argument.
 */
export function Waterfall({
  active,
  onToggle,
}: {
  active: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>('patients');
  const toggle = onToggle;

  const convert = (leads: number) => {
    if (metric === 'leads') return leads;
    const patients = toPatients(leads);
    if (metric === 'patients') return patients;
    // Revenue uses the midpoint of the plan's AOV band; the range is stated
    // in full beneath the chart rather than drawn as a fake single value.
    const r = toRevenue(patients);
    return (r.low + r.high) / 2;
  };

  const { steps, total, planTarget } = useMemo(() => {
    const chosen = CHANNEL_IMPACTS.filter((c) => active.has(c.id));

    /**
     * Today's leads are ALREADY produced by the live channels, so a live
     * channel's bar must be its INCREMENT above what it delivers now — not its
     * whole run-rate volume on top of the baseline. Adding both counted the
     * same lead twice and made the total reach 123% of a target that is, by
     * definition, 100%.
     *
     * Today's volume is attributed across the live channels in proportion to
     * their plan share, which is the most defensible split available without
     * per-channel history.
     */
    const livePlanTotal = CHANNEL_IMPACTS.filter((c) => c.state === 'LIVE').reduce(
      (a, c) => a + c.monthlyLeads,
      0,
    );
    const todayOf = (c: (typeof CHANNEL_IMPACTS)[number]) =>
      c.state === 'LIVE' && livePlanTotal > 0 ? (BASELINE_LEADS * c.monthlyLeads) / livePlanTotal : 0;

    let cum = convert(BASELINE_LEADS);
    const st = chosen.map((c) => {
      const incrementalLeads = Math.max(c.monthlyLeads - todayOf(c), 0);
      const delta = convert(incrementalLeads);
      const from = cum;
      cum += delta;
      return { item: c, from, to: cum, delta, incrementalLeads };
    });

    return { steps: st, total: cum, planTarget: convert(PLAN_MONTHLY_QLS) };
  }, [active, metric]);

  const baseVal = convert(BASELINE_LEADS);
  const max = Math.max(total, planTarget) * 1.08;
  const y = (v: number) => PAD.top + PLOT_H - (v / max) * PLOT_H;
  const colCount = steps.length + 2; // baseline + steps + total
  const colW = PLOT_W / colCount;
  const barW = Math.min(colW * 0.62, 62);
  const cx = (i: number) => PAD.left + colW * i + colW / 2;

  const pct = Math.round((total / planTarget) * 100);

  return (
    <section id="waterfall" className="scroll-mt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">Every action, in patients</p>
      <h2 className="display mt-2 max-w-[24ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
        What each thing we do is worth
      </h2>
      <p className="mt-3 max-w-[72ch] text-[13px] leading-relaxed text-dn-ink/75">
        Start from where we are today, then switch on each action to see what it adds. Switch one off and watch the
        target fail to arrive — that gap is what funding it buys.{' '}
        <span className="font-semibold text-dn-ink">Tap any action below to add or remove it.</span>
      </p>

      {/* Metric switch */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {(
          [
            ['leads', 'People who ask'],
            ['patients', 'Patients who arrive'],
            ['revenue', 'First-visit revenue'],
          ] as [Metric, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMetric(k)}
            className={`min-h-[36px] rounded-md border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
              metric === k
                ? 'border-dn-navy bg-dn-navy text-white'
                : 'border-dn-line bg-white text-dn-ink/70 hover:bg-dn-off'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-dn-ink/50">per month, at full run rate</span>
      </div>

      {/* The waterfall */}
      <div className="scroll-hint mt-4">
        <div className="scroll-x">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[880px]" role="img" aria-label="Waterfall of each action's contribution">
            {/* baseline gridline at the plan target */}
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(planTarget)}
              y2={y(planTarget)}
              stroke="#B8873B"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text x={PAD.left} y={y(planTarget) - 6} fontSize={10.5} fontWeight={700} fill="#B8873B">
              Plan target · {fmt(planTarget, metric)} per month
            </text>

            {/* baseline bar */}
            <rect x={cx(0) - barW / 2} y={y(baseVal)} width={barW} height={Math.max(y(0) - y(baseVal), 2)} fill="#16293C" rx={2} />
            <text x={cx(0)} y={y(baseVal) - 7} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="#16293C">
              {fmt(baseVal, metric)}
            </text>
            <text x={cx(0)} y={PAD.top + PLOT_H + 18} textAnchor="middle" fontSize={11} fontWeight={600} fill="#2C3233">
              Today
            </text>
            <text x={cx(0)} y={PAD.top + PLOT_H + 32} textAnchor="middle" fontSize={9.5} fill="#7A8386">
              measured
            </text>

            {/* step bars */}
            {steps.map((st, i) => {
              const i1 = i + 1;
              const top = y(st.to);
              const bot = y(st.from);
              return (
                <g key={st.item.id}>
                  {/* connector from previous bar */}
                  <line
                    x1={cx(i1 - 1) + barW / 2}
                    x2={cx(i1) - barW / 2}
                    y1={bot}
                    y2={bot}
                    stroke="#C9D3DC"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <rect
                    x={cx(i1) - barW / 2}
                    y={top}
                    width={barW}
                    height={Math.max(bot - top, 2)}
                    fill={st.item.state === 'FUTURE' ? 'none' : STATE_FILL[st.item.state]}
                    stroke={STATE_FILL[st.item.state]}
                    strokeWidth={st.item.state === 'LIVE' ? 0 : 2}
                    strokeDasharray={st.item.state === 'FUTURE' ? '4 3' : undefined}
                    rx={2}
                  />
                  <text x={cx(i1)} y={top - 7} textAnchor="middle" fontSize={11} fontWeight={700} fill="#244260">
                    +{fmt(st.delta, metric)}
                  </text>
                  <text
                    x={cx(i1)}
                    y={PAD.top + PLOT_H + 18}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="#2C3233"
                  >
                    {shortName(st.item)[0]}
                  </text>
                  {shortName(st.item)[1] ? (
                    <text x={cx(i1)} y={PAD.top + PLOT_H + 30} textAnchor="middle" fontSize={9.5} fill="#2C3233">
                      {shortName(st.item)[1]}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {/* total bar */}
            <line
              x1={cx(colCount - 2) + barW / 2}
              x2={cx(colCount - 1) - barW / 2}
              y1={y(total)}
              y2={y(total)}
              stroke="#C9D3DC"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <rect
              x={cx(colCount - 1) - barW / 2}
              y={y(total)}
              width={barW}
              height={Math.max(y(0) - y(total), 2)}
              fill="#B8873B"
              rx={2}
            />
            <text x={cx(colCount - 1)} y={y(total) - 7} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#B8873B">
              {fmt(total, metric)}
            </text>
            <text x={cx(colCount - 1)} y={PAD.top + PLOT_H + 18} textAnchor="middle" fontSize={11} fontWeight={700} fill="#2C3233">
              With these
            </text>
            <text x={cx(colCount - 1)} y={PAD.top + PLOT_H + 32} textAnchor="middle" fontSize={9.5} fill="#7A8386">
              switched on
            </text>

            {/* axis */}
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="#C9D3DC" />
          </svg>
        </div>
      </div>
      <p className="no-print mt-1.5 text-[10.5px] text-dn-ink/45 sm:hidden">Swipe sideways for the full build-up →</p>

      {/* Verdict line */}
      <p
        className={`mt-4 rounded-card border-l-[3px] px-4 py-3 text-[13.5px] leading-relaxed ${
          pct >= 100 ? 'border-l-dn-green bg-dn-green/5 text-dn-ink' : 'border-l-dn-amber bg-dn-amber/5 text-dn-ink'
        }`}
      >
        {pct >= 100 ? (
          <>
            With everything switched on the machine reaches{' '}
            <span className="font-semibold">{pct}% of the plan target</span> — {fmt(total, metric)} against a target of{' '}
            {fmt(planTarget, metric)} a month.
          </>
        ) : (
          <>
            As switched on, the machine reaches <span className="font-semibold">{pct}% of the plan target</span>:{' '}
            {fmt(total, metric)} against {fmt(planTarget, metric)} a month. The missing{' '}
            <span className="font-semibold">{fmt(planTarget - total, metric)}</span> is what the unselected actions
            above are worth.
          </>
        )}
      </p>

      {/* Action toggles */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
          The actions — tap to add or remove
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CHANNEL_IMPACTS.map((c) => {
            const on = active.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                className={`rounded-card border px-3.5 py-3 text-left transition ${
                  on ? 'border-dn-navy bg-white shadow-card' : 'border-dashed border-dn-line bg-transparent opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[12.5px] font-semibold leading-snug text-dn-ink">{c.name}</span>
                  <span
                    className={`shrink-0 rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${
                      c.state === 'LIVE'
                        ? 'border border-dn-green/40 bg-dn-green/10 text-dn-green'
                        : c.state === 'PIPELINE'
                          ? 'border border-dn-navy/40 bg-dn-navy/5 text-dn-navy'
                          : 'border border-dashed border-dn-grey text-dn-ink/55'
                    }`}
                  >
                    {c.state === 'LIVE' ? 'Live' : c.state === 'PIPELINE' ? 'Pipeline' : 'Future'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-dn-ink/65">{c.what}</p>
                <p className="tnum mt-1.5 text-[12px] font-bold text-dn-navy">
                  +{Math.round(c.monthlyLeads).toLocaleString('en-US')} people ask ·{' '}
                  {toPatients(c.monthlyLeads).toLocaleString('en-US')} patients / month
                </p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-dn-ink/45">{c.basis}</p>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 border-t border-dn-line pt-3 text-[10.5px] leading-relaxed text-dn-ink/50">
        Leads become patients at the plan&apos;s own rate — one arrival for every five people who ask (
        {Math.round(PLAN_RATES.arrivalRate.value * 100)}%), with {Math.round(PLAN_RATES.leadToBooking.value * 100)}% of
        people booking and {Math.round(PLAN_RATES.showRate.value * 100)}% of bookings arriving. Revenue uses the
        plan&apos;s first-visit value of AED {PLAN_RATES.aovLow.value}–{PLAN_RATES.aovHigh.value} per patient. Only
        channels are added together here; the people and systems that make them reachable are shown separately, so no
        patient is counted twice. Plan target: {PLAN_MONTHLY_QLS.toLocaleString('en-US')} people asking and{' '}
        {PLAN_MONTHLY_PATIENTS.toLocaleString('en-US')} patients a month.
      </p>
    </section>
  );
}

/** Two-line label for the axis under each bar. */
function shortName(i: ImpactItem): [string, string?] {
  const map: Record<string, [string, string?]> = {
    'google-search': ['Google', 'Search'],
    pmax: ['Performance', 'Max'],
    'meta-ctw': ['Meta', 'WhatsApp'],
    'meta-lead': ['Meta', 'lead ads'],
    tiktok: ['TikTok'],
    'youtube-rmk': ['YouTube', 'remarketing'],
    araby: ['Araby Ads', 'partner'],
    'seo-local': ['SEO &', 'local'],
    referrals: ['Referrals'],
    corporate: ['Corporate', '& schools'],
    reactivation: ['Database', 'reactivation'],
    pr: ['PR &', 'earned'],
  };
  return map[i.id] ?? [i.name.slice(0, 12)];
}
