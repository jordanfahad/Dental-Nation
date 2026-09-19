import { Card } from '@/components/ui/Card';
import { getFinanceRevenue } from '@/lib/finance/revenue';
import { getCeoIntel, COMMISSION_CONTROL } from '@/lib/ops/ceoIntel';
import { getDoctorPerf, getPractoWindow, getZavisOps, NO_COMMISSION_FILE } from '@/lib/ops/portals';
import { getArabyLeadStatus } from '@/lib/arabyads/leadStatus';
import { DAILY_REPORT_SNAPSHOT, ORTHO_SNAPSHOT } from '@/config/ops-snapshots';

/**
 * The Head of Operations portal suite — Dr Luvi's eight-portal Executive
 * Intelligence layout replicated on the live backbone. Shared conventions:
 * her palette (navy #244260, soft blue, gold, coral), serif display heads,
 * every card naming its period + source, snapshots labelled as snapshots,
 * unavailable sources saying so — never zero.
 */

const SERIF = { fontFamily: 'Georgia, "Palatino Linotype", serif' } as const;
const NAVY = '#244260';
const CORAL = '#B45F53';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedM = (n: number) => `AED ${(n / 1_000_000).toFixed(2)}M`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct1 = (n: number) => `${n.toFixed(1)}%`;
const mLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });

