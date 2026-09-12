/**
 * Visual layer for the operating-model reference page. The organisation
 * chart is the centrepiece (it is how the model gets explained), followed by
 * the revenue-vs-margin tension diagram, the weekly operating cadence grid
 * and the retail → dental read-across. Pure HTML/CSS; all content from
 * content/fahad-know-how-operating-model.md.
 */

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const OLIVE = '#767769';

function OrgNode({
  title, sub, tone, wide,
}: { title: string; sub: string; tone?: 'lead' | 'commercial' | 'enabling' | 'retail'; wide?: boolean }) {
  const c =
    tone === 'lead' ? { bg: NAVY, tx: 'white', bd: NAVY }
    : tone === 'enabling' ? { bg: '#EEF4F6', tx: NAVY, bd: BLUE }
    : tone === 'retail' ? { bg: '#FDF9EC', tx: '#6d5a1d', bd: GOLD }
    : { bg: 'white', tx: NAVY, bd: NAVY };
  return (
    <div
      className={`rounded-lg border-2 px-3 py-2 ${wide ? 'text-center' : ''}`}
      style={{ backgroundColor: c.bg, borderColor: c.bd }}
    >
      <p className="text-[12px] font-bold leading-tight" style={{ color: c.tx }}>{title}</p>
      <p className="mt-0.5 text-[10px] leading-tight" style={{ color: tone === 'lead' ? '#ffffffb3' : OLIVE }}>{sub}</p>
    </div>
  );
}

function SubChip({ label }: { label: string }) {
  return (
    <span className="rounded border px-1.5 py-0.5 text-[9.5px] font-medium" style={{ borderColor: '#D8D8CC', color: OLIVE, backgroundColor: 'white' }}>
      {label}
    </span>
  );
}

