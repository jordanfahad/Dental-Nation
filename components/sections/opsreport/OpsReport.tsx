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
    case 'hero':
      return (
        <div className="rounded-card border border-line bg-card px-5 py-5">
          <Heading s={s} big />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {arr(p?.stats).map((st, i) => (
              <Stat key={i} value={str(st?.value)} label={str(st?.label)} note={str(st?.note)} big />
            ))}
          </div>
        </div>
      );

    case 'stats':
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {arr(p?.stats).map((st, i) => (
              <Stat key={i} value={str(st?.value)} label={str(st?.label)} note={str(st?.note)} />
            ))}
          </div>
        </div>
      );

    case 'table':
      return (
        <div>
          <Heading s={s} />
          <div className="scroll-x mt-3 overflow-x-auto rounded-card border border-line">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-panel">
                  {arr(p?.headers).map((h, i) => (
                    <th key={i} className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">
                      {str(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arr(p?.rows).map((row, ri) => (
                  <tr key={ri} className="border-t border-line/70 align-top">
                    {arr(row).map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3 py-2 text-[12px] leading-snug ${ci === 0 ? 'font-medium text-ink' : 'text-ink-soft'}`}
                      >
                        {str(cell)}
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

    case 'columns':
      return (
        <div>
          <Heading s={s} />
          <div
            className={`mt-3 grid gap-3 ${arr(p?.columns).length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : arr(p?.columns).length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
          >
            {arr(p?.columns).map((c, i) => (
              <div key={i} className="rounded-card border border-line bg-card px-3.5 py-3">
                <p className="text-[12.5px] font-semibold text-ink">{str(c?.title)}</p>
                {str(c?.subtitle) ? <p className="mt-0.5 text-[11px] text-ink-faint">{str(c.subtitle)}</p> : null}
                <ul className="mt-2">
                  {arr(c?.lines).map((l, li) => (
                    <li key={li} className="flex gap-1.5 py-[3px] text-[11.5px] leading-snug text-ink-soft">
                      <span className="text-ink-ghost">·</span>
                      <span>{str(l)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );

    case 'beforeafter':
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-panel/50 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {str(p?.beforeTitle) || 'Before'}
              </p>
              <ul className="mt-2">
                {arr(p?.before).map((l, i) => (
                  <li key={i} className="flex gap-1.5 py-[3px] text-[11.5px] leading-snug text-ink-soft">
                    <span className="text-ink-ghost">·</span>
                    <span>{str(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-card border border-line bg-card px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {str(p?.afterTitle) || 'After'}
              </p>
              <ul className="mt-2">
                {arr(p?.after).map((l, i) => (
                  <li key={i} className="flex gap-1.5 py-[3px] text-[11.5px] leading-snug text-ink">
                    <span className="text-ink-ghost">·</span>
                    <span>{str(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {str(p?.impact) ? (
            <p className="mt-2 rounded-card border-l-2 border-accent/60 bg-panel/50 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
              {str(p.impact)}
            </p>
          ) : null}
        </div>
      );

    case 'list':
      return (
        <div>
          <Heading s={s} />
          <ol className="mt-3">
            {arr(p?.items).map((item, i) => (
              <li key={i} className="flex gap-2.5 border-t border-line/60 py-2 text-[12px] leading-snug text-ink-soft first:border-t-0">
                <span className="min-w-[18px] font-semibold tabular-nums text-ink-faint">
                  {p?.numbered ? `${i + 1}.` : '·'}
                </span>
                <span>{str(item)}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case 'bars': {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const bars = arr(p?.bars).map((b: any) => ({
        label: str(b?.label),
        value: Number(b?.value) || 0,
        note: str(b?.note),
      }));
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const unit: string = p?.unit === 'pct' ? 'pct' : p?.unit === 'plain' ? 'plain' : 'aed';
      const maxAbs = Math.max(...bars.map((b) => Math.abs(b.value)), 1);
      const hasNegative = bars.some((b) => b.value < 0);
      // With negatives the zero axis sits proportionally between the extremes.
      const negSpan = hasNegative ? Math.max(...bars.map((b) => (b.value < 0 ? -b.value : 0))) : 0;
      const posSpan = Math.max(...bars.map((b) => (b.value > 0 ? b.value : 0)), hasNegative ? 1 : maxAbs);
      const span = negSpan + posSpan || 1;
      const zeroPct = (negSpan / span) * 100;
      const fmtVal = (v: number): string =>
        unit === 'pct'
          ? `${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
          : unit === 'aed'
            ? `${v < 0 ? '−' : ''}AED ${Math.abs(Math.round(v)).toLocaleString('en-US')}`
            : Math.round(v).toLocaleString('en-US');
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 rounded-card border border-line bg-card px-4 py-3.5">
            {bars.map((b, i) => (
              <div key={i} className="flex items-center gap-3 py-[5px]">
                <span className="w-[150px] shrink-0 text-[11.5px] font-medium leading-tight text-ink sm:w-[190px]">
                  {b.label}
                  {b.note ? <span className="block text-[9.5px] font-normal text-ink-faint">{b.note}</span> : null}
                </span>
                <span className="relative h-[16px] flex-1">
                  {hasNegative ? (
                    <span className="absolute bottom-[-3px] top-[-3px] w-[1.5px] bg-ink/30" style={{ left: `${zeroPct}%` }} />
                  ) : null}
                  <span
                    className={`absolute top-0 h-full rounded-sm ${b.value < 0 ? 'bg-stop/75' : 'bg-accent'}`}
                    style={
                      b.value < 0
                        ? { right: `${100 - zeroPct}%`, width: `${Math.max((-b.value / span) * 100, 0.6)}%` }
                        : { left: `${zeroPct}%`, width: `${Math.max((b.value / span) * 100, 0.6)}%` }
                    }
                  />
                </span>
                <span className={`w-[104px] shrink-0 text-right text-[11.5px] font-semibold tabular-nums ${b.value < 0 ? 'text-stop' : 'text-ink'}`}>
                  {fmtVal(b.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'flow': {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const steps = arr(p?.steps).map((st: any) => ({ label: str(st?.label), note: str(st?.note) }));
      return (
        <div>
          <Heading s={s} />
          <div className="mt-3 flex flex-wrap items-stretch gap-y-3 rounded-card border border-line bg-card px-4 py-4">
            {steps.map((st, i) => (
              <div key={i} className="flex items-stretch">
                <div className="w-[128px] sm:w-[148px]">
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent text-[10.5px] font-bold text-white">
                    {i + 1}
                  </span>
                  <p className="mt-1.5 text-[11.5px] font-semibold leading-tight text-ink">{st.label}</p>
                  {st.note ? <p className="mt-0.5 pr-2 text-[10px] leading-snug text-ink-soft">{st.note}</p> : null}
                </div>
                {i < steps.length - 1 ? (
                  <div className="mx-1.5 flex w-[16px] items-start justify-center pt-[3px] text-[13px] text-accent-400 sm:mx-2">
                    →
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case 'quote':
      return (
        <blockquote className="rounded-card border border-line bg-panel/50 px-6 py-5 text-center">
          <p className="text-[15px] font-medium italic leading-relaxed text-ink">“{str(p?.text)}”</p>
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

function Heading({ s, big }: { s: OpsSection; big?: boolean }) {
  if (!s.title && !s.subtitle) return null;
  return (
    <div>
      {s.title ? (
        <h2 className={`${big ? 'text-[19px]' : 'text-[15px]'} font-semibold leading-tight text-ink`}>{s.title}</h2>
      ) : null}
      {s.subtitle ? <p className="mt-1 max-w-[820px] text-[12px] leading-snug text-ink-soft">{s.subtitle}</p> : null}
    </div>
  );
}

function Stat({ value, label, note, big }: { value: string; label: string; note: string; big?: boolean }) {
  return (
    <div className={big ? '' : 'rounded-card border border-line bg-card px-3.5 py-3'}>
      <p className={`${big ? 'text-[26px]' : 'text-[21px]'} font-semibold tabular-nums leading-none text-ink`}>{value}</p>
      <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      {note ? <p className="mt-1 text-[10.5px] leading-snug text-ink-soft">{note}</p> : null}
    </div>
  );
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
