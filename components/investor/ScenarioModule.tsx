'use client';

import { useMemo } from 'react';
import {
  PLAN_CHANNELS,
  PLAN_RATES,
  PLAN_SCENARIOS,
  PLAN_SCENARIOS_SOURCE,
  ROAS_BASIS_NOTE,
  BUDGET,
} from '@/config/plan-model';
import { CHANNEL_IMPACTS, AOV_DISCREPANCY_NOTE } from '@/config/impact-model';

/**
 * The budget ask (spec §6) — rebuilt on the plan's own arithmetic.
 *
 * WHAT WAS WRONG BEFORE
 *
 * The first version multiplied generic benchmark bands together and produced a
 * return of 0.5×–6.6×. A thirteen-fold spread is not a model, and the bottom of
 * it implied a loss while the top implied a windfall from the same inputs.
 *
 * WHAT REPLACED IT
 *
 * Two things, both sourced:
 *
 *  1. The plan's OWN three scenarios, quoted as the plan's — Conservative,
 *     Base and Stretch, with return of 1.05×–1.72× on first-visit revenue.
 *     That band is narrow because it comes from a modelled value per patient,
 *     not from stacked guesses.
 *  2. A mix effect that responds to the actions selected above. Organic and
 *     retention leads cost AED 60–90 against AED 140–320 for paid, so as those
 *     channels switch on the blended cost per lead falls and the return rises.
 *     That is the mechanism behind the plan's own decision to taper paid share
 *     from 65% to 50% across the year — and it is why executing the projects
 *     improves return rather than merely adding volume.
 */

