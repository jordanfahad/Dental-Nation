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

type Sub = 'reco' | 'mandate' | 'response' | 'dm' | 'offer' | 'waves' | 'corporate' | 'channels' | 'kpis';

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
      { title: 'High-intent triggered contact — replaces the broad CRM test', engine: 'CRM / WhatsApp', owner: 'Fahad + CRM-DN + contact centre', detail: 'LEARNING APPLIED (12 Sep update): five campaign sends (3 doctor-led + retry + follow-up; 1,280 non-unique reach, 863 delivered, 71 replies) proved broadcast engagement comes back appointment-led, not membership-led — so no further broadcast testing. Instead: event-triggered, 1-to-1 consented contact at high-intent moments — open treatment plans, due preventive recalls, completed SOS follow-ups, website abandoners — each source-coded.' },
      { title: 'Front-desk route', engine: 'In-clinic', owner: 'Front desk + Dr Luvi', detail: 'The enablement already exists from the programme build: Reception Conversion Guide (Ask → Match → Value → Clarify → Close), reception member deck, objection handling and Emirati Arabic scripts, plus value-discovery training completed. Wave 1 executes it: QR at the three branches, the offer at checkout, and a structured objection log from day one.' },
      { title: 'Relevant placements only', engine: 'Owned web', owner: 'CRM-DN + W3Layouts', detail: 'Membership placements on the most relevant pages with demonstrated traffic, prioritised by actual local intent and conversion potential — page count alone is not opportunity. Relevant cost-guide readers are a testable prospect audience.' },
      { title: 'Onboarding & activation — in Wave 1', engine: 'Member experience', owner: 'Fahad + Gautam + front desk', detail: 'Welcome and clear benefits/terms; help arranging the first clinically appropriate appointment; first booking and first completed visit tracked separately; care-plan reminders; payment-failure follow-up; cancellation reasons; renewal prep; a member value statement showing actual benefits received.' },
      { title: 'Corporate discovery in parallel', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Warm HR conversations start now (Michael Page contact, RBS, existing partners) — discovery does not wait for a finished case study.' },
    ],
  },
  {
    id: 'wave2', label: 'Wave 2 · Scale what the evidence supports', tag: 'Paid tests + SEO + one defined corporate pilot', horizon: 'Indicative: weeks 3–8', color: BLUE,
    intro: 'Budget follows measured conversion — and every paid audience passes the eligibility check first.',
    plays: [
      { title: 'Paid acquisition tests', engine: 'Paid', owner: 'Fahad', detail: 'After the audience-eligibility check: eligible search-intent and geographic tests first; patient-list targeting only where confirmed appropriate. Offer-led CTWA and Google Search on cost/offer intent.' },
      { title: 'SEO membership cluster', engine: 'SEO', owner: 'CRM-DN', detail: 'Dedicated EN/AR membership pages plus a membership module on the highest-traffic relevant cost and treatment pages.' },
      { title: 'One defined corporate pilot', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'One employer, explicit commitments and economics — full specification in the Corporate playbook.' },
      { title: 'Creative production', engine: 'Creative OS', owner: 'CRM-DN', detail: 'Automation supports asset production; offer accuracy, clinical review, suitability and performance still need validation before scale.' },
      { title: 'Referral mechanic — as a test', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Build member-get-member and measure its contribution. Referral is a channel to test, not an assumed winner.' },
    ],
  },
  {
    id: 'wave3', label: 'Wave 3 · Compound, if the gate opens', tag: 'Corporate expansion + selective offline, funded by measured contribution', horizon: 'Indicative: quarter +', color: NAVY,
    intro: 'With measured economics and a pilot case study, widen the funnel. Reinvest only after considering contribution, cash requirements and future benefit obligations.',
    plays: [
      { title: 'Corporate expansion', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Outbound to a named employer list opened with the pilot case study; benefits platforms, chambers, HR communities.' },
      { title: 'Insurance-gap positioning', engine: 'Messaging', owner: 'Fahad', detail: 'Positioned against verified dental-coverage gaps for the specific audience — not an assumption about all employees.' },
      { title: 'LinkedIn corporate lane', engine: 'Content OS', owner: 'CRM-DN', detail: 'A corporate-benefits content lane aimed at HR titles, warming the outbound list.' },
      { title: 'Selective offline', engine: 'Offline', owner: 'Fahad', detail: 'Judged case by case on audience fit, total delivery cost, attributable enrolments and feasibility — see the offline verdict. Radio and billboards stay deferred.' },
      { title: 'Retention economics', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Monthly-payment persistence and renewal by cohort. Renewal and lifetime value are not validated by a short pilot — cohorts must mature first.' },
    ],
  },
];

/**
 * Results to date, wave by wave — ONLY what Gautam has shared (the 12 Sep
 * management progress update and Action Map v4, 16 Sep). No numbers are
 * invented; where an outcome awaits reconciliation it says so.
 */
const WAVE_RESULTS: Record<string, { verdict: string; items: string[] }> = {
  wave1: {
    verdict: 'Tested — the broadcast lane is closed by evidence; the in-clinic lane is fully enabled and now carries the 60.',
    items: [
      'Broadcast CRM test (5 sends: 3 doctor-led + retry + follow-up): 1,280 non-unique reach · 863 delivered · 71 replies · 417 failures to code. Engagement came back appointment-led, not membership-led — 0 memberships confirmed from broadcast pending the payment-record reconciliation (closes 18 Sep). Consequence: bulk sends target 0, budget 0; triggered 1-to-1 contact replaces it.',
      'Front-desk enablement DELIVERED by the programme build: reception member deck, Reception Conversion Guide (Ask → Match → Value → Clarify → Close), objection handling and Emirati Arabic scripts, value-discovery training completed — Wave 1 executes assets that already exist.',
      'Product & governance in place: four plans live with an online joining route; Member Agreement v1.3 governs eligibility, family structure, payments, cancellation and failed-payment rules.',
    ],
  },
  wave2: {
    verdict: 'Partially entered — partnership GTM is built and activating; paid scale waits on the creative unlock.',
    items: [
      'Partnership go-to-market: bilingual community-partnership decks and an organisation-specific proposal complete; partner outreach active, first activations being scheduled (12 Sep update).',
      'Paid + owned: CRM-DN pilot landing page live with search ads following; the membership SEO cluster is tasked. Meta dynamic/smart-creative formats are HELD by the creative blocker (see the Digital marketing plan) — offer-led statics and search carry paid until the designer unlock.',
      'No paid-channel conversion results exist yet — the first source-coded funnel reads arrive with the 23 Sep Day-7 checkpoint.',
    ],
  },
  wave3: {
    verdict: 'Not entered — by design. The evidence gate has not opened; only the corporate doors are being warmed.',
    items: [
      'Corporate: warm doors named and outreach mandated by Mr Akbar — Assembly Global and Michael Page (Fahad’s contacts) plus ArabyAds through the existing partner relationship. Timeline and asks in the Digital marketing plan.',
      'No Wave-3 spend, no offline commitments, no expansion claims — Wave 3 opens only on measured contribution from Waves 1–2.',
    ],
  },
};

const FACTS: { cat: string; color: string; items: string }[] = [
  { cat: 'Established (our own platform)', color: '#2C5E3F', items: 'Smile Club product + admin console live · 4.9★ across 62 GMB reviews · patient audience lists exist in both ad accounts · warm corporate contacts (Michael Page HR contact, RBS, current partners)' },
  { cat: 'Source-reported (CRM-DN — not independently verified)', color: BLUE, items: '25 WhatsApp segments with automated creative generation · 19,500+ programmatic SEO pages · Patient Intelligence ↔ Content OS API integration' },
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
  { d: 'Day 8', t: 'Front-desk explanation, targeted CRM messages, relevant website placements and onboarding journey prepared', o: 'Fahad + CRM-DN + front desk (Dr Luvi)' },
  { d: 'Day 10', t: 'Limited patient test live with a comparison group where practical; conversion, objections, bookings, capacity monitored', o: 'Fahad + CRM-DN' },
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
  { act: 'Close the historical CRM test', dl: '18 Sep EOD', who: 'Gautam shares data · Fahad reviews', out: '71 replies classified, 417 failures coded, new bulk sends 0 — reconciled to payment and membership records. Campaign-level numbers received via the 12 Sep progress update (5 sends, 1,280 non-unique reach, 863 delivered); the payment-record reconciliation review remains.' },
  { act: 'Activate the first acquisition portfolio', dl: '19 Sep EOD', who: 'Fahad', out: 'Every live activity has source, spend, forecast, destination and response owner.' },
  { act: 'Checkpoints (Day 7 / 14 / 21)', dl: '23 Sep · 30 Sep · 7 Oct', who: 'Fahad + Smile Club Coordinator; Day 21 with Gautam', out: '36/30 → 60/50 → 88/75 cumulative paid; recovery plan next business day if missed.' },
  { act: 'Complete the mandate', dl: '16 Oct', who: 'Gautam → Mr Akbar', out: '120 paid, active, non-refunded, source-coded; ≥98% data and attribution; Finance-validated.' },
];

const MANDATE_MAP = [
  { req: 'Existing DN clinics — 60', ours: 'Wave 1 front-desk route + onboarding (front desk + Dr Luvi): one consistent explanation, QR at three branches, first-appointment help, objection log.' },
  { req: 'Corporate — 24 (pipeline ≥ 72)', ours: 'Corporate playbook: warm doors (Michael Page HR contact, RBS, partners) + the three warm introductions the mandate asks Mr Akbar to provide (CEO approval item 6).' },
  { req: 'Website — 12 (150 qualified @ 8%)', ours: 'Wave 1 relevant placements + Wave 2 SEO membership cluster and eligibility-checked paid tests; CRM-DN pilot LP live.' },
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

/* ── Fahad's 30-day delivery plan (the quantified response, v1 · 17 Sep) ── */

interface ResponseRow {
  source: string; target: number; demand: string; method: string; launch: string; code: string; owner: string;
}

const RESPONSE_ROWS: ResponseRow[] = [
  {
    source: 'Existing DN clinics', target: 60,
    demand: '20 per branch. Demand basis: live patient flow at Al Wasl, Dr Tosun, AMC — conversion assumption to be validated against branch footfall in week 1.',
    method: 'Front-desk script + QR standee at all three branches; the offer made at the checkout moment with the savings example; onboarding (first appointment help) from day one. Daily per-branch count in the 09:00 review.',
    launch: '18–19 Sep', code: 'SC-ALW / SC-TOS / SC-AMC (QR per branch)', owner: 'Front desk + Dr Luvi · reported by Smile Club Coordinator',
  },
  {
    source: 'Corporate', target: 24,
    demand: 'Pipeline ≥ 72 membership-equivalent (mandate requirement, ~33% assumed close). Built from: Michael Page HR contact, RBS, existing partners + the 3 warm introductions requested from Mr Akbar.',
    method: 'Pilot package per employer: company code + on-site dental day + quarterly aggregated usage report. Discovery meetings this week; model (employee-paid / subsidized / employer-paid) agreed per employer.',
    launch: 'Discovery now · first pilot live w/c 22 Sep', code: 'One code per employer', owner: 'Fahad + Mr Akbar',
  },
  {
    source: 'Website', target: 12,
    demand: '150 qualified opportunities by Day 30 at 8% conversion (mandate assumption). Sources: membership placements on demonstrated-traffic pages, cost-guide module, CRM-DN pilot LP traffic.',
    method: 'Membership placements + Smile Club module on top cost/treatment pages (CRM-DN); eligibility-checked paid support — search-intent tests and offer-led CTWA; 10-minute contact-centre follow-up on qualified enquiries.',
    launch: '19 Sep (with the portfolio)', code: 'UTM + source field per placement/campaign', owner: 'Fahad + CRM-DN · contact centre for follow-up',
  },
  {
    source: 'Clinic resellers', target: 7,
    demand: '2 resellers active and source-coded (mandate requirement).',
    method: 'Reseller agreements + per-partner codes and QR links (the B2B mechanics already tasked: partner codes, QR links, referral agreements).',
    launch: 'Agreements w/c 22 Sep', code: 'Per-partner code', owner: 'Fahad',
  },
  {
    source: 'Affiliates', target: 7,
    demand: '3 affiliates active and source-coded (mandate requirement).',
    method: 'Affiliate agreements with tracked links/codes; commission structure priced within the CAC ceiling once Finance sets it.',
    launch: 'Agreements w/c 22 Sep', code: 'Per-affiliate code', owner: 'Fahad',
  },
  {
    source: 'CSR', target: 4,
    demand: 'Community/CSR activation near the branches.',
    method: 'On-the-spot enrolment with the QR flow at community events; costed per event before commitment.',
    launch: 'First event by early Oct', code: 'Per-event code', owner: 'Fahad',
  },
  {
    source: 'Brokers', target: 3,
    demand: 'Source-coded broker agreements.',
    method: 'Same mechanics as resellers; terms within the CAC ceiling.',
    launch: 'w/c 22 Sep', code: 'Per-broker code', owner: 'Fahad',
  },
  {
    source: 'Distributors', target: 3,
    demand: 'Source-coded distributor agreements.',
    method: 'Same mechanics as resellers; terms within the CAC ceiling.',
    launch: 'w/c 22 Sep', code: 'Per-distributor code', owner: 'Fahad',
  },
];

function ResponseTab() {
  const total = RESPONSE_ROWS.reduce((a, r) => a + r.target, 0);
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">Fahad&apos;s quantified marketing response — v1.2, 19 Sep.</span>{' '}
        100% of the 120 mapped to source, demand basis, method, launch date, tracking and owner. The budget panel
        (R2) carries Fahad&apos;s proposed AED 30,000 DM budget with an honest CPL/CAC decomposition — marked
        PROPOSED until Mr Akbar signs the ceiling, allowable CAC and initial release. Bulk CRM: target 0, budget 0,
        per the mandate. v1.2 applies the 12 Sep programme-update learnings: broadcast CRM testing is dropped for
        high-intent triggered contact, and plays now use the enablement assets the programme has already built.
      </p>

      <section>
        <Exhibit n="R1" title={`The 120, sourced and owned — ${total}/120 mapped`} />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Source</th><th className="px-2.5 py-2 text-center font-bold">Paid</th>
                <th className="px-2.5 py-2 font-bold">Qualified demand & assumption</th><th className="px-2.5 py-2 font-bold">Method</th>
                <th className="px-2.5 py-2 font-bold">Launch</th><th className="px-2.5 py-2 font-bold">Tracking</th><th className="px-2.5 py-2 font-bold">Owner</th>
              </tr>
            </thead>
            <tbody>
              {RESPONSE_ROWS.map((r) => (
                <tr key={r.source} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{r.source}</td>
                  <td className="px-2.5 py-1.5 text-center font-bold tabular-nums" style={{ color: CORAL }}>{r.target}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{r.demand}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{r.method}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap" style={{ color: OLIVE }}>{r.launch}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{r.code}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{r.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="R2" title="Budget — AED 30,000 / 30 days (PROPOSED, pending Mr Akbar's sign-off)" />
        <div className="grid gap-2 md:grid-cols-3">
          {([
            ['AED 30,000', 'DM budget · 30 days', 'Full digital budget supporting all lanes — awareness, retargeting, corporate air-cover, offer creative — not only direct website acquisition.'],
            ['≤ AED 250', 'Blended CAC guardrail', '= 30,000 ÷ 120. Mandate-level metric: 18–25% of the first-year fee (AED 999–1,399). Achieved via the low-media channels delivering their 108 — it is not an ad-performance metric.'],
            ['CPL 150 · ceiling 200', 'Paid-lane cost per lead', 'Target 150; 200 is the hard break-point — above it the website-12 target is mathematically dead within this budget (150 leads × 200 = the full 30K).'],
          ] as [string, string, string][]).map(([v, l, s]) => (
            <div key={l} className="rounded-xl border bg-white px-3 py-2.5" style={{ borderColor: LINE }}>
              <p className="text-[16px] font-bold tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{v}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>{l}</p>
              <p className="mt-0.5 text-[10px] leading-snug" style={{ color: OLIVE }}>{s}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Paid-lane scenario</th><th className="px-3 py-2 text-center font-bold">Cost of 150 leads</th>
                <th className="px-3 py-2 text-center font-bold">Leads within 30K</th><th className="px-3 py-2 text-center font-bold">Paid @ 8%</th>
                <th className="px-3 py-2 text-center font-bold">Paid-lane CAC</th><th className="px-3 py-2 font-bold">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['CPL 150 — target', 'AED 22,500', '200', '16', '~AED 1,875', 'Website-12 beaten with 7.5K headroom for the other lanes.'],
                ['CPL 200 — ceiling', 'AED 30,000', '150', '12', 'AED 2,500', 'Exactly on plan; zero headroom — the operating break-point.'],
                ['CPL 500 — downside', 'AED 75,000 (2.5× budget)', '60', '~5', '~AED 6,000', 'Recovery trigger: shift budget to clinic/corporate enablement + warm audiences; website target revised.'],
              ] as string[][]).map((r) => (
                <tr key={r[0]} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold whitespace-nowrap" style={{ color: NAVY }}>{r[0]}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums" style={{ color: '#3a4148' }}>{r[1]}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums" style={{ color: '#3a4148' }}>{r[2]}</td>
                  <td className="px-3 py-1.5 text-center font-bold tabular-nums" style={{ color: CORAL }}>{r[3]}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums" style={{ color: '#3a4148' }}>{r[4]}</td>
                  <td className="px-3 py-1.5" style={{ color: OLIVE }}>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 space-y-2">
          <Note tone="coral">
            Dropped from the earlier draft: a CAC target of AED 70 — unreachable under any paid scenario (it would
            require more than two memberships per lead at target CPL) and only meaningful as a blend at ~8.4K spend.
            Paid-lane CAC (~1,875–2,500 at target CPL) exceeds the first-year fee on its own: it is justified only by
            incremental treatment revenue, which the pilot measures — until then, paid stays capped at this budget.
          </Note>
          <Note tone="gold">
            Definition to agree at sign-off: under the mandate&apos;s formula (working-media ceiling = paid-media
            acquisition target × allowable CAC), 12 × 250 authorizes only AED 3,000 of direct-acquisition working
            media. The 30K is therefore submitted as the full DM budget across all lanes, with direct acquisition as
            one slice — agreeing this labelling now prevents a definitional &quot;overspend&quot; at the first
            checkpoint review.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n="R3" title="Channels, sub-channels, funnels & assets" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Each channel runs its own micro-funnel; every one of them rolls up into the mandate spine
          (enquiry → qualified → checkout → paid → card active → booked → attended) via its source code. Assets marked ◆
          depend on the designer hire; everything else ships from Creative OS templates or copy. The digital lanes are
          elaborated — budget slices, the creative blocker, corporate outreach and the week-by-week timeline — in the
          Digital marketing plan sub-tab.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Channel (target)</th><th className="px-2.5 py-2 font-bold">Sub-channels</th>
                <th className="px-2.5 py-2 font-bold">Micro-funnel</th><th className="px-2.5 py-2 font-bold">Asset types</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['In-clinic (60)', 'Front desk at checkout · waiting area · chair-side mention by clinician',
                 'Visit → offer made → interest → QR enrolment → card active → first benefit booked',
                 'EXISTS from the programme build: Reception Conversion Guide + member deck + Emirati Arabic scripts + objection handling. To produce: QR standee per branch · counter card with the savings example · waiting-area poster ◆ · consented 1-to-1 WhatsApp follow-up template'],
                ['Corporate (24)', 'Warm intros · on-site dental days · HR internal comms',
                 'Intro → HR meeting → pilot agreed → employees reached → coded enrolments → activated',
                 'Corporate one-pager (pilot package + savings math) · HR email kit · employer code + enrolment page · on-site day kit (banner ◆, screening forms, QR) · quarterly usage-report template'],
                ['Website — owned (12)', 'Membership page · cost-guide & treatment-page modules · knowledge-base house ads · booking-widget cross-sell',
                 'Page visit → membership view → enquiry / checkout start → qualified (10-min contact centre) → paid',
                 'Membership module/banner EN/AR · savings-examples block · plain-language FAQ rewrite · checkout copy'],
                ['Paid digital (supports the 12)', 'Google Search (membership + cost intent) · Meta CTWA offer lane · retargeting (site visitors; lists only after the eligibility check)',
                 'Impression → click → LP / WhatsApp chat → qualified lead (CPL measured HERE) → checkout → paid @ 8%',
                 'Search ad copy set EN/AR · 3–5 CTWA statics + offer cards ◆ · retargeting statics ◆ · LP membership variant · WhatsApp quick-reply scripts'],
                ['Partners (20: resellers 7 · affiliates 7 · brokers 3 · distributors 3)', 'Per partner type, each with its own agreement',
                 'Agreement → partner promotes → coded referral → qualified → paid',
                 'EXISTS from the programme build: community partnership decks (EN/AR) + an organisation-specific deck (Dreevo). To produce: per-partner codes/QR + commission sheet · co-branded flyer template ◆ · WhatsApp share cards'],
                ['CSR / community (4)', 'Events near the three branches',
                 'Footfall → conversation → on-the-spot QR enrolment',
                 'Event banner ◆ · QR flyers · savings one-pager'],
              ] as string[][]).map((r) => (
                <tr key={r[0]} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: NAVY }}>{r[0]}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{r[1]}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{r[2]}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          Asset production owners: copy + templates — Fahad; automated statics — Creative OS (CRM-DN); ◆ items need the
          in-house designer — the launch set ships without them, they upgrade the mix when the hire lands.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Funding gates & rules — 30K proposed, sign-off pending</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Working-media ceiling = paid-media acquisition target × allowable CAC (Finance sets the CAC; Mr Akbar signs the 30-day ceiling and initial release — the blanks on the mandate’s sign-off page).',
              'Forecast CAC by activity + blended total submitted the day the ceiling lands; spend and forecast then update daily.',
              'Funding gates: 17 Sep initial launch funding → 30 Sep Day-15–30 funding after pace, CAC and data review → 16 Oct next-period funding for proven sources.',
              'Reallocation: up to 10% may move within the ceiling, reported the same day. Scale / optimize / hold rules as mandated (hold if attribution < 98% or CAC breaches the ceiling).',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: MINT }} />{t}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>Control, risk & recovery</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'Tracking: every activity source-coded (QR / employer code / partner code / UTM); the dashboard spine — enquiry → qualified → checkout → paid → card active → booked → attended — is the single report; ≥98% attribution is the hold trigger.',
              'Rhythm: 09:00 outcome review · 16:00 recovery queue · EOD scorecard · weekly resource decision, run with the Smile Club Coordinator.',
              'Risk 1 — creative assets: the designer gap limits paid creative volume. Mitigation: Creative OS output + offer-led formats; the hire decision (19 Sep) is the unlock.',
              'Risk 2 — corporate intro timing: the 24 depends on doors opening in week 1; mitigation: Michael Page + RBS start now, Mr Akbar’s three intros requested at sign-off.',
              'Risk 3 — clinic capacity: 60 clinic conversions must be servable; branch appointment availability is checked in the daily review before pushing harder.',
              'Recovery rule: any missed checkpoint minimum → recovery plan the next business day, as mandated.',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: CORAL }} />{t}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

/* ── Digital marketing plan (elaborated 19 Sep — Fahad) ────────── */

interface DmChannel {
  channel: string; role: string; execution: string; budget: string; status: string; statusColor: string;
}

const DM_CHANNELS: DmChannel[] = [
  {
    channel: 'Google Search', role: 'Capture existing intent — membership, dental-cost and treatment queries, EN/AR, geo around the three branches.',
    execution: 'Responsive search ads → CRM-DN pilot LP / membership LP variant → lead (CPL measured here) → 10-minute contact-centre follow-up. Negative lists to keep booking intent separate from membership intent.',
    budget: 'AED 12,000', status: 'LIVE', statusColor: '#2C5E3F',
  },
  {
    channel: 'Meta — paid (FB/IG)', role: 'Prospecting on eligibility-checked geo/interest audiences + retargeting site visitors; CTWA offer lane straight into WhatsApp.',
    execution: 'Offer-led statics from Creative OS launch now; Advantage+/dynamic-creative formats HELD by the smart/dynamic-creatives blocker below. Patient-list audiences only after the documented eligibility check.',
    budget: 'AED 9,000', status: 'PARTIAL — creative-capped', statusColor: '#7a6420',
  },
  {
    channel: 'LinkedIn — corporate lane', role: 'Reach corporate buyers: HR, People/Culture, Benefits and Office-Manager titles in Dubai — air-cover that warms the Assembly Global / Michael Page / ArabyAds doors before and after the intro emails.',
    execution: 'Founder-led organic posts (Fahad) from w/c 22 Sep at zero media cost + one bounded sponsored test on the corporate one-pager; every corporate meeting preceded by a connection touch.',
    budget: 'AED 3,000 (test)', status: 'READY — w/c 22 Sep', statusColor: BLUE,
  },
  {
    channel: 'ArabyAds — performance network', role: 'Paid distribution priced on performance: the Smile Club offer through their affiliate/programmatic network on a CPL model inside the CAC ceiling — extends the lead-gen go-live already scheduled for next week.',
    execution: 'Scope added to the go-live agenda (pre-launch meeting held): dedicated source code, CPL agreed against the 150/200 lane targets, weekly reconciliation into the funnel spine.',
    budget: 'AED 3,000 (CPL-based)', status: 'SCOPING — go-live next week', statusColor: BLUE,
  },
  {
    channel: 'Website sticky banner', role: 'NEW traffic opportunity: a persistent, dismissible site-wide banner routes ALL existing traffic — booking intent, cost-guide readers, entrances across the 19,500+ SEO pages — to the Smile Club page at zero media cost.',
    execution: '“Smile Club — dental care from AED 99/month → Join” EN/AR; UTM sc-banner; built by CRM-DN/W3Layouts; click-through and paid conversions read from the funnel spine.',
    budget: 'No media cost', status: 'TO BUILD — w/c 22 Sep', statusColor: CORAL,
  },
  {
    channel: 'SEO — membership cluster', role: 'Own the organic membership and cost-comparison queries the paid lane is bidding on.',
    execution: 'Dedicated EN/AR membership pages + Smile Club modules on the highest-traffic cost/treatment pages (CRM-DN); compounding, not checkpoint-dependent.',
    budget: 'No media cost', status: 'IN PROGRESS', statusColor: BLUE,
  },
  {
    channel: 'GMB / local', role: 'Convert local discovery on the 4.9★ profile (60 public reviews) across the three branches.',
    execution: 'Offer posts + membership link in profiles; review pacing rules already issued to the team stay in force.',
    budget: 'No media cost', status: 'READY', statusColor: '#2C5E3F',
  },
  {
    channel: 'WhatsApp / CRM — triggered', role: 'High-intent 1-to-1 contact only: open treatment plans, due recalls, SOS follow-ups, website abandoners. Bulk sends: target 0, budget 0, per the mandate.',
    execution: 'Consented, source-coded templates; the contact centre works the qualified queue within 10 minutes.',
    budget: 'No media cost', status: 'LIVE', statusColor: '#2C5E3F',
  },
  {
    channel: 'Organic social (IG · TikTok)', role: 'Proof content — member value statements, front-desk moments, doctor trust. TikTok paid stays deferred: asset-blocked.',
    execution: 'IG proof posts ride the existing calendar; TikTok revisited only when the creative unlock lands and a source-coded test can be bounded.',
    budget: 'No media cost', status: 'IG on · TikTok deferred', statusColor: OLIVE,
  },
];

const DM_OUTREACH: { org: string; door: string; code: string; ask: string; timeline: string; status: 'open' | 'awaiting' | 'closed-no' ; statusNote: string }[] = [
  {
    org: 'Assembly Global', door: 'Fahad’s direct contact', code: 'SC-ASG',
    ask: 'Employer-paid (Model 3) or subsidized (Model 2) memberships for their Dubai team; on-site dental day as the opener.',
    timeline: 'Contacted → awaiting their update → pilot decision by 7 Oct',
    status: 'awaiting', statusNote: 'Contacted · awaiting response (as of 21 Sep)',
  },
  {
    org: 'Michael Page', door: 'Matt Jones — Head of Operations (Fahad’s contact)', code: 'SC-MPG',
    ask: 'Pilot package offered 21 Sep via WhatsApp.',
    timeline: 'CLOSED 21 Sep — “We have dental included in our medical”. Referral ask made and accepted (“Will do!”).',
    status: 'closed-no', statusNote: 'No — dental already covered in their medical policy · referral ask live',
  },
  {
    org: 'ArabyAds', door: 'Existing partner relationship (pre-launch meeting held)', code: 'SC-ARB',
    ask: 'Two asks in one meeting: staff memberships for their own team (Model 3/2) AND the CPL distribution lane above.',
    timeline: 'Raised at the go-live meeting w/c 22 Sep → decision by 30 Sep',
    status: 'open', statusNote: 'Ask scheduled for the go-live meeting',
  },
];

/**
 * CEO-granularity investment theses — per paid channel: WHY the dirham goes
 * there, the expected CPL WITH ITS ARITHMETIC (never a bare number), and HOW
 * it is tracked. All CPL/CPC figures are PLANNING ESTIMATES (Google Keyword
 * Planner ranges for Dubai dental + our own live campaign reads, Sep 2026);
 * the daily scorecard replaces every estimate with actuals from day one.
 */
const DM_THESES: { ch: string; why: string; cpl: string; track: string }[] = [
  {
    ch: 'Google Search · AED ~4–6K working',
    why: 'Nobody searches “dental membership” at volume — search demand is COST intent. We bid where the membership is the answer to sticker shock, plus branded capture so a told-about-us searcher never lands on a competitor. Treatment intent (“dentist near me”) is deliberately EXCLUDED — that demand belongs to clinic campaigns, not membership.',
    cpl: 'CPL = CPC ÷ LP conversion. Cost-intent cluster: est. CPC AED 6–14 ÷ 8–10% LP CVR → CPL ≈ AED 70–175 (inside the 150 target / 200 ceiling). Branded: CPC AED 1–3, CVR 20%+ → CPL ≈ AED 5–15.',
    track: 'One UTM per cluster → LP → enquiry enters the spine (enquiry → qualified → checkout → paid); live CPC/CPL on the Marketing tab daily; kill rule: cluster paused if CPL > 200 after 25 clicks.',
  },
  {
    ch: 'Meta · AED ~3–5K working',
    why: 'Our own live proof: appointment campaigns are delivering at AED 3–6/lead (Tooth Gap 123 leads @ ~AED 3). Learning applied — that engagement is APPOINTMENT-led, so Meta’s membership job is narrow: retargeting site visitors and the offer lane at high-intent moments, not cold membership prospecting.',
    cpl: 'Membership CTWA est. CPL AED 15–40 (narrower intent than appointment ads → 3–6× the appointment CPL; estimate until the first coded cohort). Retargeting pool: site visitors + engaged non-converters.',
    track: 'CTWA source codes per ad set → spine; contact-centre tags membership-intent vs appointment-intent on first reply — the split that killed the broadcast test is measured from message one.',
  },
  {
    ch: 'LinkedIn · AED ~2–3K test',
    why: 'Not a CPL channel — a door-opener. Air-cover for the corporate asks: HR/People/Benefits titles see the one-pager before and after outreach. The Michael Page “no” sharpens the ICP: qualify for companies WITHOUT dental in their medical policy (SMEs, startups, blue-collar employers) before spending a meeting.',
    cpl: 'Measured as cost per corporate MEETING, not per lead: est. AED 150–400/meeting on a bounded sponsored test. No membership CPL is claimed for LinkedIn — that would be invented.',
    track: 'UTM → corporate enquiry form + a meeting log (door, date, model discussed, outcome) reviewed at each checkpoint; SC-corporate codes on any resulting pilot.',
  },
  {
    ch: 'ArabyAds · pay-per-result',
    why: 'The creative blocker cannot bind here — we pay per confirmed booking on their rate card, so downside is priced. Extends a live contract; zero fixed media risk.',
    cpl: 'Contractual: rate card AED 97–121 per confirmed booking (lanes SOS/Scan/Glow-Up); Smile Club scope priced inside the 150/200 lane targets at the go-live meeting.',
    track: 'Per-lane source codes reconciled weekly against invoices AND the funnel spine — a booking only counts when both agree.',
  },
  {
    ch: 'Zero-media lanes (banner · SEO · GMB · triggered CRM)',
    why: 'The cheapest lead is one we already paid for: site-wide banner catches existing traffic (incl. 19,500+ SEO entrances), GMB catches local discovery on the 4.9★ profile, triggered 1-to-1 contact works the high-intent moments. Staffed work, not free — but no media downside while paid is creative-capped.',
    cpl: 'Media CPL = AED 0 by construction; owner time is the real cost and is tracked in the daily rhythm. Banner contribution read directly from its sc-banner code.',
    track: 'sc-banner / GMB link / per-template CRM codes → spine; bulk sends remain 0 per the mandate.',
  },
];

/** Google Search — the exact keyword plan the CEO asked to see. Estimates
 *  labelled as estimates; live CPCs replace them from the first day of spend. */
const DM_KEYWORDS: { cluster: string; kws: string; cpc: string; cpl: string; role: string }[] = [
  { cluster: 'Branded (always-on)', kws: '“smile club dental nation” · “dental nation membership” · “smile club dubai”', cpc: '1–3', cpl: '≈5–15 @ 20%+ CVR', role: 'Capture told-about-us demand; never lose it to a competitor bid.' },
  { cluster: 'Cost intent (core test)', kws: '“teeth cleaning price dubai” · “dental checkup cost dubai” · “scaling polishing offer dubai” · “cheap dentist dubai”', cpc: '6–14', cpl: '≈70–175 @ 8–10% CVR', role: 'Membership as the ANSWER to price shock — the pilot LP thesis.' },
  { cluster: 'Plan intent (thin volume)', kws: '“dental plan dubai” · “dental membership dubai” · “dental discount card uae”', cpc: '8–18', cpl: '≈100–225 @ 8% CVR', role: 'Exact match only, low cap — tiny but perfectly qualified.' },
  { cluster: 'Insurance gap', kws: '“dental insurance dubai individuals” · “dentist without insurance dubai” · “dental cover self employed uae”', cpc: '10–20', cpl: '≈100–250 @ 8% CVR', role: 'The uninsured segment the Michael Page learning points at.' },
  { cluster: 'EXCLUDED: treatment intent', kws: '“dentist near me” · “root canal dubai” · “veneers price” → negative-matched', cpc: '—', cpl: '—', role: 'Booking demand — belongs to clinic campaigns; bidding it here would double-pay for the same click.' },
];

const DM_TIMELINE = [
  { wk: 'w/c 19 Sep · Days 1–7', paid: 'Search live · LinkedIn organic starts · sticky banner briefed to CRM-DN · Meta statics prepped', corp: 'Outreach emails drafted for Assembly Global + Michael Page · ArabyAds go-live agenda extended to Smile Club', gate: 'Day-7 checkpoint 23 Sep — 36 plan / 30 minimum' },
  { wk: 'w/c 22 Sep · Days 8–14', paid: 'Sticky banner LIVE · Meta statics live · ArabyAds CPL scope agreed · LinkedIn sponsored test brief ready', corp: 'Assembly Global + Michael Page meetings held · ArabyAds double-ask made', gate: 'Day-14 checkpoint 30 Sep — 60/50 · Day-15–30 funding review' },
  { wk: 'w/c 29 Sep · Days 15–21', paid: 'Reallocate ±10% to the winning lanes · LinkedIn sponsored test live if creative allows', corp: 'First corporate pilot agreed, coded and speced (the “one defined pilot”)', gate: 'Day-21 checkpoint 7 Oct — 88/75, reviewed with Gautam' },
  { wk: 'w/c 6 Oct · Days 22–28', paid: 'Scale proven sources only · dynamic/smart creatives live IF the designer hire has landed', corp: 'Corporate pilot enrolments running under its employer code', gate: 'CAC vs ceiling + ≥98% attribution checked before any scale-up' },
  { wk: 'w/c 13 Oct · Days 29–30', paid: 'Final push through proven lanes only — no new experiments', corp: 'Pipeline handover notes for the next period', gate: '16 Oct — 120 paid, active, non-refunded, Finance-validated' },
];

function DmPlan() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">The digital marketing plan, elaborated — all channels, one funnel.</span>{' '}
        Every lane below feeds the same spine (enquiry → qualified → checkout → paid → card active → booked →
        attended) under its own source code, inside the proposed AED 30,000 / 30-day budget (indicative split;
        the 10% reallocation rule moves money to what converts). One structural blocker is named honestly —
        smart/dynamic creatives — and the plan is built to deliver despite it.
      </p>

      <section>
        <Exhibit n="D1" title="Channel plan — role, execution, budget slice, status" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Channel</th><th className="px-2.5 py-2 font-bold">Role & audience</th>
                <th className="px-2.5 py-2 font-bold">Execution & funnel</th><th className="px-2.5 py-2 font-bold">Budget (indicative)</th>
                <th className="px-2.5 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {DM_CHANNELS.map((c) => (
                <tr key={c.channel} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: NAVY }}>{c.channel}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{c.role}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{c.execution}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums" style={{ color: OLIVE }}>{c.budget}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap font-bold" style={{ color: c.statusColor }}>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>
          Media total AED 27,000 committed + AED 3,000 reserve = the proposed 30K (pending Mr Akbar&apos;s sign-off).
          No-media-cost lanes are staffed work, not free — owner time is tracked in the daily rhythm.
        </p>
      </section>

      <section>
        <Exhibit n="D1b" title="Why each dirham — investment thesis, expected CPL with its math, tracking" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Every CPL below is shown WITH its arithmetic and labelled estimate vs contractual vs measured — the
          daily scorecard replaces estimates with actuals from the first dirham of spend.
        </p>
        <div className="space-y-2">
          {DM_THESES.map((r) => (
            <div key={r.ch} className="rounded-xl border bg-white p-3.5" style={{ borderColor: LINE }}>
              <p className="text-[12px] font-bold" style={{ color: NAVY }}>{r.ch}</p>
              <div className="mt-1.5 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Why invest</p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{r.why}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Expected CPL — and its math</p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{r.cpl}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>How we track</p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{r.track}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Exhibit n="D1c" title="Google Search — the keyword plan (planning estimates, AED)" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Cluster</th><th className="px-2.5 py-2 font-bold">Keywords we bid</th>
                <th className="px-2.5 py-2 text-right font-bold">Est. avg CPC</th><th className="px-2.5 py-2 text-right font-bold">Est. CPL</th>
                <th className="px-2.5 py-2 font-bold">Role</th>
              </tr>
            </thead>
            <tbody>
              {DM_KEYWORDS.map((k) => (
                <tr key={k.cluster} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: k.cluster.startsWith('EXCLUDED') ? CORAL : NAVY }}>{k.cluster}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{k.kws}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: '#3a4148' }}>{k.cpc}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: '#3a4148' }}>{k.cpl}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{k.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          CPC ranges are Keyword Planner planning estimates for Dubai dental (Sep 2026), not promises; CPL = CPC ÷
          landing-page conversion. Kill rule per cluster: paused above CPL 200 after 25 clicks. Live actuals replace
          this table’s estimates in the daily scorecard from day one.
        </p>
      </section>

      <section>
        <Exhibit n="D2" title="The blocker — smart/dynamic creatives — and the two zero-media unlocks" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card accent={CORAL}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>Blocker: smart/dynamic creatives</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              The scale formats — Meta Advantage+ / dynamic creative and Google responsive display / PMax — need
              asset variety: multiple ratios, message variants, video cutdowns. Creative OS produces templated
              statics; it cannot feed those formats. Until the in-house designer decision (19 Sep) lands, paid runs
              creative-capped: search + offer-led statics carry the load and the dynamic lanes stay HELD. This is
              Risk 1 of the delivery plan, now named as the structural blocker of the DM plan — the hire is the
              unlock, not more budget.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Unlock 1: the sticky banner</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              While paid is capped, the cheapest traffic is the traffic we already have. A persistent site-wide
              banner puts Smile Club in front of every visitor — booking pages, cost guides, the 19,500+ SEO page
              entrances — and needs one build, no media and no new creative formats. Dismissible, EN/AR, UTM-coded
              (sc-banner) so its contribution reads directly in the funnel spine. Owner: CRM-DN/W3Layouts, live w/c
              22 Sep.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Unlock 2: ArabyAds</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              ArabyAds helps twice. As a <span className="font-semibold">distribution partner</span>: their
              affiliate/programmatic network runs the Smile Club offer on a CPL model — we pay per lead inside the
              150/200 lane targets, so the creative cap doesn&apos;t bind and downside is priced. As a{' '}
              <span className="font-semibold">corporate prospect</span>: their own Dubai team is a Model 3/2
              candidate — both asks land in the same go-live meeting w/c 22 Sep.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="D3" title="Corporate outreach — Mr Akbar's ask, 19 Sep" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Mr Akbar has asked Fahad to open his contacts at Assembly Global and Michael Page, and to put the buy
          question to ArabyAds. All three feed the Corporate-24 target (pipeline ≥ 72 equivalent) and each is a
          candidate for the &quot;one defined pilot&quot;; the three payment models are never blurred in the ask.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Target</th><th className="px-3 py-2 font-bold">Door</th>
                <th className="px-3 py-2 font-bold">Status</th>
                <th className="px-3 py-2 font-bold">The ask</th><th className="px-3 py-2 font-bold">Timeline / outcome</th><th className="px-3 py-2 font-bold">Code</th>
              </tr>
            </thead>
            <tbody>
              {DM_OUTREACH.map((o) => (
                <tr key={o.org} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{o.org}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{o.door}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-bold"
                      style={o.status === 'closed-no' ? { backgroundColor: '#f7e8e4', color: '#a04a38' } : o.status === 'awaiting' ? { backgroundColor: '#f5ecd8', color: '#8a6a1e' } : { backgroundColor: '#e7efe6', color: '#2C5E3F' }}
                    >
                      {o.status === 'closed-no' ? 'Closed — No' : o.status === 'awaiting' ? 'Awaiting reply' : 'Open'}
                    </span>
                    <span className="mt-0.5 block text-[9.5px]" style={{ color: OLIVE }}>{o.statusNote}</span>
                  </td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{o.ask}</td>
                  <td className="px-3 py-1.5" style={{ color: OLIVE }}>{o.timeline}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap font-semibold" style={{ color: CORAL }}>{o.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 space-y-2">
          <Note tone="coral">
            LEARNING (21 Sep, Michael Page): companies whose medical policy already includes dental say no in one
            message — the ICP is companies WITHOUT dental in their cover: SMEs, startups, blue-collar and
            hospitality employers. Every future corporate door gets the qualifier question FIRST (“does your
            medical include dental?”) before a pitch is spent — and each “no” converts to a referral
            ask, exactly as done with Matt Jones. Pipeline effect: one of three named doors closed; the ≥72
            pipeline requirement now needs replacement doors from the qualified segment — the corporate
            playbook’s warm list and the LinkedIn lane both re-aim at it.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n="D4" title="Timeline — five weeks to 16 October" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Week</th><th className="px-2.5 py-2 font-bold">Paid & owned</th>
                <th className="px-2.5 py-2 font-bold">Corporate</th><th className="px-2.5 py-2 font-bold">Gate / checkpoint</th>
              </tr>
            </thead>
            <tbody>
              {DM_TIMELINE.map((t) => (
                <tr key={t.wk} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{t.wk}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{t.paid}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{t.corp}</td>
                  <td className="px-2.5 py-1.5 font-semibold" style={{ color: CORAL }}>{t.gate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          The timeline is paced by the mandate checkpoints, not the other way round: a missed minimum triggers the
          next-business-day recovery plan, and nothing scales past a gate with attribution below 98% or CAC above
          the ceiling.
        </p>
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

      <section className="mt-4">
        <Exhibit n="5b" title="Results to date — Gautam's shared updates, mapped onto this wave" />
        {wid === 'wave1' ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {['5 broadcast sends', '1,280 non-unique reach', '863 delivered', '71 replies', '417 failures to code', '0 broadcast memberships confirmed (reconciliation 18 Sep)'].map((s) => (
              <Tag key={s} color={CORAL}>{s}</Tag>
            ))}
          </div>
        ) : null}
        <Card accent={w.color}>
          <p className="text-[11.5px] font-bold" style={{ color: w.color }}>{WAVE_RESULTS[wid].verdict}</p>
          <ul className="mt-2 space-y-1.5">
            {WAVE_RESULTS[wid].items.map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: w.color }} />{t}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>
            Sources: Smile Club management progress update (12 Sep 2026) and Marketing Activation Action Map v4
            (16 Sep 2026), both shared by Gautam. Nothing here is a forecast — forecasts live in the 30-day
            delivery plan.
          </p>
        </Card>
      </section>
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
  { id: 'response', label: '30-day delivery plan' },
  { id: 'dm', label: 'Digital marketing plan' },
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
        {sub === 'response' && <ResponseTab />}
        {sub === 'dm' && <DmPlan />}
        {sub === 'offer' && <OfferEconomics />}
        {sub === 'waves' && <Waves />}
        {sub === 'corporate' && <Corporate />}
        {sub === 'channels' && <Channels />}
        {sub === 'kpis' && <Kpis />}
      </div>
    </section>
  );
}
