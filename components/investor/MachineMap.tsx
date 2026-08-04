import { MACHINE, MACHINE_NARRATIVE, STAGES } from '@/config/investor-funnel';

/**
 * "The machine we built" (spec §5) — a system map, not a paragraph.
 *
 * This section carries the emotional job of the whole page: leads are not yet
 * at target, and the honest answer to that is the infrastructure. So the
 * systems are drawn as blocks plugged into the funnel stages they power — the
 * reader can see the machine is wired, not just be told it.
 *
 * The narrative underneath is quoted verbatim from the brief, including the
 * concession that volume is short. Leading with the shortfall is what makes
 * the rest of the claim believable.
 */
export function MachineMap() {
  return (
    <section id="machine" className="scroll-mt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">The machine we built</p>
      <h2 className="display mt-2 max-w-[22ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
        Six systems, live and wired to each other
      </h2>

      {/* Miniature funnel rail — the systems plug into these */}
      <div className="mt-6 overflow-x-auto print:overflow-visible">
        <div className="min-w-[640px]">
          <div className="flex items-stretch gap-[3px]">
            {STAGES.map((s, i) => (
              <div
                key={s.id}
                className="flex-1 rounded-[2px] px-2 py-1.5 text-center"
                style={{
                  background: ['#16293C', '#244260', '#315779', '#3E6B8E', '#5793A3', '#8FBAC4', '#B8873B'][i],
                }}
              >
                <span className="block text-[9px] font-semibold uppercase tracking-wide text-white/70">
                  {String(s.n).padStart(2, '0')}
                </span>
                <span className="block truncate text-[10px] font-medium text-white">{s.caption.split(',')[0]}</span>
              </div>
            ))}
          </div>

          {/* Systems, each showing which stages it feeds */}
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {MACHINE.map((m) => (
              <div key={m.name} className="rounded-card border border-dn-line bg-white px-3.5 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12.5px] font-semibold text-dn-ink">{m.name}</p>
                  <span className="shrink-0 rounded border border-dn-green/40 bg-dn-green/10 px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide text-dn-green">
                    Live
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-snug text-dn-ink/70">{m.what}</p>
                {/* The plug: which stages this system powers */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.powers.map((p) => {
                    const st = STAGES.find((s) => s.id === p)!;
                    return (
                      <span
                        key={p}
                        className="tnum rounded-[2px] px-1.5 py-[1px] text-[9px] font-bold text-white"
                        style={{
                          background: ['#16293C', '#244260', '#315779', '#3E6B8E', '#5793A3', '#8FBAC4', '#B8873B'][
                            st.n - 1
                          ],
                        }}
                        title={st.label}
                      >
                        {String(st.n).padStart(2, '0')}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <blockquote className="mt-7 border-l-[3px] border-dn-gold bg-dn-goldWash px-5 py-4">
        <p className="max-w-[76ch] text-[13.5px] leading-relaxed text-dn-ink">{MACHINE_NARRATIVE}</p>
      </blockquote>
    </section>
  );
}
