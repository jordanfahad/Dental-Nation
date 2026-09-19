'use client';

/**
 * Interactive CRM-DN Marketing OS explorer (/impact/zavis-know-how).
 * McKinsey-style exhibits over the knowledge-graph source document plus the
 * delivery status CRM-DN reported on 12 Sep 2026: the platform suite with
 * per-product profiles and live links, the automated segment→creative→
 * broadcast loop, the paid and organic lead engines, the programmatic SEO
 * factory with its six page archetypes, and the 8-week pilot plan.
 * Figures come from content/zavis-marketing-knowledge-graph.md and the
 * 12 Sep status update; nothing is invented.
 */

import { useState } from 'react';

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const MINT = '#A9C3A6';
const OLIVE = '#767769';
const LINE = '#D8D8CC';

type Tab = 'overview' | 'suite' | 'engines' | 'seo' | 'pilot';

/* ── data ──────────────────────────────────────────────────────── */

type PlatformStatus = 'live' | 'down' | 'experimental';

interface Platform {
  id: string;
  name: string;
  role: string;
  status: PlatformStatus;
  statusNote: string;
  summary: string;
  deliverables: string[];
  links: { label: string; url: string }[];
}

const PLATFORMS: Platform[] = [
  {
    id: 'pip', name: 'Patient Intelligence Platform', role: 'The intelligence layer',
    status: 'live', statusNote: 'Live on Microsoft Azure',
    summary: 'The brain of the Marketing OS: every patient signal turned into audience segments with a recommended campaign strategy for each — exposed to the rest of the suite through APIs.',
    deliverables: [
      'Patient Intelligence Platform and its supporting APIs',
      '25 WhatsApp audience segments',
      '80 performance-marketing audience segments',
      'Campaign strategy recommendation for every segment',
      'Deployed on Microsoft Azure',
    ],
    links: [{ label: 'Platform login', url: 'http://74.162.121.241/login' }],
  },
  {
    id: 'creative', name: 'Creative OS', role: 'The asset factory',
    status: 'live', statusNote: 'Live · integrated with Patient Intelligence',
    summary: 'Creative Studio wired directly into the Patient Intelligence Platform — pick a segment and an offer, and campaign assets are generated instead of designed by hand.',
    deliverables: [
      'Personalised WhatsApp campaign creatives generated from patient segments',
      'Automatic static marketing assets for any selected audience',
      'Campaign creation streamlined to minimal manual effort',
    ],
    links: [{ label: 'Creative OS', url: 'https://contentos.dentalnation.com/creative-os' }],
  },
  {
    id: 'content', name: 'Content OS', role: 'The content production line',
    status: 'live', statusNote: 'Live',
    summary: 'One centralised system to plan, produce and reuse marketing content at scale — from patient education to board-grade market reports.',
    deliverables: [
      'Educational content planning',
      'Healthcare market report generation',
      'LinkedIn and website content creation',
      'Standardised, reusable content workflows',
    ],
    links: [
      { label: 'Reports', url: 'https://contentos.dentalnation.com/reports' },
      { label: 'Slide reports', url: 'https://contentos.dentalnation.com/slide-reports' },
    ],
  },
  {
    id: 'seo', name: 'Programmatic SEO Platform', role: 'The organic acquisition engine',
    status: 'live', statusNote: 'Live · 19,500+ pages generated',
    summary: 'Automated large-scale landing-page creation for high-intent healthcare searches — nine archetypes covering questions, treatments, conditions, symptoms, doctors and comparisons, in English and Arabic.',
    deliverables: [
      '19,500+ SEO pages generated',
      'Coverage: Patient Questions, Treatments, Conditions, Symptoms, Dentist Profiles, Directories, Technologies, Materials, Comparisons',
    ],
    links: [{ label: 'Live knowledge base', url: 'https://dentalnation.com/en/knowledge' }],
  },
  {
    id: 'smileclub', name: 'Smile Club', role: 'The membership programme',
    status: 'live', statusNote: 'Implemented end-to-end · deployed',
    summary: 'The Smile Club membership programme built from business requirements to production deployment.',
    deliverables: [
      'End-to-end implementation against business requirements',
      'Successfully deployed to production',
    ],
    links: [
      { label: 'Smile Club', url: 'https://smileclub.dentalnation.com/en/smile-club' },
      { label: 'Admin console', url: 'https://smileclub.dentalnation.com/admin/' },
    ],
  },
  {
    id: 'concierge', name: 'AI Website Concierge', role: 'Visitor assistance (experimental)',
    status: 'down', statusNote: 'Built · offline — awaiting server capacity',
    summary: 'An AI-powered concierge that helps website visitors with navigation, treatment information and lead capture. Developed and deployed, currently down because the production server is fully occupied by the live platforms.',
    deliverables: [
      'AI concierge for navigation, treatment information and lead generation',
      'Developed and deployed; parked pending additional server capacity',
    ],
    links: [{ label: 'Concierge (offline)', url: 'https://dn-concierge.zavisinternaltools.in/en' }],
  },
  {
    id: 'devenv', name: 'Development Environment', role: 'Build · test · QA · CD',
    status: 'down', statusNote: 'Built · offline — awaiting server capacity',
    summary: 'A dedicated environment for feature development, testing, quality assurance and continuous deployment — same story: implemented, offline until server capacity is added.',
    deliverables: [
      'Dedicated dev/QA environment supporting continuous deployment',
      'Implemented; parked pending additional server capacity',
    ],
    links: [{ label: 'dev.dentalnation.ae (offline)', url: 'https://dev.dentalnation.ae' }],
  },
];

