import { HANDOVER, pendingCount } from '@/config/handover';
import { SectionHead, SlotText, TD, TH, TableWrap } from './Primitives';

/**
 * The leave handover, rendered as a clean operating manual (spec §3–§4).
 *
 * Static narrative only — no metric bindings, no date controls. This is a
 * manual, not a metrics page, and it is read once by one person.
 *
 * Two invariants this component must preserve:
 *   - no patient PII anywhere (there is no data read at all — by construction);
 *   - no credentials: the access map names HOLDERS, never secrets.
 */
export function HandoverDoc() {
  const c = HANDOVER.cover;
  const toConfirm = pendingCount();

  return (
    <article className="report print-exact">
      {/* ── Not-for-board banner (spec §3) ── */}
      <div className="print-avoid-break mb-6 rounded-card border-l-[3px] border-l-stop border border-line bg-stop-50 px-4 py-3">
        <p className="text-[13px] font-semibold text-stop">{c.banner}</p>
        <p className="mt-0.5 text-[12px] text-ink-soft">{c.bannerWhy}</p>
      </div>

      {/* ── Cover ── */}
      <header className="border-b-2 border-accent pb-5">
        <p className="eyebrow text-accent">Dental Nation · Growth</p>
        <h1 className="mt-1 text-[27px] font-semibold leading-tight tracking-tight text-ink sm:text-[32px]">
          {c.title}
        </h1>
        <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
          <Field label="Prepared by">
            {c.author} · <SlotText slot={c.authorTitle} />
          </Field>
          <Field label="For">{c.audience}</Field>
          <Field label="Away">
            <span className="font-semibold text-ink">
              {c.awayFrom} → {c.awayTo}
            </span>
          </Field>
        </div>
        <div className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-3">
          <Field label="Back at desk">
            <span className="font-semibold text-ink">{c.returnDate}</span>
          </Field>
          <Field label="Reachable">
            <span className="block leading-snug">{c.availability}</span>
          </Field>
          <Field label="Response window">
            <SlotText slot={c.responseWindow} />
          </Field>
        </div>
        {toConfirm > 0 ? (
          <p className="no-print mt-4 inline-flex items-center gap-1.5 rounded border border-dashed border-watch/60 bg-watch-50 px-2 py-1 text-[11.5px] font-medium text-watch">
            <span aria-hidden>◇</span>
            {toConfirm} item{toConfirm === 1 ? '' : 's'} still to confirm before 5 August — every one is marked
            below.
          </p>
        ) : null}
      </header>

      {/* ── 1 · The rhythm ── */}
      <SectionHead n="1" title="How the engine runs day-to-day" note="my normal rhythm" />
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">Daily</p>
          <ol className="space-y-2.5">
            {HANDOVER.rhythm.daily.map((d, i) => (
              <li key={d.title} className="print-avoid-break flex gap-2.5">
                <span className="tnum mt-[1px] shrink-0 text-[11px] font-bold text-accent">{i + 1}.</span>
                <span className="text-[12.5px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">{d.title}</span> — {d.body}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="eyebrow mb-2">Weekly</p>
          <ul className="space-y-2">
            {HANDOVER.rhythm.weekly.map((w) => (
              <li key={w} className="print-avoid-break flex gap-2 text-[12.5px] leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full bg-accent-400" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 2 · Coverage ── */}
      <SectionHead n="2" title="Coverage while I'm away" note="one named owner per area" />
      <TableWrap>
        <table className="w-full border-collapse sm:min-w-[560px]">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>Area</th>
              <th className={TH}>Owner while away</th>
              <th className={TH}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {HANDOVER.coverage.map((row) => (
              <tr key={row.area} className="border-t border-line/70 align-top">
                <td className={`${TD} font-medium`}>{row.area}</td>
                <td className={TD}>
                  <SlotText slot={row.owner} />
                </td>
                <td className={`${TD} text-ink-soft`}>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {/* ── 3 · Decision rules ── */}
      <SectionHead n="3" title="Decision rules for campaigns" note="no judgement calls needed" />
      <div className="grid gap-5 sm:grid-cols-3">
        <RuleCard tone="neutral" title="Steady state">
          <ul className="space-y-1.5">
            {HANDOVER.decisionRules.steadyState.map((r) => (
              <li key={r} className="text-[12.5px] leading-relaxed text-ink-soft">
                {r}
              </li>
            ))}
          </ul>
        </RuleCard>
        <RuleCard tone="watch" title="The one pause rule">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">{HANDOVER.decisionRules.pauseRule.text}</p>
          <p className="mt-2">
            <SlotText slot={HANDOVER.decisionRules.pauseRule.threshold} />
          </p>
        </RuleCard>
        <RuleCard tone="stop" title="Call Fahad">
          <ul className="space-y-1.5">
            {HANDOVER.decisionRules.escalate.map((r) => (
              <li key={r} className="text-[12.5px] leading-relaxed text-ink-soft">
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] italic leading-snug text-ink-faint">
            {HANDOVER.decisionRules.escalateNote}
          </p>
        </RuleCard>
      </div>

      {/* ── 4 · Open items ── */}
      <SectionHead n="4" title="Open items — status on 5 August" />
      <div className="space-y-3">
        {HANDOVER.openItems.map((item) => (
          <div key={item.title} className="print-avoid-break rounded-card border border-line bg-card px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[13px] font-semibold text-ink">{item.title}</p>
              <p className="text-[12px]">
                <SlotText slot={item.status} />
              </p>
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{item.position}</p>
          </div>
        ))}
      </div>

      {/* ── 5 · Access map ── */}
      <SectionHead n="5" title="Access map" note="who holds what" />
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">
        Who holds access to each system. <span className="font-semibold text-ink">No credentials appear on this
        page</span> — passwords and recovery details are never written into a shared document. If access itself is
        needed while I&apos;m away, it comes from the named holder, not from here.
      </p>
      <TableWrap>
        <table className="w-full border-collapse sm:min-w-[420px]">
          <thead>
            <tr className="border-b border-accent">
              <th className={TH}>System</th>
              <th className={TH}>Access held by</th>
            </tr>
          </thead>
          <tbody>
            {HANDOVER.accessMap.map((row) => (
              <tr key={row.system} className="border-t border-line/70">
                <td className={`${TD} font-medium`}>{row.system}</td>
                <td className={TD}>
                  <SlotText slot={row.holders} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>

      {/* ── 6 · On return ── */}
      <SectionHead n="6" title={`On my return — ${HANDOVER.cover.returnDate}`} />
      <ol className="space-y-2">
        {HANDOVER.onReturn.map((r, i) => (
          <li key={r} className="print-avoid-break flex gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            <span className="tnum mt-[1px] shrink-0 text-[11px] font-bold text-accent">{i + 1}.</span>
            {r}
          </li>
        ))}
      </ol>

      <footer className="mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-[11px] text-ink-faint">
        <span>Dental Nation · Marketing &amp; Growth — Leave Handover</span>
        <span>Internal · prepared for Mr. Akbar · not for board circulation</span>
      </footer>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{children}</p>
    </div>
  );
}

function RuleCard({
  tone,
  title,
  children,
}: {
  tone: 'neutral' | 'watch' | 'stop';
  title: string;
  children: React.ReactNode;
}) {
  const border =
    tone === 'stop' ? 'border-l-stop' : tone === 'watch' ? 'border-l-watch' : 'border-l-accent';
  return (
    <div className={`print-avoid-break rounded-card border border-line border-l-[3px] ${border} bg-card px-4 py-3`}>
      <p className="mb-2 text-[12.5px] font-semibold text-ink">{title}</p>
      {children}
    </div>
  );
}
