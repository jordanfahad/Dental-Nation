import { Card } from '@/components/ui/Card';
import { COMMISSION_CONTROL, getCeoIntel } from '@/lib/ops/ceoIntel';

/**
 * CEO Intelligence — Dr Luvi's Executive Intelligence layout, replicated on
 * the live reporting backbone. Same anatomy as her dashboard's CEO page
 * (navy hero + executive thesis, headline tiles, numbered priorities,
 * enterprise scorecard, branch economics, appointment execution, data
 * confidence) — but every number is a live feed or a provenance-stated
 * monthly control, refreshed with the 15-minute sync. A source that fails
 * drops its block; nothing renders as a fake zero.
 */

const SERIF = { fontFamily: 'Georgia, "Palatino Linotype", serif' } as const;
const NAVY = '#244260';

const aedM = (n: number) => `AED ${(n / 1_000_000).toFixed(2)}M`;
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct1 = (n: number) => `${n.toFixed(1)}%`;
const monthName = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-line bg-card px-4 py-3">
      <p className="text-[19px] font-semibold tabular-nums tracking-tight" style={{ ...SERIF, color: NAVY }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10.5px] leading-snug text-ink-faint">{label}</p>
    </div>
  );
}

function Priority({ n, title, stat, note }: { n: string; title: string; stat: string; note: string }) {
  return (
    <div className="flex gap-3 rounded-card border border-line bg-card p-4">
      <span className="text-[18px] font-bold tabular-nums" style={{ ...SERIF, color: '#B45F53' }}>
        {n}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-[12.5px] tabular-nums text-ink-soft">
          <span className="font-semibold" style={{ color: NAVY }}>{stat}</span> — {note}
        </p>
      </div>
    </div>
  );
}

