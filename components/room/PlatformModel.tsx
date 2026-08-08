import { C } from '@/components/board/design';
import { ROOM } from '@/config/evidence-room';

/**
 * The platform-model exhibits from Mr Akbar's blueprint, shared between the
 * Evidence Room landing and the Operating Platform reports section:
 *
 *   A. the one-page summary,
 *   the "Evolution of the Operating Model" infographic (his design: three
 *   stepped cards, gold accents, the platform card in navy), and
 *   B. the independent-clinic vs chain vs platform comparison table.
 *
 * One component so the two pages can never drift apart.
 */

/** The image's palette — gold and warm cream from the investor deck. */
const GOLD = '#B99145';
const CREAM = '#FAF5ED';

const EVOLUTION = [
  {
    n: 1,
    title: 'Independent Clinic',
    lines: ['Local teams and decisions', 'Standalone systems', 'Growth tied to one site'],
    dark: false,
  },
  {
    n: 2,
    title: 'Clinic Chain',
    lines: ['Common ownership', 'Partial centralization', 'Location-by-location scaling'],
    dark: false,
  },
  {
    n: 3,
    title: 'Dental Nation Platform',
    lines: ['Shared operating backbone', 'Governance, data and playbooks', 'Repeatable across sites and models'],
    dark: true,
  },
] as const;

export function EvolutionInfographic() {
  return (
    <div className="rounded-lg px-4 py-5 sm:px-6" style={{ background: CREAM }}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>
        Evolution of the operating model
      </p>
      <div className="mt-3 flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
        {EVOLUTION.map((step, i) => (
          <div key={step.n} className="flex flex-1 flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <div
              className="flex-1 rounded-xl border px-5 py-5"
              style={
                step.dark
                  ? { background: C.navyDeep, borderColor: GOLD, borderWidth: 2 }
                  : { background: '#FFFFFF', borderColor: i === 0 ? C.rule : C.navyPale }
              }
            >
              <p
                className="text-[12.5px] font-bold uppercase tracking-wide"
                style={{ color: step.dark ? GOLD : C.navyDeep }}
              >
                <span className="mr-2 tabular-nums">{step.n}</span>
                {step.title}
              </p>
              <ul className="mt-3">
                {step.lines.map((l) => (
                  <li
                    key={l}
                    className="py-[3px] text-[12px] leading-snug"
                    style={{ color: step.dark ? '#FFFFFF' : C.inkSoft }}
                  >
                    {l}
                  </li>
                ))}
              </ul>
            </div>
            {i < EVOLUTION.length - 1 ? (
              <span
                aria-hidden
                className="hidden shrink-0 text-[18px] font-bold lg:block"
                style={{ color: GOLD }}
              >
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-right text-[11px] italic" style={{ color: C.inkFaint }}>
        From local capacity to a reusable operating system
      </p>
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="scroll-x overflow-x-auto rounded-lg border" style={{ borderColor: C.rule }}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr style={{ background: C.navy }}>
            {ROOM.comparisonHeaders.map((h, i) => (
              <th
                key={h}
                className={`px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-white ${i === 3 ? 'bg-white/10' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROOM.comparison.map((row, ri) => (
            <tr key={row[0]} className="align-top" style={{ background: ri % 2 ? C.panel : C.paper }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3.5 py-3 text-[11.5px] leading-snug ${ci === 0 ? 'font-semibold' : ci === 3 ? 'font-medium' : ''}`}
                  style={{
                    color: ci === 0 ? C.ink : ci === 3 ? C.navyDeep : C.inkSoft,
                    background: ci === 3 ? C.navyWash : undefined,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The full A + B block: one-page summary, why-platform, the evolution
 * infographic and the comparison table — blueprint order, blueprint labels.
 */
export function PlatformModelBlock() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-white p-5" style={{ borderColor: C.rule }}>
        <h2 className="text-[15px] font-semibold" style={{ color: C.ink }}>
          {ROOM.overviewTitle}
        </h2>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.inkFaint }}>
          A. One-page summary
        </p>
        <p className="mt-2 max-w-[880px] text-[12.5px] leading-relaxed" style={{ color: C.inkSoft }}>
          {ROOM.overview}
        </p>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.navyMid }}>
          {ROOM.whyTitle}
        </p>
        <p className="mt-1.5 max-w-[880px] text-[12.5px] leading-relaxed" style={{ color: C.inkSoft }}>
          {ROOM.why}
        </p>
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.navyMid }}>
          B. Platform model · comparison and implementation
        </p>
        <h2 className="mt-1 text-[15px] font-semibold" style={{ color: C.ink }}>
          {ROOM.comparisonTitle}
        </h2>
        <p className="mt-1 max-w-[860px] text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>
          {ROOM.comparisonSub}
        </p>
        <div className="mt-3">
          <EvolutionInfographic />
        </div>
        <div className="mt-3">
          <ComparisonTable />
        </div>
      </section>
    </div>
  );
}
