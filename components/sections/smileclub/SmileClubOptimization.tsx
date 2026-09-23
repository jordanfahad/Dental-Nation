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

import { createContext, useContext, useState } from 'react';
import { updateTeamTaskAction, verifyCrmTestAction } from '@/app/(app)/smileclub-actions';
import { SEGMENTS, type SegmentId } from '@/lib/smileclub/segments';
import {
  CRM_TEST_SPEC,
  OWNER_LABEL,
  TASK_BY_KEY,
  TEAM_TASKS,
  TOTAL_WEIGHT,
  ragFor,
  weightPct,
  type Step,
  type Person,
  type Rag,
  type TaskProgress,
  type TeamTask,
  type TrackerState,
} from '@/lib/smileclub/team';

/** Cross-panel navigation: goto() jumps to another sub-tab and remembers where
 *  the reader came from; back() returns there — so Mr Akbar can follow any
 *  cross-reference and jump straight back. */
const SubNavContext = createContext<{ goto: (s: string) => void }>({ goto: () => {} });

function Jump({ to, children }: { to: string; children: React.ReactNode }) {
  const { goto } = useContext(SubNavContext);
  return (
    <button
      type="button"
      onClick={() => goto(to)}
      className="inline font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid"
      style={{ color: '#5793A3' }}
      title="Opens that panel — a Back chip appears to return here"
    >
      {children} ↗
    </button>
  );
}

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const MINT = '#A9C3A6';
const OLIVE = '#767769';
const LINE = '#D8D8CC';

type Sub = 'segments' | 'why' | 'layers' | 'reco' | 'mandate' | 'response' | 'team' | 'dm' | 'offer' | 'waves' | 'corporate' | 'channels' | 'kpis';

/* ── atoms ─────────────────────────────────────────────────────── */