export function OperatingModelVisuals() {
  return (
    <div className="space-y-7">
      {/* ── The org chart ─────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The organisation — one P&amp;L owner, eight functions, one dotted line</h2>
        <p className="mb-3 text-[11.5px] text-[#767769]">
          Everything hangs off a single P&amp;L owner. Solid boxes report to the VP; the gold block is Retail
          Operations — a dotted line to Group Retail, but inside the operating model and in the same Monday trade
          meeting.
        </p>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
          {/* VP */}
          <div className="mx-auto max-w-[340px]">
            <OrgNode title="VP, E-commerce & Omni-channel" sub="P&L owner · arbitrates between functions on the numbers" tone="lead" wide />
          </div>
          {/* connector */}
          <div className="mx-auto h-4 w-px" style={{ backgroundColor: NAVY }} />
          <div className="mx-auto h-px w-[92%]" style={{ backgroundColor: NAVY }} />
          <div className="mx-auto mb-2 grid w-[92%] grid-cols-2 gap-x-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="mx-auto h-3 w-px" style={{ backgroundColor: NAVY }} />)}
          </div>
          {/* functions */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <OrgNode title="Buying" sub="Product · brands · supplier terms" />
            <OrgNode title="Planning" sub="Stock · OTB · allocation · forecast" />
            <div>
              <OrgNode title="Marketing" sub="Owns REVENUE" />
              <div className="mt-1 flex flex-wrap gap-1"><SubChip label="Digital: paid · SEO · CRM · marketplaces" /><SubChip label="Offline: brand · PR · events · mall media" /></div>
            </div>
            <OrgNode title="Trading / Merchandising" sub="Owns MARGIN · pricing · promos · sell-through" />
            <OrgNode title="Content" sub="Studio · product data · EN/AR copy" tone="enabling" />
            <div>
              <OrgNode title="Development" sub="Platform · integrations · releases" tone="enabling" />
              <div className="mt-1 flex flex-wrap gap-1"><SubChip label="Front-end" /><SubChip label="Back-end" /><SubChip label="QA" /></div>
            </div>
            <OrgNode title="Finance" sub="One set of numbers · daily & weekly flash" tone="enabling" />
            <div className="rounded-lg border-2 border-dashed p-2" style={{ borderColor: GOLD, backgroundColor: '#FDF9EC' }}>
              <p className="text-[12px] font-bold leading-tight" style={{ color: '#6d5a1d' }}>Retail Operations</p>
              <p className="mb-1 mt-0.5 text-[9.5px] leading-tight" style={{ color: OLIVE }}>dotted line → Group Retail · co-owns omni-channel targets</p>
              <div className="flex flex-wrap gap-1">
                <SubChip label="Store Mgmt" /><SubChip label="Visual Merch" /><SubChip label="Store Fulfilment" /><SubChip label="Customer Service" /><SubChip label="Warehouse & Logistics" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The core tension ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The single most important design choice</h2>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-lg border-2 px-4 py-3 text-center" style={{ borderColor: BLUE }}>
              <p className="text-[13px] font-bold" style={{ color: NAVY }}>Marketing</p>
              <p className="text-[10.5px]" style={{ color: OLIVE }}>paid to grow <span className="font-semibold" style={{ color: BLUE }}>REVENUE</span></p>
            </div>
            <div className="text-center">
              <p className="text-[18px]" style={{ color: CORAL }}>⇄</p>
              <p className="max-w-[200px] text-[10px] leading-tight" style={{ color: OLIVE }}>
                forced to negotiate <span className="font-semibold">every promotion</span> — no promo goes live without
                a logged margin approval
              </p>
            </div>
            <div className="rounded-lg border-2 px-4 py-3 text-center" style={{ borderColor: CORAL }}>
              <p className="text-[13px] font-bold" style={{ color: NAVY }}>Trading</p>
              <p className="text-[10.5px]" style={{ color: OLIVE }}>paid to protect <span className="font-semibold" style={{ color: CORAL }}>MARGIN</span></p>
            </div>
            <div className="text-center">
              <p className="text-[14px]" style={{ color: NAVY }}>↑</p>
              <p className="max-w-[160px] text-[10px] leading-tight" style={{ color: OLIVE }}>deadlock escalates to the <span className="font-semibold">VP, decided same day</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Weekly cadence ───────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The operating cadence — fixed forums, named owners, written decisions</h2>
        <div className="grid gap-2 md:grid-cols-5">
          {([
            ['MON 10:00', 'Trade meeting', 'Trading', 'THE meeting: winners pushed, losers marked down, promos approved, dev priority set', true],
            ['TUE', 'Marketing + Content sync', 'Marketing', 'Campaign, email plan, assets, store roll-out'],
            ['WED', 'Buying + Planning review', 'Planning', 'Reorders, cancellations, transfers, markdown proposals'],
            ['THU', 'Tech stand-up · Store ops call', 'Development · Stores', 'Release go/no-go · staffing, stock moves, price compliance'],
            ['FRI 15:00', 'VP flash', 'Finance', 'One page: how the week landed vs Monday decisions'],
          ] as [string, string, string, string, boolean?][]).map(([d, f, o, x, big]) => (
            <div key={d} className="rounded-xl border-2 bg-white p-3" style={{ borderColor: big ? NAVY : '#D8D8CC' }}>
              <p className="text-[10px] font-bold tracking-wide" style={{ color: big ? CORAL : BLUE }}>{d}</p>
              <p className="text-[12px] font-semibold leading-tight" style={{ color: NAVY }}>{f}</p>
              <p className="text-[9.5px]" style={{ color: OLIVE }}>owner: {o}</p>
              <p className="mt-1 text-[10px] leading-snug" style={{ color: '#3a4148' }}>{x}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] text-[#767769]">
          Plus: daily 9:00 flash (Finance) · monthly P&amp;L and reforecast · quarterly range &amp; strategy review.
          Anything undecided in its forum reaches the VP within 24 hours with a one-page brief from each side.
        </p>
      </section>

      {/* ── Read-across ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-1 text-[15px] font-semibold" style={{ color: NAVY }}>The read-across — every retail function has a dental twin</h2>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: '#D8D8CC' }}>
          <div className="grid gap-1.5">
            {([
              ['VP E-commerce', 'CEO / COO', 'group P&L, arbitration'],
              ['Buying', 'Clinical services & doctor roster', 'treatments, specialists, lab & supplier terms'],
              ['Planning', 'Capacity & scheduling', 'chair utilisation, doctor hours vs demand, no-shows'],
              ['Marketing (digital + offline)', 'Growth', 'leads, bookings, CPA, CRM · events, corporate tie-ups, referrals'],
              ['Trading', 'Revenue management', 'plan conversion, pricing & offer governance, empty chair-hours'],
              ['Content', 'Patient education & brand', 'treatment pages, doctor profiles, bilingual content'],
              ['Development', 'Systems', 'HMS, CRM, WhatsApp automation, the reporting platform'],
              ['Finance', 'Finance', 'P&L per clinic and per doctor, one set of numbers'],
              ['Store Management', 'Clinic managers', 'clinic P&L, staffing, in-clinic conversion'],
              ['Store Fulfilment', 'Front desk / treatment coordination', 'booking → plan, follow-ups, recalls'],
              ['Customer Service', 'Patient care centre', 'calls, WhatsApp, complaints, reschedules'],
              ['Warehouse & Logistics', 'Procurement & lab logistics', 'consumables, lab turnaround, equipment'],
            ] as [string, string, string][]).map(([r, d, o]) => (
              <div key={r} className="flex flex-wrap items-center gap-2 border-b border-[#EEEFE1] pb-1.5 last:border-0">
                <span className="w-[220px] shrink-0 text-[11.5px] font-medium" style={{ color: OLIVE }}>{r}</span>
                <span style={{ color: BLUE }}>→</span>
                <span className="text-[11.5px] font-semibold" style={{ color: NAVY }}>{d}</span>
                <span className="text-[10px]" style={{ color: OLIVE }}>· {o}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
            The two transfers that matter most: separate demand generation from pricing/offer governance, and run one
            weekly trade meeting on one report.
          </p>
        </div>
      </section>
    </div>
  );
}
