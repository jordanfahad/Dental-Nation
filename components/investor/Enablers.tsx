import { IMPACTS, toPatients, type ImpactItem } from '@/config/impact-model';

/**
 * The people and systems behind the numbers.
 *
 * The waterfall above adds up channels. This section answers the obvious next
 * question — who makes those channels hit their number — and it is where the
 * hiring case lives.
 *
 * The honest framing matters here. No plan can say "a designer produces 400
 * leads", and pretending otherwise would undermine every other figure on the
 * page. What IS true is that each role owns a body of work the plan depends
 * on, and that the volume tied to that work does not arrive if nobody does it.
 * So each card states what the role owns and what happens if it stays vacant —
 * a consequence, not a credit — and none of these numbers are added to the
 * waterfall total.
 */

const KIND_LABEL: Record<string, string> = {
  role: 'Person',
  system: 'System',
  capacity: 'Capacity',
};

export function Enablers() {
  const roles = IMPACTS.filter((i) => i.kind === 'role');
  const systems = IMPACTS.filter((i) => i.kind === 'system');
  const capacity = IMPACTS.filter((i) => i.kind === 'capacity');

  return (
    <section id="enablers" className="scroll-mt-20">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-dn-gold">Who and what makes it work</p>
      <h2 className="display mt-2 max-w-[26ch] text-[26px] leading-[1.1] text-dn-navy sm:text-[36px]">
        The channels above do not run themselves
      </h2>
      <p className="mt-3 max-w-[74ch] text-[13px] leading-relaxed text-dn-ink/75">
        Each person and system below owns a part of the plan. The figure on each card is the volume that depends on
        that work —{' '}
        <span className="font-semibold text-dn-ink">
          not extra patients on top of the waterfall, but the patients inside it that stop arriving if the job is not
          being done.
        </span>
      </p>

      <Group title="The team" subtitle="Roles the plan requires" items={roles} />
      <Group title="The systems" subtitle="Built and running" items={systems} />
      <Group title="Capacity" subtitle="Chairs to put the demand in" items={capacity} />
    </section>
  );
}

function Group({ title, subtitle, items }: { title: string; subtitle: string; items: ImpactItem[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-7">
      <div className="flex items-baseline gap-2 border-b border-dn-line pb-1.5">
        <p className="text-[13px] font-semibold text-dn-ink">{title}</p>
        <p className="text-[10.5px] text-dn-ink/45">{subtitle}</p>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.id}
            className={`rounded-card px-3.5 py-3 ${
              i.state === 'LIVE'
                ? 'border border-dn-line bg-white'
                : i.state === 'PIPELINE'
                  ? 'border-2 border-dn-navy/35 bg-white/60'
                  : 'border-2 border-dashed border-dn-grey/60 bg-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[12.5px] font-semibold leading-snug text-dn-ink">{i.name}</p>
              <span
                className={`shrink-0 whitespace-nowrap rounded px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-wide ${
                  i.state === 'LIVE'
                    ? 'border border-dn-green/40 bg-dn-green/10 text-dn-green'
                    : i.state === 'PIPELINE'
                      ? 'border border-dn-navy/40 bg-dn-navy/5 text-dn-navy'
                      : 'border border-dashed border-dn-grey text-dn-ink/55'
                }`}
              >
                {i.state === 'LIVE' ? 'In place' : i.state === 'PIPELINE' ? 'To hire / build' : 'Future'}
              </span>
            </div>
            <p className="mt-0.5 text-[9.5px] uppercase tracking-wide text-dn-ink/40">{KIND_LABEL[i.kind]}</p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-dn-ink/70">{i.what}</p>

            {i.monthlyLeads > 0 ? (
              <p className="tnum mt-2 border-t border-dn-line pt-2 text-[12px] font-bold text-dn-navy">
                Owns {Math.round(i.monthlyLeads).toLocaleString('en-US')} people asking ·{' '}
                {toPatients(i.monthlyLeads).toLocaleString('en-US')} patients / month
              </p>
            ) : (
              <p className="mt-2 border-t border-dn-line pt-2 text-[11px] font-semibold text-dn-ink/60">
                No direct lead volume — it changes how well everything else converts
              </p>
            )}
            <p className="mt-1 text-[9.5px] leading-snug text-dn-ink/45">{i.basis}</p>

            {i.ifAbsent ? (
              <p className="mt-2 rounded border-l-2 border-l-dn-amber bg-dn-amber/5 px-2 py-1.5 text-[10.5px] leading-snug text-dn-ink/70">
                <span className="font-semibold text-dn-amber">If not done: </span>
                {i.ifAbsent}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
