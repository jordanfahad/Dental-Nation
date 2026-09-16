'use client';

/**
 * Smile Club — membership growth plan (rev. 2), the live rendering of
 * smile-club-optimization-plan-revised.md. Revised 12 Sep 2026 after an
 * external review: leads with the recommendation (focused, measurable
 * pilot; expand on evidence), reframes the diagnosis as testable
 * hypotheses, adds offer validation + contribution economics + capacity
 * as expansion gates, moves onboarding/activation into Wave 1, separates
 * the three corporate payment models, and requires an audience-eligibility
 * check before any patient-list ad targeting. Strategy content only — no
 * patient data; unknowns are marked "baseline pending", never invented.
 */

import { useState } from 'react';

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const MINT = '#A9C3A6';
const OLIVE = '#767769';
const LINE = '#D8D8CC';

type Sub = 'reco' | 'mandate' | 'offer' | 'waves' | 'corporate' | 'channels' | 'kpis';

/* ── atoms ─────────────────────────────────────────────────────── */

function Exhibit({ n, title }: { n: number | string; title: string }) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>Exhibit {n}</span>
      <h2 className="text-[14px] font-semibold" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{title}</h2>
    </div>
  );
}

function Tag({ children, color = BLUE }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="rounded border px-1.5 py-0.5 text-[9.5px] font-medium" style={{ borderColor: `${color}66`, color, backgroundColor: `${color}0d` }}>
      {children}
    </span>
  );
}

function Card({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: accent ?? LINE }}>
      {children}
    </div>
  );
}

function Note({ tone, children }: { tone: 'gold' | 'coral' | 'blue'; children: React.ReactNode }) {
  const c = tone === 'gold' ? { bg: '#FDF9EC', tx: '#6d5a1d' } : tone === 'coral' ? { bg: '#FBEFEC', tx: CORAL } : { bg: '#EEF4F6', tx: NAVY };
  return <p className="rounded-lg px-3 py-2 text-[11px] font-medium leading-snug" style={{ backgroundColor: c.bg, color: c.tx }}>{children}</p>;
}

/* ── data ──────────────────────────────────────────────────────── */

interface Play { title: string; detail: string; owner: string; engine: string }
interface Wave { id: string; label: string; tag: string; horizon: string; color: string; intro: string; plays: Play[] }

