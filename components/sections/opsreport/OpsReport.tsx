import {
  getOpsSections,
  getOpsLastUpdated,
  payloadToFields,
  KIND_LABEL,
  SECTION_KINDS,
  type OpsSection,
} from '@/lib/ops-report';
import {
  addOpsSection,
  deleteOpsSection,
  moveOpsSection,
  saveOpsSection,
  toggleOpsSection,
} from './actions';

/**
 * The Head of Operations report — the operational-excellence narrative as a
 * live document.
 *
 * One component, two audiences: the internal tab (editable for admins and the
 * Operations Director) and the tokenised share view (read-only; `editable`
 * false, and none of the actions are imported into that tree's forms because
 * no form is rendered). Rendering is pure server-side HTML — it prints
 * cleanly and needs no client JS.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const str = (v: any): string => (typeof v === 'string' ? v : '');
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function OpsReport({
  editable,
  editorName,
  editToken,
}: {
  editable: boolean;
  editorName?: string | null;
  /** Set when editing rides on an editor share link instead of a login. */
  editToken?: string | null;
}) {
  const [sections, last] = await Promise.all([getOpsSections(editable), getOpsLastUpdated()]);

  return (
    <div className="mx-auto max-w-[980px]">
      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <header className="mb-6 border-b border-line pb-4">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          Dental Nation Group · Operations Office
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight text-ink">Head of Operations — the operating platform</h1>
        <p className="mt-1 text-[12px] text-ink-soft">
          A live document, maintained by the Operations Director.
          {last
            ? ` Last updated ${new Date(last.at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}${last.by ? ` by ${last.by}` : ''}.`
            : ''}
        </p>
        {editable ? (
          <p className="no-print mt-2 rounded-card border border-watch/50 bg-watch/5 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
            <span className="font-semibold text-ink">You are editing the live report{editorName ? `, ${editorName}` : ''}.</span>{' '}
            Every change here appears immediately on the shared read-only links. Open{' '}
            <span className="font-medium">✎ Edit</span> under any section, or add a new one at the bottom. Hidden
            sections stay here (marked) but never appear on shared links.
          </p>
        ) : null}
      </header>

      {/* ── Sections ─────────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-faint">
          No sections yet.
        </p>
      ) : (
        sections.map((s, i) => (
          <section key={s.id} className="print-avoid-break mb-6">
            {!s.visible ? (
              <p className="no-print mb-1 inline-block rounded bg-panel px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                Hidden — not shown on shared links
              </p>
            ) : null}
            <div className={s.visible ? '' : 'opacity-50'}>
              <Block s={s} />
            </div>
            {editable ? <Editor s={s} first={i === 0} last={i === sections.length - 1} editToken={editToken} /> : null}
          </section>
        ))
      )}

      {/* ── Add a section ────────────────────────────────────────────────── */}
      {editable ? (
        <div className="no-print mt-8 rounded-card border border-dashed border-line bg-panel/40 px-4 py-3">
          <p className="text-[12px] font-semibold text-ink">Add a section</p>
          <form action={addOpsSection} className="mt-2 flex flex-wrap items-center gap-2">
            {editToken ? <input type="hidden" name="edit_token" value={editToken} /> : null}
            <select
              name="kind"
              className="rounded-md border border-line bg-card px-2 py-1.5 text-[12px] text-ink"
              defaultValue="text"
            >
              {SECTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              name="title"
              placeholder="Section title"
              className="min-w-[220px] flex-1 rounded-md border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink placeholder:text-ink-ghost"
            />
            <button
              type="submit"
              className="rounded-md bg-ink px-3 py-1.5 text-[12px] font-medium text-card hover:opacity-90"
            >
              Add
            </button>
          </form>
          <p className="mt-1.5 text-[10.5px] text-ink-faint">
            The new section appears at the bottom with placeholder content — open ✎ Edit to fill it in, and use Move up
            to place it.
          </p>
        </div>
      ) : null}

      <footer className="mt-10 border-t border-line pt-3 text-[10.5px] text-ink-faint">
        Dental Nation Group · Confidential · Head of Operations report
      </footer>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── renderer ── */

function Block({ s }: { s: OpsSection }) {
  const p = s.payload;
  switch (s.kind) {
    /* ── HERO — the deck's dark cover band ──────────────────────────────── */
    case 'hero':
      return (
        <div className="overflow-hidden rounded-card bg-accent px-6 py-6 sm:px-8 sm:py-7">
          {s.title ? <h2 className="text-[21px] font-semibold leading-tight text-white sm:text-[24px]">{s.title}</h2> : null}
          {s.subtitle ? <p className="mt-1.5 max-w-[720px] text-[12.5px] leading-snug text-white/70">{s.subtitle}</p> : null}
          <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            {arr(p?.stats).map((st, i) => (
              <BigStat key={i} value={str(st?.value)} label={str(st?.label)} note={str(st?.note)} dark />
            ))}
          </div>
        </div>
      );

    /* ── STATS — gauge cards; % values get a live donut ─────────────────── */
    case 'stats':
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {arr(p?.stats).map((st, i) => (
              <div key={i} className="rounded-card border border-line bg-card px-4 py-4">
                <BigStat value={str(st?.value)} label={str(st?.label)} note={str(st?.note)} />
              </div>
            ))}
          </div>
        </div>
      );

    /* ── TABLE — navy header, zebra body, figures set as figures ────────── */
    case 'table':
      return (
        <div>
          <Heading s={s} />
          <div className="scroll-x mt-3 overflow-x-auto rounded-card border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-accent">
                  {arr(p?.headers).map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-white">
                      {str(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arr(p?.rows).map((row, ri) => (
                  <tr key={ri} className={`align-top ${ri % 2 ? 'bg-panel/60' : 'bg-card'}`}>
                    {arr(row).map((cell, ci) => (
                      <td key={ci} className={`px-3 py-2.5 text-[12px] leading-snug ${ci === 0 ? 'font-semibold text-ink' : 'text-ink-soft'}`}>
                        <FigureText text={str(cell)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {str(p?.note) ? <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">{str(p.note)}</p> : null}
        </div>
      );

    /* ── COLUMNS — numbered exhibit cards with a ghost numeral ──────────── */
    case 'columns': {
      const cols = arr(p?.columns);
      return (
        <div>
          <Heading s={s} />
          <div className={`mt-3 grid gap-3 ${cols.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : cols.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {cols.map((c, i) => (
              <div key={i} className="relative overflow-hidden rounded-card border border-line bg-card px-4 pb-3.5 pt-4">
                <span aria-hidden className="pointer-events-none absolute -top-3 right-1 select-none text-[56px] font-bold leading-none text-accent/10">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="relative pr-10 text-[13px] font-semibold leading-tight text-ink">{str(c?.title)}</p>
                {str(c?.subtitle) ? <p className="relative mt-0.5 pr-8 text-[10.5px] italic leading-snug text-ink-faint">{str(c.subtitle)}</p> : null}
                <ul className="relative mt-2.5">
                  {arr(c?.lines).map((l, li) => (
                    <li key={li} className="flex gap-2 py-[3.5px] text-[11.5px] leading-snug text-ink-soft">
                      <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent-400" />
                      <LeadText text={str(l)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ── BEFORE / AFTER — ✕ panel → arrow → ✓ panel, impact banner ─────── */
    case 'beforeafter':
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-card border border-stop/25 bg-stop-50/60 px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stop">{str(p?.beforeTitle) || 'Before'}</p>
              <ul className="mt-2">
                {arr(p?.before).map((l, i) => (
                  <li key={i} className="flex gap-2 py-[4px] text-[11.5px] leading-snug text-ink-soft">
                    <span className="mt-[1px] shrink-0 text-[11px] font-bold text-stop/70">✕</span>
                    <span>{str(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="hidden items-center lg:flex">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-accent text-[17px] font-bold text-white shadow-sm">
                →
              </span>
            </div>
            <div className="rounded-card border border-good/30 bg-good-50/70 px-4 py-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-good">{str(p?.afterTitle) || 'After'}</p>
              <ul className="mt-2">
                {arr(p?.after).map((l, i) => (
                  <li key={i} className="flex gap-2 py-[4px] text-[11.5px] leading-snug text-ink">
                    <span className="mt-[1px] shrink-0 text-[11px] font-bold text-good">✓</span>
                    <span>{str(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {str(p?.impact) ? (
            <div className="mt-2.5 flex items-start gap-2.5 rounded-card bg-accent-50 px-4 py-2.5">
              <span className="mt-[1px] text-[13px] text-accent">▸</span>
              <p className="text-[11.5px] font-medium leading-snug text-accent">{str(p.impact)}</p>
            </div>
          ) : null}
        </div>
      );

    /* ── LIST — long numbered lists become a card grid (the KPI wall) ───── */
    case 'list': {
      const items = arr(p?.items).map(str);
      const grid = Boolean(p?.numbered) && items.length >= 5;
      if (grid) {
        return (
          <div>
            <Heading s={s} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, i) => (
                <div key={i} className="relative overflow-hidden rounded-card border border-line bg-card px-4 py-3.5">
                  <span aria-hidden className="pointer-events-none absolute -top-2 right-2 select-none text-[46px] font-bold leading-none text-accent/10">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="relative pr-8">
                    <LeadText text={item} stacked />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      return (
        <div>
          <Heading s={s} />
          <ol className="mt-3 overflow-hidden rounded-card border border-line bg-card">
            {items.map((item, i) => (
              <li key={i} className={`flex items-start gap-3 px-4 py-2.5 text-[12px] leading-snug ${i % 2 ? 'bg-panel/50' : ''}`}>
                {p?.numbered ? (
                  <span className="mt-[1px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                ) : (
                  <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent-400" />
                )}
                <LeadText text={item} />
              </li>
            ))}
          </ol>
        </div>
      );
    }

    /* ── BARS — the chart, drawn like an exhibit ────────────────────────── */
    case 'bars': {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const bars = arr(p?.bars).map((b: any) => ({
        label: str(b?.label),
        value: Number(b?.value) || 0,
        note: str(b?.note),
      }));
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const unit: string = p?.unit === 'pct' ? 'pct' : p?.unit === 'plain' ? 'plain' : 'aed';
      const hasNegative = bars.some((b) => b.value < 0);
      const negSpan = hasNegative ? Math.max(...bars.map((b) => (b.value < 0 ? -b.value : 0))) : 0;
      const posSpan = Math.max(...bars.map((b) => (b.value > 0 ? b.value : 0)), hasNegative ? 1 : 0) || 1;
      const span = negSpan + posSpan || 1;
      const zeroPct = (negSpan / span) * 100;
      const maxPos = Math.max(...bars.map((b) => b.value));
      const fmtVal = (v: number): string =>
        unit === 'pct'
          ? `${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
          : unit === 'aed'
            ? `${v < 0 ? '−' : ''}AED ${Math.abs(Math.round(v)).toLocaleString('en-US')}`
            : Math.round(v).toLocaleString('en-US');
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 rounded-card border border-line bg-card px-4 py-4 sm:px-5">
            {bars.map((b, i) => {
              const widthPct = Math.max((Math.abs(b.value) / span) * 100, 1);
              const isMax = !hasNegative && b.value === maxPos && b.value > 0;
              return (
                <div key={i} className="grid grid-cols-[110px_1fr] items-center gap-x-3 gap-y-0 py-[6px] sm:grid-cols-[190px_1fr]">
                  <div className="text-[11.5px] font-semibold leading-tight text-ink">
                    {b.label}
                    {b.note ? <span className="block text-[9.5px] font-normal leading-snug text-ink-faint">{b.note}</span> : null}
                  </div>
                  <div className="relative h-[24px]">
                    {/* faint quarter grid */}
                    {[25, 50, 75].map((g) => (
                      <span key={g} aria-hidden className="absolute bottom-0 top-0 w-px bg-line/70" style={{ left: `${g}%` }} />
                    ))}
                    {hasNegative ? (
                      <span aria-hidden className="absolute bottom-[-4px] top-[-4px] w-[2px] bg-ink/40" style={{ left: `${zeroPct}%` }} />
                    ) : null}
                    <span
                      className={`absolute top-[2px] h-[20px] ${
                        b.value < 0 ? 'rounded-l-md bg-stop/80' : `rounded-r-md ${isMax ? 'bg-watch' : 'bg-accent'}`
                      }`}
                      style={
                        b.value < 0
                          ? { right: `${100 - zeroPct}%`, width: `${widthPct}%` }
                          : { left: `${zeroPct}%`, width: `${widthPct}%` }
                      }
                    >
                      {/* value rides the bar when it fits, else sits just past it */}
                      {widthPct > 34 ? (
                        <span className="absolute inset-y-0 right-1.5 flex items-center text-[10.5px] font-bold tabular-nums text-white">
                          {fmtVal(b.value)}
                        </span>
                      ) : null}
                    </span>
                    {widthPct <= 34 ? (
                      // The value sits just past the bar's tip — unless the bar
                      // ends near the container edge, in which case it flips to
                      // the bar's other side so it can never clip out of the card.
                      <span
                        className={`absolute top-0 flex h-full items-center whitespace-nowrap text-[10.5px] font-bold tabular-nums ${b.value < 0 ? 'text-stop' : 'text-ink'}`}
                        style={
                          b.value < 0
                            ? zeroPct - widthPct < 18
                              ? { left: `calc(${zeroPct}% + 6px)` }
                              : { right: `calc(${100 - zeroPct}% + ${widthPct}% + 6px)` }
                            : zeroPct + widthPct > 82
                              ? { right: `calc(${100 - zeroPct}% + 6px)` }
                              : { left: `calc(${zeroPct}% + ${widthPct}% + 6px)` }
                        }
                      >
                        {fmtVal(b.value)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {hasNegative ? (
              <p className="mt-1.5 text-[9.5px] uppercase tracking-wide text-ink-faint">
                Red = loss · blue = profit · the dark line is zero
              </p>
            ) : null}
          </div>
        </div>
      );
    }

    /* ── FLOW — the chevron journey ribbon ──────────────────────────────── */
    case 'flow': {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const steps = arr(p?.steps).map((st: any) => ({ label: str(st?.label), note: str(st?.note) }));
      const n = Math.max(steps.length, 1);
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 rounded-card border border-line bg-card px-4 py-4 sm:px-5">
            <div className="flex flex-wrap gap-y-4">
              {steps.map((st, i) => {
                const shade = NAVY_RAMP[Math.min(Math.round((i / Math.max(n - 1, 1)) * (NAVY_RAMP.length - 2)), NAVY_RAMP.length - 2)];
                return (
                  <div key={i} className="min-w-[128px] max-w-[260px] flex-1 pr-1 sm:min-w-[150px]">
                    <div
                      className="flex min-h-[44px] items-center gap-2 py-1 pl-5 pr-3 text-white"
                      style={{
                        background: shade,
                        clipPath:
                          i === 0
                            ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                            : 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)',
                      }}
                    >
                      <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-semibold leading-[1.15]">{st.label}</span>
                    </div>
                    {st.note ? <p className="mt-1.5 pl-1 pr-2 text-[10px] leading-snug text-ink-soft">{st.note}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    /* ── QUOTE — the closing band ───────────────────────────────────────── */
    case 'quote':
      return (
        <blockquote className="relative overflow-hidden rounded-card bg-accent px-6 py-7 text-center sm:px-10">
          <span aria-hidden className="pointer-events-none absolute left-3 top-[-14px] select-none text-[110px] font-serif leading-none text-white/10">
            “
          </span>
          <p className="relative text-[16px] font-medium italic leading-relaxed text-white sm:text-[18px]">
            “{str(p?.text).replace(/^[“”"\s]+|[“”"\s]+$/g, '')}”
          </p>
        </blockquote>
      );

    case 'text':
      return (
        <div>
          <Heading s={s} />
          <p className="mt-2 max-w-[820px] whitespace-pre-line text-[12.5px] leading-relaxed text-ink-soft">
            {str(p?.text)}
          </p>
        </div>
      );
  }
}

/** Sequential navy ramp for the flow chevrons — dark to pale, left to right. */
const NAVY_RAMP = ['#142842', '#1F3A5F', '#2F5480', '#4A719C', '#7C9BBE', '#A9BDD4'];

function Heading({ s }: { s: OpsSection }) {
  if (!s.title && !s.subtitle) return null;
  return (
    <div>
      {s.title ? <h2 className="text-[15.5px] font-semibold leading-tight text-ink">{s.title}</h2> : null}
      {s.subtitle ? <p className="mt-1 max-w-[840px] text-[12px] leading-snug text-ink-soft">{s.subtitle}</p> : null}
    </div>
  );
}

/**
 * A headline number. A value carrying a percentage under 100 becomes a donut
 * gauge — "13.8%" draws as a 13.8% arc — because a board reads a filled arc
 * faster than it reads a digit. Everything else is set in large type.
 */
function BigStat({ value, label, note, dark }: { value: string; label: string; note: string; dark?: boolean }) {
  const pctMatch = value.replace('−', '-').match(/(-?\d+(?:\.\d+)?)\s*%/);
  const pct = pctMatch ? Number(pctMatch[1]) : null;
  const showDonut = pct != null && pct > 0 && pct <= 100 && !value.includes('→');

  return (
    <div className="flex items-center gap-3">
      {showDonut ? <Donut pct={pct} label={value} dark={dark} /> : null}
      <div className="min-w-0">
        {!showDonut ? (
          <p className={`text-[24px] font-bold tabular-nums leading-none ${dark ? 'text-white' : 'text-ink'}`}>{value}</p>
        ) : null}
        <p className={`${showDonut ? '' : 'mt-1.5'} text-[10px] font-semibold uppercase tracking-wider ${dark ? 'text-white/60' : 'text-ink-faint'}`}>
          {label}
        </p>
        {note ? <p className={`mt-0.5 text-[10px] leading-snug ${dark ? 'text-white/50' : 'text-ink-soft'}`}>{note}</p> : null}
      </div>
    </div>
  );
}

/** SVG donut gauge — pure markup, prints exactly as it renders. */
function Donut({ pct, label, dark }: { pct: number; label: string; dark?: boolean }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(Math.max(pct, 0), 100) / 100) * c;
  return (
    <svg width="62" height="62" viewBox="0 0 62 62" role="img" aria-label={label} className="shrink-0 -rotate-90">
      <circle cx="31" cy="31" r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.18)' : '#EEF2F8'} strokeWidth="7" />
      <circle
        cx="31"
        cy="31"
        r={r}
        fill="none"
        stroke={dark ? '#D98324' : '#1F3A5F'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
      />
      <text x="31" y="31" transform="rotate(90 31 31)" textAnchor="middle" dominantBaseline="central" fontSize="12.5" fontWeight="700" fill={dark ? '#FFFFFF' : '#111111'}>
        {label.replace(/\s/g, '')}
      </text>
    </svg>
  );
}

/**
 * "Lead — rest" and "Lead: rest" split so the lead reads bold, the way a deck
 * bullets a keyword before its explanation. Falls back to plain text.
 */
function LeadText({ text, stacked }: { text: string; stacked?: boolean }) {
  const m = text.match(/^(.{2,60}?)\s*(?:—|:)\s+(.+)$/);
  if (!m) return <span className={stacked ? 'block text-[11.5px] leading-snug text-ink' : undefined}>{text}</span>;
  if (stacked) {
    return (
      <span className="block">
        <span className="block text-[12px] font-semibold leading-tight text-ink">{m[1]}</span>
        <span className="mt-1 block text-[10.5px] leading-snug text-ink-soft">{m[2]}</span>
      </span>
    );
  }
  return (
    <span>
      <span className="font-semibold text-ink">{m[1]}</span>
      <span className="text-ink-soft"> — {m[2]}</span>
    </span>
  );
}

/** Money, percentages and dashes typeset as figures inside table cells. */
function FigureText({ text }: { text: string }) {
  if (/^(≈\s*)?(−|-)?(AED\s|\d)[\d,.\s%×–—\-\/yr]*$/.test(text) && /\d/.test(text)) {
    return <span className="whitespace-nowrap font-semibold tabular-nums text-accent">{text}</span>;
  }
  return <>{text}</>;
}

/* ───────────────────────────────────────────────────────────────── editor ── */

function Editor({
  s,
  first,
  last,
  editToken,
}: {
  s: OpsSection;
  first: boolean;
  last: boolean;
  editToken?: string | null;
}) {
  const fields = payloadToFields(s.kind, s.payload);
  const tokenField = editToken ? <input type="hidden" name="edit_token" value={editToken} /> : null;
  return (
    <details className="no-print group mt-1.5 rounded-card border border-dashed border-line/80">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-1.5 text-[11px] text-ink-faint hover:text-ink">
        <span>✎ Edit</span>
        <span className="text-ink-ghost">{KIND_LABEL[s.kind]}</span>
        <span className="ml-auto hidden group-open:inline">click ✎ Edit again to close</span>
      </summary>

      <div className="border-t border-dashed border-line/80 px-3 py-3">
        <form action={saveOpsSection}>
          {tokenField}
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="kind" value={s.kind} />

          <label className="block text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Title</label>
          <input
            name="title"
            defaultValue={s.title}
            className="mt-1 w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          />
          <label className="mt-2.5 block text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
            Subtitle / intro line
          </label>
          <input
            name="subtitle"
            defaultValue={s.subtitle}
            className="mt-1 w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
          />

          {fields.map((f) => (
            <div key={f.name} className="mt-2.5">
              <label className="block text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{f.label}</label>
              {f.widget === 'area' ? (
                <textarea
                  name={f.name}
                  defaultValue={f.value}
                  rows={Math.min(Math.max(f.value.split('\n').length + 1, 3), 16)}
                  className="mt-1 w-full rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-ink"
                />
              ) : (
                <input
                  name={f.name}
                  defaultValue={f.value}
                  className="mt-1 w-full rounded-md border border-line bg-card px-2.5 py-1.5 text-[12.5px] text-ink"
                />
              )}
              {f.hint ? <p className="mt-0.5 text-[10.5px] text-ink-faint">{f.hint}</p> : null}
            </div>
          ))}

          <button
            type="submit"
            className="mt-3 rounded-md bg-ink px-3.5 py-1.5 text-[12px] font-medium text-card hover:opacity-90"
          >
            Save changes
          </button>
        </form>

        {/* Row controls — separate forms so each is one honest POST. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-2.5">
          {!first ? (
            <form action={moveOpsSection}>
              {tokenField}
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="dir" value="up" />
              <ControlButton label="↑ Move up" />
            </form>
          ) : null}
          {!last ? (
            <form action={moveOpsSection}>
              {tokenField}
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="dir" value="down" />
              <ControlButton label="↓ Move down" />
            </form>
          ) : null}
          <form action={toggleOpsSection}>
            {tokenField}
            <input type="hidden" name="id" value={s.id} />
            <ControlButton label={s.visible ? 'Hide from shared links' : 'Show on shared links'} />
          </form>
          <form action={deleteOpsSection} className="ml-auto flex items-center gap-1.5">
            {tokenField}
            <input type="hidden" name="id" value={s.id} />
            <label className="flex items-center gap-1 text-[10.5px] text-ink-faint">
              <input type="checkbox" name="confirm" className="h-3 w-3" /> confirm
            </label>
            <button
              type="submit"
              className="rounded-md border border-stop/40 px-2.5 py-1 text-[11px] font-medium text-stop hover:bg-stop/5"
            >
              Delete section
            </button>
          </form>
        </div>
      </div>
    </details>
  );
}

function ControlButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-ink-soft hover:bg-panel"
    >
      {label}
    </button>
  );
}