const LOOP_STEPS = [
  { title: 'Pick a segment', who: 'Patient Intelligence', text: 'Any of the 25 WhatsApp segments (or 80 performance segments) is selected for a given offer, campaign or communication context.' },
  { title: 'APIs hand over the audience', who: 'PIP → Content OS', text: 'APIs retrieve the segmentation data and patient records from the Patient Intelligence Platform — already integrated with the Content OS.' },
  { title: 'Assets generate themselves', who: 'Creative OS', text: 'The image-based content-generation pipeline produces personalised WhatsApp creatives and static assets for the selected audience.' },
  { title: 'Broadcast goes out', who: 'WhatsApp', text: 'The campaign reaches exactly the patients the segment describes — no manual asset production in the loop.' },
  { title: 'Leads route to the clinic', who: 'Al Wasl', text: 'Responses are worked in the clinic; every lead is tagged for quality by CRM-DN.' },
  { title: 'The system gets smarter', who: 'Feedback loop', text: 'Quality tags flow back to the ad platforms and the segments — the OS optimises toward better patients, not cheaper clicks.' },
];

const SEO_CATS = [
  { label: 'Patient Questions', n: 10880 },
  { label: 'Dentist Profiles', n: 3451 },
  { label: 'Treatments', n: 397 },
  { label: 'Conditions', n: 147 },
  { label: 'Dentist Directory', n: 130 },
  { label: 'Symptoms', n: 119 },
  { label: 'Materials', n: 83 },
  { label: 'Comparisons', n: 79 },
  { label: 'Technology', n: 62 },
];

const DEMO = 'https://contentos.zavisinternaltools.in/dental-nation/static/platform-demo';
const ARCHETYPES = [
  { name: 'Symptom Guide', example: 'Tooth pain', url: `${DEMO}/symptoms/tooth-pain.html`, text: 'Meets the patient at the moment of discomfort and routes them to the right treatment.' },
  { name: 'Condition Guide', example: 'Cavities', url: `${DEMO}/conditions/cavities.html`, text: 'Explains the condition, its progression and when to see a dentist.' },
  { name: 'Treatment Guide', example: 'Dental implants', url: `${DEMO}/treatments/dental-implants.html`, text: 'The full treatment story — candidacy, procedure, recovery, results.' },
  { name: 'Treatment Comparison', example: 'Veneers vs crowns', url: `${DEMO}/compare/veneers-vs-crowns.html`, text: 'Captures decision-stage searches where patients weigh two options.' },
  { name: 'Cost Guide', example: 'Dental implants in Dubai', url: `${DEMO}/costs/dental-implants-dubai.html`, text: 'The highest-intent query of all — what it costs, here, honestly answered.' },
  { name: 'Arabic Version', example: 'Hollywood smile (AR)', url: `${DEMO}/ar/hollywood-smile.html`, text: 'The same architecture localised, not translated — native Arabic search demand.' },
];