const WAVES: Wave[] = [
  {
    id: 'wave1', label: 'Wave 1 · Prepare + limited test', tag: 'Low incremental media spend — staff and delivery costs tracked', horizon: 'Indicative: first fortnight', color: '#2C5E3F',
    intro: 'Sell to people who already know us — and onboard properly from the first enrolment. Baseline, prices and definitions come before broad activation.',
    plays: [
      { title: 'Baseline & terms first', engine: 'Data', owner: 'Gautam + finance/ops (to confirm)', detail: 'Enrolments, payment status, plan mix, usage, cancellations; benefit-delivery costs; clinic prices; membership terms. The savings examples and funnel definitions come from this — nothing scales before it exists.' },
      { title: 'Limited CRM test', engine: 'CRM / WhatsApp', owner: 'Fahad + ZAVIS', detail: 'A few appropriate, contactable patient segments — consent and opt-out handling confirmed first — with a comparable uncontacted group where practical, so results have denominators and an incrementality read.' },
      { title: 'Front-desk route', engine: 'In-clinic', owner: 'Front desk + Dr Luvi', detail: 'One consistent explanation, a simple enrolment route, QR at the three branches — and a structured objection log from day one.' },
      { title: 'Relevant placements only', engine: 'Owned web', owner: 'ZAVIS + W3Layouts', detail: 'Membership placements on the most relevant pages with demonstrated traffic, prioritised by actual local intent and conversion potential — page count alone is not opportunity. Relevant cost-guide readers are a testable prospect audience.' },
      { title: 'Onboarding & activation — in Wave 1', engine: 'Member experience', owner: 'Fahad + Gautam + front desk', detail: 'Welcome and clear benefits/terms; help arranging the first clinically appropriate appointment; first booking and first completed visit tracked separately; care-plan reminders; payment-failure follow-up; cancellation reasons; renewal prep; a member value statement showing actual benefits received.' },
      { title: 'Corporate discovery in parallel', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Warm HR conversations start now (Michael Page contact, RBS, existing partners) — discovery does not wait for a finished case study.' },
    ],
  },
  {
    id: 'wave2', label: 'Wave 2 · Scale what the evidence supports', tag: 'Paid tests + SEO + one defined corporate pilot', horizon: 'Indicative: weeks 3–8', color: BLUE,
    intro: 'Budget follows measured conversion — and every paid audience passes the eligibility check first.',
    plays: [
      { title: 'Paid acquisition tests', engine: 'Paid', owner: 'Fahad', detail: 'After the audience-eligibility check: eligible search-intent and geographic tests first; patient-list targeting only where confirmed appropriate. Offer-led CTWA and Google Search on cost/offer intent.' },
      { title: 'SEO membership cluster', engine: 'SEO', owner: 'ZAVIS', detail: 'Dedicated EN/AR membership pages plus a membership module on the highest-traffic relevant cost and treatment pages.' },
      { title: 'One defined corporate pilot', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'One employer, explicit commitments and economics — full specification in the Corporate playbook.' },
      { title: 'Creative production', engine: 'Creative OS', owner: 'ZAVIS', detail: 'Automation supports asset production; offer accuracy, clinical review, suitability and performance still need validation before scale.' },
      { title: 'Referral mechanic — as a test', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Build member-get-member and measure its contribution. Referral is a channel to test, not an assumed winner.' },
    ],
  },
  {
    id: 'wave3', label: 'Wave 3 · Compound, if the gate opens', tag: 'Corporate expansion + selective offline, funded by measured contribution', horizon: 'Indicative: quarter +', color: NAVY,
    intro: 'With measured economics and a pilot case study, widen the funnel. Reinvest only after considering contribution, cash requirements and future benefit obligations.',
    plays: [
      { title: 'Corporate expansion', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Outbound to a named employer list opened with the pilot case study; benefits platforms, chambers, HR communities.' },
      { title: 'Insurance-gap positioning', engine: 'Messaging', owner: 'Fahad', detail: 'Positioned against verified dental-coverage gaps for the specific audience — not an assumption about all employees.' },
      { title: 'LinkedIn corporate lane', engine: 'Content OS', owner: 'ZAVIS', detail: 'A corporate-benefits content lane aimed at HR titles, warming the outbound list.' },
      { title: 'Selective offline', engine: 'Offline', owner: 'Fahad', detail: 'Judged case by case on audience fit, total delivery cost, attributable enrolments and feasibility — see the offline verdict. Radio and billboards stay deferred.' },
      { title: 'Retention economics', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Monthly-payment persistence and renewal by cohort. Renewal and lifetime value are not validated by a short pilot — cohorts must mature first.' },
    ],
  },
];

const FACTS: { cat: string; color: string; items: string }[] = [
  { cat: 'Established (our own platform)', color: '#2C5E3F', items: 'Smile Club product + admin console live · 4.9★ across 62 GMB reviews · patient audience lists exist in both ad accounts · warm corporate contacts (Michael Page HR contact, RBS, current partners)' },
  { cat: 'Source-reported (ZAVIS — not independently verified)', color: BLUE, items: '25 WhatsApp segments with automated creative generation · 19,500+ programmatic SEO pages · Patient Intelligence ↔ Content OS API integration' },
  { cat: 'Public-page observations (12 Sep — recheck before use)', color: '#7a6420', items: 'Essential AED 99/month or 999/year · Plus AED 139/month or 1,399/year · displayed savings compare payment frequencies, not savings vs buying care separately · several FAQs defer to the Member Terms. Content review only — not a checkout or functionality audit' },
  { cat: 'Data still needed', color: CORAL, items: 'Member baseline — enrolments, payment status, sign-up dates, plan mix, usage, cancellations (owner: Gautam) · clinic prices and benefit-delivery costs (owner: finance/ops, to confirm) · page-level traffic and conversion data' },
];

const MODELS = [
  { n: '1', name: 'Employee-paid', text: 'Membership distributed through the employer. A discount code is a distribution mechanism — not evidence of bulk paid memberships. Cost-free to the employer.' },
  { n: '2', name: 'Employer-subsidized', text: 'Employer part-funds the membership. Cost to the employer depends on the subsidy — never described as free.' },
  { n: '3', name: 'Employer-paid', text: 'Employer buys memberships outright. The only model that is a bulk sale — reported as contracts, not "coverage".' },
];

const PILOT_SPEC = [
  'Target employer profile and geographic fit with branches',
  'Eligible employee count and the payment model (1, 2 or 3)',
  'Named employer sponsor and communication commitments',
  'Pilot duration, offer, and onboarding process',
  'On-site event scope, staffing, cost and delivery requirements (estimated per event — not assumed low-cost)',
  'Tracking code and attribution method',
  'Success criteria and a review date',
  'Reporting: employees reached → paid enrolments → activated members, plus delivery cost and contribution',
];

const TOUCHPOINTS: { channel: string; aware: string; consider: string; convert: string; retain: string }[] = [
  { channel: 'WhatsApp / CRM (consented segments)', aware: '', consider: '●', convert: '●', retain: '●' },
  { channel: 'In-clinic (front desk, QR)', aware: '', consider: '●', convert: '●', retain: '○' },
  { channel: 'Website + relevant page placements', aware: '○', consider: '●', convert: '●', retain: '' },
  { channel: 'Meta (eligibility-checked audiences)', aware: '●', consider: '●', convert: '○', retain: '' },
  { channel: 'Google Search (cost/offer intent)', aware: '', consider: '●', convert: '●', retain: '' },
  { channel: 'SEO membership + cost cluster', aware: '●', consider: '●', convert: '○', retain: '' },
  { channel: 'GMB / local (4.9★, 62 reviews)', aware: '●', consider: '●', convert: '', retain: '' },
  { channel: 'LinkedIn (corporate lane)', aware: '●', consider: '○', convert: '', retain: '' },
  { channel: 'Corporate on-site dental days', aware: '●', consider: '●', convert: '●', retain: '○' },
  { channel: 'Referral (member-get-member, test)', aware: '○', consider: '', convert: '●', retain: '●' },
];

const OFFLINE: { medium: string; reach: string; cost: string; attribution: string; verdict: 'Deferred' | 'Case by case'; note: string }[] = [
  { medium: 'Radio', reach: 'Broad, untargeted', cost: 'High', attribution: 'Very weak', verdict: 'Deferred', note: 'Does not resolve the constraints the pilot is testing; any future test needs evidence and a bounded measurement plan.' },
  { medium: 'Billboards / large outdoor', reach: 'Broad, untargeted', cost: 'High', attribution: 'Very weak', verdict: 'Deferred', note: 'Same logic as radio.' },
  { medium: 'Banners near the three clinics', reach: 'Local, catchment', cost: 'Low', attribution: 'Weak but bounded', verdict: 'Case by case', note: 'Judged on total cost, fit and attributable enrolments — small budget, near a branch.' },
  { medium: 'Mall / community activation', reach: 'Local, engaged', cost: 'Medium', attribution: 'Medium (on-the-spot sign-ups)', verdict: 'Case by case', note: 'Works when tied to on-the-spot enrolment with the QR flow; delivery cost counted in full.' },
  { medium: 'Corporate on-site dental days', reach: 'Precise (employees)', cost: 'Estimated per event', attribution: 'Strong (codes per employer)', verdict: 'Case by case', note: 'Often the best offline we have — but scope, staffing and clinical time are costed per event, not assumed low.' },
];

const MEASURES = [
  { kpi: 'Paid active memberships & registered members', def: 'Contracts separated from people (family plans); defined treatment of cancellations and failed payments.' },
  { kpi: 'Conversion rate', def: 'Paid enrolments ÷ an explicitly defined eligible or exposed audience, by channel.' },
  { kpi: 'Acquisition cost', def: 'Consistent cost allocation ÷ new paid memberships; attributed vs incremental distinguished. Ceiling set from measured economics, not invented.' },
  { kpi: 'Activation', def: 'First appropriate booking AND first completed appropriate visit, with defined cohort windows. A two-week pilot cannot establish 60-day activation or renewal.' },
  { kpi: 'Contribution', def: 'Revenue net of delivery and operating costs (no double-counted discounts), acquisition shown clearly. Annual payments = cash against future care obligations.' },
  { kpi: 'Incremental contribution', def: 'Estimated improvement vs what the same audience would have generated without the membership intervention (comparison group where practical).' },
  { kpi: 'Capacity & experience', def: 'Appointment availability, complaints, fulfilment of promised service levels — explicit expansion conditions.' },
  { kpi: 'Corporate results', def: 'Eligible/reached employees → paid enrolments → activated members, pilot costs, payment model.' },
  { kpi: 'Retention', def: 'Monthly-payment persistence and renewal by eligible cohort — two different measures, never conflated.' },
];

const FORTNIGHT = [
  { d: 'Day 3', t: 'Baseline: enrolments, payment status, sign-up dates, plan mix, usage, cancellations; traffic/conversion data', o: 'Gautam (data) · Fahad (traffic)' },
  { d: 'Day 5', t: 'Benefit-delivery costs, clinic prices, capacity and membership terms confirmed; realistic savings examples built', o: 'Finance/ops — owner to confirm' },
  { d: 'Day 5', t: 'Funnel, tracking, cohort definitions, objection log, pilot budget and initial expansion criteria defined', o: 'Fahad' },
  { d: 'Day 8', t: 'Front-desk explanation, targeted CRM messages, relevant website placements and onboarding journey prepared', o: 'Fahad + ZAVIS + front desk (Dr Luvi)' },
  { d: 'Day 10', t: 'Limited patient test live with a comparison group where practical; conversion, objections, bookings, capacity monitored', o: 'Fahad + ZAVIS' },
  { d: 'Day 12', t: 'Warm corporate discovery held (Michael Page contact, RBS, partners); one pilot defined with explicit commitments and economics', o: 'Fahad + Mr Akbar' },
  { d: 'Day 14', t: 'Fortnight review: fix, continue testing, or expand provisionally', o: 'Fahad → Mr Akbar' },
];

/* ── the 30-day mandate (Gautam, Action Map v4, 16 Sep) ───────── */

const MANDATE_MIX = [
  { ch: 'Existing DN clinics', n: 60, note: '3 clinics × 20 — Al Wasl, Dr Tosun, AMC (live clinic conversion)' },
  { ch: 'Corporate', n: 24, note: 'pipeline equivalent to ≥ 72 memberships required' },
  { ch: 'Website', n: 12, note: '150 qualified opportunities by Day 30 at 8% conversion' },
  { ch: 'Clinic reseller', n: 7, note: '2 resellers active and source-coded' },
  { ch: 'Affiliate', n: 7, note: '3 affiliates active and source-coded' },
  { ch: 'CSR', n: 4, note: '' },
  { ch: 'Broker', n: 3, note: '' },
  { ch: 'Distributor', n: 3, note: '' },
];

const CHECKPOINTS = [
  { d: '23 Sep · Day 7', plan: 36, min: 30 },
  { d: '30 Sep · Day 14', plan: 60, min: 50 },
  { d: '7 Oct · Day 21', plan: 88, min: 75 },
  { d: '16 Oct · Day 30', plan: 120, min: 120 },
];

const REGISTER = [
  { act: 'Accept the commercial mandate', dl: '17 Sep 10:00', who: 'Fahad', out: '120 by 16 Oct; bulk CRM target 0 — targets, deadlines and guardrails acknowledged in writing.' },
  { act: 'Submit the quantified marketing response', dl: '17 Sep EOD', who: 'Fahad', out: '100% of the 120 mapped: source forecast, qualified demand, conversion, spend, CAC, launch date, owner.' },
  { act: 'Close the historical CRM test', dl: '18 Sep EOD', who: 'Gautam shares data · Fahad reviews', out: '71 replies classified, 417 failures coded, new bulk sends 0 — reconciled to payment and membership records.' },
  { act: 'Activate the first acquisition portfolio', dl: '19 Sep EOD', who: 'Fahad', out: 'Every live activity has source, spend, forecast, destination and response owner.' },
  { act: 'Checkpoints (Day 7 / 14 / 21)', dl: '23 Sep · 30 Sep · 7 Oct', who: 'Fahad + Smile Club Coordinator; Day 21 with Gautam', out: '36/30 → 60/50 → 88/75 cumulative paid; recovery plan next business day if missed.' },
  { act: 'Complete the mandate', dl: '16 Oct', who: 'Gautam → Mr Akbar', out: '120 paid, active, non-refunded, source-coded; ≥98% data and attribution; Finance-validated.' },
];

const MANDATE_MAP = [
  { req: 'Existing DN clinics — 60', ours: 'Wave 1 front-desk route + onboarding (front desk + Dr Luvi): one consistent explanation, QR at three branches, first-appointment help, objection log.' },
  { req: 'Corporate — 24 (pipeline ≥ 72)', ours: 'Corporate playbook: warm doors (Michael Page HR contact, RBS, partners) + the three warm introductions the mandate asks Mr Akbar to provide (CEO approval item 6).' },
  { req: 'Website — 12 (150 qualified @ 8%)', ours: 'Wave 1 relevant placements + Wave 2 SEO membership cluster and eligibility-checked paid tests; ZAVIS pilot LP live.' },
  { req: 'Reseller / affiliate / broker / distributor / CSR — 24', ours: 'NEW commercial-access lane the mandate adds beyond rev. 2 — folds into the B2B mechanics (partner codes, QR links, referral agreements) with per-partner source codes.' },
  { req: 'Bulk CRM: target 0, budget 0', ours: 'Aligned with our audience-eligibility and consent rule. The Wave 1 CRM test stays limited, consented and non-bulk — scope confirmed against the CRM hold.' },
  { req: 'CAC ≤ Finance ceiling · daily spend/forecast', ours: 'Our economics gate — "allowable CAC from measured economics" — now given its owner: Finance sets the ceiling, Mr Akbar signs it.' },
  { req: '≥ 98% data & attribution · dashboard spine (enquiry → qualified → checkout → paid → card active → booked → attended)', ours: 'Exactly the measurement machinery of rev. 2 — activation tracked as first booking AND first completed visit; the spine answers the console-tracking question we posed to Gautam.' },
  { req: '3× pipeline coverage · 09:00 review · 16:00 recovery · EOD scorecard', ours: 'The daily operating rhythm the pilot reports into; the objection log and comparison-group reads feed the same reviews.' },
];

/* ── sub-views ─────────────────────────────────────────────────── */

function MandateTab() {
  const maxMix = MANDATE_MIX[0].n;
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">The owner has set the outcome: 120 paid memberships by 16 October.</span>{' '}
        Gautam&apos;s Marketing Activation Action Map (v4, 16 Sep) mandates the result and delegates the method —
        which is precisely the ownership split rev. 2 called for. This page maps his requirements onto this plan&apos;s
        machinery, one to one. Guardrails: ≥3× pipeline coverage · CAC within the Finance ceiling · ≥98% data &amp;
        attribution · bulk CRM at zero · family counts as one contract.
      </p>

      <section>
        <Exhibit n="M1" title="The 120, by source — and the checkpoint line" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-2 text-[11px] font-semibold" style={{ color: NAVY }}>Paid membership target by channel</p>
            {MANDATE_MIX.map((m) => (
              <div key={m.ch} className="mb-1.5 flex items-center gap-2">
                <span className="w-[118px] shrink-0 text-[10.5px]" style={{ color: '#3a4148' }}>{m.ch}</span>
                <div className="h-3.5 flex-1 rounded-full" style={{ backgroundColor: '#EEEFE1' }}>
                  <div className="h-3.5 rounded-full" style={{ width: `${Math.max(4, Math.round((m.n / maxMix) * 100))}%`, backgroundColor: m.ch === 'Existing DN clinics' ? NAVY : BLUE }} />
                </div>
                <span className="w-[24px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums" style={{ color: NAVY }}>{m.n}</span>
              </div>
            ))}
            <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>Existing DN = live clinic conversion (50% of the mix). Bulk CRM contributes zero.</p>
          </Card>
          <Card>
            <p className="mb-2 text-[11px] font-semibold" style={{ color: NAVY }}>Management checkpoints — plan / minimum</p>
            <div className="space-y-2">
              {CHECKPOINTS.map((c, i) => (
                <div key={c.d} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: i === CHECKPOINTS.length - 1 ? CORAL : NAVY }}>{i + 1}</span>
                  <span className="w-[104px] shrink-0 text-[11px] font-bold" style={{ color: NAVY }}>{c.d}</span>
                  <div className="h-3.5 flex-1 rounded-full" style={{ backgroundColor: '#EEEFE1' }}>
                    <div className="h-3.5 rounded-full" style={{ width: `${Math.round((c.plan / 120) * 100)}%`, backgroundColor: i === CHECKPOINTS.length - 1 ? CORAL : GOLD }} />
                  </div>
                  <span className="w-[58px] shrink-0 text-right text-[10.5px] tabular-nums" style={{ color: '#3a4148' }}><b>{c.plan}</b> / {c.min}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>A missed minimum triggers a recovery plan the next business day. Day-15–30 funding releases after the 30 Sep review.</p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="M2" title="Action register — deadlines this week" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Action</th><th className="px-3 py-2 font-bold">Deadline</th>
                <th className="px-3 py-2 font-bold">Accountable</th><th className="px-3 py-2 font-bold">Completion looks like</th>
              </tr>
            </thead>
            <tbody>
              {REGISTER.map((r) => (
                <tr key={r.act} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{r.act}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap font-bold" style={{ color: CORAL }}>{r.dl}</td>
                  <td className="px-3 py-1.5" style={{ color: OLIVE }}>{r.who}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{r.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="M3" title="The logical map — his requirement, our machinery" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold" style={{ width: '40%' }}>Mandate requires (Gautam)</th>
                <th className="px-3 py-2 font-bold">Delivered by (this plan)</th>
              </tr>
            </thead>
            <tbody>
              {MANDATE_MAP.map((m) => (
                <tr key={m.req} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{m.req}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{m.ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 space-y-2">
          <Note tone="gold">
            How the two documents fit: rev. 2 said targets should be &quot;set from baseline and economics&quot; by the
            owner — the mandate is the owner doing exactly that, with fixed checkpoints replacing this plan&apos;s
            indicative dates. The measurement definitions, consent rules and economics gates of rev. 2 remain the
            control system the mandate is tracked with. First hard funnel data also arrives with it: the historical
            CRM test (71 replies, 417 failures to reconcile) closes 18 Sep.
          </Note>
          <Note tone="coral">
            Open before launch (17 Sep): Mr Akbar&apos;s sign-off — 30-day budget ceiling, allowable CAC and initial
            release are blank in the mandate; plus the three warm corporate introductions and confirmation of the
            CRM hold. Fahad&apos;s quantified response is due 17 Sep EOD.
          </Note>
        </div>
      </section>
    </div>
  );
}

function Recommendation() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[13px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">Recommendation: proceed with a focused, measurable pilot; expand when the evidence supports it.</span>{' '}
        Start with existing patients and clinic touchpoints, validate the offer and its economics, run one clearly
        defined corporate pilot through a warm door, and defer expensive awareness media. Scale is a decision we earn
        with data at the end of the pilot — not a calendar commitment we make today.
      </p>

      <section>
        <Exhibit n={1} title="The diagnosis — hypotheses to test, not settled facts" />
        <Card>
          <p className="text-[12px] leading-snug" style={{ color: '#3a4148' }}>
            We have distribution assets; <span className="font-semibold">qualified reach and conversion remain to be
            measured</span>. Existing patients may trust the brand and still find the membership poor value,
            unaffordable, confusing, inconvenient or hard to use. Affinity, value, affordability, clarity and
            convenience are all candidate constraints — the pilot is designed to tell them apart.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['Affinity', 'Value', 'Affordability', 'Clarity', 'Convenience'].map((h) => <Tag key={h} color={CORAL}>{h} — hypothesis</Tag>)}
          </div>
          <p className="mt-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
            <span className="font-semibold" style={{ color: NAVY }}>During the pilot:</span> a small sample of member and
            non-buyer interviews, plus structured objection logging at the front desk and in CRM replies. The
            existing-patients → proof → corporate sequence stays as the starting strategy — the sensible first route,
            not the only one.
          </p>
        </Card>
      </section>

      <section>
        <Exhibit n={2} title="What is fact, what is reported, what is unknown" />
        <div className="space-y-2">
          {FACTS.map((f) => (
            <div key={f.cat} className="rounded-lg border-l-4 bg-white px-3 py-2" style={{ borderColor: f.color }}>
              <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: f.color }}>{f.cat}</p>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{f.items}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OfferEconomics() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={3} title="Validate and clarify the offer before scaling promotion" />
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>The savings math — with actual prices, not assumptions</p>
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-medium" style={{ backgroundColor: '#EEF4F6', color: NAVY }}>
            Net customer saving = usual price of the same expected, clinically appropriate care without membership −
            membership fee − remaining charges for that care with membership
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Distinguish annual-vs-monthly billing savings from savings versus buying care separately — the public page currently displays the former.',
              'Do not assume every included benefit is needed, used, or always available.',
              'Individual and family examples built once actual price inputs are confirmed (owner: finance/ops, to confirm) — no invented figures.',
              'Terms understandable before purchase: inclusions, exclusions, frequencies, availability, discount-combination rules, minimum commitment, cancellation, renewal, insurance/offer interaction. Several FAQs currently defer to the Member Terms.',
              'Distinct from insurance — positioned against verified coverage gaps for the specific audience.',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: MINT }} />{t}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Note tone="gold">
              Public-page observations, 12 Sep 2026 (recheck before use): Essential AED 99/month or AED 999/year ·
              Plus AED 139/month or AED 1,399/year. Content review only — not a checkout or functionality audit.
            </Note>
          </div>
        </Card>
      </section>

      <section>
        <Exhibit n={4} title="Economics, incrementality and capacity — the expansion gate" />
        <div className="grid gap-2 md:grid-cols-2">
          {([
            ['Contribution, not revenue', 'Membership contribution after the cost of delivering included care, discounts, payment processing, support, refunds and acquisition. If treatment revenue is already net of discounts, they are not deducted twice.'],
            ['Incrementality', 'Does the offer drive additional profitable visits, or mainly discount care patients would have bought anyway? Comparison group where practical; platform attribution alone does not prove incrementality.'],
            ['True channel costs', 'Staff time, creative review, messaging costs and event delivery counted. Existing tools reduce production effort; they do not make execution free.'],
            ['Allowable CAC from economics', 'The acquisition-cost ceiling and payback criterion come from measured economics — no universal CAC or LTV target is invented.'],
            ['Cash vs profit', 'Annual payments are cash received against future care obligations — not automatically profit available for expansion.'],
            ['Capacity as a gate', 'Branch appointment availability, staff workload and delivery capacity are explicit expansion conditions — selling memberships we cannot serve destroys renewals and the brand.'],
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: LINE }}>
              <p className="text-[11px] font-bold" style={{ color: NAVY }}>{t}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: OLIVE }}>{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Waves() {
  const [wid, setWid] = useState('wave1');
  const w = WAVES.find((x) => x.id === wid)!;
  return (
    <div>
      <Exhibit n={5} title="Three waves — indicative dates, evidence-gated expansion" />
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Expansion at each step depends on: reliable measurement and clear offer terms · evidence of conversion and
        appropriate activation · acceptable acquisition cost and expected contribution (with sensitivity to
        utilization and cancellation) · sufficient appointment capacity and acceptable member experience. Early
        expansion can be limited and provisional while longer-term cohorts mature.
      </p>
      <div className="mb-3 flex flex-wrap items-stretch gap-1.5">
        {WAVES.map((x) => (
          <button
            key={x.id} type="button" onClick={() => setWid(x.id)}
            className="min-w-[160px] flex-1 rounded-xl border-2 px-3 py-2 text-left transition"
            style={wid === x.id ? { borderColor: x.color, backgroundColor: 'white', boxShadow: `0 0 0 3px ${GOLD}44` } : { borderColor: LINE, backgroundColor: 'white', opacity: 0.75 }}
          >
            <p className="text-[11.5px] font-bold" style={{ color: x.color }}>{x.label}</p>
            <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: OLIVE }}>{x.horizon}</p>
            <p className="mt-0.5 text-[10px] leading-tight" style={{ color: '#3a4148' }}>{x.tag}</p>
          </button>
        ))}
      </div>
      <Card accent={w.color}>
        <p className="text-[12px] font-medium leading-snug" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{w.intro}</p>
        <div className="mt-3 space-y-2">
          {w.plays.map((p) => (
            <div key={p.title} className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#EEEFE1' }}>
              <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                <p className="text-[12px] font-bold" style={{ color: NAVY }}>{p.title}</p>
                <span className="flex gap-1"><Tag color={w.color}>{p.engine}</Tag><Tag color={OLIVE}>{p.owner}</Tag></span>
              </div>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{p.detail}</p>
            </div>
          ))}
        </div>
      </Card>
      <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
        Reinvestment rule: a wave funds the next only after considering contribution, cash requirements and future
        benefit obligations — annual fees are prepaid care, not free cash.
      </p>
    </div>
  );
}

function Corporate() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={6} title="Three corporate models — reported separately, never blurred" />
        <div className="grid gap-2 md:grid-cols-3">
          {MODELS.map((m) => (
            <div key={m.n} className="rounded-xl border-2 bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[11px] font-bold" style={{ color: NAVY }}><span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-white" style={{ backgroundColor: NAVY }}>{m.n}</span>{m.name}</p>
              <p className="mt-1.5 text-[10.5px] leading-snug" style={{ color: OLIVE }}>{m.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px]" style={{ color: OLIVE }}>
          Vocabulary: <span className="font-semibold" style={{ color: NAVY }}>eligible employees → paid enrolments → activated members</span> (plus
          registered beneficiaries on family plans) — never &quot;employees covered&quot;. The promise is{' '}
          <span className="font-semibold" style={{ color: NAVY }}>low administration with responsibilities agreed upfront</span>, not &quot;zero admin&quot;.
        </p>
      </section>

      <section>
        <Exhibit n={7} title="One defined pilot — the full specification" />
        <Card>
          <ul className="grid gap-1.5 md:grid-cols-2">
            {PILOT_SPEC.map((s) => (
              <li key={s} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: BLUE }} />{s}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Note tone="blue">
              Warm discovery runs in parallel from day one — Michael Page (named HR contact), RBS, existing partners.
              Discovery conversations do not wait for a finished patient case study; only the broad outbound push does.
            </Note>
          </div>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>The objection we must beat</p>
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] italic leading-snug" style={{ backgroundColor: '#FBEFEC', color: NAVY }}>
            &quot;Why Dental Nation? Our employees could get a membership anywhere.&quot;
          </p>
          <p className="mt-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
            Answered with the clinic trust signals we hold today (4.9★ across 62 public reviews, three branches, named
            doctors) plus membership-specific evidence as the pilot produces it — usage, savings, member experience.
            Clinic reviews are trust signals; they are not by themselves proof of membership value.
          </p>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Reporting & permissions</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Aggregated employer reporting only — never individual treatment information; small groups handled so no one is identifiable.',
              'Employee feedback, photos or testimonials only with appropriate permission.',
              'No implied employer endorsement or logo use before it is granted.',
              'On-site day scope, staffing, cost and clinical time estimated per event — not assumed low-cost.',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: MINT }} />{t}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function Channels() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={8} title="Audience eligibility — checked before activation, not after" />
        <Card accent={CORAL}>
          <p className="text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
            The earlier draft called the uploaded patient audiences &quot;one switch away&quot;. Corrected:{' '}
            <span className="font-semibold" style={{ color: CORAL }}>a documented eligibility check precedes any patient-list targeting</span> (owner: Fahad, before Wave 1 paid activation).
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Google restricts advertiser-curated audiences (Customer Match, remarketing lists) when promoting sensitive health categories — applicability depends on the actual services, content and targeting.',
              "Meta's customer-list terms require the necessary rights, permissions and a lawful basis; an uploaded audience does not by itself establish that a given use is appropriate.",
              'CRM outreach: contact permissions and suppression/opt-out handling confirmed before the first broadcast.',
              'Where audience use is unsuitable: eligible search-intent or geographic tests instead, after checking the proposed campaign.',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: CORAL }} />{t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>A proportionate check, not a compliance programme. Sources: Google &quot;Health in personalised advertising&quot; policy; Meta Customer List Custom Audiences Terms (both consulted 12 Sep 2026).</p>
        </Card>
      </section>

      <section>
        <Exhibit n={9} title="Touchpoint map — our first channels to test for conversion" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          ● primary role to test · ○ supporting role. Each channel gets one job in the membership funnel; the test
          tells us which ones actually close.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Channel</th>
                <th className="px-3 py-2 text-center font-bold">Awareness</th>
                <th className="px-3 py-2 text-center font-bold">Consideration</th>
                <th className="px-3 py-2 text-center font-bold">Conversion</th>
                <th className="px-3 py-2 text-center font-bold">Retention</th>
              </tr>
            </thead>
            <tbody>
              {TOUCHPOINTS.map((t) => (
                <tr key={t.channel} className="border-t" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{t.channel}</td>
                  {[t.aware, t.consider, t.convert, t.retain].map((v, i) => (
                    <td key={i} className="px-3 py-1.5 text-center text-[13px]" style={{ color: v === '●' ? BLUE : '#C9C9BC' }}>{v || '·'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n={10} title="The offline verdict" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Medium</th><th className="px-3 py-2 font-bold">Reach</th>
                <th className="px-3 py-2 font-bold">Cost</th><th className="px-3 py-2 font-bold">Attribution</th>
                <th className="px-3 py-2 font-bold">Verdict</th><th className="px-3 py-2 font-bold">Why</th>
              </tr>
            </thead>
            <tbody>
              {OFFLINE.map((o) => (
                <tr key={o.medium} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{o.medium}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{o.reach}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{o.cost}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{o.attribution}</td>
                  <td className="px-3 py-1.5">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={o.verdict === 'Deferred' ? { backgroundColor: '#FBEFEC', color: CORAL } : { backgroundColor: '#FDF6E3', color: '#7a6420' }}>{o.verdict}</span>
                  </td>
                  <td className="px-3 py-1.5" style={{ color: OLIVE }}>{o.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          The trigger for ever testing broad offline is evidence and a bounded measurement plan — not simply
          &quot;digital is saturated&quot;.
        </p>
      </section>
    </div>
  );
}

function Kpis() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={11} title="Measurement — defined denominators, no invented targets" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Measure</th><th className="px-3 py-2 font-bold">Definition / purpose</th>
              </tr>
            </thead>
            <tbody>
              {MEASURES.map((k) => (
                <tr key={k.kpi} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold whitespace-nowrap" style={{ color: NAVY }}>{k.kpi}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{k.def}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <Note tone="coral">
            Where inputs are missing the plan says &quot;baseline pending&quot; or &quot;target to be set from
            baseline and economics&quot; — the member baseline sits with Gautam (on the pending ledger). Utilization
            is encouraged only where clinically appropriate, never to improve a metric.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n={12} title="The first fortnight — preparation and measurement before broad activation" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Due</th><th className="px-3 py-2 font-bold">Deliverable</th><th className="px-3 py-2 font-bold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {FORTNIGHT.map((f, i) => (
                <tr key={i} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: CORAL }}>{f.d}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{f.t}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: OLIVE }}>{f.o}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ── the tab ───────────────────────────────────────────────────── */

const SUBS: { id: Sub; label: string }[] = [
  { id: 'reco', label: 'The recommendation' },
  { id: 'mandate', label: '30-day mandate' },
  { id: 'offer', label: 'Offer & economics' },
  { id: 'waves', label: 'Three waves' },
  { id: 'corporate', label: 'Corporate playbook' },
  { id: 'channels', label: 'Channels & offline' },
  { id: 'kpis', label: 'Measurement & fortnight' },
];

export function SmileClubOptimization() {
  const [sub, setSub] = useState<Sub>('reco');
  return (
    <section className="mx-auto max-w-[980px]">
      <header className="mb-3 border-b border-line pb-3">
        <p className="eyebrow text-accent">Growth Programme · Smile Club</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink" style={{ fontFamily: 'Georgia, serif' }}>
          Smile Club — membership growth plan
        </h1>
        <p className="mt-1 max-w-[720px] text-[12px] leading-snug text-ink-soft">
          Prepared for Mr Akbar · rev. 2, 12 Sep 2026 (incorporating external review) · Gautam&apos;s 30-day
          activation mandate (v4, 16 Sep) mapped in. A focused, measurable pilot — offer validation, contribution
          economics and capacity as expansion gates, one defined corporate pilot through warm doors, offline
          deferred until the evidence earns it — now running against the owner&apos;s mandated outcome: 120 paid
          memberships by 16 October.
        </p>
      </header>
      <div className="flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: LINE }}>
        {SUBS.map((s) => (
          <button
            key={s.id} type="button" onClick={() => setSub(s.id)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
            style={sub === s.id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {sub === 'reco' && <Recommendation />}
        {sub === 'mandate' && <MandateTab />}
        {sub === 'offer' && <OfferEconomics />}
        {sub === 'waves' && <Waves />}
        {sub === 'corporate' && <Corporate />}
        {sub === 'channels' && <Channels />}
        {sub === 'kpis' && <Kpis />}
      </div>
    </section>
  );
}
