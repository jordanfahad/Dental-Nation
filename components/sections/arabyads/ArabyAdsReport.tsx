import { getArabyAdsReport } from '@/lib/arabyads/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { ChartLegend, Donut, HBarChart, TOKENS, TrendChart, type BarDatum, type TrendSeries } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number) => `AED ${int(n)}`;

/**
 * Araby Ads Performance — is the campaign working? Ground truth is the on-site
 * Booking Widget's "Source" column (ArabyAds bookings by landing page +
 * publisher), paired with GA4 traffic, the all-channel enquiry trend (surge
 * detection), and a Practo clinic-side reference. Honest by construction:
 * test/seed bookings are shown separately, and any absent source renders an
 * owned data gap — never a fabricated 0.
 */
export async function ArabyAdsReport({ range }: { range: { from: string; to: string } }) {
  const r = await getArabyAdsReport(range);
  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;
  const b = r.bookings;
  const e = r.enquiries;
  const ga4 = r.ga4;

  const kpis: KpiItem[] = [
    {
      label: 'ArabyAds bookings',
      value: b.total > 0 || b.test > 0 ? int(b.total) : null,
      gapDetail: 'no ArabyAds bookings in the widget yet',
      gapOwner: ownerFor('website'),
      hint: b.test > 0 ? `${int(b.test)} test excluded` : undefined,
    },
    {
      label: 'ArabyAds revenue',
      value: b.total > 0 ? aed(b.revenue) : null,
      gapDetail: 'no priced ArabyAds bookings yet',
      gapOwner: ownerFor('website'),
    },
    {
      label: 'ArabyAds sessions (GA4)',
      value: ga4 ? int(ga4.araby.sessions) : null,
      gapDetail: 'GA4 campaign traffic not available',
      gapOwner: ownerFor('tracking'),
    },
    {
      label: 'Total enquiries',
      value: e.total > 0 ? int(e.total) : null,
      gapDetail: 'no lead-tracker rows in range',
      gapOwner: ownerFor('tracking'),
      hint: 'all channels',
    },
    {
      label: 'Appointments booked',
      value: r.practo.appointmentsBooked != null ? int(r.practo.appointmentsBooked) : null,
      gapDetail: 'no CRM appointments in range',
      gapOwner: ownerFor('clinic'),
      hint: 'Zavis CRM',
    },
    {
      label: 'Clinic revenue',
      value: r.practo.clinicRevenue != null ? aed(r.practo.clinicRevenue) : null,
      gapDetail: 'no finalized Practo bills in range',
      gapOwner: ownerFor('clinic'),
      hint: r.practo.bills != null ? `${int(r.practo.bills)} bills` : undefined,
    },
  ];

  const laneBars: BarDatum[] = b.byLane.map((x) => ({ label: x.label, value: x.value }));
  const channelBars: BarDatum[] = e.byChannel.map((x) => ({ label: x.label, value: x.value }));
  const socialBars: BarDatum[] = e.social.map((x) => ({ label: x.label, value: x.value }));
  const enqTrend = e.daily.map((d) => ({ date: d.date, enquiries: d.count }));
  const enqSeries: TrendSeries[] = [{ key: 'enquiries', label: 'Enquiries', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' }];

  return (
    <div className="space-y-5">
      {/* ── Campaign overview ── */}
      <Card>
        <SectionHeader
          tag="A"
          eyebrow="Paid campaign · Araby Ads"
          title="Araby Ads Performance"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Araby Ads drives paid traffic (utm_source=ArabyAds, medium=cpl) to three landing pages; visitors book
            through the on-site widget, which stamps the campaign into its <strong>Source</strong> column — the
            ground-truth conversion signal below.{' '}
            {r.firstSeen ? (
              <span className="text-ink-faint">First ArabyAds booking seen {dubaiDateLabel(r.firstSeen)}.</span>
            ) : (
              <span className="text-ink-faint">No ArabyAds booking seen yet.</span>
            )}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {r.lanes.map((l) => {
              const laneBookings = b.byLane.find((x) => x.label === l.label)?.value ?? 0;
              return (
                <div key={l.key} className="rounded-card border border-line bg-card p-3">
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
                    {l.laneCode} · {l.label}
                  </p>
                  <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-ink">
                    {int(laneBookings)}
                    <span className="ml-1 text-[11px] font-normal text-ink-faint">bookings</span>
                  </p>
                  <p className="mt-1.5 truncate text-[10.5px] text-ink-faint" title={l.url}>
                    /{l.url.split('/en/')[1]} · {l.campaign}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Scorecards ── */}
      <Card>
        <SectionHeader tag="A1" eyebrow="Scorecard" title="Campaign at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
          {b.test > 0 && b.total === 0 ? (
            <Takeaway>
              Only test/seed bookings so far ({int(b.test)}) — the campaign is wired end to end (widget is
              stamping the ArabyAds source), now waiting on real conversions.
            </Takeaway>
          ) : null}
        </div>
      </Card>

      {/* ── Booking conversions ── */}
      <Card>
        <SectionHeader tag="A2" eyebrow="Conversions" title="ArabyAds bookings — the money signal" />
        <div className="px-5 pb-5 pt-4">
          {b.total === 0 ? (
            <DataGapInline
              detail={b.test > 0 ? `no real ArabyAds bookings yet (${int(b.test)} test excluded)` : 'no ArabyAds bookings in the widget yet'}
              owner={ownerFor('website')}
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Bookings by landing page</p>
                <HBarChart data={laneBars} valueFormat="int" />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Top publishers (PID · SUB)</p>
                {b.byPublisher.length === 0 ? (
                  <DataGapInline detail="no publisher IDs on the bookings" owner={ownerFor('tracking')} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-line text-[10px] uppercase tracking-wide text-ink-faint">
                          <th className="py-1.5 pr-3 font-medium">PID</th>
                          <th className="py-1.5 pr-3 font-medium">SUB</th>
                          <th className="py-1.5 pr-3 font-medium">Lane</th>
                          <th className="py-1.5 pr-3 text-right font-medium">Bookings</th>
                          <th className="py-1.5 pl-3 text-right font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.byPublisher.slice(0, 8).map((p, i) => (
                          <tr key={i} className="border-b border-line/60 last:border-0">
                            <td className="py-1.5 pr-3 text-ink">{p.pid}</td>
                            <td className="py-1.5 pr-3 text-ink-soft">{p.sub}</td>
                            <td className="py-1.5 pr-3 text-ink-soft">{p.lane}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{int(p.bookings)}</td>
                            <td className="py-1.5 pl-3 text-right tabular-nums text-ink">{aed(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── GA4 traffic ── */}
      <Card>
        <SectionHeader tag="A3" eyebrow="Traffic · GA4" title="Daily traffic & where it comes from" />
        <div className="px-5 pb-5 pt-4">
          {!ga4 ? (
            <DataGapInline detail="GA4 traffic unavailable (not configured or API error)" owner={ownerFor('tracking')} />
          ) : (
            <div className="space-y-5">
              {ga4.dailyAll.length === 0 ? (
                <DataGapInline detail="no GA4 sessions in this window" owner={ownerFor('tracking')} />
              ) : (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Daily sessions (all channels) · {int(ga4.totalSessions)} total, {int(ga4.araby.sessions)} from ArabyAds
                  </p>
                  <TrendChart
                    data={ga4.dailyAll.map((d) => ({ date: d.date, sessions: d.sessions }))}
                    series={[{ key: 'sessions', label: 'Sessions', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' }]}
                    leftFormat="int"
                  />
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Traffic by channel</p>
                  {ga4.byChannel.length === 0 ? (
                    <DataGapInline detail="no channel data" owner={ownerFor('tracking')} />
                  ) : (
                    <Donut data={ga4.byChannel.map((c) => ({ label: c.channel, value: c.sessions }))} valueFormat="int" centerLabel="sessions" height={200} />
                  )}
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">ArabyAds — sessions by landing page</p>
                  {ga4.araby.byLandingPage.length === 0 ? (
                    <DataGapInline detail="no ArabyAds sessions attributed in GA4 yet" owner={ownerFor('tracking')} />
                  ) : (
                    <HBarChart data={ga4.araby.byLandingPage.slice(0, 6).map((p) => ({ label: p.page, value: p.sessions }))} valueFormat="int" accent={TOKENS.accent600} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Enquiry surge ── */}
      <Card>
        <SectionHeader tag="A4" eyebrow="Enquiries" title="Are enquiries surging? (all channels)" />
        <div className="px-5 pb-5 pt-4">
          {e.total === 0 ? (
            <DataGapInline detail="no enquiries (lead-tracker rows) in range" owner={ownerFor('tracking')} />
          ) : (
            <div className="space-y-5">
              {enqTrend.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Enquiries per day</p>
                  <TrendChart data={enqTrend} series={enqSeries} leftFormat="int" />
                </div>
              ) : null}
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">By channel</p>
                  <Donut data={channelBars} valueFormat="int" centerLabel="enquiries" height={200} />
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Social & messaging (WhatsApp · Instagram · Telegram · …)
                  </p>
                  {socialBars.length === 0 ? (
                    <DataGapInline detail="no social/messaging enquiries in range" owner={ownerFor('PAC')} />
                  ) : (
                    <HBarChart data={socialBars} valueFormat="int" accent={TOKENS.accent400} />
                  )}
                </div>
              </div>
              <Takeaway>
                Track this against the campaign start — a real lift here (especially WhatsApp / Instagram) alongside
                ArabyAds bookings is the sign the traffic is converting into enquiries, not just clicks.
              </Takeaway>
            </div>
          )}
        </div>
      </Card>

      {/* ── Recent ArabyAds bookings ── */}
      {b.recent.length > 0 ? (
        <Card>
          <SectionHeader tag="A5" eyebrow="Detail" title="Recent ArabyAds bookings" />
          <div className="px-5 pb-5 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Landing page</th>
                    <th className="py-2 pr-3 font-medium">PID</th>
                    <th className="py-2 pr-3 font-medium">SUB</th>
                    <th className="py-2 pr-3 text-right font-medium">Price</th>
                    <th className="py-2 pl-3 font-medium">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {b.recent.map((row, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">{row.date ? dubaiDateLabel(row.date) : '—'}</td>
                      <td className="py-2 pr-3 text-ink">{row.lane?.label ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{row.pid ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{row.sub ?? '—'}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{row.price != null ? aed(row.price) : '—'}</td>
                      <td className="py-2 pl-3">
                        {row.isTest ? <span className="text-[11px] text-watch">test</span> : <span className="text-[11px] text-good">real</span>}
                      </td>
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