const PILOT = [
  { phase: 'Week 1', title: 'Research & build', text: '10 offer themes decided, landing pages built, tracking wired. No spend yet.' },
  { phase: 'Weeks 2–4', title: 'Month 1 live', text: 'Google Search + Meta CTWA both on; budget spread across 4 themes × 2 languages.' },
  { phase: 'End of week 4', title: 'Review gate', text: 'Winners keep their spend; weak themes are swapped out.' },
  { phase: 'Weeks 5–8', title: 'Concentrate', text: 'Budget concentrates on the best lead producers; closing recommendation prepared.' },
  { phase: 'Next phase', title: 'Scale decision', text: 'Measured on cost per booked patient — not cost per click.' },
];

/* ── atoms ─────────────────────────────────────────────────────── */

function StatusBadge({ status, note }: { status: PlatformStatus; note: string }) {
  const c =
    status === 'live' ? { bg: '#EEF4F0', bd: MINT, tx: '#2C5E3F', dot: '#3f7d58' }
    : status === 'down' ? { bg: '#FBEFEC', bd: CORAL, tx: CORAL, dot: CORAL }
    : { bg: '#FDF6E3', bd: GOLD, tx: '#7a6420', dot: '#b3922f' };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold" style={{ backgroundColor: c.bg, borderColor: c.bd, color: c.tx }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {note}
    </span>
  );
}

function LinkBtn({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10.5px] font-semibold transition hover:opacity-75"
      style={{ borderColor: NAVY, color: NAVY }}
    >
      {label} ↗
    </a>
  );
}

function Exhibit({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>Exhibit {n}</span>
      <h2 className="text-[14px] font-semibold" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{title}</h2>
      {children}
    </div>
  );
}

function FlowBox({ title, sub, color, dashed }: { title: string; sub?: string; color?: string; dashed?: boolean }) {
  return (
    <div className={`rounded-lg border-2 px-3 py-2 text-center ${dashed ? 'border-dashed' : ''}`} style={{ borderColor: color ?? NAVY, backgroundColor: 'white' }}>
      <p className="text-[12px] font-semibold leading-tight" style={{ color: NAVY }}>{title}</p>
      {sub ? <p className="mt-0.5 text-[10px] leading-tight" style={{ color: OLIVE }}>{sub}</p> : null}
    </div>
  );
}

const Arrow = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center px-1">
    <span className="text-[16px] leading-none" style={{ color: BLUE }}>→</span>
    {label ? <span className="mt-0.5 max-w-[90px] text-center text-[9px] leading-tight" style={{ color: OLIVE }}>{label}</span> : null}
  </div>
);

/* ── overview tab ──────────────────────────────────────────────── */