const aed = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n / 1000)}K`;
const aedExact = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;

/** Map an impact id to its plan channel, for cost per lead. */
const CPL_BY_ID: Record<string, number> = {
  'google-search': 140,
  pmax: 150,
  'meta-ctw': 170,
  'meta-lead': 140,
  tiktok: 160,
  'youtube-rmk': 320,
  araby: 180,
  'seo-local': 80,
  referrals: 60,
  corporate: 75,
  reactivation: 70,
  pr: 90,
};

export function ScenarioModule({ active }: { active: Set<string> }) {
  const mix = useMemo(() => {
    const chosen = CHANNEL_IMPACTS.filter((c) => active.has(c.id));
    const leads = chosen.reduce((a, c) => a + c.monthlyLeads, 0);
    if (!leads) return null;

    const spend = chosen.reduce((a, c) => a + c.monthlyLeads * (CPL_BY_ID[c.id] ?? PLAN_RATES.weightedCpl.value), 0);
    const blendedCpl = spend / leads;

    const organicIds = new Set(['seo-local', 'referrals', 'corporate', 'reactivation', 'pr']);
    const organicLeads = chosen.filter((c) => organicIds.has(c.id)).reduce((a, c) => a + c.monthlyLeads, 0);

    /**
     * The paid-only counterfactual — the number the organic work is actually
     * measured against.
     *
     * Comparing "today" with "everything switched on" showed blended cost per
     * lead essentially unchanged (AED 148 both ways), because the cheap organic
     * channels are offset almost exactly by the expensive reach channels the
     * plan also adds (YouTube at AED 320, Meta at AED 170). Presenting that as
     * "executing the projects makes each patient cheaper" would have been
     * false.
     *
     * The true comparison is buying the SAME volume through paid channels
     * alone versus the planned mix. That is where organic earns its place.
     */
    const paidChosen = chosen.filter((c) => !organicIds.has(c.id));
    const paidLeads = paidChosen.reduce((a, c) => a + c.monthlyLeads, 0);
    const paidSpend = paidChosen.reduce((a, c) => a + c.monthlyLeads * (CPL_BY_ID[c.id] ?? 161), 0);
    const paidOnlyCpl = paidLeads ? paidSpend / paidLeads : 0;

    const patients = leads * PLAN_RATES.arrivalRate.value;

    /**
     * DELIBERATELY NOT A RETURN FIGURE.
     *
     * Computing return here produced 0.64×–1.04×, sitting directly beneath the
     * plan's own 1.05×–1.72× and contradicting it. The cause is a real
     * inconsistency between two sheets of the source workbook: the channel-mix
     * sheet implies 80% of leads are paid, while the acquisition-need sheet
     * tapers paid share from 65% to 50%. The plan's ROAS also divides ALL
     * patients by PAID media only, whereas a mix built from per-channel costs
     * necessarily includes the cost of organic effort too.
     *
     * Two figures both labelled "return", differing by a factor of two, would
     * destroy confidence in every other number on the page. So this block
     * reports UNIT COST — which is computable, unambiguous, and makes exactly
     * the point that matters: shifting the mix towards organic lowers what
     * each patient costs. Return stays quoted only where it is sourced, on the
     * plan's own scenario cards above.
     */
    const costPerPatient = spend / patients;

    return {
      leads,
      spend,
      blendedCpl,
      costPerPatient,
      paidOnlyCpl,
      organicShare: organicLeads / leads,
      patients,
      count: chosen.length,
    };
  }, [active]);

  // The all-paid comparison point, so the improvement has something to be
  // measured against rather than being asserted.
  const allPaidCpl = PLAN_RATES.weightedCpl.value;
  const planCostPerPatient = allPaidCpl / PLAN_RATES.arrivalRate.value;

  return (
    <section id="scenarios" className="scroll-mt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">The budget ask</p>
      <h2 className="display mt-2 max-w-[24ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
        What the plan costs, and what it returns
      </h2>

      {/* The ask, stated as a comparison rather than a slider */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-card border border-dn-line bg-white px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">Spending today</p>
          <p className="tnum mt-1 text-[26px] font-bold leading-none text-dn-ink">
            {aedExact(BUDGET.currentMonthly.value)}
          </p>
          <p className="mt-1 text-[10.5px] text-dn-ink/55">a month · {BUDGET.currentMonthly.source}</p>
        </div>
        <div className="rounded-card border-2 border-dn-gold bg-dn-goldWash px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-gold">The plan asks for</p>
          <p className="tnum mt-1 text-[26px] font-bold leading-none text-dn-navy">
            {aed(BUDGET.y1PaidMedia.value)}
          </p>
          <p className="mt-1 text-[10.5px] text-dn-ink/60">
            paid media across Year 1 — about {aedExact(BUDGET.y1PaidMedia.value / 12)} a month
          </p>
        </div>
        <div className="rounded-card border border-dn-line bg-white px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">To produce</p>
          <p className="tnum mt-1 text-[26px] font-bold leading-none text-dn-navy">7,797</p>
          <p className="mt-1 text-[10.5px] text-dn-ink/55">new patients in Year 1 · 650 a month</p>
        </div>
      </div>

      {/* The plan's three scenarios — definitive, not a slider */}
      <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
        The plan&apos;s three cases
      </p>
      <div className="mt-2.5 grid gap-3 lg:grid-cols-3">
        {PLAN_SCENARIOS.map((sc) => (
          <div
            key={sc.key}
            className={`rounded-card px-4 py-4 ${
              sc.key === 'base' ? 'border-2 border-dn-navy bg-white' : 'border border-dn-line bg-white'
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-dn-ink">{sc.label}</p>
              {sc.key === 'base' ? (
                <span className="rounded bg-dn-navy px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-white">
                  Planned
                </span>
              ) : null}
            </div>
            <p className="text-[10.5px] text-dn-ink/50">{sc.newPatientShare}</p>
            <p className="tnum mt-3 text-[28px] font-bold leading-none text-dn-navy">
              {sc.newPatients.toLocaleString('en-US')}
            </p>
            <p className="text-[10.5px] text-dn-ink/55">new patients in Year 1</p>
            <dl className="mt-3 space-y-1.5 border-t border-dn-line pt-2.5">
              <Row k="Paid media" v={aed(sc.paidMedia)} />
              <Row k="First-visit revenue" v={`${aed(sc.revenueLow)} – ${aed(sc.revenueHigh)}`} />
              <Row k="Return on media" v={`${sc.roasLow}× – ${sc.roasHigh}×`} strong />
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[9.5px] italic text-dn-ink/45">Source: {PLAN_SCENARIOS_SOURCE}</p>

      {/* Mix effect — the answer to "does executing projects improve return?" */}
      {mix ? (
        <div className="mt-8 rounded-card border-2 border-dn-navy/30 bg-white px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-dn-navy/40 bg-dn-navy/5 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-dn-navy">
              Projected
            </span>
            <p className="text-[11px] text-dn-ink/55">
              Priced from the {mix.count} action{mix.count === 1 ? '' : 's'} selected above
            </p>
          </div>

          <h3 className="display mt-2 text-[19px] leading-tight text-dn-navy">
            The organic channels are what stop cost rising as volume grows
          </h3>
          <p className="mt-1.5 max-w-[74ch] text-[12px] leading-relaxed text-dn-ink/65">
            Scaling on paid alone gets more expensive, because the cheap high-intent searches run out and the budget
            moves to costlier reach channels. Organic, referral and reactivation leads cost AED 60–90 against AED
            140–320 for paid — enough to hold the blended figure down while volume multiplies.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Blended cost per lead"
              value={aedExact(mix.blendedCpl)}
              sub={
                mix.paidOnlyCpl > 0
                  ? `paid channels alone would be ${aedExact(mix.paidOnlyCpl)}`
                  : `plan average is AED ${allPaidCpl}`
              }
              good={mix.paidOnlyCpl > 0 && mix.blendedCpl < mix.paidOnlyCpl}
            />
            <Stat label="Organic share of leads" value={`${Math.round(mix.organicShare * 100)}%`} sub="organic leads cost AED 60–90" good={mix.organicShare > 0.15} />
            <Stat label="Patients a month" value={Math.round(mix.patients).toLocaleString('en-US')} sub={`from ${Math.round(mix.leads).toLocaleString('en-US')} people asking`} />
            <Stat
              label="Cost per patient acquired"
              value={aedExact(mix.costPerPatient)}
              sub={`at the plan average this is ${aedExact(planCostPerPatient)}`}
              good={mix.costPerPatient < planCostPerPatient}
            />
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-dn-ink/50">
            This block reports what a patient <span className="font-semibold">costs</span>, not what they return.
            Return is quoted only on the plan&apos;s own cards above, where it is sourced — the plan measures it
            against paid media alone, so mixing it with organic effort here would produce a second, different
            &ldquo;return&rdquo; and neither figure would be trusted.
          </p>

          {/* Blended CPL bar against the plan average */}
          <div className="mt-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/45">
              Cost per lead by channel — why the mix matters
            </p>
            <ul className="space-y-1.5">
              {PLAN_CHANNELS.map((c) => {
                const maxCpl = 320;
                return (
                  <li key={c.name} className="flex items-center gap-2.5">
                    <span className="w-[128px] shrink-0 truncate text-[11px] text-dn-ink/75 sm:w-[186px]">
                      {c.name}
                    </span>
                    <span className="flex h-[15px] min-w-0 flex-1 items-center rounded-sm bg-dn-navy/8">
                      <span
                        className="h-full rounded-sm"
                        style={{
                          width: `${(c.cpl / maxCpl) * 100}%`,
                          background: c.type === 'Organic' ? '#2E7D32' : '#5793A3',
                        }}
                      />
                    </span>
                    <span className="tnum w-[62px] shrink-0 text-right text-[11px] font-semibold text-dn-ink">
                      AED {c.cpl}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[10.5px] leading-relaxed text-dn-ink/55">
              <span className="inline-block h-[8px] w-[8px] rounded-sm bg-dn-green align-middle" /> Organic and
              retention leads cost AED 60–90.{' '}
              <span className="inline-block h-[8px] w-[8px] rounded-sm bg-dn-soft align-middle" /> Paid leads cost AED
              140–320. Every point of lead share that moves from paid to organic lowers the blended cost and raises
              the return — which is exactly why the plan tapers paid share from 65% to 50% across the year.
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-8 rounded-card border border-dashed border-dn-line px-4 py-6 text-center text-[12.5px] text-dn-ink/50">
          Select at least one action above to price the mix.
        </p>
      )}

      {/* Basis — always visible */}
      <div className="mt-4 rounded-card border border-dn-line bg-dn-off px-4 py-4 sm:px-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-dn-ink/55">How to read the return</p>
        <p className="mt-2 text-[12px] leading-relaxed text-dn-ink/75">{ROAS_BASIS_NOTE}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-dn-ink/60">{AOV_DISCREPANCY_NOTE}</p>
        <p className="mt-2 text-[11.5px] leading-relaxed text-dn-ink/60">
          One further inconsistency worth knowing about, since it affects any return calculation: the plan&apos;s
          channel-mix sheet implies 80% of leads come from paid, while its acquisition sheet tapers paid share from
          65% to 50% across the year. Both are internally consistent; they have not been reconciled with each other.
          This page uses the channel-mix figures for the build-up and quotes the plan&apos;s own return figures
          unchanged.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-dn-line pt-3 sm:grid-cols-2">
          <Row k="People who ask → book" v={`${Math.round(PLAN_RATES.leadToBooking.value * 100)}%`} />
          <Row k="Bookings → arrive" v={`${Math.round(PLAN_RATES.showRate.value * 100)}%`} />
          <Row k="People who ask → patients" v={`${Math.round(PLAN_RATES.arrivalRate.value * 100)}% (one in five)`} />
          <Row k="First-visit value per patient" v={`AED ${PLAN_RATES.aovLow.value}–${PLAN_RATES.aovHigh.value}`} />
        </dl>
        <p className="mt-3 text-[11.5px] italic leading-relaxed text-dn-ink/55">
          Illustrative model built on the Year-1 Comprehensive Plan — actual results depend on execution, clinical
          capacity and market conditions.
        </p>
      </div>
    </section>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11.5px] text-dn-ink/70">{k}</dt>
      <dd className={`tnum text-[12px] ${strong ? 'font-bold text-dn-navy' : 'font-semibold text-dn-ink'}`}>{v}</dd>
    </div>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-card border border-dn-line bg-dn-off px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dn-ink/45">{label}</p>
      <p className={`tnum mt-1 text-[20px] font-bold leading-none ${good ? 'text-dn-green' : 'text-dn-navy'}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-dn-ink/50">{sub}</p>
    </div>
  );
}
