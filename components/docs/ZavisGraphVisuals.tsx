/**
 * Visual layer for the ZAVIS Marketing Knowledge Graph page — the graph
 * rendered as infographics instead of prose: the six-layer system map, the
 * paid lead flow with its feedback loop, the organic engine, the SEO page
 * inventory and the pilot timeline. Pure HTML/CSS, no dependencies; every
 * figure comes from the source document (content/zavis-marketing-knowledge-graph.md).
 */

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const MINT = '#A9C3A6';

function Chip({ label, tone, note }: { label: string; tone?: 'live' | 'dev' | 'planned' | 'open'; note?: string }) {
  const c =
    tone === 'dev' ? { bg: '#FDF6E3', bd: GOLD, tx: '#7a6420' }
    : tone === 'planned' ? { bg: '#F4EFEA', bd: '#D8D8CC', tx: '#767769' }
    : tone === 'open' ? { bg: '#FBEFEC', bd: CORAL, tx: CORAL }
    : { bg: '#EEF4F0', bd: MINT, tx: '#2C5E3F' };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium"
      style={{ backgroundColor: c.bg, borderColor: c.bd, color: c.tx }}
      title={note}
    >
      {label}
      {note ? <span className="text-[9px] opacity-70">· {note}</span> : null}
    </span>
  );
}