function OverviewTab({ goToPlatform }: { goToPlatform: (id: string) => void }) {
  const live = PLATFORMS.filter((p) => p.status === 'live');
  const down = PLATFORMS.filter((p) => p.status !== 'live');
  return (
    <div className="space-y-5">
      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ['5 + 2', 'platforms delivered', '5 live in production · 2 built, awaiting server capacity'],
          ['19,500+', 'SEO pages generated', 'live knowledge base, EN + AR'],
          ['105', 'audience segments', '25 WhatsApp + 80 performance, each with a strategy'],
          ['AED 12,000', 'pilot media budget', '8 weeks · Google + Meta'],
        ] as [string, string, string][]).map(([v, l, s]) => (
          <div key={l} className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: LINE }}>
            <p className="text-[22px] font-bold tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{v}</p>
            <p className="text-[11px] font-medium" style={{ color: '#3a4148' }}>{l}</p>
            <p className="text-[10px]" style={{ color: OLIVE }}>{s}</p>
          </div>
        ))}
      </div>

      {/* the one-line story */}
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        CRM-DN has built a full Marketing OS: patient intelligence decides <em>who</em>, Creative OS produces <em>what</em>,
        Content OS and programmatic SEO carry the <em>message</em>, and every lead feeds quality back into the system.
        The constraint today is not software — it is server capacity.
      </p>

      {/* suite at a glance */}
      <section>
        <Exhibit n={1} title="The platform suite at a glance — click any platform for its full profile" />
        <div className="grid gap-2 md:grid-cols-3">
          {live.map((p) => (
            <button key={p.id} type="button" onClick={() => goToPlatform(p.id)} className="rounded-xl border-2 bg-white p-3 text-left transition hover:-translate-y-0.5" style={{ borderColor: MINT }}>
              <p className="text-[12px] font-bold leading-tight" style={{ color: NAVY }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: OLIVE }}>{p.role}</p>
              <div className="mt-1.5"><StatusBadge status={p.status} note={p.statusNote} /></div>
            </button>
          ))}
          {down.map((p) => (
            <button key={p.id} type="button" onClick={() => goToPlatform(p.id)} className="rounded-xl border-2 border-dashed bg-white p-3 text-left transition hover:-translate-y-0.5" style={{ borderColor: CORAL }}>
              <p className="text-[12px] font-bold leading-tight" style={{ color: NAVY }}>{p.name}</p>
              <p className="text-[10px]" style={{ color: OLIVE }}>{p.role}</p>
              <div className="mt-1.5"><StatusBadge status={p.status} note={p.statusNote} /></div>
            </button>
          ))}
        </div>
        <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FBEFEC', color: CORAL }}>
          Decision on the table: the current server is fully occupied by the live platforms. The AI Concierge and the
          development environment are finished software waiting on capacity, not on build time.
        </p>
      </section>

      {/* how it hangs together */}
      <section>
        <Exhibit n={2} title="How the OS hangs together" />
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <FlowBox title="Patient Intelligence" sub="105 segments + strategy each" />
            <Arrow label="APIs" />
            <FlowBox title="Content OS" sub="plans & produces content" color={BLUE} />
            <Arrow label="pipeline" />
            <FlowBox title="Creative OS" sub="assets generated per segment" color={BLUE} />
            <Arrow label="broadcast" />
            <FlowBox title="WhatsApp · Paid · SEO" sub="channels" color={GOLD} />
            <Arrow label="leads" />
            <FlowBox title="Clinics" sub="Al Wasl routing" color={CORAL} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2" style={{ borderColor: CORAL }}>
            <span className="text-[14px]" style={{ color: CORAL }}>↩</span>
            <p className="text-[11px]" style={{ color: '#3a4148' }}>
              <span className="font-semibold" style={{ color: CORAL }}>The loop:</span> every lead is quality-tagged and fed
              back — segments sharpen, ad platforms optimise toward quality, creatives regenerate. See it step by step in
              <span className="font-semibold"> The automated loop</span> tab.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── platform suite tab ────────────────────────────────────────── */

