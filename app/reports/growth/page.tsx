import { getChannelPerformance } from '@/lib/growth/channelPerformance';
import { CHANNEL_GROUPS } from '@/config/growth-channels';
import { resolveGrowthClinic, GROWTH_CLINIC_OPTS } from '@/config/clinics';
import { WATERFALL_RULES } from '@/lib/growth/attribution';
import { dubaiDateLabel, dubaiToday } from '@/lib/dates';
import { AutoPrint } from './AutoPrint';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * ⭐ Growth Platform — the PRINT edition. A standalone, A4-designed report
 * (reached from the dashboard's Download-PDF button) rather than a screen
 * print-through: fetches ONE read layer, lays out dense consulting-style
 * pages (headline → funnel → channel P&L → how to read the numbers), and
 * keeps every bar and accent colour in the PDF via print-color-adjust. No
 * app chrome, no interactivity, no whitespace pages.
 */

const NAVY = '#1F3A5F';
const GROUP_COLOR: Record<string, string> = {
  paid: '#B45309', organic: '#1F3A5F', referral: '#2E7D32', collab: '#7C3AED', retention: '#64748B',
};
const AMBER = '#B45309';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(1)}k` : `AED ${Math.round(n)}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number | null) => (n == null ? '—' : `${Math.round(n * 100)}%`);

function Stat({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: accent ? NAVY : '#D8DCE2' }}>
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</p>
      <p className="text-[19px] font-semibold leading-tight tabular-nums text-ink">{value}</p>
      {sub ? <p className="text-[9.5px] leading-snug text-ink-faint">{sub}</p> : null}
    </div>
  );
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const w = max > 0 ? Math.max((value / max) * 100, 2) : 2;
  // The label only fits INSIDE the bar when the bar is actually wide enough.
  // Below that it sits outside in ink — otherwise a short bar with a long
  // label ("AED 41.0k") spills its white text past the fill and onto the
  // track, which is what made the old chart look broken.
  const inside = w >= 26 && label.length <= 12;
  return (
    <div className="flex items-center gap-2">
      <div className="h-[14px] min-w-0 flex-1 rounded-sm bg-[#EEF1F5]">
        <div
          className={`flex h-full items-center rounded-sm ${inside ? 'justify-end pr-1.5' : ''}`}
          style={{ width: `${w}%`, background: color }}
        >
          {inside ? (
            <span className="whitespace-nowrap text-[9px] font-semibold text-white">{label}</span>
          ) : null}
        </div>
      </div>
      {!inside ? (
        <span className="w-[62px] shrink-0 whitespace-nowrap text-[9px] font-semibold tabular-nums text-ink">
          {label}
        </span>
      ) : (
        <span className="w-[62px] shrink-0" aria-hidden />
      )}
    </div>
  );
}

function SectionTitle({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="mb-2.5 mt-6 flex items-baseline gap-2 border-b pb-1.5" style={{ borderColor: NAVY }}>
      <span className="text-[10px] font-bold tabular-nums" style={{ color: NAVY }}>{n}</span>
      <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">{title}</h2>
      {note ? <span className="ml-auto text-[9.5px] text-ink-faint">{note}</span> : null}
    </div>
  );
}