function Exhibit({ n, title, right }: { n: number | string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
      <span className="flex items-baseline gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>Exhibit {n}</span>
        <h2 className="text-[14px] font-semibold" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{title}</h2>
      </span>
      {right ?? null}
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
interface Wave { id: string; label: string; tag: string; horizon: string; color: string; status: string; statusColor: string; intro: string; plays: Play[] }

const WAVES: Wave[] = [
  {
    id: 'wave1', label: 'Wave 1 · Prepare + limited test', tag: 'Low incremental media spend — staff and delivery costs tracked', horizon: 'Indicative: first fortnight', color: '#2C5E3F', status: 'EXECUTED — its plays now run daily as the operating engine (front desk carries the 60)', statusColor: '#2C5E3F',
    intro: 'Sell to people who already know us — and onboard properly from the first enrolment. Baseline, prices and definitions come before broad activation.',
    plays: [
      { title: 'Baseline & terms first', engine: 'Data', owner: 'Gautam + finance/ops (to confirm)', detail: 'Enrolments, payment status, plan mix, usage, cancellations; benefit-delivery costs; clinic prices; membership terms. The savings examples and funnel definitions come from this — nothing scales before it exists.' },
      { title: 'High-intent triggered contact — replaces the broad CRM test', engine: 'CRM / WhatsApp', owner: 'Fahad + CRM-DN + contact centre', detail: 'LEARNING APPLIED (12 Sep update): five campaign sends (3 doctor-led + retry + follow-up; 1,280 non-unique reach, 863 delivered, 71 replies) returned appointment-led, not membership-led, responses (payment reconciliation still to be reviewed) — so no further broadcast testing. Instead: event-triggered, 1-to-1 consented contact at high-intent moments — open treatment plans, due preventive recalls, completed SOS follow-ups, website abandoners — each source-coded.' },
      { title: 'Front-desk route', engine: 'In-clinic', owner: 'Front desk + Dr Luvi', detail: 'The enablement already exists from the programme build: Reception Conversion Guide (Ask → Match → Value → Clarify → Close), reception member deck, objection handling and Emirati Arabic scripts, plus value-discovery training completed. Wave 1 executes it: QR at the three branches, the offer at checkout, and a structured objection log from day one.' },
      { title: 'Relevant placements only', engine: 'Owned web', owner: 'CRM-DN + W3Layouts', detail: 'Membership placements on the most relevant pages with demonstrated traffic, prioritised by actual local intent and conversion potential — page count alone is not opportunity. Relevant cost-guide readers are a testable prospect audience.' },
      { title: 'Onboarding & activation — in Wave 1', engine: 'Member experience', owner: 'Fahad + Gautam + front desk', detail: 'Welcome and clear benefits/terms; help arranging the first clinically appropriate appointment; first booking and first completed visit tracked separately; care-plan reminders; payment-failure follow-up; cancellation reasons; renewal prep; a member value statement showing actual benefits received.' },
      { title: 'Corporate discovery in parallel', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Warm HR conversations start now (Michael Page contact, RBS, existing partners) — discovery does not wait for a finished case study.' },
    ],
  },
  {
    id: 'wave2', label: 'Wave 2 · Scale what the evidence supports', tag: 'Paid tests + SEO + one defined corporate pilot', horizon: 'Indicative: weeks 3–8', color: BLUE, status: 'IN PROGRESS — paid pilot + partnerships live; dynamic formats held by the creative blocker', statusColor: '#7a6420',
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
    id: 'wave3', label: 'Wave 3 · Compound, if the gate opens', tag: 'Corporate expansion + selective offline, funded by measured contribution', horizon: 'Indicative: quarter +', color: NAVY, status: 'NOT STARTED — by design; opens only on measured Wave 1–2 contribution', statusColor: CORAL,
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
    verdict: 'Tested — bulk sends held following appointment-led responses; final membership yield unverified pending the payment reconciliation. The in-clinic lane is fully enabled and now carries the 60.',
    items: [
      'Broadcast CRM test (5 sends: 3 doctor-led + retry + follow-up): 1,280 non-unique reach · 863 delivered · 71 replies · 417 failures to code. Engagement came back appointment-led, not membership-led — 0 memberships confirmed from broadcast — an evidence state, not a final zero: the payment-record reconciliation review is still outstanding. Consequence: bulk sends target 0, budget 0; triggered 1-to-1 contact replaces it.',
      'Front-desk enablement DELIVERED by the programme build: reception member deck, Reception Conversion Guide (Ask → Match → Value → Clarify → Close), objection handling and Emirati Arabic scripts, value-discovery training completed — Wave 1 executes assets that already exist.',
      'Product & governance in place: four plans live with an online joining route; Member Agreement v1.3 governs eligibility, family structure, payments, cancellation and failed-payment rules.',
    ],
  },
  wave2: {
    verdict: 'Partially entered — partnership GTM is built and activating; paid scale waits on the creative unlock.',
    items: [
      'Partnership go-to-market: bilingual community-partnership decks and an organisation-specific proposal complete; partner outreach active, first activations being scheduled (12 Sep update).',
      'Paid + owned: CRM-DN pilot landing page live with search ads following; the membership SEO cluster is tasked. Meta dynamic/smart-creative formats are HELD by the creative blocker (see the Digital marketing plan) — offer-led statics and search carry paid until the designer unlock.',
      'No paid-channel conversion results exist yet — the first source-coded funnel reads arrive with the 28 Sep Day-7 checkpoint.',
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
  { cat: 'Established (our own platform)', color: '#2C5E3F', items: 'Smile Club product + admin console live · 4.9★ · 60 publicly visible Google reviews (verified 14 Sep; owner-view sync 61) · patient audience lists exist in both ad accounts · warm corporate contacts (Michael Page HR contact, RBS, current partners)' },
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
  { channel: 'GMB / local (4.9★, 60 public)', aware: '●', consider: '●', convert: '', retain: '' },
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
  { d: '28 Sep · Day 7', plan: 36, min: 30 },
  { d: '5 Oct · Day 14', plan: 60, min: 50 },
  { d: '12 Oct · Day 21', plan: 88, min: 75 },
  { d: '21 Oct · Day 30', plan: 120, min: 120 },
];

const REGISTER: { act: string; dl: string; who: string; out: string; to: Sub; toLabel: string }[] = [
  { act: 'Accept the commercial mandate', dl: '22 Sep 10:00', who: 'Fahad', out: '120 by 21 Oct; bulk CRM target 0 — targets, deadlines and guardrails acknowledged in writing. The acceptance in practice is the delivery plan itself:', to: 'response', toLabel: 'Delivery plan' },
  { act: 'Submit the quantified marketing response', dl: '22 Sep EOD', who: 'Fahad', out: '100% of the 120 mapped: source forecast, qualified demand, conversion, spend, CAC, launch date, owner — ALREADY IN THIS DOCUMENT:', to: 'response', toLabel: 'Delivery plan R1' },
  { act: 'Close the historical CRM test', dl: '23 Sep EOD', who: 'Gautam shares data · Fahad reviews', out: '71 replies classified, 417 failures coded, new bulk sends 0 — reconciled to payment and membership records. Campaign-level numbers received via the 12 Sep progress update (5 sends, 1,280 non-unique reach, 863 delivered); the payment-record reconciliation review remains. Evidence to date:', to: 'waves', toLabel: 'Wave 1 results (5b)' },
  { act: 'Activate the first acquisition portfolio', dl: '24 Sep EOD', who: 'Fahad', out: 'Every live activity has source, spend, forecast, destination and response owner — the portfolio is the channel plan:', to: 'dm', toLabel: 'DM plan D1' },
  { act: 'Checkpoints (Day 7 / 14 / 21)', dl: '28 Sep · 5 Oct · 12 Oct', who: 'Fahad + Smile Club Coordinator; Day 21 with Gautam', out: '36/30 → 60/50 → 88/75 cumulative paid; recovery plan next business day if missed. Cadence and gates:', to: 'kpis', toLabel: 'Controls' },
  { act: 'Complete the mandate', dl: '21 Oct', who: 'Gautam → Mr Akbar', out: '120 paid, active, non-refunded, source-coded; ≥98% data and attribution; Finance-validated. How each condition is measured:', to: 'kpis', toLabel: 'Measurement' },
];

const MANDATE_MAP: { req: string; ours: string; to: Sub; toLabel: string }[] = [
  { req: 'Existing DN clinics — 60 paid subscriptions', ours: 'Wave 1 front-desk route + onboarding (front desk + Dr Luvi): one consistent explanation, QR at three branches, first-appointment help, objection log.', to: 'waves', toLabel: 'Three waves' },
  { req: 'Corporate — 24 paid subscriptions (needs a pipeline of ≥72 membership-equivalents at ~33% close)', ours: 'Corporate playbook: qualified doors (see the live outreach status — Michael Page closed 21 Sep, ICP sharpened) + the three warm introductions the mandate asks Mr Akbar to provide (CEO approval item 6).', to: 'corporate', toLabel: 'Corporate playbook' },
  { req: 'Website — 12 paid subscriptions (150 qualified enquiries × 8% close)', ours: 'Wave 1 relevant placements + Wave 2 SEO membership cluster and eligibility-checked paid tests; CRM-DN pilot LP live.', to: 'dm', toLabel: 'DM plan' },
  { req: 'Reseller / affiliate / broker / distributor / CSR (community events) — 24 paid subscriptions combined', ours: 'NEW commercial-access lane the mandate adds beyond rev. 2 — folds into the B2B mechanics (partner codes, QR links, referral agreements) with per-partner source codes.', to: 'response', toLabel: 'Delivery plan R1' },
  { req: 'Bulk CRM: target 0, budget 0', ours: 'Aligned with our audience-eligibility and consent rule. The Wave 1 CRM test stays limited, consented and non-bulk — scope confirmed against the CRM hold.', to: 'waves', toLabel: 'Wave 1 results' },
  { req: 'CAC ≤ Finance ceiling · daily spend/forecast', ours: 'Our economics gate — "allowable CAC from measured economics" — now given its owner: Finance sets the ceiling, Mr Akbar signs it.', to: 'response', toLabel: 'Budget R2' },
  { req: '≥ 98% data & attribution · dashboard spine (enquiry → qualified → checkout → paid → card active → booked → attended)', ours: 'Exactly the measurement machinery of rev. 2 — activation tracked as first booking AND first completed visit; the spine answers the console-tracking question we posed to Gautam.', to: 'kpis', toLabel: 'Measurement' },
  { req: '3× pipeline coverage · 09:00 review · 16:00 recovery · EOD scorecard', ours: 'The daily operating rhythm the pilot reports into; the objection log and comparison-group reads feed the same reviews.', to: 'kpis', toLabel: 'Controls' },
];

/* ── sub-views ─────────────────────────────────────────────────── */

function MandateTab() {
  const maxMix = MANDATE_MIX[0].n;
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">The owner has set the outcome: 120 paid memberships in 30 days — clock re-based 22 Sep (kick-start) → 21 Oct (Day 30); day-count, targets and guardrails unchanged.</span>{' '}
        Gautam&apos;s Marketing Activation Action Map (v4, 16 Sep) mandates the result and delegates the method —
        which is precisely the ownership split rev. 2 called for. This page maps Gautam&apos;s mandate requirements
        onto Fahad&apos;s delivery machinery, one to one. Guardrails: ≥3× pipeline coverage · CAC within the Finance ceiling · ≥98% data &amp;
        attribution · bulk CRM at zero. Output definition: 120 DISTINCT NEW membership contracts whose first
        qualifying payment falls in the 22 Sep – 21 Oct cohort, card active and not refunded at the reporting
        cutoff; a family contract counts once (beneficiaries reported separately); one primary acquisition source
        per contract.
      </p>

      <section>
        <Exhibit n="M1" title="The 120, by source — and the checkpoint line" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-2 text-[11px] font-semibold" style={{ color: NAVY }}>Target paid membership SUBSCRIPTIONS by channel — every number on this page is a count of paid subscriptions</p>
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
            <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>A missed minimum triggers a recovery plan the next business day. Day-15–30 funding releases after the 5 Oct review.</p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="M2" title="Action register — re-based to the 22 Sep kick-start" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Every owner&apos;s week-by-week tasks: <Jump to="team">Team task calendar</Jump>. Accountability rule: Gautam ISSUES and owns the mandate — he provides the baseline data and reports
          completion to Mr Akbar; Fahad owns DELIVERY. Acceptance therefore sits with Fahad: it is the delivery
          owner&apos;s written commitment to the targets, deadlines and guardrails — an issuer cannot accept his
          own mandate.
        </p>
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
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>
                    {r.out} <Jump to={r.to}>{r.toLabel}</Jump>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="M3" title="The logical map — Gautam's mandate requirement → Fahad's delivery machinery" />
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
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>
                    {m.ours} <Jump to={m.to}>{m.toLabel}</Jump>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 space-y-2">
          <Note tone="gold">
            How the two documents fit: the mandate fixes the outcome and cadence; the baseline and economic
            derivation remain open deliverables (owners: Gautam — member baseline; Finance — fully loaded
            ceiling), due before scale spending. Fixed checkpoints replace this plan&apos;s indicative dates. The measurement definitions, consent rules and economics gates of rev. 2 remain the
            control system the mandate is tracked with. First hard funnel data also arrives with it: the historical
            CRM test (71 replies, 417 failures to reconcile) closes 23 Sep.
          </Note>
          <Note tone="coral">
            Open before launch (22 Sep): Mr Akbar&apos;s sign-off — 30-day budget ceiling, allowable CAC and initial
            release are blank in the mandate; plus the three warm corporate introductions and confirmation of the
            CRM hold. Fahad&apos;s quantified response is due 22 Sep EOD.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n="M4" title="Alignment — Mr Akbar's two blueprints ↔ this 30-day plan" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Checked line by line against the Smile Club Strategic Blueprint and the Corporate Strategy (both Sep
          2026). This 30-day plan is their execution slice: blueprint phases 0–2 for consumers plus the corporate
          &quot;2–5 pilot accounts&quot; motion. One tension is named honestly rather than hidden.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Blueprint requirement</th><th className="px-2.5 py-2 font-bold">Where it lives in this plan</th>
                <th className="px-2.5 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['Demand architecture before economics; personalised message per demand state', 'Why & proposition + Layers tabs lead the plan; every DM lane carries a named layer and CTA', 'ALIGNED', '#2C5E3F'],
                ['Wave-1 priority: existing patients + families first (strongest trust, fastest learning)', 'In-clinic-60 = 50% of the target; family layer served by creators/CSR; states 7–8 are the largest engines', 'ALIGNED', '#2C5E3F'],
                ['DTC growth phased, gated on CAC and activation thresholds', 'Paid capped at 15K direct, Google gated at Day-14, kill rules per cluster, no scale past a failed gate', 'ALIGNED', '#2C5E3F'],
                ['North Star: Active (Preventively Engaged / Corporate Smile) Members — not subscriptions or contracts', 'K0 on Measurement; activation rate is the corporate primary KPI (C8)', 'ALIGNED', '#2C5E3F'],
                ['Membership language, never insurance; legal sign-off as a launch gate', 'W4 regulatory dictionary incl. DHA 2026 context; legal review flagged before any new wording ships', 'ALIGNED', '#2C5E3F'],
                ['No random broad awareness; offline only where precise and attributable', 'Billboards/radio deferred; awareness is a bounded geo air cover on enabler metrics with a Day-21 kill', 'ALIGNED', '#2C5E3F'],
                ['Corporate B2B2C system: segments, triggers, funding models, ABM, brokers, HR portal', 'Corporate playbook C1–C10 carries the full system; the 30-day window runs only its seed (warm-door pilots + door plan)', 'ALIGNED — full build sequenced to scale phase', '#2C5E3F'],
                ['Corporate roadmap cadence: pilot employers in months 2–4, brokers 6–9, scale 9–12', 'The mandate asks for Corporate-24 by Day 30 — more aggressive than the blueprint cadence. Resolution: the 30-day corporate lane is ONLY the blueprint’s “2–5 pilot accounts through warm doors”; broad ABM and brokers stay scale-phase; if the 28 Sep door bridge cannot support 24, the recovery plan reallocates toward in-clinic/family per Wave-1 priority — decided at the Day-14 gate, not discovered at Day 30', 'TENSION — managed, decision 5 Oct', '#7a6420'],
                ['Product architecture: launch simple (Individual / Family / Plus)', 'The live public page shows four plans; reconciling the live tier set with the blueprint’s three-tier launch principle is a product decision for Gautam at the 28 Sep review', 'TO RECONCILE — Gautam, 28 Sep', '#7a6420'],
                ['Smile Score · My Smile Plan · annual value statement · activation cadence (Day 0–30)', 'Marked as BUILD items with owner assignment at the 28 Sep review; onboarding/first-booking already runs in Wave 1', 'ALIGNED — sequenced', '#2C5E3F'],
              ] as [string, string, string, string][]).map(([req, ours, st, col]) => (
                <tr key={req} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-semibold" style={{ color: NAVY }}>{req}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{ours}</td>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: col }}>{st}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ── Fahad's 30-day delivery plan (the quantified response, v1 · 17 Sep) ── */

interface ResponseRow {
  source: string; target: number; summary: string; owner: string; launch: string; code: string;
  approach: string; proposition: string; steps: string[]; demand: string; budget: string;
  to: Sub; toLabel: string;
}

/** R1 rebuilt (22 Sep): every source opens into a structured drill-down —
 *  approach, proposition, owner, steps, demand basis and where every dirham
 *  goes — and links to its deep section. */
const RESPONSE_ROWS: ResponseRow[] = [
  {
    source: 'Existing DN clinics', target: 60,
    summary: 'Rev. 6 split: 36 in the chair (dentist recommends, reception closes — 12 per branch) + 24 from each dentist’s own WhatsApp to their own patients.',
    owner: 'Front desk + Dr Luvi · reported by Smile Club Coordinator',
    launch: 'LIVE since 18–19 Sep', code: 'SC-ALW / SC-TOS / SC-AMC (QR per branch)',
    approach: 'The patient is already in the chair and already trusts us — the cheapest acquisition there is. The sale happens at the CHECKOUT moment, when the bill is in front of them and membership is visibly the cheaper way to keep coming back. No media, no cold pitch: a scripted conversation by trained reception staff, with a structured objection log when it is a no.',
    proposition: '“You’re already part of Dental Nation. Smile Club makes staying with us easier — your check-ups and hygiene are planned for the year and members pay preferred rates.” (Demand state 8 · CTA: join from your DN record.)',
    steps: [
      'Patient checks out after treatment or hygiene',
      'Front desk runs the Reception Conversion Guide: Ask → Match → Value → Clarify → Close',
      'Savings example shown against TODAY’s bill — not a generic leaflet',
      'QR standee → enrolment page under the branch code',
      'Onboarding: first member appointment booked before the patient leaves',
      'Declines logged in the objection log — reviewed at the 09:00 daily',
    ],
    demand: '20 per branch across Al Wasl, Dr Tosun and AMC. The conversion assumption is validated against branch footfall at the Day-7 checkpoint (28 Sep).',
    budget: 'AED 0 media. Real costs are staffed minutes per pitch and the printed QR standees (already produced by the programme build); all staffed cost is priced in the Finance fully-loaded bridge, not hidden.',
    to: 'waves', toLabel: 'Front-desk route · Wave 1',
  },
  {
    source: 'Corporate', target: 24,
    summary: 'Sold employer-by-employer: warm doors + door-to-door field sales. Needs a ≥72-equivalent pipeline.',
    owner: 'Gautam — field sales in-window (owner decision, 22 Sep) · Fahad — warm doors & enablement · Mr Akbar — economic-buyer introductions · agent sourced for scale',
    launch: 'Discovery live · doors from w/c 22 Sep', code: 'One code per employer',
    approach: 'A subscription for a whole team is SOLD in meetings, not clicked. Two motions run together. (1) WARM DOORS: Assembly Global (awaiting reply), ArabyAds (staff-membership ask at the go-live meeting), RBS and existing partners, plus the three introductions requested from Mr Akbar. (2) DOOR-TO-DOOR: 40–60 qualified SME doors across JLT, Business Bay, DIFC and Al Quoz. Every door is qualified FIRST with “does your medical insurance include dental?” — the Michael Page learning (closed 21 Sep precisely because their medical already covers dental). A dedicated sales agent cannot land inside 30 days, so Gautam carries the bag in-window (owner decision, 22 Sep) with Fahad running warm doors and enablement, while agent sourcing starts now for the scale phase.',
    proposition: '“Your health insurance probably doesn’t provide meaningful dental. Smile Club sits BESIDE it — a visible employee benefit at a defined per-employee cost, with activation, booking, employee communications and aggregated reporting run by us, not by HR.” The employer then picks a funding model — employer-paid, subsidized or voluntary employee-paid — agreed per employer and never blurred.',
    steps: [
      'Pick the door trigger-first (insurance-renewal month, employee complaints, rapid hiring) — never alphabetically',
      'Qualify: dental in their medical? headcount? who is the economic buyer?',
      'Discovery meeting with the one-pager + savings table (LinkedIn air-cover touch before and after)',
      'Benefits Gap Assessment (5 questions) → a numbers-based business case',
      'Pilot proposal: company code + on-site dental day + quarterly aggregated usage report',
      'Sign → employee launch (CEO/HR email + QR) → activation drive — activation rate is the KPI, not the signature',
    ],
    demand: 'To close 24 contracts at the ~33% assumed close rate the pipeline must hold ≥72 membership-equivalents. SIZING PENDING: the replacement-door bridge (which doors, how many contract-equivalents each) is due 28 Sep, after Michael Page’s closure removed one of three named doors.',
    budget: 'AED 6,000 enablement — production and distribution only: on-site dental-day kits 2 × 1,500 = 3,000 · printed one-pagers + savings tables EN/AR 1,000 · LinkedIn boost on the door territories 1,000 · employer-code enrolment pages + QR 500 · door-plan logistics 500. No salaries, commissions or agency fees in this figure (Finance bridge). LinkedIn adds a separate AED 3,000 bounded test, measured as cost per held meeting.',
    to: 'corporate', toLabel: 'Corporate playbook (B2B2C system)',
  },
  {
    source: 'Website', target: 12,
    summary: '150 qualified enquiries × 8% close — Google + Meta + owned surfaces feeding one funnel.',
    owner: 'Fahad + CRM-DN · contact centre works the queue within 10 minutes',
    launch: 'LIVE since 19 Sep (with the portfolio)', code: 'UTM + source field per placement/campaign',
    approach: 'Capture demand that already exists and route traffic we already have — never cold membership prospecting. Paid: Google on cost-intent and branded queries, Meta on retargeting + the CTWA offer lane. Owned: sticky banner, cost-guide placements, triggered CRM. Every enquiry gets a 10-minute contact-centre follow-up and an intent tag on first reply.',
    proposition: 'Per demand state, never one speech: cost-anxious searcher → “know where you stand before problems become expensive”; insurance-frustrated → “your medical insurance and your dental membership do different jobs”; retargeted visitor → the offer at the moment of return.',
    steps: [
      'Ad or placement carries its per-cluster UTM',
      'Membership landing page (EN/AR)',
      'Enquiry enters the spine: enquiry → qualified → checkout → paid',
      'Contact centre responds within 10 minutes and tags membership-intent vs appointment-intent',
      'Cluster kill rules pause anything whose matured CPQL exceeds 200; Day-14 gate decides Google’s second tranche',
    ],
    demand: '150 qualified opportunities by Day 30 at the mandate’s 8% close. Paid is planned to deliver ≥120 (Google est. 24–66 qualified + Meta 90–180, pool-capped) and owned lanes ≥30 (banner · placements · triggered CRM).',
    budget: 'AED 15,000 direct-response: Google 6,000 pilot (branded 500 · cost-intent 4,500 · plan-intent 500 · insurance-gap 500; second tranche only via the Day-14 gate) + Meta 9,000 (retargeting + CTWA). Blended CPQL target ≤ 125, kill line 200. Full dirham-to-subscription funnel in the DM plan (D1d).',
    to: 'dm', toLabel: 'DM plan (D1–D1d)',
  },
  {
    source: 'Clinic resellers', target: 7,
    summary: '≥2 local partners selling under their own code, paid per result.',
    owner: 'Fahad',
    launch: 'Agreements w/c 22 Sep', code: 'Per-partner code',
    approach: 'Local businesses with aligned audiences near the branches — pharmacies, gyms, salons, GP clinics without dental — refer or sell memberships under a written agreement. They already own the customer’s trust; we pay only for results.',
    proposition: '“Offer your customers a dental membership from a 4.9★, three-branch network — and earn a commission on every PAID membership, tracked to your code.”',
    steps: [
      'Shortlist partners inside branch catchments',
      'One-page agreement: commission per paid membership only — never per referral or click',
      'Partner receives code + QR + counter material',
      'Monthly reconciliation against the funnel spine before any payout',
    ],
    demand: '7 subscriptions through ≥2 active, source-coded resellers (mandate requirement).',
    budget: 'No media. Commission per paid membership priced inside the CAC ceiling once Finance sets it; counter material rides the field-sales print run at marginal cost.',
    to: 'corporate', toLabel: 'Distribution engine (C7)',
  },
  {
    source: 'Affiliates', target: 7,
    summary: '≥3 result-paid promoters — micro-influencers, community groups, deal platforms.',
    owner: 'Fahad',
    launch: 'Agreements w/c 22 Sep', code: 'Per-affiliate tracked link/code',
    approach: 'Third parties promote Smile Club to their own audience through tracked links — local micro-influencers, parenting and community groups, deal/lifestyle platforms, gym and wellness partners. Paid per RESULT: a commission only when a promoted member’s first qualifying payment clears.',
    proposition: 'Family-layer creative carries this lane: “one membership, one dental home for the family” — the creator shows the visit, the tracked code does the attribution. (Demand state 7 · CTA: explore Family membership.)',
    steps: [
      'Recruit ≥3 affiliates (family/community creators first — the layer map says this is their lane)',
      'Written agreement per affiliate: commission per PAID membership, payable after first payment clears',
      'Unique tracked link/code each',
      'Monthly reconciliation of affiliate claims against the spine before payout',
    ],
    demand: '7 subscriptions via ≥3 active, source-coded affiliates (mandate requirement).',
    budget: 'No fixed media — pure performance commission inside the CAC ceiling (Finance sets it). Nothing is paid for posts, reach or clicks.',
    to: 'layers', toLabel: 'Layer map (L1 · family state)',
  },
  {
    source: 'CSR (community events)', target: 4,
    summary: 'Community activations near the branches with on-the-spot QR enrolment.',
    owner: 'Fahad',
    launch: 'First event by early Oct', code: 'Per-event code',
    approach: 'Corporate Social Responsibility — community, not customer service: schools, community centres, sports and wellness events inside branch catchments. A table, a clinician, a free smile check and a QR code. Each event is costed BEFORE commitment; nothing is assumed low-cost.',
    proposition: 'Prevention and family framing: free smile check → “stay ahead of your smile” → enrol on the spot with the event code.',
    steps: [
      'Pick an event near a branch (school terms and community calendars first)',
      'Cost it before committing: staff, clinical time, materials',
      'Per-event source code + QR enrolment flow',
      'Run the activation; enrol on the spot',
      'Post-event attribution review — the event only repeats if the code shows enrolments',
    ],
    demand: '4 subscriptions from community activations.',
    budget: 'No standing budget line — each event is costed and approved individually; staffing and clinical time are the real costs and sit in the Finance bridge.',
    to: 'channels', toLabel: 'Offline verdict',
  },
  {
    source: 'Brokers', target: 3,
    summary: 'Insurance brokers recommend Smile Club beside the medical policies they already sell.',
    owner: 'Fahad',
    launch: 'w/c 22 Sep', code: 'Per-broker code',
    approach: 'The broker already owns the employer relationship and, crucially, its insurance-renewal calendar — the single biggest corporate demand moment. Smile Club becomes an add-on benefit they can recommend, never a competitor to their medical book.',
    proposition: '“Add a differentiated dental benefit to your client proposition without building dental delivery yourself — we run the membership, the network and the reporting; you keep the relationship.”',
    steps: [
      'Identify 2–3 brokers through existing relationships',
      'Broker terms: referral fee per paid membership/account, inside the CAC ceiling',
      'Broker receives the one-pager + the Benefits Gap Assessment as a conversation tool',
      'Per-broker code on every resulting enrolment; the full “Smile Club Partner” broker product is a scale-phase build',
    ],
    demand: '3 subscriptions through source-coded broker agreements.',
    budget: 'No media — referral fee per result, priced inside the CAC ceiling once Finance sets it.',
    to: 'corporate', toLabel: 'Distribution engine (C7)',
  },
  {
    source: 'Distributors', target: 3,
    summary: 'Benefit platforms and aggregators listing Smile Club under tracked codes.',
    owner: 'Fahad',
    launch: 'w/c 22 Sep', code: 'Per-distributor code',
    approach: 'Employee-benefit marketplaces and community aggregators list the membership where employees and households already browse benefits; the same result-paid mechanics as resellers.',
    proposition: '“A dental benefit your users can actually see, understand and use” — listed with plain-language inclusions, never insurance vocabulary.',
    steps: [
      'Shortlist benefit platforms and aggregators',
      'Listing agreement with a per-distributor code',
      'Result-paid terms inside the CAC ceiling',
      'Monthly reconciliation against the spine before payout',
    ],
    demand: '3 subscriptions through source-coded distributor agreements.',
    budget: 'No media — per-result terms inside the CAC ceiling once Finance sets it.',
    to: 'corporate', toLabel: 'Distribution engine (C7)',
  },
];

function R1Row({ r, open, onToggle }: { r: ResponseRow; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-xl border bg-white" style={{ borderColor: open ? BLUE : LINE }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold tabular-nums text-white" style={{ backgroundColor: CORAL }}>{r.target}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold" style={{ color: NAVY }}>{r.source}</span>
          <span className="block truncate text-[10.5px]" style={{ color: OLIVE }}>{r.summary}</span>
        </span>
        <span className="hidden shrink-0 text-right text-[9.5px] leading-tight md:block" style={{ color: OLIVE }}>
          {r.launch}
        </span>
        <span className="shrink-0 text-[13px] font-bold" style={{ color: BLUE }}>{open ? '▾' : '▸'}</span>
      </button>
      {open ? (
        <div className="border-t px-3.5 py-3" style={{ borderColor: '#EEEFE1' }}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>How we approach & sell</p>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{r.approach}</p>
              <p className="mt-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>The proposition — what we say</p>
              <p className="mt-0.5 text-[11px] italic leading-snug" style={{ color: NAVY }}>{r.proposition}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>The steps</p>
              <ol className="mt-0.5 space-y-1">
                {r.steps.map((s, i) => (
                  <li key={s} className="flex gap-2 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
                    <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: NAVY }}>{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#F7F7F0' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: OLIVE }}>Demand basis & assumption</p>
              <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{r.demand}</p>
            </div>
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FDF9EC' }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6d5a1d' }}>Budget — where it goes and how</p>
              <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{r.budget}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10.5px]" style={{ color: OLIVE }}>
            <span><span className="font-bold" style={{ color: NAVY }}>Owner:</span> {r.owner} · <span className="font-bold" style={{ color: NAVY }}>Tracking:</span> {r.code}</span>
            <Jump to={r.to}>{r.toLabel}</Jump>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResponseTab() {
  const total = RESPONSE_ROWS.reduce((a, r) => a + r.target, 0);
  const [openSrc, setOpenSrc] = useState<string | null>('Corporate');
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
        <Exhibit n="R1" title={`The 120 — paid subscriptions by source (${total}/120 mapped) · click any source to drill down`} />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Each source opens into its full playbook: how we approach and sell, the proposition, the steps, who
          owns it, the demand assumption and where every dirham goes — with a link to its deep section.
        </p>
        <div className="space-y-2">
          {RESPONSE_ROWS.map((r) => (
            <R1Row key={r.source} r={r} open={openSrc === r.source} onToggle={() => setOpenSrc(openSrc === r.source ? null : r.source)} />
          ))}
        </div>
      </section>

      <section>
        <Exhibit n="R2" title="Budget — AED 30,000 / 30 days (PROPOSED, pending Mr Akbar's sign-off)" />
        <div className="grid gap-2 md:grid-cols-3">
          {([
            ['AED 30,000', 'DM budget · 30 days', 'Full digital budget supporting all lanes — awareness, retargeting, corporate air-cover, offer creative — not only direct website acquisition.'],
            ['≤ AED 250', 'Proposed DM budget per target contract', '= 30,000 ÷ 120 (18–25% of the two individual annual fees). NOT yet a full-cost ceiling: staff, commissions, creative, events and onboarding are unpriced — the fully loaded ceiling is a Finance deliverable before scale.'],
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
                <th className="px-3 py-2 font-bold">Paid CPL scenario</th><th className="px-3 py-2 text-center font-bold">Fixed 150 qualified: cost · paid · headroom</th>
                <th className="px-3 py-2 text-center font-bold">Full 30K: leads → expected paid</th>
                <th className="px-3 py-2 text-center font-bold">Full-spend CAC</th><th className="px-3 py-2 font-bold">Reading</th>
              </tr>
            </thead>
            <tbody>
              {([
                ['CPL 150 — target', 'AED 22,500 · 12 paid · AED 7,500 headroom', '200 → 16 expected · no headroom', '~AED 1,875', 'Fixed-150 and full-spend outcomes are mutually exclusive — never both.'],
                ['CPL 200 — ceiling', 'AED 30,000 · 12 paid · zero headroom', '150 → 12 expected', 'AED 2,500', 'The operating break-point at full budget.'],
                ['CPL 500 — downside', 'not affordable (150 leads = 2.5× budget)', '60 → 4.8 expected', 'AED 6,250', 'Recovery trigger: shift to clinic/corporate enablement + warm audiences; website target revised.'],
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
          <Note tone="blue">
            Affordability check on the direct slices: Search 6,000 + Meta 9,000 = AED 15,000
            direct-response. All 150 qualified from paid alone would need CPQL ≤ 100 (15,000 ÷ 150); the plan
            instead assumes paid delivers ≥120 of the 150 (CPQL ≤ 125) with the owned lanes (banner ·
            placements · triggered CRM) contributing ≥30 at zero media cost. At the 200 ceiling the 15K buys
            only 75 qualified → 6 expected paid — recovery is owned lanes + the reserve, not silent overspend.
            The mandate’s own direct-media formula (12 × 250 = 3,000) is 5× smaller than these slices — the
            budget-classification question flagged at sign-off, restated here so it is settled at the 28 Sep
            review, not discovered later.
          </Note>
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
                 'Search ad copy set EN/AR · 3–5 CTWA template statics (launch set, Creative OS) · designer variants + retargeting statics ◆ (upgrade) · LP membership variant · WhatsApp quick-reply scripts'],
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
              'Funding gates: 22 Sep initial launch funding → 5 Oct Day-15–30 funding after pace, CAC and data review → 21 Oct next-period funding for proven sources.',
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
              'Tracking: every activity source-coded (QR / employer code / partner code / UTM); the dashboard spine — enquiry → qualified → checkout → paid → card active → booked → attended — is the single report. Attribution BELOW 98% holds new spend; on paid contracts that means ≥30/30, 49/50, 74/75 and 118/120 attributed at the four checkpoints.',
              'Rhythm: 09:00 outcome review · 16:00 recovery queue · EOD scorecard · weekly resource decision, run with the Smile Club Coordinator.',
              'Risk 1 — creative assets: the designer gap limited paid creative volume. Unlock in progress: Mohan (videographer & content designer) in role — dynamic-format asset set v1 due Mon 28 Sep, clinically reviewed before launch.',
              'Risk 2 — corporate pipeline: the 24 depends on sized, surviving doors — Michael Page closed 21 Sep; Assembly Global awaiting; the ≥72 coverage is unquantified until the 28 Sep replacement-door bridge lands. Mr Akbar’s three intros requested at sign-off.',
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

/* ── Digital marketing plan (rev. 4, 22 Sep — Fahad) ── */

interface DmChannel {
  channel: string; role: string; execution: string; budget: string; contrib: string; status: string; statusColor: string; thesis: string;
}

/** Final rev. 4 channel set under the 70% offline / 30% online doctrine.
 *  Every lane carries its estimated gross-lead → subscription contribution
 *  so no dirham is unaccounted; each channel name links to its full
 *  investment thesis (D1b) and back. */
const DM_CHANNELS: DmChannel[] = [
  {
    channel: 'Google Search', role: 'Capture the only search demand that exists for this product — cost/price intent plus branded protection. There is no membership-query volume to buy; treatment intent stays excluded (it belongs to clinic campaigns).',
    execution: 'Responsive search ads EN/AR → membership LP → lead → 10-minute contact-centre follow-up. Per-cluster budgets and the confirmation status of every keyword in D1c; the second tranche is released ONLY through the Day-14 gate (reserve + reallocation rule) if matured CPQL ≤ 150.',
    budget: 'AED 6,000 pilot (+ gated second tranche at Day-14)',
    contrib: 'Est. 40–110 gross → 24–66 qualified → 2–5 subs (inside Website-12)',
    status: 'LIVE', statusColor: '#2C5E3F', thesis: 'th-google',
  },
  {
    channel: 'Meta — paid (FB/IG)', role: 'Retargeting site visitors + CTWA offer lane at high-intent moments — NOT cold membership prospecting (the broadcast learning). Patient-list audiences only after the documented eligibility check.',
    execution: 'Offer-led statics from Creative OS launch now; Advantage+/dynamic formats HELD by the smart/dynamic-creatives blocker. Contact centre tags membership-intent vs appointment-intent on first reply.',
    budget: 'AED 9,000',
    contrib: 'Est. 150–300 gross (pool-capped) → 90–180 qualified → 7–14 subs (inside Website-12)',
    status: 'PARTIAL — unlock: Mohan’s v1 set 28 Sep', statusColor: '#7a6420', thesis: 'th-meta',
  },
  {
    channel: 'LinkedIn — corporate air-cover', role: 'Door-opener, not a CPL channel: HR, People/Culture, Benefits and Office-Manager titles in Dubai see the one-pager before and after the field-sales knock and the intro emails.',
    execution: 'Founder-led organic posts (Fahad) at zero media cost + one bounded sponsored test on the corporate one-pager; every corporate meeting preceded by a connection touch.',
    budget: 'AED 3,000 (test)',
    contrib: 'Est. 8–20 held meetings — feeds Corporate-24; no membership CPL is claimed',
    status: 'READY — w/c 22 Sep', statusColor: BLUE, thesis: 'th-linkedin',
  },
  {
    channel: 'Corporate field sales — door-to-door', role: 'THE 70% ENGINE. A committed monthly subscription this considered is SOLD in meetings, not clicked: a dedicated agent walks SME/startup/blue-collar doors WITHOUT dental in their medical cover (the Michael Page learning) and signs employer codes.',
    execution: 'Inside the mandate window Gautam carries the bag (owner decision, 22 Sep; a hire cannot land within 30 days — agent sourcing starts now, onboards for the scale phase); Fahad runs warm doors and enablement. Door plan: JLT, Business Bay, DIFC, Al Quoz clusters; “does your medical include dental?” asked first. The 6,000 enablement is itemized line by line in D1b.',
    budget: 'AED 6,000 enablement (itemized in D1b)',
    contrib: '40–60 doors → 12–20 held meetings → pipeline toward ≥72 equivalent → 24 subs (Corporate-24)',
    status: 'NEW — doors from w/c 22 Sep', statusColor: CORAL, thesis: 'th-fieldsales',
  },
  {
    channel: 'Community awareness — offline (rev. 6)', role: 'Targeted air cover, deliberately NOT called brand awareness: AED 3,000 cannot buy brand awareness and does not claim to. It warms exactly where the other lanes harvest — geo cells around the three branches and the agent’s door territories. The full DN brand-awareness campaign is a costed scale-phase proposal for the 21 Oct review (D1b).',
    execution: 'Bounded geo burst: IG/FB reach around the three branches + LinkedIn boost on the agent’s door territories; organic IG proof content rides here (TikTok deferred, asset-blocked). Judged on ENABLER metrics only — branded-search lift, direct traffic, GMB profile views, meeting-acceptance rate — never on CPL.',
    budget: 'AED 3,000 — moved from digital to schools, buildings, gyms and pharmacies near the branches',
    contrib: 'No subscription claim — declared enabler: 30 days of subs cannot judge awareness',
    status: 'NEW — w/c 22 Sep', statusColor: BLUE, thesis: 'th-awareness',
  },
  {
    channel: 'Website sticky banner', role: 'Traffic opportunity: a persistent, dismissible banner routes eligible OBSERVED traffic on selected surfaces to the Smile Club page at zero media cost. The 19,500-page count is supplier-reported inventory, not measured sessions — volume pending measurement, with a clinic-booking displacement guardrail.',
    execution: '“Smile Club — dental care from AED 99/month → Join” EN/AR; UTM sc-banner; built by CRM-DN/W3Layouts; click-through and paid conversions read from the funnel spine.',
    budget: 'No media cost',
    contrib: 'Part of the owned ≥30-qualified floor → ~2–3 subs (inside Website-12), read from sc-banner',
    status: 'TO BUILD — w/c 22 Sep', statusColor: CORAL, thesis: 'th-zero',
  },
  {
    channel: 'WhatsApp / CRM — triggered', role: 'High-intent 1-to-1 contact only, redesigned on the Wave 1 broadcast evidence (full before/after in D1b). Bulk sends: target 0, budget 0, per the mandate.',
    execution: 'Four triggers, each with its own consented template and source code: open treatment plan (membership as the way to afford it) · due recall · SOS follow-up · website abandoner. The contact centre works the qualified queue within 10 minutes and tags membership-intent vs appointment-intent on first reply.',
    budget: 'No media cost',
    contrib: 'Counts inside In-clinic-60 or Website-12 by origin code — no separate target, no double-count',
    status: 'LIVE', statusColor: '#2C5E3F', thesis: 'th-crm',
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
    ask: 'Staff memberships for their own team (Model 3/2); on-site dental day as the opener. One clean ask — no mixed agenda in the room.',
    timeline: 'Raised at the go-live meeting w/c 22 Sep → decision by 30 Sep',
    status: 'open', statusNote: 'Ask scheduled for the go-live meeting',
  },
];

/**
 * CEO-granularity investment theses — per lane: WHY the dirham goes there,
 * the expected numbers WITH THEIR ARITHMETIC (never a bare figure), and HOW
 * it is tracked. All CPL/CPC figures are PLANNING ESTIMATES (Google Keyword
 * Planner ranges for Dubai dental + our own live campaign reads, Sep 2026);
 * the daily scorecard replaces every estimate with actuals from day one.
 */
const DM_THESES: { id: string; ch: string; why: string; cpl: string; track: string }[] = [
  {
    id: 'th-google',
    ch: 'Google Search · AED 6,000 pilot — second tranche only via the Day-14 gate',
    why: 'Search can only CAPTURE demand that already exists — and measured volume for “dental membership” queries is near zero, so a large membership search budget has nothing to buy. What Dubai does search is PRICE: “teeth cleaning price dubai”, “dental checkup cost”. That searcher sees a price, flinches, and the membership is presented as the cheaper way in — the one non-branded pool worth paying for, and a HYPOTHESIS until the first coded cohort matures. Branded terms are protected separately at trivial cost so a told-about-us searcher never lands on a competitor. “Dentist near me” stays negative-matched: that click books an appointment either way, so paying for it here would charge the membership plan for revenue the clinic campaigns already earn.',
    cpl: 'Penny accounting of the 6,000 — branded 500 (CPC 1–3, CVR 20%+ → CPL ≈5–15; volume-capped ≈10–25 leads) · cost-intent 4,500 (CPC 6–14 ÷ 8–10% LP CVR → CPL ≈60–175 → ≈26–75 leads) · plan-intent 500 + insurance-gap 500 (CPL ≈100–250 → ≈4–10 leads). Slice total: est. 40–110 gross → 24–66 qualified → 2–5 subscriptions (full funnel in D1d).',
    track: 'One UTM per cluster → LP → enquiry enters the spine (enquiry → qualified → checkout → paid); live CPC/CPL on the Marketing tab daily; per-cluster kill rule below; Day-14 gate decides the second tranche. Live keyword coverage is confirmed cluster by cluster in D1c — owner Fahad, by 23 Sep.',
  },
  {
    id: 'th-meta',
    ch: 'Meta · AED 9,000 slice',
    why: 'Our own live proof: appointment campaigns deliver at AED 3–6/lead (Tooth Gap 123 leads @ ~AED 3). Learning applied — that engagement is APPOINTMENT-led, so Meta’s membership job is narrow: retargeting site visitors and the CTWA offer lane at high-intent moments, not cold membership prospecting.',
    cpl: 'Membership CTWA est. CPL AED 15–40 — an independent planning range, NOT derived from the appointment CPL. The retargeting + CTWA pool is FINITE (site visitors + engaged non-converters), so volume is planning-capped at 150–300 gross → 90–180 qualified → 7–14 subscriptions (D1d); a raw CPL far below 15 would signal junk volume, not success.',
    track: 'CTWA source codes per ad set → spine; contact-centre tags membership-intent vs appointment-intent on first reply — the split that killed the broadcast test is measured from message one.',
  },
  {
    id: 'th-linkedin',
    ch: 'LinkedIn · AED 3,000 slice (bounded test)',
    why: 'Not a CPL channel — a door-opener. Air-cover for the field-sales knocks and corporate asks: HR/People/Benefits titles see the one-pager before and after outreach. The Michael Page “no” sharpens the ICP: qualify for companies WITHOUT dental in their medical policy (SMEs, startups, blue-collar employers) before spending a meeting.',
    cpl: 'Measured as cost per corporate MEETING, not per lead: est. AED 150–400/meeting on a bounded sponsored test → est. 8–20 held meetings feeding Corporate-24. No membership CPL is claimed for LinkedIn — that would be invented.',
    track: 'UTM → corporate enquiry form + the meeting log (door, date, model discussed, outcome) reviewed at each checkpoint; SC-corporate codes on any resulting pilot.',
  },
  {
    id: 'th-fieldsales',
    ch: 'Corporate field sales · AED 6,000 enablement — THE 70% ENGINE',
    why: 'The doctrine in practice: 70% of the mandate (In-clinic 60 + Corporate 24 = 84 of 120) is sold face-to-face, and corporate needs a bag-carrier, not a banner. A considered AED 99/month commitment for a whole team is bought in a meeting where the savings table is walked through — so the plan funds a door-to-door motion: 40–60 qualified doors across JLT, Business Bay, DIFC and Al Quoz, “does your medical include dental?” asked first. Inside the 30-day window Gautam carries the bag (owner decision, 22 Sep) with Fahad on warm doors and enablement; a dedicated agent CANNOT contribute in-window (hiring takes 2–4 weeks), so sourcing starts now and the agent onboards for the scale phase — priced into the Finance fully-loaded bridge (salary + commission are staffed cost, not media).',
    cpl: 'What the 6,000 buys, line by line (indicative, re-costed per event before commitment): on-site dental-day kits for the first two employer pilots 2 × 1,500 = 3,000 (banner stand, screening forms, chair-side collateral, giveaways) · printed one-pagers + savings tables EN/AR 1,000 · LinkedIn boost on the door territories 1,000 · employer-code enrolment pages + QR materials 500 · door-plan logistics 500. What the 6,000 is NOT: no salaries, no commissions, no agency fees (those sit in the Finance fully-loaded bridge) and no new design spend — artwork and content come from the programme’s existing enablement assets (corporate one-pager, savings math, HR email kit, reception deck) plus Creative OS templates; the 6,000 buys only their production and distribution: printing, kit materials, the territory boost and logistics. Media-side arithmetic: 6,000 ÷ 24 target contracts = AED 250/contract — exactly the mandate’s own per-contract figure. The controlling number is pipeline: ≥72 membership-equivalent at ~33% close → 24.',
    track: 'The meeting log (door, date, model, outcome) + one employer code per door → spine; pipeline coverage reviewed at every checkpoint; the 28 Sep replacement-door bridge sizes the doors.',
  },
  {
    id: 'th-awareness',
    ch: 'Awareness air cover · AED 3,000 — targeted, and honestly NOT brand awareness',
    why: 'Honest sizing first: AED 3,000 cannot buy brand awareness — a credible Dental Nation brand campaign runs AED 25–60K/month sustained over 3+ months and is judged on brand tracking, which a 30-day acquisition mandate cannot fund or measure. So this slice claims only the smaller job it can actually do: targeted air cover exactly where the other lanes harvest — geo cells around the three branches (warms cost-intent search and the retargeting pool) and the agent’s door territories (warms the knock before it lands). The full brand-awareness question — media mix, budget, brand tracking — goes to Mr Akbar as a costed, stand-alone scale-phase proposal at the 21 Oct review.',
    cpl: 'No CPL and no CAC are claimed — enabler metrics only: branded-search impression lift, direct traffic, GMB profile views, door/meeting acceptance rate, all read week-over-week against the pre-burst baseline.',
    track: 'Reach/frequency per geo cell + the enabler metrics on the weekly scorecard; if no lift is visible by Day-21, the remaining burst stops (its own kill rule).',
  },
  {
    id: 'th-crm',
    ch: 'WhatsApp / CRM — triggered · zero media — redesigned on the Wave 1 evidence',
    why: 'WHAT HAPPENED BEFORE (Wave 1, measured): a broadcast test — 5 sends (3 doctor-led + a retry + a follow-up) reached 1,280 non-unique recipients, 863 delivered, 71 replies, 417 failures to code — and the engagement came back APPOINTMENT-led, not membership-led: 0 memberships confirmed from broadcast (payment reconciliation still under review). HOW THIS LANE IS DIFFERENT: broadcast is closed (target 0, budget 0, per the mandate). Triggered contact fires 1-to-1 on a specific high-intent EVENT — an open treatment plan (membership as the way to afford the plan), a due recall, an SOS follow-up, a website abandoner — moments where the membership answers a live problem instead of interrupting. Same channel, opposite mechanism: the audience raises its hand first.',
    cpl: 'Zero media by construction; contribution counts inside the owned ≥30-qualified floor and lands in In-clinic-60 or Website-12 by origin code — never double-counted. The real cost is contact-centre minutes per template, priced in the Finance fully-loaded bridge.',
    track: 'Consented, per-template source codes → spine; the contact centre works the qualified queue within 10 minutes and tags membership-intent vs appointment-intent on first reply — the exact split the broadcast test taught us to measure. Bulk sends stay 0.',
  },
  {
    id: 'th-zero',
    ch: 'Zero-media lane (sticky banner + page placements) — incremental contribution only',
    why: 'The rule is incrementality: these surfaces are always-on for the clinic, so the plan claims only their source-coded membership contributions, never their existence. They add no new target; they are how existing targets are met at zero media cost: the banner + page placements (with triggered CRM, above) feed the Website-12’s 150-qualified pool — planning floor: ≥30 of the 150, ≈2–3 subs. GMB and SEO stay maintained as clinic infrastructure and claim ZERO membership attribution — their closes happen at the front desk and are already counted in In-clinic-60 (double-count guard).',
    cpl: 'Media CPL = AED 0 by construction; the real cost is staffed time, priced in the Finance fully-loaded bridge, not hidden. Banner contribution reads directly from sc-banner.',
    track: 'sc-banner / per-placement codes → spine; anything without a source code counts as nothing.',
  },
];

/** Google Search — the keyword plan with its slice of the 6,000. Estimates
 *  labelled as estimates; live CPCs replace them from the first day of spend. */
const DM_KEYWORDS: { cluster: string; slice: string; kws: string; cpc: string; cpl: string; live: string; role: string }[] = [
  { cluster: 'Branded (always-on)', slice: 'AED 500', kws: '“smile club dental nation” · “dental nation membership” · “smile club dubai”', cpc: '1–3', cpl: '≈5–15 at 20% CVR', live: 'TO CONFIRM — 23 Sep', role: 'Capture told-about-us demand; never lose it to a competitor bid. Volume-capped ≈10–25 leads.' },
  { cluster: 'Cost intent (core test)', slice: 'AED 4,500', kws: '“teeth cleaning price dubai” · “dental checkup cost dubai” · “scaling polishing offer dubai” · “cheap dentist dubai”', cpc: '6–14', cpl: '≈60–175 @ 8–10% CVR', live: 'TO CONFIRM — 23 Sep', role: 'Membership as the ANSWER to price shock — the pilot LP thesis. ≈26–75 leads.' },
  { cluster: 'Plan intent (thin volume)', slice: 'AED 500', kws: '“dental plan dubai” · “dental membership dubai” · “dental discount card uae”', cpc: '8–18', cpl: '≈100–225 @ 8% CVR', live: 'TO CONFIRM — 23 Sep', role: 'Exact match only, low cap — tiny but perfectly qualified.' },
  { cluster: 'Insurance gap', slice: 'AED 500', kws: '“dental insurance dubai individuals” · “dentist without insurance dubai” · “dental cover self employed uae”', cpc: '10–20', cpl: '≈125–250 @ 8% CVR', live: 'TO CONFIRM — 23 Sep', role: 'The uninsured segment the Michael Page learning points at.' },
  { cluster: 'EXCLUDED: treatment intent', slice: '—', kws: '“dentist near me” · “root canal dubai” · “veneers price” → negative-matched', cpc: '—', cpl: '—', live: 'Negative list TO CONFIRM', role: 'Booking demand — belongs to clinic campaigns; bidding it here would double-pay for the same click.' },
];

/** D1d — every dirham to a subscription: the full funnel per lane. Planning
 *  estimates; the 60% gross→qualified rate is an assumption validated at the
 *  Day-7 checkpoint (28 Sep); qualified→paid 8% is the mandate assumption. */
const DM_FUNNEL: { lane: string; budget: string; gross: string; qual: string; subs: string; costPerSub: string }[] = [
  { lane: 'Google Search (pilot)', budget: '6,000', gross: '40–110', qual: '24–66', subs: '2–5', costPerSub: '1,200–3,000' },
  { lane: 'Meta (retargeting + CTWA)', budget: '9,000', gross: '150–300 (pool-capped)', qual: '90–180', subs: '7–14', costPerSub: '640–1,290' },
  { lane: 'DIRECT-RESPONSE SUBTOTAL', budget: '15,000', gross: '190–410', qual: '114–246 · need ≥120 of the 150', subs: '9–19 · target 12 in band', costPerSub: 'blended CPQL 61–132 → target ≤125 · kill 200' },
  { lane: 'Owned (banner · placements · triggered CRM)', budget: '0 media', gross: 'measured, not forecast', qual: '≥30 (planning floor)', subs: '2–3', costPerSub: '0 media (staffed cost in Finance bridge)' },
  { lane: 'LinkedIn (air-cover)', budget: '3,000', gross: 'meetings, not leads: 8–20', qual: '—', subs: 'feeds Corporate-24', costPerSub: '150–400 per held meeting' },
  { lane: 'Corporate field sales', budget: '6,000', gross: '40–60 doors', qual: '12–20 held meetings', subs: '24 (via ≥72 pipeline @ ~33%)', costPerSub: '250/contract media-side' },
  { lane: 'Awareness air cover', budget: '3,000', gross: 'no claim', qual: '—', subs: '0 claimed', costPerSub: 'enabler metrics only' },
  { lane: 'Reserve', budget: '3,000', gross: '—', qual: '—', subs: '—', costPerSub: 'unallocated until the Day-14 gate' },
];

const DM_TIMELINE = [
  { wk: '22–28 Sep · mandate days 1–7', paid: 'Search live · LinkedIn organic starts · sticky banner briefed to CRM-DN · Meta statics prepped', corp: 'Outreach opened — Assembly Global contacted · Michael Page closed 21 Sep (referral live) · ArabyAds staff-membership ask scheduled', gate: 'Day-7 checkpoint 28 Sep — 36 plan / 30 minimum' },
  { wk: '29 Sep – 5 Oct · days 8–14', paid: 'Sticky banner LIVE · Meta statics live · awareness burst starts · LinkedIn sponsored test brief ready', corp: 'Assembly Global follow-up · ArabyAds staff-membership ask made · field-sales door plan live (JLT / Business Bay / DIFC) · agent sourcing starts', gate: 'Day-14 checkpoint 5 Oct — 60/50 · Google gate: matured CPQL ≤ 150 releases the second tranche' },
  { wk: '6–12 Oct · days 15–21', paid: 'Reallocate ±10% to the winning lanes · LinkedIn sponsored test live if creative allows · awareness kill check (lift visible or burst stops)', corp: 'First corporate pilot agreed, coded and speced (the “one defined pilot”) · 40+ doors walked cumulative', gate: 'Day-21 checkpoint 12 Oct — 88/75, reviewed with Gautam' },
  { wk: '13–19 Oct · days 22–28', paid: 'Scale proven sources only · dynamic/smart creatives scale on Mohan’s v2 set (Day-14 learnings)', corp: 'Corporate pilot enrolments running under its employer code · agent offer out for the scale phase', gate: 'CAC vs ceiling + ≥98% attribution checked before any scale-up' },
  { wk: '20–21 Oct · days 29–30', paid: 'Final push through proven lanes only — no new experiments', corp: 'Pipeline handover notes for the next period', gate: '21 Oct — 120 paid, active, non-refunded, Finance-validated' },
];

function DmPlan() {
  const [dmBack, setDmBack] = useState<string | null>(null);
  const jump = (target: string, from: string) => {
    setDmBack(from);
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const backTo = () => {
    if (!dmBack) return;
    document.getElementById(dmBack)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setDmBack(null);
  };
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">The digital marketing plan (rev. 4, 22 Sep). Operating doctrine: ~70% offline / ~30% online.</span>{' '}
        The mandate mix already encodes the doctrine — In-clinic 60 + Corporate 24 = 84 of 120 = 70% sold
        face-to-face — rev. 4 names it and funds it. Media money is inherently an online instrument (offline lanes
        run on staffed cost, priced in the Finance bridge), so the split lives in outcomes and effort, not in the
        media ledger. The AED 30,000, sliced: Google 6 · Meta 9 · LinkedIn 3 · field-sales enablement
        6 · awareness air cover 3 · reserve 3. Every lane feeds the same spine (enquiry → qualified → checkout → paid → card
        active → booked → attended) under its own source code; the smart/dynamic-creatives blocker stands and is
        worked around, not wished away. Every lane serves named audience layers and demand states — the
        personalised message map is in <Jump to="layers">Layers &amp; demand states</Jump>; a message aimed at
        no state does not run.
      </p>

      <section>
        <Exhibit n="D1" title="Channel plan — role, execution, budget slice, contribution, status" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Channel</th><th className="px-2.5 py-2 font-bold">Role & audience</th>
                <th className="px-2.5 py-2 font-bold">Execution & funnel</th><th className="px-2.5 py-2 font-bold">Budget (indicative)</th>
                <th className="px-2.5 py-2 font-bold">Gross → subs (est.)</th>
                <th className="px-2.5 py-2 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {DM_CHANNELS.map((c) => (
                <tr key={c.channel} id={`dmrow-${c.thesis}`} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: NAVY }}>
                    <button
                      type="button"
                      onClick={() => jump(c.thesis, `dmrow-${c.thesis}`)}
                      className="text-left font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid"
                      style={{ color: NAVY }}
                      title="Opens this channel's full investment thesis — a back link returns here"
                    >
                      {c.channel} ↓
                    </button>
                  </td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{c.role}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{c.execution}</td>
                  <td className="px-2.5 py-1.5 tabular-nums" style={{ color: OLIVE }}>{c.budget}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{c.contrib}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap font-bold" style={{ color: c.statusColor }}>{c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>
          Media total AED 27,000 committed (6+9+3+6+3) + AED 3,000 reserve = the proposed 30K (pending
          Mr Akbar&apos;s sign-off). No-media lanes are staffed work, not free — owner time is tracked in the
          daily rhythm.
        </p>
      </section>

      <section>
        <Exhibit n="D1b" title="Why each dirham — investment thesis, expected numbers with their math, tracking" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Every figure below is shown WITH its arithmetic and labelled estimate vs contractual vs measured — the
          daily scorecard replaces estimates with actuals from the first dirham of spend.{' '}
          <span className="font-bold" style={{ color: NAVY }}>Metric dictionary:</span> raw response (click / chat /
          enquiry) → qualified membership opportunity (eligibility + intent, deduplicated — CPQL is priced
          here and is what the mandate&apos;s 150 means) → paid contract. Employer meetings and walked doors are
          separate objects and never called CPL.
        </p>
        <div className="space-y-2">
          {DM_THESES.map((r) => (
            <div key={r.ch} id={r.id} className="rounded-xl border bg-white p-3.5" style={{ borderColor: LINE }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-bold" style={{ color: NAVY }}>{r.ch}</p>
                {dmBack === `dmrow-${r.id}` && (
                  <button
                    type="button"
                    onClick={backTo}
                    className="whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold"
                    style={{ borderColor: LINE, color: BLUE, backgroundColor: '#F7F7F0' }}
                  >
                    ↩ Back to the channel plan
                  </button>
                )}
              </div>
              {r.id === 'th-google' && (
                <button
                  type="button"
                  onClick={() => jump('dm-keywords', r.id)}
                  className="mt-1 text-[10.5px] font-bold underline decoration-dotted underline-offset-2 hover:decoration-solid"
                  style={{ color: BLUE }}
                >
                  Full keyword bid list + live-account confirmation → D1c
                </button>
              )}
              <div className="mt-1.5 grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Why invest</p>
                  <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{r.why}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Expected numbers — and their math</p>
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

      <section id="dm-keywords">
        <Exhibit n="D1c" title="Google Search — the keyword bid list shared with Mr Akbar (planning estimates, AED)" />
        {dmBack === 'th-google' && (
          <button
            type="button"
            onClick={backTo}
            className="mb-2 rounded-full border px-2 py-0.5 text-[10px] font-bold"
            style={{ borderColor: LINE, color: BLUE, backgroundColor: '#F7F7F0' }}
          >
            ↩ Back to the Google thesis
          </button>
        )}
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Cluster</th><th className="px-2.5 py-2 text-right font-bold">Slice</th>
                <th className="px-2.5 py-2 font-bold">Keywords we bid</th>
                <th className="px-2.5 py-2 text-right font-bold">Est. avg CPC</th><th className="px-2.5 py-2 text-right font-bold">Est. CPL</th>
                <th className="px-2.5 py-2 font-bold">In live account?</th>
                <th className="px-2.5 py-2 font-bold">Role</th>
              </tr>
            </thead>
            <tbody>
              {DM_KEYWORDS.map((k) => (
                <tr key={k.cluster} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: k.cluster.startsWith('EXCLUDED') ? CORAL : NAVY }}>{k.cluster}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap" style={{ color: OLIVE }}>{k.slice}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{k.kws}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: '#3a4148' }}>{k.cpc}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums" style={{ color: '#3a4148' }}>{k.cpl}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap font-bold" style={{ color: k.live.startsWith('TO CONFIRM') || k.live.startsWith('Negative') ? '#7a6420' : '#2C5E3F' }}>{k.live}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{k.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          Slices sum to the 6,000 pilot (500 + 4,500 + 500 + 500). The campaign is LIVE but live keyword
          coverage is NOT assumed: our sync reads campaign-level data only, so every cluster above — including
          “dental checkup cost dubai” — is confirmed inside the Google Ads account itself (owner: Fahad, by 23
          Sep); any missing keyword is added at confirmation and the status column flips to CONFIRMED, dated.
          This table is the definitive bid list shared with Mr Akbar. CPC ranges are Keyword Planner planning
          estimates for Dubai dental (Sep 2026), not promises; CPL = CPC ÷ landing-page conversion. Kill rule per
          cluster: evaluated at minimum AED 300 spend AND a 7-day maturity lag for qualification; zero matured
          qualified leads reads “no result yet”, never CPL 0; a cluster pauses when its matured CPQL exceeds 200.
          Equivalent stop rules per billable object apply to Meta (CPQL) and LinkedIn (cost/held meeting). Live
          actuals replace this table&apos;s estimates in the daily scorecard from day one.
        </p>
      </section>

      <section>
        <Exhibit n="D1d" title="Every dirham to a subscription — gross lead → qualified → sub, per lane" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Lane</th><th className="px-2.5 py-2 text-right font-bold">Budget (AED)</th>
                <th className="px-2.5 py-2 font-bold">Est. gross leads</th><th className="px-2.5 py-2 font-bold">Est. qualified (~60%)</th>
                <th className="px-2.5 py-2 font-bold">Est. subscriptions (8% of qual.)</th><th className="px-2.5 py-2 font-bold">Est. media cost / sub (AED)</th>
              </tr>
            </thead>
            <tbody>
              {DM_FUNNEL.map((f) => (
                <tr key={f.lane} className={`border-t align-top${f.lane.startsWith('DIRECT') ? ' font-semibold' : ''}`} style={{ borderColor: '#EEEFE1', backgroundColor: f.lane.startsWith('DIRECT') ? '#F7F7F0' : undefined }}>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: NAVY }}>{f.lane}</td>
                  <td className="px-2.5 py-1.5 text-right tabular-nums whitespace-nowrap" style={{ color: OLIVE }}>{f.budget}</td>
                  <td className="px-2.5 py-1.5 tabular-nums" style={{ color: '#3a4148' }}>{f.gross}</td>
                  <td className="px-2.5 py-1.5 tabular-nums" style={{ color: '#3a4148' }}>{f.qual}</td>
                  <td className="px-2.5 py-1.5 tabular-nums" style={{ color: '#3a4148' }}>{f.subs}</td>
                  <td className="px-2.5 py-1.5 tabular-nums" style={{ color: CORAL }}>{f.costPerSub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 space-y-2">
          <Note tone="blue">
            Website-12 reconciliation: direct paid 9–19 subs + owned 2–3 = 11–22 band, with the 12 target at its
            low-mid — headroom, not slack. Qualified check: paid 114–246 + owned ≥30 against the 150 the mandate
            requires. Assumptions on show: gross→qualified ~60% (validated at the 28 Sep Day-7 checkpoint) and
            qualified→paid 8% (the mandate&apos;s own rate). Blended direct CPQL must land ≤125 target
            (15,000 ÷ 120) with 200 as the kill line.
          </Note>
          <Note tone="coral">
            The honesty line that justifies the 70/30 doctrine: direct-media cost per subscription (est. AED
            640–3,000) can EXCEED the first-year fee (AED 99/month ≈ 1,188/year) — paid acquisition pays back only
            through utilization revenue, which the pilot measures. The offline 70% (in-clinic + field-sold
            corporate) carries no media CAC at all — staffed cost only. That is why the target mix leans offline
            and paid stays capped and gated.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n="D2" title="The blocker — smart/dynamic creatives — and what is structurally immune to it" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card accent={CORAL}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>Blocker: smart/dynamic creatives</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              The scale formats — Meta Advantage+ / dynamic creative and Google responsive display / PMax — need
              asset variety: multiple ratios, message variants, video cutdowns. Creative OS produces templated
              statics; it cannot feed those formats. UNLOCK IN PROGRESS: the hire has landed — Mohan
              (videographer &amp; content designer) delivers the dynamic-format asset set v1 (3 ratios × 3
              demand-state messages) on Mon 28 Sep; the dynamic lanes go live only after Dr Luvi&apos;s clinical
              review, and scale on the v2 set from Day-14 learnings. Until then search + offer-led statics carry
              the load. See the <Jump to="team">Team task calendar</Jump>.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Immune 1: the sticky banner</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              While paid is capped, the cheapest lead is traffic we already paid for. The banner puts Smile Club in
              front of eligible observed traffic on selected surfaces — measured sessions, not the supplier-reported
              19,500-page count, decide its worth — one build, no media, no new creative formats, with a
              clinic-booking displacement guardrail. Dismissible, EN/AR, UTM-coded
              (sc-banner) so its contribution reads directly in the funnel spine. Owner: CRM-DN/W3Layouts, live w/c
              22 Sep.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Immune 2: the offline 70%</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              The creative blocker cannot bind on a handshake. Door-to-door corporate selling needs a one-pager
              and a savings table, not dynamic ad formats — the 70% of the target sold face-to-face (In-clinic 60 +
              Corporate 24 = 84) is structurally immune to the blocker. ArabyAds features only as a{' '}
              <span className="font-semibold">corporate prospect</span> (staff memberships, SC-ARB).
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
            LEARNING (21 Sep, Michael Page): one employer declined citing dental already included in their
            medical cover. HYPOTHESIS to qualify — not yet a rule: employers WITHOUT dental in their cover
            (SMEs, startups, blue-collar, hospitality) convert better; each door still needs case-specific
            qualification (“does your medical include dental?” asked FIRST). The referral is promised,
            introduction pending — it enters the pipeline only when a named door exists. Pipeline effect: one
            of three named doors closed; the ≥72 requirement needs a sized replacement-door bridge, due at
            the 28 Sep review. The field-sales door plan (D1) is the replacement engine. Pilot specification
            and payment models:{' '}
            <Jump to="corporate">Corporate playbook</Jump>.
          </Note>
        </div>
      </section>

      <section>
        <Exhibit n="D4" title="Timeline — 30 days to 21 October" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Week</th><th className="px-2.5 py-2 font-bold">Paid & owned</th>
                <th className="px-2.5 py-2 font-bold">Corporate & field sales</th><th className="px-2.5 py-2 font-bold">Gate / checkpoint</th>
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
        defined corporate pilot through a warm door, and defer heavy awareness media (rev. 4 carries a single
        bounded AED 3,000 awareness burst, judged on enabler metrics, never on CPL). Scale is a decision we earn
        with data at the end of the pilot — not a calendar commitment we make today. The owner has since fixed
        the outcome (<Jump to="mandate">30-day mandate</Jump>) and the proposed, quantified response is in the{' '}
        <Jump to="response">30-day delivery plan</Jump>.
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
        <p className="mb-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#EEF4F6', color: NAVY }}>
          The blueprint&apos;s equation: membership revenue + incremental treatment revenue + retention value +
          family expansion + corporate revenue − included clinical cost − acquisition cost − benefit cost −
          service cost = Smile Club contribution. The governing comparison is member LTV vs non-member LTV, not
          subscription margin alone. And the breakage rule: a plan that is profitable because members fail to use
          preventive care undermines the whole thesis — the objective is economically sustainable UTILISATION.
        </p>
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
        How to read the waves: they are gates, not a calendar — Wave 1 is EXECUTED and keeps running (its plays
        became the daily operating engine), Wave 2 is the CURRENT phase (entered where evidence allows), Wave 3
        is PLANNED and deliberately not started until the evidence gate opens. Mapping to the Strategic
        Blueprint&apos;s launch phases: Wave 1 ≈ phases 0–2 (validate · internal pilot · existing-patient
        launch), Wave 2 ≈ phases 3–5 (DTC growth · family scale · B2B pilot), Wave 3 ≈ phase 6 (optimise /
        platform). Expansion at each step depends on: reliable measurement and clear offer terms · evidence of conversion and
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
            <p className="mt-0.5 text-[10px] font-bold leading-tight" style={{ color: x.statusColor }}>{x.status}</p>
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
            {['5 broadcast sends', '1,280 non-unique reach', '863 delivered', '71 replies', '417 failures to code', '0 broadcast memberships confirmed (reconciliation pending — 23 Sep)'].map((s) => (
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

/* ── rev. 5: demand architecture (Mr Akbar's strategy review, 22 Sep) ── */

const CONSUMER_JOBS: { job: string; thought: string; answer: string }[] = [
  { job: 'Protect me', thought: '“I don’t want a surprise dental bill.”', answer: 'Predictable annual membership — fewer unpleasant surprises.' },
  { job: 'Keep me healthy', thought: '“I want to avoid expensive problems.”', answer: 'Preventive care built in: small problems caught before they become expensive ones.' },
  { job: 'Make it simple', thought: '“I don’t understand dental pricing.”', answer: 'Clear member pricing — no decoding, no claims journey for membership benefits.' },
  { job: 'Look after my family', thought: '“I want someone responsible for our teeth.”', answer: 'Family membership: one dental home managing everyone’s oral health.' },
  { job: 'Give me access', thought: '“When I need a dentist, I want someone good, quickly.”', answer: 'DN network + priority appointment access.' },
  { job: 'Help me decide', thought: '“I don’t know what needs doing now vs later.”', answer: 'My Smile Plan: prioritised, clinically grounded recommendations — now / soon / monitor.' },
  { job: 'Reward loyalty', thought: '“I already use Dental Nation.”', answer: 'Member privileges and value recognition — the patient-to-member conversion engine.' },
]

const LANG_DICT: { avoid: string; use: string }[] = [
  { avoid: 'Dental insurance / corporate dental insurance', use: 'Dental membership / corporate dental membership' },
  { avoid: 'Premium', use: 'Membership fee' },
  { avoid: 'Policy / policy limit', use: 'Membership programme / membership entitlement' },
  { avoid: 'Insured / covered employees', use: 'Member / eligible employees → activated members' },
  { avoid: 'Coverage', use: 'Included benefits / included member services' },
  { avoid: 'Claim', use: 'Member service' },
  { avoid: '“We cover your treatment up to AED X”', use: 'Specified included services + preferred member rates' },
  { avoid: '“Dental insurance without calling it insurance”', use: 'Complementary employee dental benefit beside existing insurance' },
  { avoid: 'Annual coverage limit', use: 'Membership-year inclusions / limits' },
  { avoid: '“Guaranteed protection from dental costs”', use: 'More predictable routine dental care / member value' },
]

function WhyTab() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[13px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">The single source of truth (Mr Akbar&apos;s Strategic Blueprint + Corporate Strategy, Sep 2026 — this plan is their 30-day execution slice):</span>{' '}
        Smile Club is not Dental Nation selling cheaper dentistry. It is Dental Nation converting episodic
        dental patients into continuously cared-for members by making prevention, access and dental spending
        simpler, more predictable and more valuable. The product economics come AFTER this demand
        architecture — not before.
      </p>

      <section>
        <Exhibit n="W1" title="The need — nobody wakes up wanting a dental subscription" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          “I need a dental subscription” is our product language, not the customer&apos;s. The actual demand pool
          sounds like this — and UAE insurance structure creates it: basic plans often carry little or no routine
          dental benefit, and enhanced plans add sub-limits, co-pays and exclusions.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            '“Dentists are expensive.”', '“I don’t know what my insurance covers.”',
            '“Every time I go, they find something.”', '“I don’t want a AED 5,000 surprise.”',
            '“I have kids — something is always happening.”', '“I haven’t been in a year.”',
            '“I want good dentists without premium prices every time.”', '“My insurance covers medical; dental is terrible.”',
          ].map((s) => (
            <span key={s} className="rounded-full border px-2.5 py-1 text-[10.5px] italic" style={{ borderColor: LINE, color: NAVY, backgroundColor: 'white' }}>{s}</span>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] font-semibold" style={{ color: NAVY }}>
          So Smile Club does not fundamentally sell dentistry. It sells: predictability + prevention + access +
          privilege + trust.
        </p>
      </section>

      <section>
        <Exhibit n="W2" title="Five jobs-to-be-done — what the member hires Smile Club to do" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Job</th><th className="px-3 py-2 font-bold">The consumer thought</th><th className="px-3 py-2 font-bold">Smile Club answer</th>
              </tr>
            </thead>
            <tbody>
              {CONSUMER_JOBS.map((j) => (
                <tr key={j.job} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{j.job}</td>
                  <td className="px-3 py-1.5 italic" style={{ color: '#3a4148' }}>{j.thought}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{j.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="W3" title="The proposition — four pillars, one sentence" />
        <div className="grid gap-2 md:grid-cols-4">
          {([
            ['PREVENT', 'Do not wait for pain to be the trigger — scheduled exams, hygiene, risk-based recalls.'],
            ['PLAN', 'Understand what is happening and what comes next — baseline, Smile Score, My Smile Plan, transparent priorities.'],
            ['SAVE', 'Transparent preferred-member economics — privilege, not “30% off everything”.'],
            ['BELONG', 'An ongoing relationship: patient → MEMBER. Dental Nation knows your history year after year.'],
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>{t}</p>
              <p className="mt-1 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-medium" style={{ backgroundColor: '#F4F7F6', color: NAVY }}>
          “Smile Club gives you a simple way to stay ahead of dental problems, access Dental Nation throughout
          the year and enjoy preferred member benefits — without the complexity normally associated with dental
          care.” Brand idea: <span className="font-bold">Stay Ahead of Your Smile.</span> The membership journey
          the product must deliver after purchase: activate → baseline assessment → Smile Score → My Smile Plan →
          prevention → recall → annual value statement → renewal → family extension (Smile Score, My Smile Plan
          and the annual value statement are BUILD items, owner assignment at the 28 Sep review).
        </p>
      </section>

      <section>
        <Exhibit n="W4" title="Regulatory language dictionary — before any word goes to market" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Smile Club is a Dental Nation membership programme, NOT an insurance policy or a substitute for
          mandatory health insurance. Health-insurance activity requires authorisation in Dubai, and renaming
          &quot;insurance&quot; to &quot;subscription&quot; does not change regulatory classification — the benefit
          architecture stays on specified services, access rights and preferred rates, never open-ended promises
          to pay uncertain treatment costs. Final vocabulary is legal-approved before launch. 2026 context
          raising the bar: DHA published updated Dubai Dental Guidelines (v2, Mar 2026) and continues
          health-insurance claims-audit activity — formal legal/compliance sign-off is a launch GATE, not a
          marketing-led interpretation.
        </p>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold" style={{ width: '50%' }}>Avoid (until legally cleared)</th><th className="px-3 py-2 font-bold">Use</th>
              </tr>
            </thead>
            <tbody>
              {LANG_DICT.map((r) => (
                <tr key={r.avoid} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5" style={{ color: CORAL }}>{r.avoid}</td>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: '#2C5E3F' }}>{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Positioning to test: “A benefit employees can actually see, understand and use” · “Dental Nation care,
          built into your employee experience” (corporate) · “Stay ahead of your smile” (consumer). Never:
          “Dental insurance for your employees without insurance.”
        </p>
      </section>

      <p className="text-[11px]" style={{ color: OLIVE }}>
        This architecture governs everything downstream: the audience layers and demand states it serves are in{' '}
        <Jump to="layers">Layers &amp; demand states</Jump>, the B2B2C system it powers is the{' '}
        <Jump to="corporate">Corporate playbook</Jump>, and the 30-day machinery executing against it is the{' '}
        <Jump to="dm">Digital marketing plan</Jump>.
      </p>
    </div>
  );
}

/* Consumer layers × demand states — different layer, different message,
 * different channel. The direct answer to "single speech for all". */
const DEMAND_STATES: { state: string; who: string; message: string; channel: string; cta: string }[] = [
  { state: '1 · Unaware', who: '“My teeth are fine.” No immediate demand.', message: 'Create prevention awareness: “Small problems become expensive problems. Stay ahead of them.”', channel: 'Awareness air cover (geo) · organic proof content · GMB presence — never a hard sell', cta: 'Check your smile status' },
  { state: '2 · Neglect / procrastination', who: 'Knows they should go; postpones. Our biggest competitor.', message: '“Your dental care is already planned for the year.” Reduce friction, pre-commitment.', channel: 'Reactivation CRM (lapsed DN patients, personalised 1-to-1) · recall triggers · sticky banner', cta: 'Book your baseline visit' },
  { state: '3 · Cost anxiety', who: 'Afraid of the AED 10,000 verdict.', message: '“Know where you stand before problems become expensive.” Loss-aversion frame, not savings %.', channel: 'Google cost-intent search (the paid core test) · cost-guide pages + membership module', cta: 'See member benefits' },
  { state: '4 · Insurance frustration', who: '“I have insurance but dental isn’t covered.”', message: '“Your medical insurance and your dental membership do different jobs.” Complement — never attack insurance.', channel: 'Insurance-gap search cluster · content answering coverage questions → consult → membership', cta: 'Compare your options' },
  { state: '5 · Active dental need', who: 'Toothache, broken filling, cleaning due — already high intent.', message: 'Solve TODAY’S problem first; introduce Smile Club as continuity at the point of care — never lead with “buy Smile Club”.', channel: 'Clinic campaigns → front desk at checkout (the In-clinic-60 engine) · triggered WhatsApp follow-up', cta: 'Book urgent visit — membership comes after' },
  { state: '6 · Planned treatment', who: 'Implants, ortho, veneers — “I’m spending anyway; does membership add value?”', message: 'Membership as the economic accelerator on treatment already planned.', channel: 'Chair-side + treatment-plan trigger (open-plan CRM template) · consult close', cta: 'Ask about member rates' },
  { state: '7 · Family responsibility', who: 'Parents — “someone should manage the family’s teeth.”', message: '“One membership. One dental home for the family.” Belonging, not saving.', channel: 'Family/parent creators & influencers (per-code tracked) · school/community activations (CSR) · Meta family creative', cta: 'Explore Family membership' },
  { state: '8 · Existing DN patient', who: 'Already trusts DN — the cheapest acquisition there is.', message: '“You’re already part of Dental Nation. Smile Club makes staying with us easier.”', channel: 'Front desk · recall · post-treatment touch · personalised CRM — the installed base carries the 60', cta: 'Join from your DN record' },
]

function LayersTab() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">One speech for all is dead.</span>{' '}
        Smile Club serves different layers in different demand states — an unaware scroller, a lapsed patient to
        reactivate, a parent, an insurance-frustrated searcher and a patient in the chair need different messages
        on different channels. Every campaign, template and landing page below is tagged to one state; a message
        aimed at no state does not run.
      </p>

      <section>
        <Exhibit n="L1" title="The demand-state map — layer → message → best activity & channel" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Demand state (layer)</th><th className="px-2.5 py-2 font-bold">Who this is</th>
                <th className="px-2.5 py-2 font-bold">The message (personalised)</th><th className="px-2.5 py-2 font-bold">Best activity & channel</th>
                <th className="px-2.5 py-2 font-bold">CTA</th>
              </tr>
            </thead>
            <tbody>
              {DEMAND_STATES.map((d) => (
                <tr key={d.state} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{d.state}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{d.who}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{d.message}</td>
                  <td className="px-2.5 py-1.5" style={{ color: OLIVE }}>{d.channel}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap font-semibold" style={{ color: BLUE }}>{d.cta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Rule: different channel = different message. A searcher asking “does my insurance cover root canal?”
          never sees “JOIN SMILE CLUB TODAY” — they see help understanding their options, then a consult, then
          membership as continuity. Instagram may ask “when was your last check-up?” — different intent,
          different creative, different landing page, different CTA.
        </p>
      </section>

      <section>
        <Exhibit n="L2" title="The psychology doing the work" />
        <div className="grid gap-2 md:grid-cols-3">
          {([
            ['Loss aversion', 'A surprise AED 3,000 bill hurts more than AED 75/month. Lead with “fewer unpleasant surprises”, not only savings.'],
            ['Mental accounting', 'AED 900 at once feels painful; AED 75/month feels manageable — economically similar, psychologically different.'],
            ['Present bias', 'Prevention is postponed because the reward feels distant. Included preventive visits + reminders create commitment.'],
            ['Inertia', 'People delay booking even after deciding — so the first appointment is booked during onboarding, not left to the member.'],
            ['Endowment effect', 'Once someone is “a Smile Club member”, they move from transactional patient to belonging. Never a discount plan.'],
            ['Ambiguity aversion', 'Unclear dental pricing creates avoidance — explicit inclusions, exclusions and member rates.'],
            ['Trust transfer', 'People act on recommendations from a known clinician — continuity and a named care team where possible.'],
            ['Social proof', 'Households choose providers through friends and family — family add-ons and referrals built into the lifecycle.'],
            ['Goal gradient', 'Visible progress increases adherence — Smile Score and milestones, used responsibly as communication tools.'],
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>{t}</p>
              <p className="mt-1 text-[10px] leading-snug" style={{ color: '#3a4148' }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Exhibit n="L3" title="How the 30-day machinery maps to the layers" />
        <p className="text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
          The delivery plan already runs one engine per high-value layer: state 8 (existing patients) is the{' '}
          <Jump to="response">In-clinic-60</Jump>, state 5 is the front-desk close + triggered WhatsApp, state 3
          is the Google cost-intent pilot, state 4 is the insurance-gap cluster, state 7 is the affiliate/creator
          and CSR lanes, state 2 is reactivation CRM, and state 1 gets only the bounded awareness air cover.
          Corporate buyers are a different market entirely — B2B demand states, triggers and journeys live in the{' '}
          <Jump to="corporate">Corporate playbook</Jump>. Budget stays where the mandate put it; what changes is
          that every dirham now carries a named layer and a personalised message instead of one speech.
        </p>
      </section>
    </div>
  );
}

/* ── Corporate rebuilt as a B2B2C system (Mr Akbar's architecture, 22 Sep) ── */

const CORP_MESSAGES: { who: string; message: string }[] = [
  { who: 'CEO', message: '“Strengthen the employee experience with a healthcare benefit people can actually use.”' },
  { who: 'CHRO', message: '“Add a visible dental benefit without redesigning your entire medical insurance programme.”' },
  { who: 'Benefits manager', message: '“Simple administration, clear eligibility and measurable utilisation.”' },
  { who: 'CFO', message: '“Defined per-employee cost with controllable benefit architecture.”' },
  { who: 'Procurement', message: '“Clear SLA, pricing, governance and contractual structure.”' },
  { who: 'Employee', message: '“Your company is making dental care easier.”' },
]

const EMP_JOBS: { job: string; hr: string; answer: string }[] = [
  { job: 'Improve benefits', hr: '“Our benefits feel basic.”', answer: 'Add a visible dental benefit' },
  { job: 'Control cost', hr: '“Insurance upgrades are expensive.”', answer: 'Defined membership economics' },
  { job: 'Retain talent', hr: '“Benefits matter to employees.”', answer: 'Tangible everyday benefit' },
  { job: 'Support wellbeing', hr: '“We want preventive programmes.”', answer: 'Preventive dental pathway' },
  { job: 'Simplify access', hr: '“Employees don’t know where to go.”', answer: 'Preferred DN network' },
  { job: 'Differentiate employer', hr: '“We need EVP advantages.”', answer: 'Branded employee membership' },
]

const CORP_SEGMENTS: { seg: string; size: string; traits: string; prop: string }[] = [
  { seg: 'A · SMEs', size: '20–200', traits: 'Limited benefits sophistication, price-sensitive, fast decisions, owner/GM involved.', prop: '“Give your employees a meaningful dental benefit without upgrading your entire medical policy.” Easiest initial market — the field-sales door plan starts here.' },
  { seg: 'B · Mid-market', size: '200–1,000', traits: 'Formal HR; needs engagement, reporting, procurement, employee categories.', prop: '“A measurable preventive dental benefit integrated into your employee-benefits programme.”' },
  { seg: 'C · Enterprise', size: '1,000+', traits: 'Banks, developers, airlines, GREs, hospitality. Ask for SLAs, capacity, governance, data protection.', prop: 'Longer sale, dramatically larger accounts — enters the pipeline via brokers and warm doors, not cold knocks.' },
  { seg: 'D · Frontline-heavy', size: 'Any', traits: 'Hospitality, retail, logistics, security, F&B — employees often on basic medical benefits.', prop: '“High perceived employee value at controlled employer cost.” Prime Essential-tier territory.' },
  { seg: 'E · Premium talent', size: 'Any', traits: 'Consulting, finance, tech, law. Different psychology — never “cheap dental care”.', prop: '“Premium preventive dental access as part of a sophisticated employee experience.”' },
  { seg: 'F · Schools', size: 'Staff first', traits: 'Staff programme initially; later staff + families + wider family initiatives.', prop: 'Staff benefit now, family funnel later.' },
]

const CORP_STATES: { state: string; signal: string; play: string }[] = [
  { state: '1 · No perceived problem', signal: '“Our insurance is fine.”', play: 'Don’t sell — create the category: “How much dental protection does your current employee health plan actually provide?”' },
  { state: '2 · Benefits gap recognised', signal: '“Our dental coverage is weak.”', play: 'High-potential: “You don’t need to redesign your medical plan to improve dental access.”' },
  { state: '3 · Insurance renewal', signal: 'Reviewing premiums, networks, exclusions.', play: 'THE biggest B2B demand moment — renewal month goes on every account record.' },
  { state: '4 · Employee complaints', signal: '“My dental isn’t covered.”', play: 'Immediate HR pain — fastest sales cycle.' },
  { state: '5 · Benefits benchmarking', signal: '“What are competitors providing?”', play: 'Sell Smile Club as an EVP product.' },
  { state: '6 · Cost pressure', signal: 'More perceived benefit without premium increases.', play: 'The cost-control story: defined per-employee economics.' },
  { state: '7 · Talent / retention initiative', signal: 'EVP, wellness, retention programmes.', play: 'Position inside the total-rewards architecture.' },
  { state: '8 · Wellness programme', signal: 'Health checks, mental wellbeing, fitness running already.', play: 'Dental slots in naturally as the next pillar.' },
]

const CORP_LADDER: { tier: string; who: string; inside: string }[] = [
  { tier: 'Corporate Essential', who: 'Large populations / frontline workforces (segments A, D)', inside: 'Annual dental assessment · preventive check-up · defined diagnostic benefits · member rates · priority access · recall.' },
  { tier: 'Corporate Plus', who: 'Mid-market standard (segment B)', inside: 'Essential + additional hygiene/prevention · enhanced member rates · expanded services · better access privileges.' },
  { tier: 'Corporate Premium', who: 'Executives / premium talent (segment E)', inside: 'Higher preventive utilisation · premium appointment access · concierge · executive oral-health assessment · cosmetic consultation.' },
  { tier: 'Family Add-On', who: 'Every tier', inside: 'Employer pays employee; employee upgrades to spouse/family — DN revenue without employer funding it. Employee → Employee + Spouse → Family.' },
]

const CORP_IMPL: { t: string; what: string }[] = [
  { t: 'T-30', what: 'Contract signed' },
  { t: 'T-21', what: 'Employee eligibility data received' },
  { t: 'T-14', what: 'Employee communications prepared (radically simple: “Your company has given you Smile Club — activate in 60 seconds”, never an eight-page PDF)' },
  { t: 'T-7', what: 'HR briefing (FAQ, launch pack, support line, clear exclusions — internal political safety)' },
  { t: 'Launch', what: 'CEO/HR announcement + QR + landing page' },
  { t: 'Weeks 1–4', what: 'Activation drive + on-site/virtual onboarding' },
  { t: 'Month 1 / 3', what: 'First activation report / first utilisation report' },
  { t: 'Quarterly', what: 'Business review — aggregated dashboard' },
  { t: 'Month 9–10', what: 'Renewal strategy begins — NEVER waiting until month 12; the annual value report leads the conversation' },
]

function Corporate() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">Smile Club Corporate is a B2B2C system, run almost as its own business unit — not a bulk discount on the consumer product.</span>{' '}
        The person who buys it (employer) is not the person who uses it (employee), so there are two
        transformations to engineer: Employer → Distribution Partner, and Employee → Member. It sells a practical
        employee dental benefit that sits BESIDE employer health insurance — never pretending to be insurance —
        because HR&apos;s real problems are “our health insurance doesn&apos;t provide meaningful dental”,
        “upgrading everyone&apos;s package is expensive” and “we want benefits employees actually use”. The
        strategic prize is institutional distribution: employers, brokers and schools continuously feeding
        members into the DN network — worth far more than the membership fee alone.
      </p>

      <section>
        <Exhibit n="C1" title="Two simultaneous journeys — the fundamental design fact" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card accent={NAVY}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Employer journey (the sale)</p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#3a4148' }}>
              Need → Trigger → Discovery (“How is dental currently handled within your employee health
              benefits?”) → Benefits Gap Assessment → Business case → Proposal (16-section standard) →
              Procurement / legal → Implementation → Launch → Adoption → Reporting → Business review → Renewal →
              Expansion (family, subsidiaries, tiers).
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Employee journey (the value)</p>
            <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#3a4148' }}>
              Company launch → “What is Smile Club / is it included for me?” → Activate (60 seconds) → Book →
              First assessment → Smile Score → My Smile Plan → Prevention → Treatment if required → Recall →
              Ongoing membership → Family upgrade → Advocacy.
            </p>
            <p className="mt-1.5 text-[10.5px] font-bold" style={{ color: CORAL }}>
              The contract means nothing if employees don&apos;t activate — ACTIVATION RATE is the primary KPI.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="C2" title="Three customers, six messages — never one speech" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Economic buyer (CEO/CFO/HR Director/Procurement — “why should our company pay?”), programme owner
          (HR/People &amp; Culture/Benefits — “how hard is this to run?”) and employee (“why should I care?”)
          need completely different communication. This is where most B2B healthcare offers fail.
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {CORP_MESSAGES.map((m) => (
            <div key={m.who} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>{m.who}</p>
              <p className="mt-1 text-[10.5px] italic leading-snug" style={{ color: NAVY }}>{m.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Exhibit n="C3" title="The six employer jobs-to-be-done" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Employer job</th><th className="px-3 py-2 font-bold">What HR/CFO thinks</th><th className="px-3 py-2 font-bold">Smile Club answer</th>
              </tr>
            </thead>
            <tbody>
              {EMP_JOBS.map((j) => (
                <tr key={j.job} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{j.job}</td>
                  <td className="px-3 py-1.5 italic" style={{ color: '#3a4148' }}>{j.hr}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{j.answer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          So the product is simultaneously: healthcare benefit + employee experience + HR tool + retention tool +
          wellbeing programme + distribution channel for DN. It never sells “two cleanings + 20% discount”.
        </p>
      </section>

      <section>
        <Exhibit n="C4" title="Market map — six segments, sold differently" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Segment</th><th className="px-2.5 py-2 font-bold">Headcount</th>
                <th className="px-2.5 py-2 font-bold">Characteristics</th><th className="px-2.5 py-2 font-bold">Proposition & route in</th>
              </tr>
            </thead>
            <tbody>
              {CORP_SEGMENTS.map((s) => (
                <tr key={s.seg} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{s.seg}</td>
                  <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums" style={{ color: OLIVE }}>{s.size}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{s.traits}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{s.prop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="C5" title="Corporate demand states + the trigger map that goes into CRM" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Demand state</th><th className="px-2.5 py-2 font-bold">Signal</th><th className="px-2.5 py-2 font-bold">Play</th>
              </tr>
            </thead>
            <tbody>
              {CORP_STATES.map((s) => (
                <tr key={s.state} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: NAVY }}>{s.state}</td>
                  <td className="px-2.5 py-1.5 italic" style={{ color: '#3a4148' }}>{s.signal}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{s.play}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          {([
            ['Calendar triggers', 'Insurance renewal · annual budgeting · new financial year · open enrollment · Ramadan wellbeing · World Oral Health Day · back-to-school · year-end HR planning'],
            ['Organisational triggers', 'Rapid recruitment · new office · M&A · new HR director · benefits redesign · salary restructuring · engagement programme'],
            ['Pain triggers', 'Premium increase · employee complaints · poor benefit utilisation · retention difficulty · competitor benefits'],
            ['Relationship triggers', 'Existing DN corporate client · corporate patient volume · executive patient · DN ambassador · school/community partnership'],
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>{t}</p>
              <p className="mt-1 text-[10px] leading-snug" style={{ color: '#3a4148' }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Every trigger event is recorded on the account in CRM — the field-sales door plan works trigger-first,
          not alphabetically.
        </p>
      </section>

      <section>
        <Exhibit n="C6" title="Product ladder + funding flexibility — never one plan, never one price" />
        <div className="grid gap-2 md:grid-cols-2">
          {CORP_LADDER.map((l) => (
            <div key={l.tier} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[11px] font-bold" style={{ color: NAVY }}>{l.tier}</p>
              <p className="text-[9.5px] font-semibold uppercase tracking-wide" style={{ color: BLUE }}>{l.who}</p>
              <p className="mt-1 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{l.inside}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          {([
            ['1 · Employer-funded', 'Company buys membership for everyone.'],
            ['2 · Employer-subsidised', 'Company pays a share (e.g. 50%); employee pays the remainder.'],
            ['3 · Voluntary employee-paid', 'Employer gives access to preferential corporate membership at no major employer cost.'],
            ['4 · Hybrid', 'Core benefit employer-funded; employee upgrades (Plus / Family) on top — the easiest structure to sell.'],
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#2C5E3F' }}>{t}</p>
              <p className="mt-1 text-[10px] leading-snug" style={{ color: '#3a4148' }}>{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Benefit architecture stays on specified services, access rights and preferred rates — anything closer
          to “we cover uncertain future treatment costs” moves toward insurance territory and needs the legal
          review in <Jump to="why">the regulatory dictionary</Jump> before it is ever written down. A
          “Smile Credits / Flex” allowance concept is interesting but is legal-review-first, not launch material.
        </p>
      </section>

      <section>
        <Exhibit n="C7" title="Distribution: account-based, broker-friendly — never mass advertising" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card accent={NAVY}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>The ABM engine — 100 target accounts</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              No “corporate dental membership available!” advertising. Choose 100 named accounts and hold, per
              account: company · headcount · locations · industry · decision maker · medical insurer · broker ·
              insurance-renewal month · current dental provision · relationship owner · opportunity value ·
              demand state. Communicate according to account state. This is the Smile Club Corporate Account
              Intelligence Map — the build starts with the ~60 doors of the field-sales plan and grows to 100.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Channels, in order of expected conversion</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              1 · Existing DN corporate relationships (highest-converting). 2 · Direct sales — founder/CEO
              network, CHROs, benefits managers (the door plan). 3 · Insurance brokers &amp; benefit consultants —
              make Smile Club a benefit they can recommend beside medical insurance, not a competitor (a formal
              “Smile Club Partner” broker product is a scale-phase build). 4 · HR consultancies. 5 · Chambers,
              business councils, free-zone communities. 6 · Benefits marketplaces / HR platforms. Lead magnet for
              all of them: the free Dental Benefits Gap Assessment (five questions → “your dental benefits gap
              score”).
            </p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="C8" title="North Star, dashboard and renewal psychology" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card accent={CORAL}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>North Star: Active Corporate Smile Members</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              Not signed contracts, not eligible names: eligible members who have ACTIVATED and engaged in
              preventive care within the period. Ten companies × 10,000 names that never activate are worth less
              than 10,000 genuinely engaged members. Metric groups: sales (pipeline, win rate, cycle) ·
              implementation (time-to-launch, activation rate, first-booking rate) · utilisation (preventive
              visits/member, attendance) · economics (revenue/member, corporate CAC, member LTV) · retention
              (corporate renewal, family add-ons, NPS).
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>The HR dashboard & annual value report</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              HR sees aggregated numbers only: eligibility, activation %, active users, preventive visits,
              attendance, satisfaction, family upgrades, membership value used — NEVER individual clinical
              information. Before renewal HR receives “Your Smile Club Year” so the conversation is “here&apos;s
              what the programme accomplished”, not “do you want to spend another AED 800K?”. Renewal rests on
              four questions: did employees use it, did they like it, was it easy for HR, can HR defend the
              spend. The product is dentistry + technology + reporting + account management.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <Exhibit n="C9" title="Implementation runbook — contract to renewal" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[10.5px]">
            <tbody>
              {CORP_IMPL.map((r) => (
                <tr key={r.t} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-1.5 font-bold whitespace-nowrap" style={{ color: CORAL }}>{r.t}</td>
                  <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Once signed, the employer becomes a distribution channel: new-joiner onboarding (“your benefits
          include Smile Club — activate”), dental check month, family month, recall campaigns — continuous
          internal demand under the employer&apos;s code. The flywheel: contract → activation → preventive visits
          → positive experience → HR value visibility → renewal → family upgrades → subsidiary expansion → more
          members → network value.
        </p>
      </section>

      <section>
        <Exhibit n="C10" title="The 30-day slice of all this — what runs now" />
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
              The mandate window runs the seed of this system: one defined pilot through warm doors, the
              field-sales door plan (segment A first, trigger-led), and the three funding models offered per
              employer. Live door status — Michael Page closed 21 Sep (dental already in their medical; referral
              secured), Assembly Global awaiting, ArabyAds scheduled — tracked in{' '}
              <Jump to="dm">Corporate outreach (D3)</Jump>. The full B2B2C build-out (broker product, HR portal,
              ABM tooling, Smile Score) is sequenced for the scale phase with the 21 Oct review.
            </Note>
          </div>
        </Card>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Card>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>The objection we must beat</p>
            <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] italic leading-snug" style={{ backgroundColor: '#FBEFEC', color: NAVY }}>
              &quot;Why Dental Nation? Our employees could get a membership anywhere.&quot;
            </p>
            <p className="mt-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
              Answered with the clinic trust signals we hold today (4.9★, 60 public reviews verified 14 Sep,
              three branches, named doctors) plus membership-specific evidence as the pilot produces it — usage,
              savings, member experience — and the category frame: unlike insurance upgrades, clinic discounts or
              discount platforms, Smile Club is designed-in prevention + predictable employer cost + dental
              continuity + a member relationship on the DN network.
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
                'Vocabulary: eligible employees → paid enrolments → activated members — never “employees covered”. Low administration with responsibilities agreed upfront, not “zero admin”.',
              ].map((t) => (
                <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: MINT }} />{t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
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
          Ruling (Mr Akbar, 22 Sep): random broad awareness — billboards included — makes no sense for a
          target market that is mostly B2B. Radio and billboards stay deferred; the only offline that runs is
          precise and attributable (corporate on-site days, door-to-door, community events), and the trigger for
          ever testing broad offline is evidence and a bounded measurement plan — not &quot;digital is
          saturated&quot;.
        </p>
      </section>
    </div>
  );
}

function Kpis() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n="K0" title="North Star (rev. 5) — engaged members, not subscriptions sold" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card accent={NAVY}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Consumer: Active Preventively Engaged Members</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              Members who have activated AND engaged in preventive care within the period — not the raw
              subscription count. A membership that never books is churn waiting to happen; the mandate&apos;s
              120 paid contracts remain the 30-day outcome, and this North Star is what makes them worth
              having at renewal. Supporting metric: % of new members booking their first visit within 30 days.
            </p>
          </Card>
          <Card accent={BLUE}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Corporate: Active Corporate Smile Members</p>
            <p className="mt-1.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>
              Eligible employees who activated and engaged — never signed contracts or eligible headcount.
              Primary KPI per account: ACTIVATION RATE. The governing comparison across the whole programme is
              member LTV vs non-member LTV — a AED 700 membership is extraordinarily valuable if it turns a
              one-time patient into a five-year DN household. Full metric groups in the{' '}
              <Jump to="corporate">Corporate playbook (C8)</Jump>.
            </p>
          </Card>
        </div>
      </section>
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
        <Exhibit n={12} title="The first fortnight — preparation and measurement before broad activation" right={<Jump to="mandate">Deadlines register (M2)</Jump>} />
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

/* ── Team task calendar + live tracker: who does what, week by week, to Day 30 ── */

const TEAM: { id: Person; name: string; role: string; color: string; owns: string }[] = [
  { id: 'fahad', name: 'Fahad', role: 'Growth lead — reports to Mr Akbar', color: '#5B4B8A', owns: 'Runs the marketing machine — Google, Facebook/Instagram, LinkedIn and the partner channels — works the warm corporate introductions, gets Mr Akbar’s sign-offs, and reports progress every checkpoint Monday.' },
  { id: 'crm', name: 'CRM-DN', role: 'WhatsApp, web pages, tracking & contact centre', color: '#7A5C2E', owns: 'Runs the WhatsApp messages, the membership web page and banner, the contact centre’s 10-minute replies, and the tracking that proves where every member came from. Fahad updates these tasks.' },
  { id: 'doctors', name: 'Treating dentists', role: 'Dr Hasna · Dr Tosun · Dr Maisoon · every treating dentist', color: '#1F6F6B', owns: 'Recommend Smile Club in one sentence at the end of every check-up, and write — in their own name, only to their own patients — the three waves of personal WhatsApp messages. Dr Luvi updates these tasks.' },
  { id: 'gautam', name: 'Gautam', role: 'Project owner & corporate implementer', color: NAVY, owns: 'Owns the mandate and its data, carries the corporate door-to-door bag in-window, and implements every signed employer (proposal → launch → activation).' },
  { id: 'luvi', name: 'Dr Luvi', role: 'Head of Operations', color: '#2C5E3F', owns: 'Owns the front-desk engine behind In-clinic-60, branch capacity, clinical review of every claim, and clinical delivery of on-site days. Updates the receptionists’ tasks on their behalf.' },
  { id: 'mohan', name: 'Mohan', role: 'Videographer & content designer', color: CORAL, owns: 'The creative unlock: produces the asset variety the dynamic formats need, plus every print, video and launch kit the other lanes depend on.' },
  { id: 'reception', name: 'Receptionists', role: 'Al Wasl · Dr Tosun · AMC', color: BLUE, owns: 'Sell at the checkout moment, every patient, every day — 20 paid subscriptions per branch by 21 Oct.' },
];

const WEEKS: { n: number; label: string; gate: string }[] = [
  { n: 1, label: 'Week 1 · 22–28 Sep', gate: 'Mon 28 Sep · Day-7 · 36 plan / 30 min' },
  { n: 2, label: 'Week 2 · 29 Sep – 5 Oct', gate: 'Mon 5 Oct · Day-14 · 60 / 50 · funding review' },
  { n: 3, label: 'Week 3 · 6–12 Oct', gate: 'Mon 12 Oct · Day-21 · 88 / 75' },
  { n: 4, label: 'Week 4 · 13–19 Oct', gate: 'Scale only past CAC + ≥98% attribution' },
  { n: 5, label: 'Close · 20–21 Oct', gate: 'Wed 21 Oct · Day-30 · 120 paid' },
];

const RHYTHMS: { who: Person; items: string[] }[] = [
  { who: 'fahad', items: ['Daily: read the end-of-day numbers — members by source, ad spend, enquiries', 'Monday: one-page progress report to Mr Akbar', 'Weekly: ad performance review with Mohan — keep, cut or remake'] },
  { who: 'doctors', items: ['Every check-up or cleaning: the one-sentence recommendation + the signed invitation card', 'During a wave: up to 20 messages a day to your own patients only; every reply answered the same day', 'Friday: what patients said back, to Dr Luvi'] },
  { who: 'crm', items: ['Every enquiry answered within 10 minutes and tagged “membership” or “appointment”', 'Daily: late replies reviewed at the 09:00 meeting', 'Weekly: tracking spot-check — every new member shows where they came from'] },
  { who: 'gautam', items: ['Mon: checkpoint or weekly resource decision', 'Daily: EOD scorecard read · meeting log updated after every door', 'Weekly: pipeline coverage vs ≥72 equivalents'] },
  { who: 'luvi', items: ['Daily 09:00: per-branch count + objection log review (with the Smile Club Coordinator)', 'Daily 16:00: recovery queue for any branch behind pace', 'Weekly: clinical sign-off on new creative and claims'] },
  { who: 'mohan', items: ['Every asset tagged to one demand state before it ships', 'Weekly: submission batch to Dr Luvi for clinical review', 'Weekly: performance read with Fahad — cut, keep or re-cut'] },
  { who: 'reception', items: ['Every checkout: Ask → Match → Value → Clarify → Close, savings shown against TODAY’s bill', 'Every join: QR under the branch code + first member appointment booked before the patient leaves', 'Every decline: objection log · Friday: objection themes to Dr Luvi', 'Always “membership / included services / member rates” — never insurance, coverage or claim'] },
];

const RAG_STYLE: Record<Rag, { label: string; fg: string; bg: string }> = {
  done: { label: 'Done', fg: '#2C5E3F', bg: '#e7efe6' },
  on_track: { label: 'On track', fg: '#2b5a8a', bg: '#e6eef6' },
  due: { label: 'Due today', fg: '#8a6a1e', bg: '#f5ecd8' },
  overdue: { label: 'Overdue', fg: '#a04a38', bg: '#f7e8e4' },
  blocked: { label: 'Blocked', fg: '#ffffff', bg: '#a04a38' },
  not_started: { label: 'Not started', fg: OLIVE, bg: '#F1F1EA' },
};

const EMPTY_TRACKER: TrackerState = { progress: {}, events: [], canEdit: [], viewer: null, today: '2026-09-23', live: false };

function RagPill({ rag }: { rag: Rag }) {
  const s = RAG_STYLE[rag];
  return <span className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-bold" style={{ color: s.fg, backgroundColor: s.bg }}>{s.label}</span>;
}

function Bar({ pct, color, h = 6 }: { pct: number; color: string; h?: number }) {
  return (
    <div className="w-full rounded-full" style={{ height: h, backgroundColor: '#EEEFE1' }}>
      <div className="rounded-full" style={{ height: h, width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color, transition: 'width .3s' }} />
    </div>
  );
}

/** The task's flow chart: one chevron per step — done (filled), current (gold), ahead (open). */
function Flow({ steps, stage, color, blocked }: { steps: Step[]; stage: number; color: string; blocked: boolean }) {
  return (
    <div className="flex flex-wrap items-stretch gap-y-1">
      {steps.map((st, i) => {
        const s = st.s;
        const done = i < stage;
        const current = i === stage;
        const bg = done ? color : current ? (blocked ? '#f7e8e4' : '#FDF6E3') : '#F7F7F0';
        const fg = done ? 'white' : current ? (blocked ? '#a04a38' : '#6d5a1d') : OLIVE;
        const border = current ? (blocked ? '#a04a38' : GOLD) : done ? color : LINE;
        return (
          <div key={s} className="flex items-center">
            <div
              className="flex min-h-[34px] max-w-[170px] items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] leading-tight"
              style={{ backgroundColor: bg, color: fg, borderColor: border, fontWeight: current ? 700 : 500 }}
              title={done ? 'Completed' : current ? (blocked ? 'Blocked here' : 'Current step') : 'Ahead'}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ backgroundColor: done ? 'rgba(255,255,255,.25)' : 'white', color: done ? 'white' : fg, border: done ? 'none' : `1px solid ${border}` }}>
                {done ? '✓' : i + 1}
              </span>
              {s}
            </div>
            {i < steps.length - 1 ? <span className="px-1 text-[12px] font-bold" style={{ color: i < stage ? color : '#C9C9BC' }}>→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function fmtAt(iso: string | null): string {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

function crmTemplateCsv(): string {
  const rows = [
    CRM_TEST_SPEC.columns.join(','),
    'reply,MSG-0001,appointment,no',
    'reply,MSG-0002,membership,yes',
    'failure,MSG-0103,wrong number,',
    'failure,MSG-0104,opted out,',
  ];
  return rows.join('\n');
}

function EvidenceBox({ p, editable, onVerified }: { p: TaskProgress | undefined; editable: boolean; onVerified: (s: TrackerState) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const v = p?.verify ?? null;
  const download = () => {
    const blob = new Blob([crmTemplateCsv()], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'smile-club-whatsapp-test-reconciliation-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await verifyCrmTestAction(new FormData(e.currentTarget));
    setBusy(false);
    if (!r.ok) setErr(r.error); else onVerified(r.state);
  };
  return (
    <div className="mt-2 rounded-lg border px-2.5 py-2" style={{ borderColor: v?.pass ? '#b8d3bd' : GOLD, backgroundColor: v?.pass ? '#F2F8F3' : '#FFFCF3' }}>
      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#6d5a1d' }}>Evidence check — completes automatically</p>
      <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>
        One row per reply ({CRM_TEST_SPEC.replies}) and per failed message ({CRM_TEST_SPEC.failures}). Columns: <b>record_type</b> (reply / failure) ·
        <b> ref</b> (message or contact ID — no names or phone numbers) · <b>outcome</b> (reply: {CRM_TEST_SPEC.replyOutcomes.join(', ')}; failure: {CRM_TEST_SPEC.failureReasons.join(', ')}) ·
        <b> paid_membership</b> (replies: yes / no). The file is stored privately.
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={download} className="rounded-full border px-2.5 py-1 text-[10.5px] font-bold" style={{ borderColor: LINE, color: NAVY }}>⬇ Download the template</button>
        {editable ? (
          <form onSubmit={submit} className="flex flex-wrap items-center gap-1.5">
            <input type="file" name="file" accept=".xlsx,.xls,.csv" required className="text-[10.5px]" />
            <button type="submit" disabled={busy} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: NAVY }}>{busy ? 'Checking…' : 'Upload and check'}</button>
          </form>
        ) : <span className="text-[10px]" style={{ color: OLIVE }}>Gautam uploads; the result appears here for everyone.</span>}
        {err ? <span className="text-[10px] font-bold" style={{ color: '#a04a38' }}>{err}</span> : null}
      </div>
      {v ? (
        <div className="mt-2">
          <p className="text-[11px] font-bold" style={{ color: v.pass ? '#2C5E3F' : '#a04a38' }}>
            {v.pass ? `✓ COMPLETE — the test produced ${v.confirmed} paid membership${v.confirmed === 1 ? '' : 's'}` : '✗ NOT COMPLETE YET — fix the items below and upload again'}
          </p>
          <ul className="mt-1 space-y-0.5">
            {v.checks.map((c) => (
              <li key={c.label} className="text-[10.5px]" style={{ color: c.ok ? '#2C5E3F' : '#a04a38' }}>{c.ok ? '✓' : '✗'} {c.label} <span style={{ color: OLIVE }}>— {c.detail}</span></li>
            ))}
          </ul>
          {v.warnings.map((w) => <p key={w} className="text-[10px] font-bold" style={{ color: '#8a6a1e' }}>⚠ {w}</p>)}
          <p className="mt-0.5 text-[9.5px]" style={{ color: OLIVE }}>Checked {fmtAt(v.at)} · {v.file} · uploaded by {v.by}</p>
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({ t, p, today, color, editable, onSave, onVerified }: {
  t: TeamTask; p: TaskProgress | undefined; today: string; color: string; editable: boolean;
  onSave: (stage: number, blocked: boolean, note: string) => Promise<string | null>;
  onVerified: (s: TrackerState) => void;
}) {
  const stage = p?.stage ?? 0;
  const blocked = p?.status === 'blocked';
  const rag = ragFor(t, p, today);
  const pct = Math.round((stage / t.steps.length) * 100);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = async (s: number, b: boolean, n = '') => {
    setBusy(true); setErr(null);
    const e = await onSave(s, b, n);
    setBusy(false);
    if (e) setErr(e); else setNote('');
  };
  return (
    <div id={`task-${t.key}`} className="rounded-xl border bg-white p-3" style={{ borderColor: rag === 'overdue' || rag === 'blocked' ? '#dcb3aa' : LINE }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold" style={{ color: NAVY }}>{t.task}</p>
          <p className="text-[10px]" style={{ color: OLIVE }}>
            <span className="font-bold" style={{ color }}>{t.due}</span>
            {t.with ? <> · with {t.with}</> : null}
            {t.to ? <> · <Jump to={t.to}>{t.toLabel}</Jump></> : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RagPill rag={rag} />
          <span className="text-[11px] font-bold tabular-nums" style={{ color: NAVY }}>{pct}%</span>
        </div>
      </div>
      <div className="mt-2"><Bar pct={pct} color={rag === 'overdue' || rag === 'blocked' ? CORAL : color} /></div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: '#EEF1F6', color: NAVY }}>Weightage {weightPct(t)}%</span>
        <span className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: t.subs ? '#e7efe6' : '#F1F1EA', color: t.subs ? '#2C5E3F' : OLIVE }}>
          {t.subs ? `Subscription target: ${t.subs}` : 'Enabler — no direct subscriptions'}
        </span>
        <span className="py-0.5" style={{ color: OLIVE }}>{t.subsNote}</span>
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <p className="text-[10.5px] leading-snug" style={{ color: '#3a4148' }}><span className="font-bold" style={{ color: NAVY }}>Objective:</span> {t.objective}</p>
        <p className="text-[10.5px] leading-snug" style={{ color: '#3a4148' }}><span className="font-bold" style={{ color: NAVY }}>Why it matters:</span> {t.why}</p>
      </div>
      <div className="mt-2"><Flow steps={t.steps} stage={stage} color={color} blocked={blocked} /></div>
      <div className="mt-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: '#FAFAF6' }}>
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>How to do it</p>
        <ol className="mt-1 space-y-1">
          {t.steps.map((st, i) => (
            <li key={st.s} className="flex gap-2 text-[10.5px] leading-snug" style={{ color: i < stage ? OLIVE : '#3a4148', textDecoration: i < stage ? 'line-through' : 'none' }}>
              <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: i < stage ? color : '#B9B9AC' }}>{i < stage ? '✓' : i + 1}</span>
              <span><b style={{ color: NAVY }}>{st.s}</b> — {st.how}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-2 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}><span className="font-bold" style={{ color: NAVY }}>Done looks like:</span> {t.done}</p>
      {t.verify ? <EvidenceBox p={p} editable={editable} onVerified={onVerified} /> : null}
      {p?.note ? <p className="mt-1 rounded px-2 py-1 text-[10.5px]" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>Latest note: {p.note}</p> : null}
      {p?.updatedAt ? <p className="mt-1 text-[9.5px]" style={{ color: OLIVE }}>Last updated {fmtAt(p.updatedAt)}{p.updatedBy ? ` by ${p.updatedBy}` : ''}</p> : null}
      {editable ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2" style={{ borderColor: '#EEEFE1' }}>
          {!t.verify ? <><button type="button" disabled={busy || stage === 0} onClick={() => save(stage - 1, false)} className="rounded-full border px-2.5 py-1 text-[10.5px] font-bold disabled:opacity-40" style={{ borderColor: LINE, color: OLIVE }}>◀ Undo step</button>
          <button type="button" disabled={busy || stage >= t.steps.length} onClick={() => save(stage + 1, false, note)} className="rounded-full px-2.5 py-1 text-[10.5px] font-bold text-white disabled:opacity-40" style={{ backgroundColor: color }}>
            {stage >= t.steps.length ? 'Complete ✓' : `Mark “${t.steps[stage].s}” done ▶`}
          </button></> : null}
          {stage < t.steps.length ? (
            <button type="button" disabled={busy} onClick={() => save(stage, !blocked, note)} className="rounded-full border px-2.5 py-1 text-[10.5px] font-bold" style={{ borderColor: '#dcb3aa', color: '#a04a38' }}>
              {blocked ? 'Unblock' : 'Flag blocked'}
            </button>
          ) : null}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Add a note (what happened, what’s blocking)…" className="min-w-[180px] flex-1 rounded-md border px-2 py-1 text-[10.5px]" style={{ borderColor: LINE }} />
          <button type="button" disabled={busy || !note.trim()} onClick={() => save(stage, blocked, note)} className="rounded-full border px-2.5 py-1 text-[10.5px] font-bold disabled:opacity-40" style={{ borderColor: LINE, color: NAVY }}>Save note</button>
          {busy ? <span className="text-[10px]" style={{ color: OLIVE }}>Saving…</span> : null}
          {err ? <span className="text-[10px] font-bold" style={{ color: '#a04a38' }}>{err}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function TeamTab({ state, setState }: { state: TrackerState; setState: (s: TrackerState) => void }) {
  const [focus, setFocus] = useState<Person | 'all'>('all');
  const people = focus === 'all' ? TEAM : TEAM.filter((p) => p.id === focus);
  const today = state.today;
  const canEditPerson = (p: Person) => state.canEdit === 'all' || state.canEdit.includes(p);

  const save = async (key: string, stage: number, blocked: boolean, note: string): Promise<string | null> => {
    const r = await updateTeamTaskAction({ key, stage, blocked, note });
    if (!r.ok) return r.error;
    setState(r.state);
    return null;
  };

  // Completion is WEIGHTED: each task contributes its weightage × the share of its steps done.
  const frac = (t: TeamTask) => Math.min(1, (state.progress[t.key]?.stage ?? 0) / t.steps.length);
  const stats = (tasks: TeamTask[]) => {
    const w = tasks.reduce((a, t) => a + t.weight, 0);
    const wDone = tasks.reduce((a, t) => a + t.weight * frac(t), 0);
    const rags = tasks.map((t) => ragFor(t, state.progress[t.key], today));
    const count = (r: Rag) => rags.filter((x) => x === r).length;
    const subs = tasks.reduce((a, t) => a + t.subs, 0);
    const subsDone = tasks.filter((t) => frac(t) >= 1).reduce((a, t) => a + t.subs, 0);
    return { pct: w ? Math.round((wDone / w) * 100) : 0, share: Math.round((w / TOTAL_WEIGHT) * 100), subs, subsDone, done: count('done'), onTrack: count('on_track'), due: count('due'), overdue: count('overdue'), blocked: count('blocked'), notStarted: count('not_started'), n: tasks.length };
  };
  const all = stats(TEAM_TASKS);
  // Where the plan says we should be by today: weight of tasks whose due date has passed.
  const expectedPct = Math.round((TEAM_TASKS.filter((t) => t.dueIso <= today).reduce((a, t) => a + t.weight, 0) / TOTAL_WEIGHT) * 100);
  const attention = TEAM_TASKS.filter((t) => ['overdue', 'blocked', 'due'].includes(ragFor(t, state.progress[t.key], today)));

  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">Who does what, week by week, to 21 October — tracked live.</span>{' '}
        Every task is lifted from a commitment elsewhere in this plan and links back to it. Each task has its own
        flow of steps; owners mark steps done as they happen, every change is time-stamped in the activity log,
        and the status panel below is what Fahad reports to Mr Akbar from.
        {!state.live ? <span className="font-bold" style={{ color: CORAL }}> (Tracking database unreachable — showing the plan without live progress.)</span> : null}
      </p>

      <section>
        <Exhibit n="T0" title={`Programme status — as of ${today} (Dubai)`} />
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <Card accent={NAVY}>
            <div className="flex items-baseline justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>Overall completion</p>
              <p className="text-[22px] font-bold tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{all.pct}%</p>
            </div>
            <div className="relative mt-1">
              <Bar pct={all.pct} color={NAVY} h={10} />
              <div className="absolute top-[-3px] h-4 w-[2px]" style={{ left: `${expectedPct}%`, backgroundColor: CORAL }} title="Planned position today" />
            </div>
            <p className="mt-1 text-[10px]" style={{ color: OLIVE }}>
              <span className="font-bold" style={{ color: CORAL }}>│</span> planned position today: {expectedPct}%. Completion is weighted — each task counts by its weightage, so the tasks that drive the most subscriptions move the bar most. {all.n} tasks · subscription targets of completed tasks: <b style={{ color: NAVY }}>{all.subsDone} of {all.subs}</b>.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-6">
              {([['done', all.done], ['on_track', all.onTrack], ['due', all.due], ['overdue', all.overdue], ['blocked', all.blocked], ['not_started', all.notStarted]] as [Rag, number][]).map(([r, n]) => (
                <div key={r} className="rounded-lg px-2 py-1.5 text-center" style={{ backgroundColor: RAG_STYLE[r].bg }}>
                  <p className="text-[16px] font-bold tabular-nums" style={{ color: RAG_STYLE[r].fg, fontFamily: 'Georgia, serif' }}>{n}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: RAG_STYLE[r].fg }}>{RAG_STYLE[r].label}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: NAVY }}>By owner</p>
            <div className="mt-2 space-y-2">
              {TEAM.map((p) => {
                const s = stats(TEAM_TASKS.filter((t) => t.who === p.id));
                return (
                  <div key={p.id}>
                    <div className="flex items-baseline justify-between text-[10.5px]">
                      <span className="font-bold" style={{ color: p.color }}>{p.name} <span className="font-normal" style={{ color: OLIVE }}>· {s.share}% weight · {s.subs ? `${s.subs} subs` : 'enabler'}</span></span>
                      <span className="tabular-nums" style={{ color: OLIVE }}>
                        {s.done}/{s.n} done{s.overdue ? <span className="font-bold" style={{ color: '#a04a38' }}> · {s.overdue} overdue</span> : null}{s.blocked ? <span className="font-bold" style={{ color: '#a04a38' }}> · {s.blocked} blocked</span> : null} · <b style={{ color: NAVY }}>{s.pct}%</b>
                      </span>
                    </div>
                    <Bar pct={s.pct} color={p.color} h={8} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
        {attention.length ? (
          <div className="mt-2 rounded-xl border bg-white p-3" style={{ borderColor: '#dcb3aa' }}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#a04a38' }}>Needs attention ({attention.length})</p>
            <ul className="mt-1 space-y-1">
              {attention.map((t) => {
                const p = TEAM.find((x) => x.id === t.who)!;
                return (
                  <li key={t.key} className="flex flex-wrap items-center gap-2 text-[10.5px]" style={{ color: '#3a4148' }}>
                    <RagPill rag={ragFor(t, state.progress[t.key], today)} />
                    <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span>{t.task}</span>
                    <span style={{ color: OLIVE }}>· due {t.due} · step {Math.min(t.steps.length, (state.progress[t.key]?.stage ?? 0) + 1)} of {t.steps.length}</span>
                    <button type="button" onClick={() => { setFocus('all'); document.getElementById(`task-${t.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} className="font-bold underline decoration-dotted" style={{ color: BLUE }}>open ↓</button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      <section>
        <Exhibit n="T1" title="The calendar — six owners × five weeks, each week closing on its checkpoint" />
        <div className="mb-2 flex flex-wrap gap-1.5">
          {([['all', 'Everyone'], ...TEAM.map((p) => [p.id, p.name])] as [Person | 'all', string][]).map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => setFocus(id)}
              className="rounded-full px-3 py-1 text-[11px] font-bold transition"
              style={focus === id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full min-w-[860px] border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left align-bottom" style={{ backgroundColor: '#F7F7F0' }}>
                <th className="w-[130px] px-2.5 py-2 text-[9.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Owner</th>
                {WEEKS.map((w) => (
                  <th key={w.n} className="px-2.5 py-2">
                    <span className="block text-[10px] font-bold" style={{ color: NAVY }}>{w.label}</span>
                    <span className="block text-[9px] font-semibold" style={{ color: CORAL }}>{w.gate}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-2.5 py-2">
                    <span className="block text-[11px] font-bold" style={{ color: p.color }}>{p.name}</span>
                    <span className="block text-[9.5px] leading-tight" style={{ color: OLIVE }}>{p.role}</span>
                  </td>
                  {WEEKS.map((w) => (
                    <td key={w.n} className="px-2 py-2">
                      <div className="space-y-1">
                        {TEAM_TASKS.filter((x) => x.who === p.id && x.wk === w.n).map((x) => {
                          const pr = state.progress[x.key];
                          const rag = ragFor(x, pr, today);
                          const pct = Math.round(((pr?.stage ?? 0) / x.steps.length) * 100);
                          return (
                            <button
                              key={x.key} type="button"
                              onClick={() => document.getElementById(`task-${x.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                              className="block w-full rounded-md border-l-2 px-1.5 py-1 text-left" style={{ borderColor: p.color, backgroundColor: '#FAFAF6' }}
                            >
                              <span className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-bold" style={{ color: p.color }}>{x.due}</span>
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: RAG_STYLE[rag].bg === '#F1F1EA' ? '#C9C9BC' : RAG_STYLE[rag].fg === '#ffffff' ? RAG_STYLE[rag].bg : RAG_STYLE[rag].fg }} title={RAG_STYLE[rag].label} />
                              </span>
                              <span className="block leading-tight" style={{ color: '#3a4148' }}>{x.task}</span>
                              <span className="mt-0.5 block"><Bar pct={pct} color={rag === 'overdue' || rag === 'blocked' ? CORAL : p.color} h={3} /></span>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="T2" title="Every task — objective, why it matters, how to do it, weightage, subscription target and live progress" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          Owners update their own tasks: mark the next step done, flag a block, add a note. Dr Luvi updates the
          receptionists’ tasks; Fahad updates CRM-DN’s. Everyone else sees the same live picture read-only.
          {state.viewer ? <> Signed in as <b style={{ color: NAVY }}>{state.viewer}</b>{state.canEdit === 'all' ? ' — you can update every task.' : state.canEdit.length ? ` — you can update ${state.canEdit.map((x) => TEAM.find((p) => p.id === x)!.name).join(' and ')}’s tasks.` : ' — read-only.'}</> : null}
        </p>
        <div className="space-y-4">
          {people.map((p) => (
            <Card key={p.id} accent={p.color}>
              <p className="text-[12px] font-bold" style={{ color: p.color }}>{p.name} <span className="text-[10.5px] font-semibold" style={{ color: OLIVE }}>· {p.role}</span></p>
              <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{p.owns}</p>
              <div className="mt-2 space-y-2">
                {TEAM_TASKS.filter((x) => x.who === p.id).map((x) => (
                  <TaskCard
                    key={x.key} t={x} p={state.progress[x.key]} today={today} color={p.color}
                    editable={canEditPerson(p.id)}
                    onSave={(stage, blocked, note) => save(x.key, stage, blocked, note)}
                    onVerified={setState}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Exhibit n="T3" title="Activity log — every update, who made it and when" />
        {state.events.length ? (
          <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                  <th className="px-2.5 py-2 font-bold">When (Dubai)</th><th className="px-2.5 py-2 font-bold">Who</th>
                  <th className="px-2.5 py-2 font-bold">Task</th><th className="px-2.5 py-2 font-bold">Change</th><th className="px-2.5 py-2 font-bold">Note</th>
                </tr>
              </thead>
              <tbody>
                {state.events.filter((e) => focus === 'all' || TASK_BY_KEY[e.key]?.who === focus).slice(0, 60).map((e, i) => {
                  const t = TASK_BY_KEY[e.key];
                  if (!t) return null;
                  const change = e.toStage > e.fromStage
                    ? `✓ ${t.steps.slice(e.fromStage, e.toStage).map((x) => x.s).join(' · ')}`
                    : e.toStage < e.fromStage ? `↩ back to step ${e.toStage + 1}` : e.status === 'blocked' ? '⚑ flagged blocked' : 'note';
                  return (
                    <tr key={`${e.at}-${i}`} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                      <td className="px-2.5 py-1.5 whitespace-nowrap tabular-nums" style={{ color: OLIVE }}>{fmtAt(e.at)}</td>
                      <td className="px-2.5 py-1.5 whitespace-nowrap font-bold" style={{ color: NAVY }}>{e.actor}</td>
                      <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{t.task}</td>
                      <td className="px-2.5 py-1.5" style={{ color: e.status === 'blocked' ? '#a04a38' : '#2C5E3F' }}>{change}{e.status === 'done' ? ' — task complete' : ''}</td>
                      <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{e.note ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border bg-white px-3 py-2 text-[11px]" style={{ borderColor: LINE, color: OLIVE }}>No updates yet — the first step an owner marks done appears here with its time and author.</p>
        )}
      </section>

      <section>
        <Exhibit n="T4" title="Standing rhythms — the daily and weekly habits behind the dated tasks" />
        <div className="grid gap-2 md:grid-cols-2">
          {RHYTHMS.filter((r) => focus === 'all' || r.who === focus).map((r) => {
            const p = TEAM.find((x) => x.id === r.who)!;
            return (
              <div key={r.who} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
                <p className="text-[11px] font-bold" style={{ color: p.color }}>{p.name}</p>
                <ul className="mt-1 space-y-1">
                  {r.items.map((i) => (
                    <li key={i} className="flex gap-2 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />{i}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <Exhibit n="T5" title="Branch pace — paid subscriptions per branch, cumulative" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">Branch · code</th>
                <th className="px-3 py-2 text-center font-bold">Mon 28 Sep</th><th className="px-3 py-2 text-center font-bold">Mon 5 Oct</th>
                <th className="px-3 py-2 text-center font-bold">Mon 12 Oct</th><th className="px-3 py-2 text-center font-bold">Wed 21 Oct</th>
              </tr>
            </thead>
            <tbody>
              {['Al Wasl · SC-ALW', 'Dr Tosun · SC-TOS', 'AMC · SC-AMC'].map((b) => (
                <tr key={b} className="border-t" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{b}</td>
                  {['4 (min 3)', '7 (min 6)', '10 (min 9)', '12'].map((v) => (
                    <td key={v} className="px-3 py-1.5 text-center tabular-nums" style={{ color: '#3a4148' }}>{v}</td>
                  ))}
                </tr>
              ))}
              <tr className="border-t font-bold" style={{ borderColor: '#EEEFE1', backgroundColor: '#F7F7F0' }}>
                <td className="px-3 py-1.5" style={{ color: NAVY }}>Chair total (of the existing-patient 60)</td>
                {['12', '21', '30', '36'].map((v) => (
                  <td key={v} className="px-3 py-1.5 text-center tabular-nums" style={{ color: CORAL }}>{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10.5px]" style={{ color: OLIVE }}>
          Segmented split (rev. 6): our existing patients bring 60 — 36 from the chair (12 per branch, the
          dentist recommends and reception closes) and 24 from the dentists&apos; own WhatsApp messages, tracked
          per dentist. A branch below its minimum triggers Dr Luvi&apos;s 16:00 recovery queue the same day.
        </p>
      </section>
    </div>
  );
}

/* ── rev. 6: the plan by segment (Mr Akbar, 23 Sep — "no one solution for all") ── */

function SegmentsTab({ state }: { state: TrackerState }) {
  const [open, setOpen] = useState<SegmentId | null>('patients');
  const { goto } = useContext(SubNavContext);
  const today = state.today;
  const segStats = (id: SegmentId) => {
    const tasks = TEAM_TASKS.filter((t) => t.seg === id);
    const w = tasks.reduce((a, t) => a + t.weight, 0);
    const done = tasks.reduce((a, t) => a + t.weight * Math.min(1, (state.progress[t.key]?.stage ?? 0) / t.steps.length), 0);
    const late = tasks.filter((t) => ['overdue', 'blocked'].includes(ragFor(t, state.progress[t.key], today))).length;
    return { tasks, pct: w ? Math.round((done / w) * 100) : 0, late };
  };
  const total = SEGMENTS.reduce((a, s) => a + s.target, 0);
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[13px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">One plan per segment — never one speech for all.</span>{' '}
        Five groups of people, each reached by the person they already trust, with its own message, its own
        channel and its own moment to start. {total} paid memberships by 21 October. Every segment below links
        to the tasks that deliver it, with live progress.
      </p>

      <section>
        <Exhibit n="S1" title="The plan on one page" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full min-w-[820px] border-collapse text-[10.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-2.5 py-2 font-bold">Segment</th><th className="px-2.5 py-2 font-bold">Who delivers it</th>
                <th className="px-2.5 py-2 font-bold">When it starts</th><th className="px-2.5 py-2 text-center font-bold">Target</th>
                <th className="px-2.5 py-2 font-bold" style={{ width: 150 }}>Tasks done</th>
              </tr>
            </thead>
            <tbody>
              {SEGMENTS.map((s) => {
                const st = segStats(s.id);
                return (
                  <tr key={s.id} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                    <td className="px-2.5 py-1.5">
                      <button type="button" onClick={() => { setOpen(s.id); document.getElementById(`seg-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-left font-bold underline decoration-dotted underline-offset-2" style={{ color: NAVY }}>{s.name} ↓</button>
                      <span className="block text-[10px]" style={{ color: OLIVE }}>{s.who}</span>
                    </td>
                    <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{s.messenger}</td>
                    <td className="px-2.5 py-1.5" style={{ color: '#3a4148' }}>{s.unlock}</td>
                    <td className="px-2.5 py-1.5 text-center">
                      <span className="text-[15px] font-bold tabular-nums" style={{ color: CORAL, fontFamily: 'Georgia, serif' }}>{s.target}</span>
                      <span className="block text-[9px]" style={{ color: OLIVE }}>{s.targetNote}</span>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="text-[11px] font-bold tabular-nums" style={{ color: NAVY }}>{st.pct}%</span>
                      <span className="text-[9.5px]" style={{ color: OLIVE }}> · {st.tasks.length} tasks{st.late ? <b style={{ color: '#a04a38' }}> · {st.late} late</b> : null}</span>
                      <div className="mt-1"><Bar pct={st.pct} color={st.late ? CORAL : NAVY} /></div>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t font-bold" style={{ borderColor: '#EEEFE1', backgroundColor: '#F7F7F0' }}>
                <td className="px-2.5 py-1.5" colSpan={3} style={{ color: NAVY }}>Total — paid, active memberships by Wed 21 Oct</td>
                <td className="px-2.5 py-1.5 text-center text-[15px] tabular-nums" style={{ color: CORAL, fontFamily: 'Georgia, serif' }}>{total}</td>
                <td className="px-2.5 py-1.5" />
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <Exhibit n="S2" title="Each segment — who, the message, how it is done, when it starts, what we will not do" />
        <div className="space-y-2">
          {SEGMENTS.map((s) => {
            const st = segStats(s.id);
            const isOpen = open === s.id;
            return (
              <div key={s.id} id={`seg-${s.id}`} className="rounded-xl border bg-white" style={{ borderColor: isOpen ? BLUE : LINE }}>
                <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
                  <span className="flex h-8 w-10 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold tabular-nums text-white" style={{ backgroundColor: CORAL }}>{s.target}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-bold" style={{ color: NAVY }}>{s.name}</span>
                    <span className="block truncate text-[10.5px]" style={{ color: OLIVE }}>{s.owner}</span>
                  </span>
                  <span className="hidden w-[120px] shrink-0 md:block"><Bar pct={st.pct} color={st.late ? CORAL : NAVY} /></span>
                  <span className="shrink-0 text-[13px] font-bold" style={{ color: BLUE }}>{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen ? (
                  <div className="border-t px-3.5 py-3" style={{ borderColor: '#EEEFE1' }}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Who they are</p>
                        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{s.who}</p>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>Who delivers the message</p>
                        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{s.messenger}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>What they hear</p>
                        <p className="mt-0.5 text-[11px] italic leading-snug" style={{ color: NAVY }}>{s.message}</p>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>When it starts</p>
                        <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#3a4148' }}>{s.unlock}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>How it is done</p>
                    <div className="mt-1 grid gap-2 md:grid-cols-2">
                      {s.how.map((h) => (
                        <div key={h.title} className="rounded-lg px-2.5 py-2" style={{ backgroundColor: '#FAFAF6' }}>
                          <p className="text-[11px] font-bold" style={{ color: NAVY }}>{h.title}</p>
                          <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{h.body}</p>
                        </div>
                      ))}
                    </div>
                    {s.scripts ? (
                      <>
                        <p className="mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>The words — ready to use</p>
                        <div className="mt-1 space-y-1.5">
                          {s.scripts.map((sc) => (
                            <div key={sc.label} className="rounded-lg border-l-4 bg-white px-2.5 py-1.5" style={{ borderColor: GOLD }}>
                              <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: '#6d5a1d' }}>{sc.label}</p>
                              <p className="text-[11px] italic leading-snug" style={{ color: NAVY }}>{sc.text}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>What we will NOT do</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {s.notDo.map((n) => <li key={n} className="text-[10.5px]" style={{ color: '#a04a38' }}>✗ {n}</li>)}
                    </ul>
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>The tasks that deliver it — live</p>
                    <div className="mt-1 overflow-x-auto">
                      <table className="w-full border-collapse text-[10.5px]">
                        <tbody>
                          {st.tasks.map((t) => {
                            const pr = state.progress[t.key];
                            const pct = Math.round(((pr?.stage ?? 0) / t.steps.length) * 100);
                            const rag = ragFor(t, pr, today);
                            return (
                              <tr key={t.key} className="border-t align-middle" style={{ borderColor: '#EEEFE1' }}>
                                <td className="py-1 pr-2 whitespace-nowrap font-bold" style={{ color: OLIVE }}>{t.due}</td>
                                <td className="py-1 pr-2 whitespace-nowrap" style={{ color: NAVY }}>{OWNER_LABEL[t.who]}</td>
                                <td className="py-1 pr-2" style={{ color: '#3a4148' }}>{t.task}{t.subs ? <b style={{ color: '#2C5E3F' }}> · {t.subs} subs</b> : null}</td>
                                <td className="py-1 pr-2"><RagPill rag={rag} /></td>
                                <td className="w-[90px] py-1"><Bar pct={pct} color={rag === 'overdue' || rag === 'blocked' ? CORAL : NAVY} /></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <button type="button" onClick={() => goto('team')} className="mt-2 text-[10.5px] font-bold underline decoration-dotted" style={{ color: BLUE }}>Open these tasks in the Team task calendar ↗</button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <Exhibit n="S3" title="What changed from the rejected plan" />
        <div className="grid gap-2 md:grid-cols-2">
          {([
            ['Existing patients split in two', 'The 60 now come from two different moments: 36 in the chair (the dentist recommends, reception closes) and 24 from each dentist writing personally to their own patients — active, inactive and dormant, in that order.'],
            ['WhatsApp is curated, never blanket', 'Each dentist writes only to their own patients, in their own name, 20 a day at most. This replaces the mass test that produced no confirmed members.'],
            ['Corporate has a list, a type order and an unlock date', 'Warm doors first; door-to-door only for smaller companies, Tue–Thu, from 29 Sep once the price, kit, list and dental-day offer are ready. The door-opener is a free dental day, not a sales pitch.'],
            ['Google is three campaigns, not one', 'Brand, price searches and insurance-gap searches — each with its own words and budget. No display, no broad awareness.'],
            ['Awareness moves offline', 'The AED 3,000 moves from digital ads to schools, residential buildings, gyms and pharmacies near the branches.'],
            ['Every task carries its segment', 'The task calendar and the progress bars are the plan — Mr Akbar sees each segment’s progress on this page.'],
          ] as [string, string][]).map(([h, b]) => (
            <div key={h} className="rounded-xl border bg-white p-3" style={{ borderColor: LINE }}>
              <p className="text-[11px] font-bold" style={{ color: NAVY }}>{h}</p>
              <p className="mt-0.5 text-[10.5px] leading-snug" style={{ color: '#3a4148' }}>{b}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── the tab ───────────────────────────────────────────────────── */

const SUBS: { id: Sub; label: string }[] = [
  { id: 'segments', label: 'The plan by segment' },
  { id: 'team', label: 'Team task calendar' },
  { id: 'why', label: 'Why & proposition' },
  { id: 'layers', label: 'Layers & demand states' },
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

const SUB_LABELS: Record<string, string> = Object.fromEntries(SUBS.map((s) => [s.id, s.label]));

export function SmileClubOptimization({ tracker }: { tracker?: TrackerState } = {}) {
  const [sub, setSub] = useState<Sub>('segments');
  const [trk, setTrk] = useState<TrackerState>(tracker ?? EMPTY_TRACKER);
  // The return trail: cross-reference jumps remember their origin so the
  // reader (Mr Akbar) can follow any thread and come straight back.
  const [trail, setTrail] = useState<Sub[]>([]);
  const goto = (s: string) => {
    const target = s as Sub;
    if (target === sub) return;
    setTrail((tr) => [...tr, sub]);
    setSub(target);
  };
  const back = () => {
    setTrail((tr) => {
      const nt = [...tr];
      const prev = nt.pop();
      if (prev) setSub(prev);
      return nt;
    });
  };
  const navTo = (s: Sub) => { setSub(s); setTrail([]); };
  return (
    <section className="mx-auto max-w-[980px]">
      <header className="mb-3 border-b border-line pb-3">
        <p className="eyebrow text-accent">Growth Programme · Smile Club</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink" style={{ fontFamily: 'Georgia, serif' }}>
          Smile Club — membership growth plan
        </h1>
        <p className="mt-1 max-w-[720px] text-[12px] leading-snug text-ink-soft">
          Prepared for Mr Akbar · rev. 5 · 22 Sep 2026. Demand architecture first, economics second:
          personalised messaging by layer, corporate run as a B2B2C system, engaged members as the North Star.
          Delivering Gautam&apos;s 30-day mandate — <span className="font-semibold">120 paid memberships by
          21 October</span> (kick-start 22 Sep) — through a focused, evidence-gated pilot.
        </p>
        <p className="mt-1 max-w-[720px] text-[10px] leading-snug" style={{ color: OLIVE }}>
          Revision trail: rev. 5 strategy restructure (Mr Akbar) · rev. 4 channel sense check &amp; 70/30
          doctrine · rev. 3 adversarial review (16 findings) · rev. 2 external review · mandate v4, 16 Sep.
        </p>
      </header>
      <div className="flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: LINE }}>
        {SUBS.map((s) => (
          <button
            key={s.id} type="button" onClick={() => navTo(s.id)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
            style={sub === s.id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {/* The argument, in order — one governing chain, each link clickable. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px]" style={{ color: OLIVE }}>
        <span className="font-bold uppercase tracking-widest" style={{ color: CORAL }}>The argument</span>
        {([
          ['segments', 'The plan by segment'], ['team', 'Who does what'], ['why', 'Why & proposition'], ['layers', 'Who & when'], ['reco', 'Diagnosis'],
          ['mandate', 'Mandate'], ['offer', 'Offer & economics'], ['response', 'Funding & targets'],
          ['dm', 'Channel machinery'], ['corporate', 'B2B2C system'], ['channels', 'Eligibility'],
          ['waves', 'Evidence to date'], ['kpis', 'Controls'],
        ] as [Sub, string][]).map(([id, label], i) => (
          <span key={id} className="flex items-center gap-1.5">
            {i > 0 ? <span>→</span> : null}
            <button
              type="button" onClick={() => goto(id)}
              className="rounded-full px-2 py-0.5 font-bold transition"
              style={sub === id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
            >
              {label}
            </button>
          </span>
        ))}
      </div>
      {trail.length > 0 ? (
        <button
          type="button" onClick={back}
          className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition hover:shadow-sm"
          style={{ borderColor: GOLD, backgroundColor: '#FDF9EC', color: '#6d5a1d' }}
        >
          ← Back to {SUB_LABELS[trail[trail.length - 1]]}
        </button>
      ) : null}
      <SubNavContext.Provider value={{ goto }}>
      <div className="mt-3">
        {sub === 'segments' && <SegmentsTab state={trk} />}
        {sub === 'why' && <WhyTab />}
        {sub === 'layers' && <LayersTab />}
        {sub === 'reco' && <Recommendation />}
        {sub === 'mandate' && <MandateTab />}
        {sub === 'response' && <ResponseTab />}
        {sub === 'team' && <TeamTab state={trk} setState={setTrk} />}
        {sub === 'dm' && <DmPlan />}
        {sub === 'offer' && <OfferEconomics />}
        {sub === 'waves' && <Waves />}
        {sub === 'corporate' && <Corporate />}
        {sub === 'channels' && <Channels />}
        {sub === 'kpis' && <Kpis />}
      </div>
      </SubNavContext.Provider>
    </section>
  );
}
