import { runChecks, DECISIONS, type CheckResult } from '@/lib/status/registry';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

/**
 * Status & Rules — admin-only. Live green/red checks (regression guard, run on
 * every load / deployment) + the decisions log (agreed rules & substantial
 * changes) so nothing is silently reverted or forgotten.
 */
export async function StatusReport() {
  const checks = await runChecks();
  const passed = checks.filter((c) => c.ok).length;
  const failed = checks.length - passed;
  const allGreen = failed === 0;

  return (
    <div className="space-y-5">
      <Card highlight={!allGreen}>
        <SectionHeader
          tag="✓"
          eyebrow="Admin · system status"
          title="Status & Rules — deployment health check"
          right={
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${allGreen ? 'bg-good/10 text-good' : 'bg-stop/10 text-stop'}`}>
              {passed}/{checks.length} green
            </span>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Every check below re-runs the real logic and data on each load — so a broken rule (like the DNW-only
            classification bug) or an empty source shows up <strong>red here before it misleads anyone</strong>. Review
            this tab after each deployment.
            {failed > 0 ? <span className="font-medium text-stop"> {failed} check(s) need attention.</span> : ' All clear.'}
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Live checks" title="Automated regression checks" />
        <div className="px-5 pb-5 pt-4">
          <ul className="divide-y divide-line">
            {checks.map((c) => (
              <CheckRow key={c.id} c={c} />
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <SectionHeader eyebrow="Decisions log" title="Agreed rules & substantial changes" />
        <div className="px-5 pb-5 pt-4">
          <div className="space-y-3">
            {DECISIONS.map((d) => (
              <div key={d.id} className="rounded-xl border border-line bg-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{d.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10.5px] font-medium text-accent">{d.area}</span>
                    <span className="text-[10.5px] text-ink-faint">agreed {d.decidedOn}</span>
                  </div>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{d.agreed}</p>
                {d.codeRef ? <p className="mt-1.5 font-mono text-[10.5px] text-ink-faint">{d.codeRef}</p> : null}
              </div>
            ))}
          </div>
          <Takeaway>
            This log is the single source of truth for the rules we agreed. Before changing any of these, check here first —
            and add a new entry when a rule or substantial behaviour changes.
          </Takeaway>
        </div>
      </Card>
    </div>
  );
}

function CheckRow({ c }: { c: CheckResult }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          c.ok ? 'bg-good/12 text-good' : 'bg-stop/12 text-stop'
        }`}
        aria-label={c.ok ? 'pass' : 'fail'}
      >
        {c.ok ? '✓' : '✕'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-ink">{c.title}</span>
          <span className="rounded-full bg-panel-2 px-1.5 py-0.5 text-[10px] text-ink-faint">{c.area}</span>
        </div>
        <p className={`mt-0.5 text-[12px] ${c.ok ? 'text-ink-soft' : 'text-stop'}`}>{c.detail}</p>
        <p className="mt-0.5 text-[11px] italic text-ink-faint">Rule: {c.rule}</p>
      </div>
    </li>
  );
}