export default async function GrowthReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; gclinic?: string; print?: string }>;
}) {
  const sp = await searchParams;
  const clinic = resolveGrowthClinic(sp.gclinic);
  const perfClinic = clinic === 'amc' ? 'all' : clinic;
  const report = await getChannelPerformance({ from: sp.from, to: sp.to }, perfClinic);
  const t = report.totals;
  const ps = report.channels.find((c) => c.key === 'paid-search');
  const modelled = ps?.estEnquiries ?? 0;
  const clinicLabel = GROWTH_CLINIC_OPTS.find((o) => o.key === clinic)?.label ?? 'All clinics';
  const windowLabel = sp.from && sp.to ? `${dubaiDateLabel(sp.from)} → ${dubaiDateLabel(sp.to)}` : 'All time';
  const today = dubaiDateLabel(dubaiToday());

  const activeRows = report.channels.filter((c) => c.booked + c.enquiries + c.revenue > 0 || c.spend != null || (c.impressions ?? 0) > 0);
  const groupLabel = new Map(CHANNEL_GROUPS.map((g) => [g.key, g.label]));

  // Group rollup for funnel + revenue visuals.
  const groups = CHANNEL_GROUPS.map((g) => {
    const rows = report.channels.filter((c) => c.group === g.key);
    const sum = (f: (c: (typeof rows)[number]) => number) => rows.reduce((a, c) => a + f(c), 0);
    return {
      key: g.key, label: g.label,
      enquiries: sum((c) => c.enquiries), booked: sum((c) => c.booked), showed: sum((c) => c.showed),
      treated: sum((c) => c.treated), revenue: sum((c) => c.revenue), estRevenue: sum((c) => c.estRevenue ?? 0),
    };
  });
  const maxGroupRevenue = Math.max(...groups.map((g) => g.revenue + g.estRevenue), 1);

  // The story in one line — computed, not copy-pasted.
  const topRevenue = [...report.channels].sort((a, b) => b.revenue - a.revenue)[0];
  const headline = `${int(t.enquiries)} measured enquiries became ${int(t.booked)} bookings, ${int(t.showed)} arrivals and ${int(t.treated)} treated patients worth ${aedShort(t.revenue)}${topRevenue && topRevenue.revenue > 0 ? ` — led by ${topRevenue.label} (${aedShort(topRevenue.revenue)})` : ''}${ps?.estRoas != null ? `; Google Ads returns ≈${ps.estRoas.toFixed(1)}× including the Markov phone model` : ''}.`;

  const funnelStages = [
    { label: 'Enquiries', v: t.enquiries },
    { label: 'Booked (Practo)', v: t.booked },
    { label: 'Showed up', v: t.showed },
    { label: 'Treated (billed)', v: t.treated },
  ];
  const maxStage = Math.max(...funnelStages.map((s) => s.v), 1);

  const th = 'py-1 px-1.5 text-right text-[8.5px] font-semibold uppercase tracking-wide text-ink-faint';
  const td = 'py-[5px] px-1.5 text-right text-[10px] tabular-nums text-ink';

  return (
    <main className="print-exact mx-auto max-w-[820px] px-6 py-6 text-ink">
      {/* Screen-only chrome */}
      <div className="no-print mb-4 flex items-center justify-between rounded-card border border-line bg-panel/40 px-4 py-2.5">
        <p className="text-[12px] text-ink-soft">Print edition — laid out for A4. Use the button (choose “Save as PDF”).</p>
        <AutoPrint auto={sp.print === '1'} />
      </div>

      {/* ── Masthead ── */}
      <header className="flex items-end justify-between border-b-2 pb-3" style={{ borderColor: NAVY }}>
        <div>
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: NAVY }}>
            ⭐ Dental Nation · Growth Platform
          </p>
          <h1 className="mt-0.5 text-[21px] font-semibold tracking-tight">Channel performance — enquiry to revenue</h1>
        </div>
        <div className="text-right text-[9.5px] leading-relaxed text-ink-faint">
          <p><span className="font-medium text-ink">{windowLabel}</span></p>
          <p>{clinicLabel} · generated {today}</p>
        </div>
      </header>

      {/* ── The story in one line ── */}
      <p className="mt-3 border-l-2 pl-3 text-[11.5px] font-medium leading-relaxed" style={{ borderColor: AMBER }}>
        {headline}
      </p>

      {/* ── 1 · Headline metrics ── */}
      <SectionTitle n="1" title="Headline metrics" note="net = measured, deduped by phone, attributed" />
      <div className="grid grid-cols-5 gap-4 print-avoid-break">
        <Stat label="Net enquiries" value={int(t.enquiries)} sub={modelled > 0 ? `+≈${int(modelled)} Markov phone model` : 'all sources, deduped'} accent />
        <Stat label="Booked (Practo)" value={int(t.booked)} sub="appointments in window" />
        <Stat label="Show-up rate" value={pct(t.showRate)} sub={`${int(t.showed)} arrived`} />
        <Stat label="Treated (billed)" value={int(t.treated)} sub="distinct billed patients" />
        <Stat label="Attributed revenue" value={t.revenue > 0 ? aedShort(t.revenue) : '—'} sub={report.unattributedRevenue > 0 ? `+${aedShort(report.unattributedRevenue)} unattributed` : 'patient → channel joined'} accent />
      </div>

      {/* ── 2 · Funnel + revenue by group ── */}
      <SectionTitle n="2" title="One funnel, five channel groups" />
      <div className="grid grid-cols-2 gap-6 print-avoid-break">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">The funnel (measured)</p>
          <div className="space-y-1.5">
            {funnelStages.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="w-[92px] shrink-0 text-[9.5px] text-ink-soft">{s.label}</span>
                <div className="flex-1"><Bar value={s.v} max={maxStage} color={['#1F3A5F', '#2C5E86', '#3B82A6', '#57A0BE'][i]} label={int(s.v)} /></div>
              </div>
            ))}
          </div>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr>
                <th className="py-1 px-1.5 text-left text-[8.5px] font-semibold uppercase tracking-wide text-ink-faint">Group</th>
                <th className={th}>Enq</th><th className={th}>Booked</th><th className={th}>Showed</th><th className={th}>Treated</th>
              </tr>
            </thead>
            <tbody>
              {groups.filter((g) => g.booked + g.enquiries > 0).map((g) => (
                <tr key={g.key} className="border-t border-line/60">
                  <td className="py-[4px] px-1.5 text-[10px] text-ink">
                    <span className="mr-1.5 inline-block h-[7px] w-[7px] rounded-[2px]" style={{ background: GROUP_COLOR[g.key] }} />
                    {g.label}
                  </td>
                  <td className={td}>{int(g.enquiries)}</td><td className={td}>{int(g.booked)}</td>
                  <td className={td}>{int(g.showed)}</td><td className={td}>{int(g.treated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">Attributed revenue by group</p>
          <div className="space-y-1.5">
            {groups.map((g) => {
              const v = g.revenue + g.estRevenue;
              return (
                <div key={g.key} className="flex items-center gap-2">
                  <span className="w-[92px] shrink-0 text-[9.5px] text-ink-soft">{g.label}{g.estRevenue > 0 ? ' ≈' : ''}</span>
                  <div className="flex-1"><Bar value={v} max={maxGroupRevenue} color={GROUP_COLOR[g.key]} label={v > 0 ? aedShort(v) : '0'} /></div>
                </div>
              );
            })}
          </div>
          {report.ga4 ? (
            <p className="mt-3 rounded-sm border border-line bg-[#F6F8FA] px-2.5 py-2 text-[9.5px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">Visibility:</span> {int(report.ga4.sessions)} website sessions from{' '}
              {int(report.ga4.users)} unique visitors ({report.ga4.periodStart}–{report.ga4.periodEnd}, GA4).
              {report.organicSplit ? (
                <> Organic split: search {int(report.organicSplit.seoSessions)} · AI assistants {int(report.organicSplit.aiSessions)} · direct {int(report.organicSplit.directSessions)}.</>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── 3 · Channel P&L (page 2) ── */}
      <div className="print-break" />
      <SectionTitle n="3" title="Channel P&L — every channel, one row" note="≈ = includes the Markov-chain phone model" />
      <table className="w-full border-collapse print-avoid-break">
        <thead>
          <tr className="border-b" style={{ borderColor: NAVY }}>
            <th className="py-1 px-1.5 text-left text-[8.5px] font-semibold uppercase tracking-wide text-ink-faint">Channel</th>
            <th className={th}>Reach</th><th className={th}>Enquiries</th><th className={th}>Booked</th>
            <th className={th}>Showed</th><th className={th}>Treated</th><th className={th}>Revenue</th>
            <th className="py-1 px-1.5 text-right text-[8.5px] font-semibold uppercase tracking-wide text-ink-faint">Spend · unit costs</th>
          </tr>
        </thead>
        <tbody>
          {activeRows.map((c) => (
            <tr key={c.key} className="border-t border-line/60 align-top">
              <td className="py-[5px] px-1.5 text-[10px] leading-tight text-ink">
                <span className="mr-1 inline-block h-[7px] w-[7px] rounded-[2px]" style={{ background: GROUP_COLOR[c.group] }} />
                <span className="font-medium">{c.label}</span>
                <span className="block pl-[13px] text-[8.5px] text-ink-faint">{groupLabel.get(c.group)}</span>
              </td>
              <td className={td}>{c.impressions == null ? '—' : int(c.impressions)}</td>
              <td className={td}>{int(c.enquiries)}{c.estEnquiries ? <span style={{ color: AMBER }}> +≈{int(c.estEnquiries)}</span> : null}</td>
              <td className={`${td} font-semibold`}>{int(c.booked)}{c.estExtraBookings ? <span style={{ color: AMBER }}> +≈{int(c.estExtraBookings)}</span> : null}</td>
              <td className={td}>{int(c.showed)}{c.estShowed ? <span style={{ color: AMBER }}> +≈{int(c.estShowed)}</span> : null}</td>
              <td className={td}>{int(c.treated)}{c.estTreated ? <span style={{ color: AMBER }}> +≈{int(c.estTreated)}</span> : null}</td>
              <td className={`${td} font-semibold`}>{c.revenue > 0 ? aedShort(c.revenue) : '—'}{c.estRevenue ? <span style={{ color: AMBER }}> +≈{aedShort(c.estRevenue)}</span> : null}</td>
              <td className="py-[5px] px-1.5 text-right text-[9px] leading-snug text-ink-soft">
                {c.spend != null ? (
                  <>
                    <span className="font-semibold tabular-nums text-ink">{aedShort(c.spend)}</span>
                    <span className="block">
                      {c.key === 'paid-search' ? (
                        <>
                          {c.estCostPerEnquiry != null ? `enq ≈${aed(c.estCostPerEnquiry)}` : ''}
                          {c.estCostPerBooked != null ? ` · bkg ≈${aed(c.estCostPerBooked)}` : ''}
                          {c.estCostPerShowed != null ? ` · show ≈${aed(c.estCostPerShowed)}` : ''}
                          {c.estCostPerTreated != null ? ` · trt ≈${aed(c.estCostPerTreated)}` : ''}
                          {c.estRoas != null ? ` · ROAS ≈${c.estRoas.toFixed(1)}×` : ''}
                        </>
                      ) : (
                        <>
                          {c.costPerEnquiry != null ? `enq ${aed(c.costPerEnquiry)}` : ''}
                          {c.costPerBooked != null ? ` · bkg ${aed(c.costPerBooked)}` : ''}
                          {c.roas != null ? ` · ROAS ${c.roas.toFixed(1)}×` : ''}
                        </>
                      )}
                    </span>
                    {c.spendThrough ? <span className="block" style={{ color: AMBER }}>spend complete to {c.spendThrough} (Meta paused)</span> : null}
                  </>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[8.5px] leading-relaxed text-ink-faint">
        Unit costs: enq = cost per net enquiry (CPL) · bkg = per net booking · show = per net show · trt = per treated
        patient — spend ÷ deduped, attributed funnel counts. ≈ figures include the Markov-chain phone model.
      </p>

      {/* ── 4 · How to read the numbers ── */}
      <SectionTitle n="4" title="How the numbers are made" note="attribution · reconciliation · the phone model" />
      <div className="grid grid-cols-2 gap-6 print-avoid-break">
        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">Attribution waterfall — first match wins</p>
          <ol className="space-y-[3px]">
            {WATERFALL_RULES.map((r, i) => (
              <li key={r.id} className="flex gap-1.5 text-[9px] leading-snug text-ink-soft">
                <span className="shrink-0 font-bold tabular-nums" style={{ color: NAVY }}>{i + 1}.</span>
                <span>{r.text} <span className="font-semibold" style={{ color: r.evidence === 'tagged' ? '#2E7D32' : AMBER }}>{r.evidence === 'tagged' ? 'hard' : 'inferred'}</span></span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[9px] text-ink-soft">
            Confidence this window: <span className="font-semibold text-ink">{int(report.confidence.tagged)}</span> hard-traced ·{' '}
            <span className="font-semibold text-ink">{int(report.confidence.inferred)}</span> inferred ·{' '}
            <span className="font-semibold text-ink">{int(report.confidence.defaulted)}</span> defaulted to Direct/Walk-in.
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">One enquiry count, three lenses</p>
            <p className="text-[9.5px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{int(t.enquiries)}</span> measured &amp; deduped (the house number)
              {modelled > 0 ? (
                <> · <span className="font-semibold" style={{ color: AMBER }}>+≈{int(modelled)}</span> Markov-modelled phone
                enquiries on the Paid Search row (column sum ≈{int(t.enquiries + modelled)})</>
              ) : null}
              {report.trackerLeadRows > 0 ? (
                <> · <span className="font-semibold text-ink">{int(report.trackerLeadRows)}</span> raw lead-tracker rows
                (one source, before dedup — the Executive “Leads generated” basis)</>
              ) : null}
              . Three lenses, one reality.
            </p>
          </div>
          {report.phonePath ? (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">The Markov-chain phone model</p>
              <p className="text-[9.5px] leading-relaxed text-ink-soft">
                {int(report.phonePath.callTaps)} measured call-button taps → valid ≈{int(report.phonePath.estValidTaps)} →
                answered ≈{int(report.phonePath.estAnswered)} → patient enquiries ≈{int(report.phonePath.estPatientCalls)} →
                bookings ≈{int(report.phonePath.estBookingsReconciled)} (capped by the {int(report.phonePath.untracedPool)} untraced
                Dental Nation Al Wasl patients — the model never claims a patient another channel already owns). Transition
                rates are healthcare call-tracking benchmarks; a tracking number would replace them with measured rates.
              </p>
            </div>
          ) : null}
          {report.notes.length > 0 ? (
            <div>
              <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">Coverage notes</p>
              <ul className="space-y-[2px]">
                {report.notes.slice(0, 5).map((n) => (
                  <li key={n} className="flex gap-1.5 text-[8.5px] leading-snug text-ink-faint">
                    <span className="mt-[3px] h-[4px] w-[4px] shrink-0 rounded-full" style={{ background: AMBER }} />{n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="mt-6 flex justify-between border-t border-line pt-2 text-[8.5px] text-ink-faint">
        <span>Dental Nation · ⭐ Growth Platform · {clinicLabel}</span>
        <span>{windowLabel} · generated {today} · figures marked ≈ are modelled, all others measured</span>
      </footer>
    </main>
  );
}