export async function CeoIntelligence() {
  const d = await getCeoIntel();
  const fin = d.finance;
  const last = fin?.lastMonth ?? null;
  const revPace = d.pacing.revenue ? (d.pacing.revenue.actual / d.pacing.revenue.target) * 100 : null;
  const leadPace = d.pacing.leads ? (d.pacing.leads.actual / d.pacing.leads.target) * 100 : null;
  const cashConversion = last ? (COMMISSION_CONTROL.actual / last.total) * 100 : null;
  const reg = d.registry;
  const attendanceBase = reg ? reg.completed + reg.cancelled + reg.noShow : 0;

  return (
    <div className="mt-5 space-y-5">
      {/* Hero — her navy band, serif action title, executive thesis */}
      <section className="overflow-hidden rounded-card" style={{ backgroundColor: NAVY }}>
        <div className="px-6 pb-6 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#E1C96E' }}>
            CEO Intelligence · Dental Nation
          </p>
          <h2 className="mt-2 max-w-[720px] text-[26px] font-bold leading-tight text-white" style={SERIF}>
            One fact base. Four decisions that matter now.
          </h2>
          <p className="mt-2 max-w-[720px] text-[12.5px] leading-snug text-white/80">
            Clinical, financial, operational and growth signals translated into quantified management priorities —
            every figure live from the reporting backbone{d.lastSync ? `, last synced ${new Date(d.lastSync).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })} (Dubai)` : ''}.
          </p>
        </div>
      </section>

      {/* Executive thesis + headline tiles */}
      <Card>
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#5793A3' }}>
              Executive thesis
            </p>
            <p className="mt-2 text-[19px] font-semibold leading-snug" style={{ ...SERIF, color: NAVY }}>
              Demand exists; value realization is constrained by appointment leakage, collection conversion and
              plan pacing.
            </p>
            <p className="mt-2 text-[12px] leading-snug text-ink-soft">
              The priority is not more reporting — it is a weekly operating cadence that converts existing demand
              into attended, collected treatment. (Thesis per the Head of Operations&apos; Executive Intelligence
              build, restated on live figures.)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {fin ? <Tile value={aedM(fin.ytdTotal)} label="2026 clinical revenue — invoice lines, reconciled" /> : null}
            {reg ? <Tile value={int(reg.total)} label="appointments in the live registry (15-min mirror)" /> : null}
            {d.enquiries ? <Tile value={int(d.enquiries.ytd)} label="enquiries YTD — all channels, deduplicated" /> : null}
            <Tile value="—" label="procurement — not connected (Zoho authorisation pending)" />
          </div>
        </div>
      </Card>

      {/* Four priorities */}
      <div className="grid gap-3 md:grid-cols-2">
        {cashConversion != null && last ? (
          <Priority
            n="01"
            title="Close the cash-conversion gap"
            stat={`${pct1(cashConversion)} of ${monthName(last.ym)} billed collected`}
            note={`${aed(COMMISSION_CONTROL.actual)} collected vs ${aed(last.total)} billed (workbook control)`}
          />
        ) : null}
        {reg && attendanceBase > 0 ? (
          <Priority
            n="02"
            title="Recover appointment leakage"
            stat={`${pct1((reg.cancelled / attendanceBase) * 100)} of resolved bookings cancelled`}
            note={`${int(reg.cancelled)} cancelled · ${int(reg.completed)} completed · ${int(reg.noShow)} no-shows (live registry)`}
          />
        ) : null}
        {revPace != null && d.pacing.revenue ? (
          <Priority
            n="03"
            title="Re-pace revenue to plan"
            stat={`${pct1(revPace)} of the eight-month target`}
            note={`${aedM(d.pacing.revenue.actual)} achieved vs ${aedM(d.pacing.revenue.target)} phased target`}
          />
        ) : null}
        {leadPace != null && d.pacing.leads ? (
          <Priority
            n="04"
            title="Scale the lead engine"
            stat={`${pct1(leadPace)} of the phased lead target`}
            note={`${int(d.pacing.leads.actual)} enquiries vs ${int(d.pacing.leads.target)} planned — funnel or target must move`}
          />
        ) : null}
      </div>

      {/* Enterprise scorecard */}
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Enterprise scorecard</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
              <tbody>
                {fin ? (
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">Clinical revenue</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{aedM(fin.ytdTotal)}</td>
                    <td className="py-2 pl-3 text-[11px] text-ink-faint">Jan–{monthName(fin.months[fin.months.length - 1].ym).slice(0, 3)} · reconciled to Finance&apos;s workbook to the fils</td>
                  </tr>
                ) : null}
                {last ? (
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">{monthName(last.ym)} revenue</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{aed(last.total)}</td>
                    <td className="py-2 pl-3 text-[11px] text-ink-faint">{last.momPct != null ? `${last.momPct >= 0 ? '+' : ''}${pct1(last.momPct)} vs prior month` : '—'}</td>
                  </tr>
                ) : null}
                <tr className="border-b border-line/60">
                  <td className="py-2 pr-3 font-medium text-ink">{COMMISSION_CONTROL.month} collections</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{aed(COMMISSION_CONTROL.actual)}</td>
                  <td className="py-2 pl-3 text-[11px] text-ink-faint">{COMMISSION_CONTROL.doctors} doctor workbooks · payable {aed(COMMISSION_CONTROL.payable)} · formula-controlled to AED 0.02</td>
                </tr>
                {reg ? (
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">Appointment completion</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{attendanceBase > 0 ? pct1((reg.completed / attendanceBase) * 100) : '—'}</td>
                    <td className="py-2 pl-3 text-[11px] text-ink-faint">{int(reg.completed)} completed of {int(attendanceBase)} resolved — future bookings excluded</td>
                  </tr>
                ) : null}
                {d.reviews ? (
                  <tr className="border-b border-line/60">
                    <td className="py-2 pr-3 font-medium text-ink">Patient experience</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{d.reviews.avg.toFixed(1)}★</td>
                    <td className="py-2 pl-3 text-[11px] text-ink-faint">{int(d.reviews.count)} Google reviews · {pct1((d.reviews.replied / d.reviews.count) * 100)} replied</td>
                  </tr>
                ) : null}
                {d.spend ? (
                  <tr>
                    <td className="py-2 pr-3 font-medium text-ink">Paid media spend</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums" style={{ color: NAVY }}>{aed(d.spend.ytd)}</td>
                    <td className="py-2 pl-3 text-[11px] text-ink-faint">Google {aed(d.spend.google)} · Meta {aed(d.spend.meta)} — media only; agency spend with Finance</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Branch economics + appointment execution */}
      <div className="grid gap-5 lg:grid-cols-2">
        {fin ? (
          <Card>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Branch economics · {last ? monthName(last.ym) : ''}
              </p>
              <table className="mt-3 w-full border-collapse text-[12.5px]">
                <tbody>
                  {fin.clinics.map((c) => (
                    <tr key={c.label} className="border-b border-line/60">
                      <td className="py-2 pr-3 font-medium text-ink">{c.label}</td>
                      <td className="py-2 pr-3 text-right tabular-nums" style={{ color: NAVY }}>{aed(c.lastMonth)}</td>
                      <td className="py-2 pr-3 text-right text-[11px] tabular-nums text-ink-faint">
                        {c.momPct != null ? `${c.momPct >= 0 ? '+' : ''}${pct1(c.momPct)} MoM` : 'new'}
                      </td>
                      <td className="py-2 text-right text-[11px] tabular-nums text-ink-faint">{pct1(c.share * 100)} of YTD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
        {reg ? (
          <Card>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                Appointment execution — live registry
              </p>
              <table className="mt-3 w-full border-collapse text-[12.5px]">
                <tbody>
                  {(
                    [
                      ['Booked', reg.booked],
                      ['Confirmed', reg.confirmed],
                      ['Completed', reg.completed],
                      ['Cancelled', reg.cancelled],
                      ['Requested', reg.requested],
                      ['No-show', reg.noShow],
                    ] as [string, number][]
                  ).map(([label, v]) => (
                    <tr key={label} className="border-b border-line/60">
                      <td className="py-1.5 pr-3 text-ink-soft">{label}</td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums" style={{ color: NAVY }}>{int(v)}</td>
                      <td className="py-1.5 w-1/2">
                        <div className="h-2 rounded-full bg-panel">
                          <div className="h-2 rounded-full" style={{ width: `${Math.max(2, Math.round((v / Math.max(reg.total, 1)) * 100))}%`, backgroundColor: label === 'Cancelled' || label === 'No-show' ? '#B45F53' : '#5793A3' }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[10.5px] leading-snug text-ink-faint">
                Statuses from the live CRM mirror (refreshed every 15 minutes), including future bookings — unlike a
                point-in-time export, these move as the diary moves.
              </p>
            </div>
          </Card>
        ) : null}
      </div>

      {/* Data confidence */}
      <Card>
        <div className="px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Data confidence</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-faint">
                  <th className="py-1.5 pr-3 text-left font-medium">Domain</th>
                  <th className="py-1.5 pr-3 text-left font-medium">Source</th>
                  <th className="py-1.5 text-left font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-ink">Clinical revenue</td><td className="py-1.5 pr-3 text-ink-faint">Zoho invoice lines via Finance drops</td><td className="py-1.5 text-good">High — reconciled to the fils</td></tr>
                <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-ink">Collections & payroll</td><td className="py-1.5 pr-3 text-ink-faint">Monthly doctor workbooks</td><td className="py-1.5 text-good">High — formula-controlled, twice verified</td></tr>
                <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-ink">Appointments</td><td className="py-1.5 pr-3 text-ink-faint">CRM-DN live mirror</td><td className="py-1.5 text-good">High — live, 15-min cadence</td></tr>
                <tr className="border-b border-line/60"><td className="py-1.5 pr-3 text-ink">Demand & media</td><td className="py-1.5 pr-3 text-ink-faint">GA4, ad APIs, enquiry union</td><td className="py-1.5 text-good">High — live APIs</td></tr>
                <tr><td className="py-1.5 pr-3 text-ink">Procurement</td><td className="py-1.5 pr-3 text-ink-faint">Zoho Books</td><td className="py-1.5 text-watch">Not connected — authorisation with CEO &amp; Finance</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