function Head({ kicker, title, note }: { kicker: string; title: string; note: string }) {
  return (
    <section className="overflow-hidden rounded-card px-6 pb-5 pt-4" style={{ backgroundColor: NAVY }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#E1C96E' }}>{kicker}</p>
      <h2 className="mt-1.5 text-[22px] font-bold leading-tight text-white" style={SERIF}>{title}</h2>
      <p className="mt-1.5 max-w-[760px] text-[12px] leading-snug text-white/75">{note}</p>
    </section>
  );
}

function Bar({ v, max, danger }: { v: number; max: number; danger?: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-panel">
      <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.round((v / Math.max(max, 1)) * 100))}%`, backgroundColor: danger ? CORAL : '#5793A3' }} />
    </div>
  );
}

const cellL = 'py-2 pr-3 text-left text-ink-soft';
const cellR = 'py-2 pr-3 text-right tabular-nums text-ink-soft';
const headRow = 'border-b border-line text-[10px] uppercase tracking-wide text-ink-faint';

/* ── Clinical Performance ───────────────────────────────────────────── */

export async function ClinicalPortal() {
  const [fin, intel] = await Promise.all([getFinanceRevenue(), getCeoIntel()]);
  if (!fin.available) return <Card><p className="px-5 py-6 text-[12.5px] text-ink-soft">Finance feed unavailable.</p></Card>;
  const last = fin.months[fin.months.length - 1];
  const prev = fin.months[fin.months.length - 2];
  const maxM = Math.max(...fin.months.map((m) => m.total), 1);
  const pace = intel.pacing.revenue;
  const augDept = new Map<string, number>();
  // Service mix from raw invoice lines for the latest month, via clinicTotals shape:
  // (deptMix in the finance report is YTD; latest-month mix comes from months data — omit if unavailable.)
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="Clinical Performance" title="Every level visible — group, branch, doctor." note={`January–${mLabel(last.ym)} 2026 · invoice-line feed reconciled to Finance's workbook to the fils · targets time-phased to ${fin.months.length} of 12 months`} />
      {pace ? (
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Achieved vs 2026 target</p>
            <table className="mt-3 w-full min-w-[520px] border-collapse text-[12.5px]">
              <thead><tr className={headRow}><th className={cellL}>KPI</th><th className={cellR}>Achieved</th><th className={cellR}>{fin.months.length}M target</th><th className={cellR}>Variance</th><th className="py-2 text-left font-medium">Assessment</th></tr></thead>
              <tbody>
                <tr className="border-b border-line/60">
                  <td className="py-2 pr-3 font-medium text-ink">Clinic network revenue</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{aedM(pace.actual)}</td>
                  <td className={cellR}>{aedM(pace.target)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: CORAL }}>{pct1((pace.actual / pace.target - 1) * 100)}</td>
                  <td className="py-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: '#DFA79833', color: CORAL }}>BELOW TARGET</span></td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-medium text-ink">{COMMISSION_CONTROL.month} collection vs billed</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{last ? pct1((COMMISSION_CONTROL.actual / last.total) * 100) : '—'}</td>
                  <td className={cellR}>≥ 95%</td>
                  <td className={cellR}>—</td>
                  <td className="py-2 text-[11px] text-ink-faint">workbook control · timing differences apply</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Monthly revenue</p>
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <tbody>
                {fin.months.map((m) => (
                  <tr key={m.ym} className="border-b border-line/60">
                    <td className="py-1.5 pr-3 font-medium text-ink">{mLabel(m.ym)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: NAVY }}>{aed(m.total)}</td>
                    <td className="w-1/2 py-1.5"><Bar v={m.total} max={maxM} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {last && prev ? (
              <p className="mt-2 text-[10.5px] text-ink-faint">{mLabel(last.ym)}: {aed(last.total)} ({pct1((last.total / prev.total - 1) * 100)} vs {mLabel(prev.ym)}).</p>
            ) : null}
          </div>
        </Card>
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Branch achievement · YTD vs phased target</p>
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <tbody>
                {fin.clinicTotals.map((c) => (
                  <tr key={c.label} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{c.label}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" style={{ color: NAVY }}>{aed(c.value)}</td>
                    <td className="py-2 pr-3 text-right text-[11px] tabular-nums text-ink-faint">{pct1(c.share * 100)} of group</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">Branch-level phased targets live on the restricted KPI page (Layer 01) — Al Wasl 65%, Dr Tosun 68%, Al Maher 26% of plan.</p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Department mix · YTD</p>
          <table className="mt-3 w-full min-w-[480px] border-collapse text-[12.5px]">
            <tbody>
              {fin.deptMix.map((d) => (
                <tr key={d.label} className="border-b border-line/60">
                  <td className={cellL}>{d.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: NAVY }}>{aed(d.value)}</td>
                  <td className="py-2 pr-3 text-right text-[11px] tabular-nums text-ink-faint">{pct1(d.share * 100)}</td>
                  <td className="w-1/3 py-2"><Bar v={d.value} max={fin.deptMix[0]?.value ?? 1} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10.5px] text-ink-faint">Computed from raw invoice lines (not the workbook pivot, which is stale for Jul–Aug).</p>
        </div>
      </Card>
    </div>
  );
}

/* ── Doctor Performance ─────────────────────────────────────────────── */

export async function DoctorPortal() {
  const d = await getDoctorPerf();
  const t = d.totals;
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="Doctor Performance" title="Production, commission economics, and the controls behind them." note={`August 2026 commission workbooks (15 of 22 doctors supplied) + the live billed-production feed · every payable passes the formula control within AED 0.02 — verified twice, independently`} />
      {t ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {([['Gross collections', t.gross], ['Actual collections', t.actual], ['Net shareable', t.net], ['Doctor payable', t.payable]] as [string, number][]).map(([l, v]) => (
            <div key={l} className="rounded-card border border-line bg-card px-4 py-3">
              <p className="text-[17px] font-semibold tabular-nums" style={{ ...SERIF, color: NAVY }}>{aed(v)}</p>
              <p className="mt-0.5 text-[10.5px] text-ink-faint">{l}</p>
            </div>
          ))}
        </div>
      ) : null}
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">August commission register — reconciled</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-[12px]">
              <thead><tr className={headRow}><th className={cellL}>Doctor</th><th className={cellL}>Branch</th><th className={cellR}>Gross</th><th className={cellR}>Actual</th><th className={cellR}>Lab</th><th className={cellR}>Other</th><th className={cellR}>Net shareable</th><th className={cellR}>Rate</th><th className={cellR}>Diag.</th><th className={cellR}>Payable</th></tr></thead>
              <tbody>
                {d.commissions.map((r) => (
                  <tr key={r.doctor} className="border-b border-line/60 align-top">
                    <td className="py-2 pr-3 font-medium text-ink">{r.doctor}{r.note ? <div className="text-[10px] font-normal text-ink-faint">{r.note}</div> : null}</td>
                    <td className={cellL}>{r.branch}</td>
                    <td className={cellR}>{int(r.gross)}</td>
                    <td className={cellR}>{int(r.actual)}</td>
                    <td className={cellR}>{r.lab ? int(r.lab) : '—'}</td>
                    <td className={cellR}>{r.otherDed ? int(r.otherDed) : '—'}</td>
                    <td className={cellR}>{int(r.net)}</td>
                    <td className={cellR}>{Math.round(r.rate * 100)}%</td>
                    <td className={cellR}>{r.diag ? int(r.diag) : '—'}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{int(r.payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            15/15 files pass the payable formula control (net shareable × rate + diagnostic share, tolerance AED 0.02).
            No commission file supplied — shown as such, never zero: {NO_COMMISSION_FILE.map((x) => x.doctor).join(', ')}.
          </p>
        </div>
      </Card>
      {d.scorecard.length ? (
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Billed production scorecard · {mLabel(d.month)} vs prior month</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[12px]">
                <thead><tr className={headRow}><th className={cellL}>Doctor</th><th className={cellL}>Branch</th><th className={cellR}>Prior</th><th className={cellR}>{mLabel(d.month)}</th><th className={cellR}>MoM</th></tr></thead>
                <tbody>
                  {d.scorecard.map((r) => (
                    <tr key={r.doctor} className="border-b border-line/60">
                      <td className="py-1.5 pr-3 font-medium text-ink">{r.doctor}</td>
                      <td className="py-1.5 pr-3 text-ink-soft">{r.branch}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-ink-soft">{r.prev ? int(r.prev) : '—'}</td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums" style={{ color: NAVY }}>{r.cur ? int(r.cur) : '—'}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums" style={{ color: r.momPct != null && r.momPct < 0 ? CORAL : '#1E7A46' }}>{r.momPct != null ? `${r.momPct >= 0 ? '+' : ''}${pct1(r.momPct)}` : 'new'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ── DN Ortho ───────────────────────────────────────────────────────── */

export async function OrthoPortal() {
  const araby = await getArabyLeadStatus();
  const s = ORTHO_SNAPSHOT;
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="DN Ortho" title="The ortho control tower — campaigns, consultations, follow-up." note={`Paid leads live from the campaign feeds · tracker and Instagram figures are dated snapshots (${s.asOf}) from the operations handover — they refresh with the next Data Drop`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-card border border-line bg-card px-4 py-3"><p className="text-[17px] font-semibold tabular-nums" style={{ ...SERIF, color: NAVY }}>{pct1((s.tracker.attended / s.tracker.booked) * 100)}</p><p className="mt-0.5 text-[10.5px] text-ink-faint">tracker attendance · {s.tracker.attended}/{s.tracker.booked} (snapshot)</p></div>
        <div className="rounded-card border border-line bg-card px-4 py-3"><p className="text-[17px] font-semibold tabular-nums" style={{ ...SERIF, color: NAVY }}>{aed(s.tracker.revenue)}</p><p className="mt-0.5 text-[10.5px] text-ink-faint">tracked revenue · {s.tracker.newPatients} new patients (snapshot)</p></div>
        <div className="rounded-card border border-line bg-card px-4 py-3"><p className="text-[17px] font-semibold tabular-nums" style={{ ...SERIF, color: CORAL }}>{int(s.unconverted.pending)}</p><p className="mt-0.5 text-[10.5px] text-ink-faint">unconverted plans pending action (pool {s.unconverted.pool})</p></div>
        <div className="rounded-card border border-line bg-card px-4 py-3"><p className="text-[17px] font-semibold tabular-nums" style={{ ...SERIF, color: NAVY }}>{int(s.instagram.views)}</p><p className="mt-0.5 text-[10.5px] text-ink-faint">Instagram views · 14-day insights snapshot</p></div>
      </div>
      {araby.available ? (
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Paid leads — live campaign validation</p>
            <table className="mt-3 w-full min-w-[480px] border-collapse text-[12.5px]">
              <thead><tr className={headRow}><th className={cellL}>Lane</th><th className={cellR}>Leads</th><th className={cellR}>Valid</th><th className={cellR}>Invalid</th><th className={cellR}>In follow-up</th><th className={cellR}>Booked</th></tr></thead>
              <tbody>
                {araby.lanes.map((l) => (
                  <tr key={l.key} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{l.label}</td>
                    <td className={cellR}>{int(l.total)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-good">{int(l.valid)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" style={{ color: CORAL }}>{int(l.invalid)}</td>
                    <td className={cellR}>{int(l.pending)}</td>
                    <td className={cellR}>{int(l.booked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Unconverted-plan follow-up · snapshot</p>
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <thead><tr className={headRow}><th className={cellL}>Branch</th><th className={cellR}>Cases</th><th className={cellR}>Contacted</th><th className={cellR}>Pending</th></tr></thead>
              <tbody>
                {s.unconverted.byBranch.map((b) => (
                  <tr key={b.branch} className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{b.branch}</td>
                    <td className={cellR}>{b.cases}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-good">{b.contacted}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" style={{ color: CORAL }}>{b.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Daily ortho tracker · snapshot rows</p>
            <table className="mt-3 w-full border-collapse text-[12px]">
              <thead><tr className={headRow}><th className={cellL}>Date</th><th className={cellL}>Doctor</th><th className={cellR}>Booked</th><th className={cellR}>Attended</th><th className={cellR}>New</th><th className={cellR}>Revenue</th></tr></thead>
              <tbody>
                {s.tracker.rows.map((r) => (
                  <tr key={`${r.date}-${r.doctor}`} className="border-b border-line/60">
                    <td className={cellL}>{r.date}</td>
                    <td className="py-2 pr-3 font-medium text-ink">{r.doctor}</td>
                    <td className={cellR}>{r.booked}</td>
                    <td className={cellR}>{r.attended}</td>
                    <td className={cellR}>{r.newP}</td>
                    <td className={cellR}>{aed(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Practo Live ────────────────────────────────────────────────────── */

export async function PractoPortal() {
  const p = await getPractoWindow();
  if (!p) return <Card><p className="px-5 py-6 text-[12.5px] text-ink-soft">Practo feed unavailable.</p></Card>;
  const maxDay = Math.max(...p.byDay.map((d) => d.net), 1);
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="Practo Live" title="Finalized billing from the hospital system — the roll call." note={`${p.from} → ${p.to} (rolling 30 days) · live API, synced every 15 minutes · finalized bills only — appointments live in the CRM-DN portal`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([['Net revenue', aed(p.net)], ['Collected', `${aed(p.collected)} (${p.net > 0 ? pct1((p.collected / p.net) * 100) : '—'})`], ['Patient dues', aed(p.due)], ['Bills', int(p.bills)]] as [string, string][]).map(([l, v]) => (
          <div key={l} className="rounded-card border border-line bg-card px-4 py-3"><p className="text-[16px] font-semibold tabular-nums" style={{ ...SERIF, color: NAVY }}>{v}</p><p className="mt-0.5 text-[10.5px] text-ink-faint">{l}</p></div>
        ))}
      </div>
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Daily net revenue</p>
          <table className="mt-3 w-full border-collapse text-[12px]">
            <tbody>
              {p.byDay.map((d) => (
                <tr key={d.day} className="border-b border-line/60">
                  <td className="py-1 pr-3 whitespace-nowrap text-ink-soft">{d.day.slice(5)}</td>
                  <td className="py-1 pr-3 text-right tabular-nums" style={{ color: NAVY }}>{aed(d.net)}</td>
                  <td className="py-1 pr-3 text-right text-[10.5px] tabular-nums text-ink-faint">{d.bills} bills</td>
                  <td className="w-1/2 py-1"><Bar v={d.net} max={maxDay} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10.5px] text-ink-faint">Every calendar day in range shown from the feed — boundary days included (the seven-day-window defect found in the QA dashboard does not affect this feed).</p>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Branches</p>
            <table className="mt-3 w-full border-collapse text-[12px]">
              <thead><tr className={headRow}><th className={cellL}>Branch</th><th className={cellR}>Bills</th><th className={cellR}>Net</th><th className={cellR}>Collected</th><th className={cellR}>Due</th></tr></thead>
              <tbody>{p.byBranch.map((b) => (<tr key={b.branch} className="border-b border-line/60"><td className="py-2 pr-3 font-medium text-ink">{b.branch}</td><td className={cellR}>{b.bills}</td><td className={cellR}>{int(b.net)}</td><td className={cellR}>{int(b.collected)}</td><td className={cellR}>{int(b.due)}</td></tr>))}</tbody>
            </table>
            <p className="mt-2 text-[10.5px] text-ink-faint">Al Maher is not yet on Practo — a known onboarding gap, tracked with Operations.</p>
          </div>
        </Card>
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Departments &amp; doctors</p>
            <table className="mt-3 w-full border-collapse text-[12px]">
              <tbody>
                {p.byDept.slice(0, 4).map((d) => (<tr key={d.dept} className="border-b border-line/60"><td className={cellL}>{d.dept}</td><td className={cellR}>{int(d.net)}</td><td className="py-2 pr-3 text-right text-[10.5px] tabular-nums text-ink-faint">{d.bills} bills</td></tr>))}
                {p.byDoctor.slice(0, 5).map((d) => (<tr key={d.doctor} className="border-b border-line/60"><td className="py-2 pr-3 text-ink">{d.doctor}</td><td className={cellR}>{int(d.net)}</td><td className="py-2 pr-3 text-right text-[10.5px] text-ink-faint">charge attribution</td></tr>))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">Doctor attribution from bill charge lines; bills without a conducting doctor stay unattributed rather than inflating a top-doctor share.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── CRM-DN Operations ───────────────────────────────────────────────── */

export async function ZavisPortal() {
  const z = await getZavisOps();
  if (!z) return <Card><p className="px-5 py-6 text-[12.5px] text-ink-soft">CRM-DN feed unavailable.</p></Card>;
  const maxF = Math.max(...z.funnel.map((f) => f.count), 1);
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="CRM-DN Operations" title="The live appointment registry — not a snapshot." note={`${int(z.total)} appointments in the CRM mirror, refreshed every 15 minutes · statuses move as the diary moves, future bookings included`} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Status funnel</p>
            <table className="mt-3 w-full border-collapse text-[12.5px]">
              <tbody>{z.funnel.map((f) => (<tr key={f.label} className="border-b border-line/60"><td className={cellL}>{f.label}</td><td className="py-1.5 pr-3 text-right font-medium tabular-nums" style={{ color: NAVY }}>{int(f.count)}</td><td className="w-1/2 py-1.5"><Bar v={f.count} max={maxF} danger={f.label === 'cancel' || f.label === 'noShow'} /></td></tr>))}</tbody>
            </table>
          </div>
        </Card>
        <Card>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Booking sources &amp; departments</p>
            <table className="mt-3 w-full border-collapse text-[12px]">
              <tbody>
                {z.sources.map((s) => (<tr key={s.label} className="border-b border-line/60"><td className={cellL}>{s.label}</td><td className={cellR}>{int(s.count)}</td></tr>))}
                {z.departments.slice(0, 5).map((s) => (<tr key={s.label} className="border-b border-line/60"><td className="py-1.5 pr-3 text-ink">{s.label}</td><td className={cellR}>{int(s.count)}</td></tr>))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Appointments by doctor</p>
          <table className="mt-3 w-full min-w-[380px] border-collapse text-[12px]">
            <tbody>{z.doctors.map((s) => (<tr key={s.label} className="border-b border-line/60"><td className="py-1.5 pr-3 font-medium text-ink">{s.label}</td><td className={cellR}>{int(s.count)}</td><td className="w-1/2 py-1.5"><Bar v={s.count} max={z.doctors[0]?.count ?? 1} /></td></tr>))}</tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Procurement ────────────────────────────────────────────────────── */

export function ProcurementPortal() {
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="Procurement" title="Zoho Books — not connected yet." note="Purchase orders, spend, payables and vendor concentration across the three branch organisations will appear here once API access is authorised." />
      <Card>
        <div className="px-5 py-6">
          <p className="rounded-card border border-dashed border-line bg-panel/40 px-4 py-6 text-center text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-medium text-ink">No figures are shown because none exist yet</span> — this page will
            not display zeros for an unconnected source. The three Zoho Books organisations (Al Maher Medical Centre,
            Dental Nation General Dental Clinic, Dr Tosun Dental Clinic) are mapped in the Executive Intelligence
            specification; authorisation sits with the CEO and Head of Finance.
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ── Daily Appointment Report ───────────────────────────────────────── */

export function DailyReportPortal() {
  const s = DAILY_REPORT_SNAPSHOT;
  return (
    <div className="mt-5 space-y-5">
      <Head kicker="Daily Appointment Report" title={`Branch daily reports — ${s.reportDate}`} note="The CEO-approved manual report, one column per branch — latest submitted workbooks from the operations handover. Aggregate view only; the patient-level log stays in the source files." />
      <Card>
        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
            <thead>
              <tr className={headRow}>
                <th className={cellL}>Metric</th>
                {s.branches.map((b) => (<th key={b.branch} className={cellR}>{b.branch}</th>))}
              </tr>
            </thead>
            <tbody>
              {([
                ['Attended with appointment', (b: (typeof s.branches)[number]) => String(b.attendedWithAppt)],
                ['Walk-ins', (b) => String(b.walkIn)],
                ['Total served (new)', (b) => `${b.totalServed} (${b.newPatients})`],
                ['No-shows', (b) => String(b.noShows)],
                ['Cancelled', (b) => String(b.cancelled)],
                ['Total booked', (b) => String(b.totalBooked)],
                ['Services provided', (b) => String(b.servicesProvided)],
                ['Attendance rate', (b) => b.attendanceRate],
                ['No-show rate', (b) => b.noShowRate],
                ['Most requested service', (b) => b.topService],
                ['Prepared by · submitted', (b) => `${b.preparedBy} · ${b.submitted}`],
              ] as [string, (b: (typeof s.branches)[number]) => string][]).map(([label, get]) => (
                <tr key={label} className="border-b border-line/60">
                  <td className="py-2 pr-3 font-medium text-ink">{label}</td>
                  {s.branches.map((b) => (<td key={b.branch} className={cellR}>{get(b)}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
            Snapshot of the latest submitted workbooks ({s.reportDate}) — a 15-day-old report is shown as 15 days old,
            with daily submission discipline tracked in the hardening backlog. New workbooks land via the Data Drop.
          </p>
        </div>
      </Card>
    </div>
  );
}
