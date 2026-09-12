'use client';

/**
 * Smile Club Optimization — the 360° growth plan for the membership
 * programme, prepared after Mr Akbar's ask (11 Sep): how do we optimize
 * Smile Club? McKinsey-style numbered exhibits: the diagnosis (the
 * affinity chicken-and-egg and how to break it), three sequenced waves
 * from low-hanging fruit to the corporate engine, the corporate
 * engagement playbook, the digital touchpoint map, the offline verdict,
 * and KPIs with the first two weeks of moves. Strategy content only —
 * no patient data; figures referenced (segments, SEO pages, reviews,
 * audiences) are the platform's own verified numbers.
 */

import { useState } from 'react';

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const MINT = '#A9C3A6';
const OLIVE = '#767769';
const LINE = '#D8D8CC';

type Sub = 'diag' | 'waves' | 'corporate' | 'touchpoints' | 'offline' | 'kpis';

/* ── atoms ─────────────────────────────────────────────────────── */

function Exhibit({ n, title }: { n: number; title: string }) {
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

/* ── data ──────────────────────────────────────────────────────── */

interface Play { title: string; detail: string; owner: string; engine: string }
interface Wave { id: string; label: string; tag: string; horizon: string; color: string; intro: string; plays: Play[] }

const WAVES: Wave[] = [
  {
    id: 'wave1', label: 'Wave 1 · Now', tag: 'Low-hanging fruit — mostly zero new budget', horizon: 'Weeks 1–2', color: '#2C5E3F',
    intro: 'Sell to people who already know us. Affinity is highest with existing patients — start where the chicken-and-egg problem does not exist.',
    plays: [
      { title: 'WhatsApp to our own base', engine: 'CRM / WhatsApp', owner: 'Fahad + ZAVIS', detail: 'Broadcast the membership offer through the 25 ZAVIS patient segments. Creative OS already generates the segment-personalised assets — for this channel the creative bottleneck is solved.' },
      { title: 'In-clinic conversion', engine: 'In-clinic', owner: 'Front desk + Dr Luvi', detail: 'Front-desk script and a QR standee at all three branches. The moment a patient pays for a cleaning or check-up is the moment membership savings are most tangible — sell it at the counter.' },
      { title: 'House ads on our own traffic', engine: 'Owned web', owner: 'ZAVIS + W3Layouts', detail: 'Smile Club promo slots on dentalnation.com and across the 19,500-page knowledge base — the highest-intent free inventory we own. A cost-guide reader is a membership prospect by definition.' },
      { title: 'Retargeting warm audiences', engine: 'Paid — remarketing', owner: 'Fahad', detail: 'Meta and Google remarketing to site visitors and the uploaded patient customer-match lists — those audiences are already built and live in both ad accounts.' },
      { title: 'GMB + social drumbeat', engine: 'Local / social', owner: 'Fahad + Syed/Hassan', detail: 'Smile Club posts on the Google Business profiles (4.9★ across 62 reviews) and Instagram. Reviews that mention membership become the social proof Wave 2 sells with.' },
    ],
  },
  {
    id: 'wave2', label: 'Wave 2 · Scale', tag: 'Paid + SEO + the first corporate logos', horizon: 'Weeks 3–8', color: BLUE,
    intro: 'Put budget and content behind what converted in Wave 1 — and land two or three corporate pilots through warm doors.',
    plays: [
      { title: 'Paid acquisition', engine: 'Paid — prospecting', owner: 'Fahad', detail: 'Lookalikes seeded from the member and patient lists; CTWA campaigns with a membership-led offer; Google Search on cost and offer intent ("teeth cleaning price Dubai", "dental offers").' },
      { title: 'SEO membership cluster', engine: 'SEO', owner: 'ZAVIS', detail: 'Dedicated EN/AR membership pages, plus a Smile Club module on the cost-guide archetype — every "what does X cost in Dubai" page answers with the member price. The programmatic pipeline generates this at scale.' },
      { title: 'Corporate pilots through warm doors', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Michael Page (Fahad’s HR contact), RBS, and the corporates we already work with. Pitch a pilot: employee code + an on-site dental day. The pilot manufactures the case study the wider corporate push needs.' },
      { title: 'Creative engine', engine: 'Creative OS', owner: 'ZAVIS', detail: 'Performance statics and offer variants generated through Creative OS instead of manual design — the declared blocker ("the only blocker is the creative assets") is exactly what that pipeline automates.' },
      { title: 'Referral mechanic', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Member-get-member: a simple reward for bringing family or a friend. Membership products grow on referral more than on ads — build the mechanic before scaling spend.' },
    ],
  },
  {
    id: 'wave3', label: 'Wave 3 · Compound', tag: 'The corporate engine + brand, funded by proof', horizon: 'Quarter +', color: NAVY,
    intro: 'With unit economics and a corporate case study in hand, widen the funnel — and only now decide on expensive awareness media.',
    plays: [
      { title: 'Corporate engine at scale', engine: 'B2B', owner: 'Fahad + Mr Akbar', detail: 'Employee-benefits platforms and aggregators, chambers and business councils, HR communities — plus outbound to a named list of ~50 Dubai employers, opened with the pilot case study.' },
      { title: 'Insurance-gap positioning', engine: 'Messaging', owner: 'Fahad', detail: 'Position Smile Club as the complement to health insurance where dental cover is thin — the one-sentence answer to "why would our employees need this?".' },
      { title: 'LinkedIn corporate lane', engine: 'Content OS', owner: 'ZAVIS', detail: 'Content OS already produces LinkedIn content — add a corporate-benefits lane aimed at HR titles to warm the outbound list.' },
      { title: 'Offline — only what earns its keep', engine: 'Offline', owner: 'Fahad', detail: 'Clinic-vicinity banners and community/mall activations near the three branches; corporate on-site dental days double as offline brand. Radio and billboards stay parked until CAC is known — see the Offline verdict.' },
      { title: 'Renewals & retention', engine: 'CRM', owner: 'Fahad + Gautam', detail: 'Renewal journeys and unused-benefit nudges in WhatsApp. A retained member is the cheapest member — retention economics fund everything above.' },
    ],
  },
];

const PIPELINE = [
  { stage: '1 · Warm intros', now: true, text: 'Michael Page (named HR contact), RBS, and partners already collaborating with us. Ask for 30 minutes, not a contract.' },
  { stage: '2 · Pilot package', now: true, text: 'Employee discount code + one on-site dental day + a simple usage report back to HR. Small enough to say yes to in one meeting.' },
  { stage: '3 · Case study', now: false, text: 'Sign-ups, on-site day photos, employee feedback — the proof pack that answers "why Dental Nation?" for every next HR conversation.' },
  { stage: '4 · Outbound at scale', now: false, text: 'A named list of ~50 Dubai employers, opened with the case study; LinkedIn corporate content lane warming the same titles.' },
  { stage: '5 · Platforms & partners', now: false, text: 'Employee-benefits platforms, aggregators, chambers and business councils — distribution that compounds without headcount.' },
];

const TOUCHPOINTS: { channel: string; aware: string; consider: string; convert: string; retain: string }[] = [
  { channel: 'WhatsApp / CRM (25 segments)', aware: '', consider: '●', convert: '●', retain: '●' },
  { channel: 'In-clinic (front desk, QR)', aware: '', consider: '●', convert: '●', retain: '○' },
  { channel: 'Website + knowledge-base house ads', aware: '○', consider: '●', convert: '●', retain: '' },
  { channel: 'Meta (CTWA + remarketing)', aware: '●', consider: '●', convert: '○', retain: '' },
  { channel: 'Google Search (cost/offer intent)', aware: '', consider: '●', convert: '●', retain: '' },
  { channel: 'SEO membership + cost cluster', aware: '●', consider: '●', convert: '○', retain: '' },
  { channel: 'GMB / local (4.9★, 62 reviews)', aware: '●', consider: '●', convert: '', retain: '' },
  { channel: 'LinkedIn (corporate lane)', aware: '●', consider: '○', convert: '', retain: '' },
  { channel: 'Corporate on-site dental days', aware: '●', consider: '●', convert: '●', retain: '○' },
  { channel: 'Referral (member-get-member)', aware: '○', consider: '', convert: '●', retain: '●' },
];

const OFFLINE: { medium: string; reach: string; cost: string; attribution: string; verdict: 'Park' | 'Selective' | 'Do now'; note: string }[] = [
  { medium: 'Radio', reach: 'Broad, untargeted', cost: 'High', attribution: 'Very weak', verdict: 'Park', note: 'Awareness-expensive; revisit only after CAC and LTV are known and digital is saturated.' },
  { medium: 'Billboards / large outdoor', reach: 'Broad, untargeted', cost: 'High', attribution: 'Very weak', verdict: 'Park', note: 'Same logic as radio — the chicken-and-egg is broken by proof, not by billboards.' },
  { medium: 'Banners near the three clinics', reach: 'Local, catchment', cost: 'Low', attribution: 'Weak but bounded', verdict: 'Selective', note: 'Cheap, geo-relevant, supports the in-clinic push. Acceptable in Wave 3, small budget.' },
  { medium: 'Mall / community activation', reach: 'Local, engaged', cost: 'Medium', attribution: 'Medium (sign-ups on the spot)', verdict: 'Selective', note: 'Works when tied to on-the-spot enrolment with the QR flow, near a branch.' },
  { medium: 'Corporate on-site dental days', reach: 'Precise (employees)', cost: 'Low–medium', attribution: 'Strong (codes per employer)', verdict: 'Do now', note: 'The best "offline" we have: it is simultaneously awareness, affinity and B2B sales.' },
];

const KPIS = [
  { kpi: 'Active members', base: 'Baseline pending — Gautam’s Smile Club dataset', why: 'The single number the whole plan moves.' },
  { kpi: 'CAC per member (by channel)', base: 'Measurable from Wave 1', why: 'Decides what Wave 2 scales and whether offline ever makes sense.' },
  { kpi: 'Corporate accounts / employees covered', base: '0 today — pilots are the unlock', why: 'The B2B engine’s scoreboard.' },
  { kpi: 'Activation (benefit used ≤ 60 days)', base: 'Needs member usage data', why: 'An unused membership does not renew and does not refer.' },
  { kpi: 'Renewal rate', base: 'Measurable from first renewal cohort', why: 'The economics that fund brand spend later.' },
];

const CHECKLIST = [
  'WhatsApp broadcast of the membership offer to the top patient segments (assets via Creative OS)',
  'QR standee + front-desk script live at all three branches',
  'Smile Club house-ad slots on dentalnation.com and the knowledge base',
  'Meta + Google remarketing on, using the existing patient audiences',
  'Intro messages out: Michael Page contact and RBS — pilot pitch, not a contract',
  'One-pager built: the member savings math + the corporate pilot package',
  'Baseline requested from Gautam: current members, sign-up dates, benefit usage',
];

/* ── sub-views ─────────────────────────────────────────────────── */

function Diagnosis() {
  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        Mr Akbar&apos;s ask: how do we optimize Smile Club? The product is live end-to-end and reach is not the
        constraint — we can put campaigns in market at will. The constraint is <em>affinity and distribution</em>:
        who believes in the brand enough to join, and who sells it where trust already exists.
      </p>

      <section>
        <Exhibit n={1} title="The chicken-and-egg — and how the sequence breaks it" />
        <Card>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="max-w-[240px] rounded-lg border-2 px-4 py-3" style={{ borderColor: BLUE }}>
              <p className="text-[12px] font-bold" style={{ color: NAVY }}>Corporate sales need affinity</p>
              <p className="mt-1 text-[10.5px] leading-snug" style={{ color: OLIVE }}>
                HR&apos;s fair question: &quot;Why Dental Nation? Our people could get a membership anywhere.&quot;
                A cold pitch with no proof loses that conversation.
              </p>
            </div>
            <p className="text-[20px]" style={{ color: CORAL }}>⇄</p>
            <div className="max-w-[240px] rounded-lg border-2 px-4 py-3" style={{ borderColor: CORAL }}>
              <p className="text-[12px] font-bold" style={{ color: NAVY }}>Affinity needs members</p>
              <p className="mt-1 text-[10.5px] leading-snug" style={{ color: OLIVE }}>
                Brand affinity is built by members using benefits, saving money and telling people — which needs
                members first.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-lg px-3 py-2.5" style={{ backgroundColor: '#FDF9EC' }}>
            <p className="text-[11px] font-bold" style={{ color: '#6d5a1d' }}>The breaker: start where affinity already exists, then convert it into proof.</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px]" style={{ color: '#3a4148' }}>
              {[
                'Existing patients join (they already trust us)',
                'Usage, savings, reviews accumulate',
                'Proof pack: numbers + stories',
                'Corporate pilots through warm doors',
                'Bulk memberships + on-site days',
                'More members → more affinity',
              ].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="rounded-md border bg-white px-2 py-1 font-medium" style={{ borderColor: LINE, color: NAVY }}>{s}</span>
                  {i < arr.length - 1 ? <span style={{ color: BLUE }}>→</span> : <span style={{ color: CORAL }}>↩</span>}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section>
        <Exhibit n={2} title="What we already hold — the plan spends assets before it spends money" />
        <div className="grid gap-2 md:grid-cols-3">
          {([
            ['Product live end-to-end', 'smileclub.dentalnation.com + admin console — implemented and deployed (ZAVIS).'],
            ['25 WhatsApp segments + Creative OS', 'Segment-personalised assets generate automatically — the stated creative bottleneck is solved for CRM.'],
            ['Patient audiences in both ad accounts', 'Customer-match lists uploaded to Meta and Google — remarketing and lookalikes are one switch away.'],
            ['19,500+ SEO pages', 'Owned high-intent traffic (cost guides, treatments) where a membership answer belongs.'],
            ['4.9★ across 62 GMB reviews', 'Social proof for the consideration step — and for the HR pitch.'],
            ['Warm corporate doors', 'Michael Page (HR contact), RBS, and partners we already collaborate with.'],
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
      <Exhibit n={3} title="Three waves — sequenced by effort, each funding the next" />
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Low-hanging fruit first, exactly as agreed: Wave 1 needs almost no new budget, Wave 2 scales what
        converted, Wave 3 is the corporate engine plus any brand spend — funded by proof, not hope.
      </p>
      <div className="mb-3 flex flex-wrap items-stretch gap-1.5">
        {WAVES.map((x) => (
          <button
            key={x.id} type="button" onClick={() => setWid(x.id)}
            className="min-w-[150px] flex-1 rounded-xl border-2 px-3 py-2 text-left transition"
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
    </div>
  );
}

function Corporate() {
  const [idx, setIdx] = useState(0);
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={4} title="The corporate engagement engine — pilot first, scale on proof" />
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PIPELINE.map((s, i) => (
            <button
              key={s.stage} type="button" onClick={() => setIdx(i)}
              className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition"
              style={i === idx ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: s.now ? MINT : LINE, color: s.now ? '#2C5E3F' : OLIVE }}
            >
              {s.stage}{s.now ? ' ·  start now' : ''}
            </button>
          ))}
        </div>
        <Card accent={NAVY}>
          <p className="text-[12px] font-bold" style={{ color: NAVY }}>{PIPELINE[idx].stage}</p>
          <p className="mt-1 text-[12px] leading-snug" style={{ color: '#3a4148' }}>{PIPELINE[idx].text}</p>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>The pitch, in HR&apos;s language</p>
          <ul className="mt-2 space-y-1.5">
            {[
              'A dental benefit at zero cost to the employer — Smile Club fills the gap where standard health insurance covers little dentistry.',
              'Zero admin: a company code and a sign-up link; the Smile Club console handles the rest.',
              'An on-site dental day employees actually remember — screening, advice, sign-ups on the spot.',
              'A usage report back to HR each quarter, so the benefit is visible internally.',
            ].map((t) => (
              <li key={t} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: MINT }} />{t}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CORAL }}>The objection we must beat</p>
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] italic leading-snug" style={{ backgroundColor: '#FBEFEC', color: NAVY }}>
            &quot;Why Dental Nation? Our employees could get a membership anywhere.&quot;
          </p>
          <p className="mt-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
            The honest answer is proof, which is why Wave 1 precedes the hard corporate sell: 4.9★ across 62 public
            reviews, three branches, named doctors, the member savings math on one page — and after the first pilot,
            a case study with real sign-up and usage numbers. Until that pack exists, corporate outreach stays
            warm-intro only (Michael Page, RBS, existing partners), where the relationship carries what the brand
            does not yet.
          </p>
        </Card>
      </section>

      <section>
        <p className="rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
          To build before the first meeting: the corporate one-pager (savings math + pilot package), employer discount-code
          mechanics in the Smile Club admin, and a simple per-employer usage report.
        </p>
      </section>
    </div>
  );
}

function Touchpoints() {
  return (
    <div>
      <Exhibit n={5} title="Digital touchpoint map — every channel, one funnel" />
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        ● primary role · ○ supporting role. Reach was never the problem — this is about giving each channel one job
        in the membership funnel instead of running everything everywhere.
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
      <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#EEF4F6', color: NAVY }}>
        The two channels that close: WhatsApp to known patients and the in-clinic moment. Everything else exists to
        fill those two — which is why they go live first.
      </p>
    </div>
  );
}

function Offline() {
  const tone = (v: string) =>
    v === 'Do now' ? { bg: '#EEF4F0', tx: '#2C5E3F' } : v === 'Selective' ? { bg: '#FDF6E3', tx: '#7a6420' } : { bg: '#FBEFEC', tx: CORAL };
  return (
    <div>
      <Exhibit n={6} title="The offline verdict — is radio / billboard really needed?" />
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Asked and answered per medium, not as a yes/no on &quot;offline&quot;. The rule: nothing broad and
        unattributable until digital CAC per member is known and warm channels are saturated.
      </p>
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
                <td className="px-3 py-1.5"><span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: tone(o.verdict).bg, color: tone(o.verdict).tx }}>{o.verdict}</span></td>
                <td className="px-3 py-1.5" style={{ color: OLIVE }}>{o.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
        Bottom line for Mr Akbar: offline is not needed to start, and starting with it would spend the most money on
        the least measurable step. The affinity problem is broken by members and proof; corporate on-site days give
        us real-world presence that also sells.
      </p>
    </div>
  );
}

function Kpis() {
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={7} title="How we will know it is working" />
        <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
                <th className="px-3 py-2 font-bold">KPI</th><th className="px-3 py-2 font-bold">Where it stands</th><th className="px-3 py-2 font-bold">Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {KPIS.map((k) => (
                <tr key={k.kpi} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
                  <td className="px-3 py-1.5 font-semibold" style={{ color: NAVY }}>{k.kpi}</td>
                  <td className="px-3 py-1.5" style={{ color: '#3a4148' }}>{k.base}</td>
                  <td className="px-3 py-1.5" style={{ color: OLIVE }}>{k.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FBEFEC', color: CORAL }}>
          One data dependency: the member baseline (current members, sign-up dates, benefit usage) sits with Gautam —
          already on the pending ledger. Without it every result reads as &quot;up from unknown&quot;.
        </p>
      </section>

      <section>
        <Exhibit n={8} title="The first two weeks — the checklist" />
        <Card>
          <ul className="space-y-1.5">
            {CHECKLIST.map((c, i) => (
              <li key={c} className="flex gap-2.5 text-[12px] leading-snug" style={{ color: '#3a4148' }}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white" style={{ backgroundColor: NAVY }}>{i + 1}</span>
                {c}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

/* ── the tab ───────────────────────────────────────────────────── */

const SUBS: { id: Sub; label: string }[] = [
  { id: 'diag', label: 'The diagnosis' },
  { id: 'waves', label: 'Three waves' },
  { id: 'corporate', label: 'Corporate playbook' },
  { id: 'touchpoints', label: 'Touchpoint map' },
  { id: 'offline', label: 'Offline verdict' },
  { id: 'kpis', label: 'KPIs & first moves' },
];

export function SmileClubOptimization() {
  const [sub, setSub] = useState<Sub>('diag');
  return (
    <section className="mx-auto max-w-[980px]">
      <header className="mb-3 border-b border-line pb-3">
        <p className="eyebrow text-accent">Growth Programme · Smile Club</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-ink" style={{ fontFamily: 'Georgia, serif' }}>
          Smile Club Optimization — the 360° membership growth plan
        </h1>
        <p className="mt-1 max-w-[720px] text-[12px] leading-snug text-ink-soft">
          Prepared for Mr Akbar: how to scale Smile Club membership — sequenced from low-hanging fruit to the
          corporate engine, with the digital touchpoints, the SEO play, the corporate engagement playbook and an
          honest verdict on offline media.
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
        {sub === 'diag' && <Diagnosis />}
        {sub === 'waves' && <Waves />}
        {sub === 'corporate' && <Corporate />}
        {sub === 'touchpoints' && <Touchpoints />}
        {sub === 'offline' && <Offline />}
        {sub === 'kpis' && <Kpis />}
      </div>
    </section>
  );
}