function SuiteTab({ selected, setSelected }: { selected: string; setSelected: (id: string) => void }) {
  const p = PLATFORMS.find((x) => x.id === selected) ?? PLATFORMS[0];
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PLATFORMS.map((x) => (
          <button
            key={x.id} type="button" onClick={() => setSelected(x.id)}
            className="rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
            style={selected === x.id ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: x.status === 'down' ? CORAL : LINE, color: x.status === 'down' ? CORAL : OLIVE }}
          >
            {x.name}
          </button>
        ))}
      </div>
      <div className="rounded-xl border-2 bg-white p-4" style={{ borderColor: p.status === 'down' ? CORAL : NAVY }}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[16px] font-bold" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{p.name}</p>
            <p className="text-[11px]" style={{ color: OLIVE }}>{p.role}</p>
          </div>
          <StatusBadge status={p.status} note={p.statusNote} />
        </div>
        <p className="mt-2 text-[12px] leading-snug" style={{ color: '#3a4148' }}>{p.summary}</p>
        <p className="mt-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>Key deliverables</p>
        <ul className="mt-1 space-y-1">
          {p.deliverables.map((d) => (
            <li key={d} className="flex gap-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
              <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: p.status === 'down' ? CORAL : MINT }} />
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">{p.links.map((l) => <LinkBtn key={l.url} {...l} />)}</div>
        {p.status === 'down' && (
          <p className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FBEFEC', color: CORAL }}>
            Offline for one reason only: the production server is fully occupied by the five live platforms.
            Additional server capacity brings this back without further build work.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── automated loop tab ────────────────────────────────────────── */

function LoopTab() {
  const [idx, setIdx] = useState(0);
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={3} title="Segment → creative → broadcast, with no designer in the loop" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          The integration delivered this month: Patient Intelligence APIs feed the Content OS, and an image-based
          generation pipeline turns any of the 25 WhatsApp segments into ready campaign assets. Click through the steps.
        </p>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap gap-1.5">
            {LOOP_STEPS.map((s, i) => (
              <button
                key={s.title} type="button" onClick={() => setIdx(i)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition"
                style={i === idx ? { backgroundColor: NAVY, borderColor: NAVY, color: 'white' } : { borderColor: LINE, color: OLIVE }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={i === idx ? { backgroundColor: GOLD, color: '#5a4a10' } : { backgroundColor: '#F1F1EA', color: OLIVE }}>{i + 1}</span>
                {s.title}
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-lg border-l-4 px-3 py-2.5" style={{ borderColor: GOLD, backgroundColor: '#FDF9EC' }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#7a6420' }}>{LOOP_STEPS[idx].who}</p>
            <p className="mt-0.5 text-[12px] leading-snug" style={{ color: '#3a4148' }}>{LOOP_STEPS[idx].text}</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setIdx(Math.max(0, idx - 1))} className="rounded-md border px-3 py-1 text-[11px] font-bold" style={{ borderColor: NAVY, color: NAVY }}>← Prev</button>
            <button type="button" onClick={() => setIdx(Math.min(LOOP_STEPS.length - 1, idx + 1))} className="rounded-md px-3 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: NAVY }}>Next →</button>
            <div className="ml-1 h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: '#EEEFE1' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / LOOP_STEPS.length) * 100}%`, backgroundColor: GOLD }} />
            </div>
          </div>
        </div>
      </section>

      <section>
        <Exhibit n={4} title="Paid lead flow — and the loop that makes it smarter" />
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <FlowBox title="Google Search" sub="AED 6,000 · 10 landing pages" />
            <FlowBox title="Meta CTWA" sub="AED 6,000 · EN + AR native" />
            <Arrow label="click" />
            <FlowBox title="Landing page / WhatsApp chat" sub="offer-led · noindex" color={BLUE} />
            <Arrow label="call / message" />
            <FlowBox title="Al Wasl clinic" sub="all pilot routing" color={BLUE} />
            <Arrow label="worked in" />
            <FlowBox title="CRM-DN" sub="every lead tagged for quality" color={CORAL} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2" style={{ borderColor: CORAL }}>
            <span className="text-[14px]" style={{ color: CORAL }}>↩</span>
            <p className="text-[11px]" style={{ color: '#3a4148' }}>
              <span className="font-semibold" style={{ color: CORAL }}>Feedback loop:</span> lead-quality tags return to
              Google &amp; Meta — the platforms learn what a <em>quality</em> lead looks like (real, contactable, in
              catchment, genuine treatment interest).
            </p>
          </div>
        </div>
      </section>

      <section>
        <Exhibit n={5} title="The organic engine — deliberately separate from paid" />
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <FlowBox title="Programmatic SEO" sub="19,500+ pages" />
            <FlowBox title="Journal + Content OS" sub="weekly cadence" />
            <FlowBox title="Backlinks" sub="W3Layouts live · PR planned" dashed color={GOLD} />
            <Arrow />
            <FlowBox title="dentalnation.com" sub="concern-first · EN/AR" color={BLUE} />
            <Arrow />
            <FlowBox title="Organic growth" sub="long-term goal" color={CORAL} />
          </div>
          <p className="mt-3 text-[10.5px] leading-snug" style={{ color: OLIVE }}>
            Paid landing pages are noindexed so the two engines never interfere. Known hygiene item: www vs non-www both
            serve the sitemap — one host should be canonical (with W3Layouts).
          </p>
        </div>
      </section>
    </div>
  );
}

/* ── SEO factory tab ───────────────────────────────────────────── */

function SeoTab() {
  const maxSeo = SEO_CATS[0].n;
  return (
    <div className="space-y-5">
      <section>
        <Exhibit n={6} title="19,500+ pages, one factory, nine archetypes" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
            <p className="mb-2 text-[11px] font-semibold" style={{ color: NAVY }}>Pages by category <span className="font-normal" style={{ color: OLIVE }}>(counted snapshot; total now 19,500+)</span></p>
            {SEO_CATS.map((c) => (
              <div key={c.label} className="mb-1.5 flex items-center gap-2">
                <span className="w-[120px] shrink-0 text-[10.5px]" style={{ color: '#3a4148' }}>{c.label}</span>
                <div className="h-3.5 flex-1 rounded-full" style={{ backgroundColor: '#EEEFE1' }}>
                  <div className="h-3.5 rounded-full" style={{ width: `${Math.max(2, Math.round((c.n / maxSeo) * 100))}%`, backgroundColor: BLUE }} />
                </div>
                <span className="w-[52px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums" style={{ color: NAVY }}>{c.n.toLocaleString('en-US')}</span>
              </div>
            ))}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <LinkBtn label="Live knowledge base" url="https://dentalnation.com/en/knowledge" />
              <LinkBtn label="Concept brief" url={`${DEMO}/concept.html`} />
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
            <p className="mb-1 text-[11px] font-semibold" style={{ color: NAVY }}>Why archetypes, not pages</p>
            <p className="text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
              Each archetype is a template engineered once for a whole class of high-intent search — then generated at
              scale with real clinical content, in English and Arabic. That is how nine templates become 19,500+ pages
              without 19,500 briefs.
            </p>
            <p className="mt-2 text-[11.5px] leading-snug" style={{ color: '#3a4148' }}>
              The templates below are the live design references — open any of them to see exactly what a generated page
              looks like for its archetype.
            </p>
          </div>
        </div>
      </section>

      <section>
        <Exhibit n={7} title="The archetype gallery — open the live templates" />
        <div className="grid gap-2 md:grid-cols-3">
          {ARCHETYPES.map((a) => (
            <a
              key={a.name} href={a.url} target="_blank" rel="noopener noreferrer"
              className="rounded-xl border-2 bg-white p-3 transition hover:-translate-y-0.5"
              style={{ borderColor: LINE }}
            >
              <p className="text-[12px] font-bold" style={{ color: NAVY }}>{a.name} <span style={{ color: BLUE }}>↗</span></p>
              <p className="text-[10px] font-semibold" style={{ color: '#7a6420' }}>example: {a.example}</p>
              <p className="mt-1 text-[10.5px] leading-snug" style={{ color: OLIVE }}>{a.text}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── pilot tab ─────────────────────────────────────────────────── */

function PilotTab() {
  const [idx, setIdx] = useState(0);
  return (
    <div>
      <Exhibit n={8} title="The 8-week paid pilot — AED 12,000, measured on booked patients" />
      <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
        Test broadly, then concentrate: month one spreads the budget to learn, month two doubles down on what produced
        real leads. Click a phase.
      </p>
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
        <div className="flex flex-wrap items-stretch gap-1.5">
          {PILOT.map((p, i) => (
            <button
              key={p.phase} type="button" onClick={() => setIdx(i)}
              className="min-w-[110px] flex-1 rounded-lg border-2 px-3 py-2 text-left transition"
              style={i === idx ? { borderColor: NAVY, backgroundColor: '#EEF4F6' } : { borderColor: LINE, backgroundColor: 'white', opacity: 0.8 }}
            >
              <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: i === idx ? CORAL : BLUE }}>{p.phase}</p>
              <p className="text-[11.5px] font-bold leading-tight" style={{ color: NAVY }}>{p.title}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 rounded-lg border-l-4 px-3 py-2.5 text-[12px] leading-snug" style={{ borderColor: GOLD, backgroundColor: '#FDF9EC', color: '#3a4148' }}>
          {PILOT[idx].text}
        </p>
      </div>
    </div>
  );
}

/* ── the app ───────────────────────────────────────────────────── */

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Executive view' },
  { id: 'suite', label: 'Platform suite' },
  { id: 'engines', label: 'The automated loop' },
  { id: 'seo', label: 'SEO factory' },
  { id: 'pilot', label: 'Pilot plan' },
];

export function ZavisKnowHowApp() {
  const [tab, setTab] = useState<Tab>('overview');
  const [platform, setPlatform] = useState('pip');

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: LINE }}>
        {TABS.map((t) => (
          <button
            key={t.id} type="button" onClick={() => setTab(t.id)}
            className="rounded-full px-3 py-1.5 text-[11px] font-bold transition"
            style={tab === t.id ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {tab === 'overview' && <OverviewTab goToPlatform={(id) => { setPlatform(id); setTab('suite'); }} />}
        {tab === 'suite' && <SuiteTab selected={platform} setSelected={setPlatform} />}
        {tab === 'engines' && <LoopTab />}
        {tab === 'seo' && <SeoTab />}
        {tab === 'pilot' && <PilotTab />}
      </div>
    </div>
  );
}