function Layer({ n, title, color, children }: { n: string; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="relative rounded-xl border bg-white p-3.5" style={{ borderColor: '#D8D8CC' }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>{n}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: NAVY }}>{title}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FlowBox({ title, sub, color, dashed }: { title: string; sub?: string; color?: string; dashed?: boolean }) {
  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 text-center ${dashed ? 'border-dashed' : ''}`}
      style={{ borderColor: color ?? NAVY, backgroundColor: 'white' }}
    >
      <p className="text-[12px] font-semibold leading-tight" style={{ color: NAVY }}>{title}</p>
      {sub ? <p className="mt-0.5 text-[10px] leading-tight text-[#767769]">{sub}</p> : null}
    </div>
  );
}

const Arrow = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center px-1">
    <span className="text-[16px] leading-none" style={{ color: BLUE }}>→</span>
    {label ? <span className="mt-0.5 max-w-[90px] text-center text-[9px] leading-tight text-[#767769]">{label}</span> : null}
  </div>
);

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

export function ZavisGraphVisuals() {
  const maxSeo = SEO_CATS[0].n;
  return (
    <div className="space-y-6">
      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([
          ['7', 'Marketing OS modules', 'built by ZAVIS in 2 months'],
          ['15,348', 'programmatic SEO pages', 'across 9 counted categories'],
          ['105', 'audience segments', '25 WhatsApp + 80 performance'],
          ['AED 12,000', 'pilot media budget', '8 weeks · Google + Meta'],
        ] as [string, string, string][]).map(([v, l, s]) => (
          <div key={l} className="rounded-xl border bg-white px-4 py-3" style={{ borderColor: '#D8D8CC' }}>
            <p className="text-[20px] font-bold tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{v}</p>
            <p className="text-[11px] font-medium text-[#3a4148]">{l}</p>
            <p className="text-[10px] text-[#767769]">{s}</p>
          </div>
        ))}
      </div>

      {/* six-layer system map */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The system, in six layers</h2>
        <p className="mb-3 text-[11.5px] text-[#767769]">
          Everything in the marketing system, grouped the way the knowledge graph groups it — each layer feeds the one
          below it. Green = live · amber = dev only · grey = planned · coral = open.
        </p>
        <div className="space-y-2">
          <Layer n="L1" title="Organisations" color={NAVY}>
            <Chip label="Dental Nation" note="owner" />
            <Chip label="ZAVIS" note="Marketing OS + paid ops" />
            <Chip label="W3Layouts" note="website build" />
            <Chip label="Digital 24" tone="planned" note="PR" />
            <Chip label="Azure" note="cloud" />
            <Chip label="Google" note="ads" />
            <Chip label="Meta" note="ads" />
          </Layer>
          <div className="pl-4 text-[14px]" style={{ color: BLUE }}>↓</div>
          <Layer n="L2" title="Marketing OS modules" color={BLUE}>
            <Chip label="Patient Intelligence Platform" note="segments" />
            <Chip label="Creative Studio" note="auto creatives" />
            <Chip label="Content OS" note="weekly cadence" />
            <Chip label="Programmatic SEO" note="15,348 pages" />
            <Chip label="Cloud Infrastructure" note="prod + dev" />
            <Chip label="Smile Club" tone="dev" note="dev env only" />
            <Chip label="Video Production" tone="open" note="role open" />
          </Layer>
          <div className="pl-4 text-[14px]" style={{ color: BLUE }}>↓</div>
          <Layer n="L3" title="Channels" color={MINT}>
            <Chip label="dentalnation.com" note="EN/AR" />
            <Chip label="Google Search ads" />
            <Chip label="Meta Click-to-WhatsApp" />
            <Chip label="WhatsApp broadcast" />
            <Chip label="Journal" note="long-tail" />
            <Chip label="LinkedIn" />
            <Chip label="Social / video" />
          </Layer>
          <div className="pl-4 text-[14px]" style={{ color: BLUE }}>↓</div>
          <Layer n="L4" title="Assets" color={GOLD}>
            <Chip label="80 performance segments" />
            <Chip label="25 WhatsApp segments" />
            <Chip label="10 paid landing pages" note="4 live at a time" />
            <Chip label="SEO page set (EN + AR sitemaps)" />
            <Chip label="6 signature offers" />
            <Chip label="W3Layouts backlink" note="17 links, live 5 Sep" />
            <Chip label="Digital 24 PR backlinks" tone="planned" />
            <Chip label="ZAVIS case studies" tone="planned" />
          </Layer>
          <div className="pl-4 text-[14px]" style={{ color: BLUE }}>↓</div>
          <Layer n="L5" title="Strategies → Goals" color={CORAL}>
            <Chip label="Test broadly, then concentrate" />
            <Chip label="Lead-quality feedback loop" />
            <Chip label="Off-page SEO / PR" />
            <Chip label="Bilingual EN/AR" />
            <Chip label="Concern-first architecture" />
            <Chip label="→ Lead generation" note="pilot goal" />
            <Chip label="→ Organic growth" note="long-term" />
          </Layer>
          <div className="pl-4 text-[14px]" style={{ color: BLUE }}>↓</div>
          <Layer n="L6" title="Clinics" color={NAVY}>
            <Chip label="Al Wasl" note="all pilot leads route here" />
            <Chip label="Dr Tosun" />
            <Chip label="AMC" />
          </Layer>
        </div>
      </section>

      {/* paid lead flow */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>Paid lead flow — and the loop that makes it smarter</h2>
        <p className="mb-3 text-[11.5px] text-[#767769]">
          Every paid lead follows one path; quality tags flow back so Google and Meta optimise toward better leads,
          not cheaper clicks.
        </p>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <FlowBox title="Google Search" sub="AED 6,000 · 10 landing pages" />
            <FlowBox title="Meta CTWA" sub="AED 6,000 · EN + AR native" />
            <Arrow label="click" />
            <FlowBox title="Landing page / WhatsApp chat" sub="offer-led · noindex" color={BLUE} />
            <Arrow label="call / message" />
            <FlowBox title="Al Wasl clinic" sub="all pilot routing" color={BLUE} />
            <Arrow label="worked in" />
            <FlowBox title="ZAVIS" sub="every lead tagged for quality" color={CORAL} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2" style={{ borderColor: CORAL }}>
            <span className="text-[14px]" style={{ color: CORAL }}>↩</span>
            <p className="text-[11px] text-[#3a4148]">
              <span className="font-semibold" style={{ color: CORAL }}>Feedback loop:</span> lead-quality tags return
              to Google &amp; Meta — the platforms learn what a <em>quality</em> lead looks like (real, contactable,
              in catchment, genuine treatment interest).
            </p>
          </div>
        </div>
      </section>

      {/* organic engine + SEO chart */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The organic engine</h2>
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
            <div className="flex flex-wrap items-center gap-1.5">
              <FlowBox title="Programmatic SEO" sub="15,348 pages" />
              <FlowBox title="Journal + Content OS" sub="weekly cadence" />
              <FlowBox title="Backlinks" sub="W3Layouts live · PR planned" dashed color={GOLD} />
              <Arrow />
              <FlowBox title="dentalnation.com" sub="concern-first · EN/AR" color={BLUE} />
              <Arrow />
              <FlowBox title="Organic growth" sub="long-term goal" color={CORAL} />
            </div>
            <p className="mt-3 text-[10.5px] leading-snug text-[#767769]">
              Deliberately separate from the paid cluster: paid landing pages are noindexed so the two engines never
              interfere. Known hygiene item: www vs non-www both serve the sitemap — one host should be canonical.
            </p>
          </div>
        </div>
        <div>
          <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>SEO pages by category</h2>
          <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
            {SEO_CATS.map((c) => (
              <div key={c.label} className="mb-1.5 flex items-center gap-2">
                <span className="w-[120px] shrink-0 text-[10.5px] text-[#3a4148]">{c.label}</span>
                <div className="h-3.5 flex-1 rounded-full bg-[#EEEFE1]">
                  <div className="h-3.5 rounded-full" style={{ width: `${Math.max(2, Math.round((c.n / maxSeo) * 100))}%`, backgroundColor: BLUE }} />
                </div>
                <span className="w-[52px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums" style={{ color: NAVY }}>{c.n.toLocaleString('en-US')}</span>
              </div>
            ))}
            <p className="mt-2 text-[10.5px] text-[#767769]">
              Four more categories planned (cost guides, clinical tools, educational, Arabic-localised) — counts pending.
            </p>
          </div>
        </div>
      </section>

      {/* pilot timeline */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The 8-week pilot, phase by phase</h2>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
          <div className="flex flex-wrap items-stretch gap-1.5">
            <FlowBox title="Week 1 · Research & build" sub="10 themes decided · pages built · tracking wired · no spend" />
            <Arrow />
            <FlowBox title="Weeks 2–4 · Month 1 live" sub="both channels · budget spread over 4 themes × 2 languages" />
            <Arrow />
            <FlowBox title="End W4 · Review" sub="winners keep spend · weak themes swapped" color={GOLD} />
            <Arrow />
            <FlowBox title="Weeks 5–8 · Concentrate" sub="spend on best lead producers · closing recommendation" color={BLUE} />
            <Arrow />
            <FlowBox title="Next phase" sub="measure: cost per booked patient" dashed color={CORAL} />
          </div>
        </div>
      </section>
    </div>
  );
}
