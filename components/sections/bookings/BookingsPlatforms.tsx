import type { getRangeReport } from '@/lib/report';
import { getBookingsPlatforms } from '@/lib/bookings/platforms';
import { getWidgetEnquiries } from '@/lib/bookings/widgetEnquiries';
import { WidgetEnquiriesPanel } from './WidgetEnquiriesPanel';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import {
  ChartLegend,
  Donut,
  HBarChart,
  TOKENS,
  TrendChart,
  type BarDatum,
  type TrendSeries,
} from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';
import { dubaiDateLabel } from '@/lib/dates';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

type RangeReport = Awaited<ReturnType<typeof getRangeReport>>;

/**
 * Website Bookings › Platforms — enquiries by the channel they reached us on
 * (WhatsApp, Instagram, Telegram, TikTok, Website forms, Walk-ins, ZAVIS,
 * Telephone, Facebook), from the in-house lead tracker. This is an ENQUIRY
 * population; the website booking WIDGET (a different source) lives on its own
 * sub-tab and is only shown here as a labelled aside next to Website forms —
 * the two are never summed.
 *
 * Honest by construction: the tracker is thin on funnel fields, so this leads
 * with enquiry volume / mix / trend and only surfaces qualified & booked where
 * the tracker actually carries them.
 */
export async function BookingsPlatforms({ report }: { report: RangeReport }) {
  const range = report.range;
  const widgetBookings = report.bookings.booked.value;
  const [data, widget] = await Promise.all([
    getBookingsPlatforms({ from: range.from, to: range.to, widgetBookings }),
    getWidgetEnquiries({ from: range.from, to: range.to }),
  ]);

  const period = `${dubaiDateLabel(range.from)} → ${dubaiDateLabel(range.to)}`;
  const owner = ownerFor('website');

  if (data.source === 'empty') {
    return (
      <div className="space-y-5">
        <Card>
          <SectionHeader
            tag="P"
            eyebrow="Enquiries by platform · Website Bookings"
            title="Platforms — how enquiries reach us"
            right={<span className="text-[11px] text-ink-faint">{period}</span>}
          />
          <div className="px-5 pb-5 pt-4">
            <DataGapInline detail="no lead-tracker enquiries in range" owner={owner} />
          </div>
        </Card>
        {/* Widget enquiries are a separate source — still show them + the CEO detail table. */}
        <WidgetEnquiriesPanel report={widget} period={period} />
      </div>
    );
  }

  const active = data.platforms.filter((p) => p.enquiries > 0);

  const kpis: KpiItem[] = [
    { label: 'Enquiries', value: int(data.totalEnquiries), hint: `across ${int(data.activePlatforms)} platforms` },
    {
      label: 'Top platform',
      value: data.topPlatform ? data.topPlatform.label : null,
      gapDetail: 'no platform activity',
      gapOwner: owner,
      hint: data.topPlatform ? `${int(data.topPlatform.enquiries)} enquiries` : undefined,
    },
    {
      label: 'Qualified',
      value: int(data.qualifiedTotal),
      hint: 'flagged in tracker',
    },
    {
      label: 'Website widget bookings',
      value: widgetBookings != null ? int(widgetBookings) : null,
      gapDetail: 'no widget rows in range',
      gapOwner: owner,
      hint: 'separate source',
    },
  ];

  // Mix charts (coloured per platform), active platforms only.
  const mix: BarDatum[] = active.map((p) => ({ label: p.label, value: p.enquiries, color: p.color }));

  // Trend: daily total enquiries.
  const trendData = data.byDay.map((d) => ({ date: d.date, enquiries: d.count }));
  const trendSeries: TrendSeries[] = [
    { key: 'enquiries', label: 'Enquiries', color: TOKENS.accent, kind: 'area', axis: 'left', valueFormat: 'int' },
  ];

  // Campaigns / entry points — top by enquiries, coloured by dominant platform.
  const campaignBars: BarDatum[] = data.campaigns
    .slice(0, 12)
    .map((c) => ({ label: c.name, value: c.enquiries, color: c.color, note: c.platformLabel }));

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="P"
          eyebrow="Enquiries by platform · Website Bookings"
          title="Platforms — how enquiries reach us"
          right={<span className="text-[11px] text-ink-faint">{period}</span>}
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Every enquiry from the in-house lead tracker, split by the platform it came in on. This is an{' '}
            <strong>enquiry</strong> population — distinct from the on-site booking widget (its own sub-tab),
            which is shown here only beside <em>Website forms</em> and never added into these counts.{' '}
            <span className="text-ink-faint">Period: {period}.</span>
          </p>
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P1" eyebrow="Scorecard" title="Enquiries at a glance" />
        <div className="px-5 pb-5 pt-4">
          <KpiBand items={kpis} />
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P2" eyebrow="Mix" title="Enquiries by platform" />
        <div className="px-5 pb-5 pt-4">
          {mix.length === 0 ? (
            <DataGapInline detail="no platform activity in range" owner={owner} />
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Share of enquiries</p>
                <Donut data={mix} valueFormat="int" centerLabel="enquiries" height={220} />
              </div>
              <div>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Volume by platform</p>
                <HBarChart data={mix} valueFormat="int" />
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P3" eyebrow="Daily" title="Enquiries over time" />
        <div className="px-5 pb-5 pt-4">
          {trendData.length === 0 ? (
            <DataGapInline detail="no dated enquiries to chart" owner={owner} />
          ) : (
            <>
              <TrendChart data={trendData} series={trendSeries} leftFormat="int" />
              <ChartLegend items={[{ label: 'Enquiries', color: TOKENS.accent }]} />
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader tag="P4" eyebrow="Per platform" title="Every platform, side by side" />
        <div className="px-5 pb-5 pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3 font-medium">Platform</th>
                  <th className="py-2 pr-3 text-right font-medium">Enquiries</th>
                  <th className="py-2 pr-3 text-right font-medium">Share</th>
                  <th className="py-2 pr-3 text-right font-medium">Qualified</th>
                  <th className="py-2 pr-3 text-right font-medium">Booked</th>
                  <th className="py-2 pl-3 font-medium">Last enquiry</th>
                </tr>
              </thead>
              <tbody>
                {data.platforms.map((p) => (
                  <tr key={p.key} className="border-b border-line/60 last:border-0">
                    <td className="py-2 pr-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                        <span className={p.enquiries > 0 ? 'font-medium text-ink' : 'text-ink-faint'}>{p.label}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(p.enquiries)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">
                      {p.enquiries > 0 ? pct(p.sharePct) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(p.qualified)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(p.booked)}</td>
                    <td className="py-2 pl-3 tabular-nums text-ink-soft">
                      {p.lastDate ? dubaiDateLabel(p.lastDate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {widgetBookings != null ? (
            <p className="mt-3 text-[11.5px] text-ink-faint">
              Website forms above counts lead-tracker <em>website-inquiry</em> rows; the on-site booking widget
              recorded <strong className="text-ink-soft">{int(widgetBookings)}</strong> booking
              {widgetBookings === 1 ? '' : 's'} in this window (a separate source — see the Booking widget sub-tab).
            </p>
          ) : null}
          <Takeaway>
            Telegram &amp; TikTok are listed ready at zero — the moment an enquiry is tagged to them in the
            tracker, they populate here automatically. Qualified &amp; Booked reflect only what the tracker
            records today (sparse), so read this as an enquiry-<em>volume</em> view, not a conversion funnel.
          </Takeaway>
        </div>
      </Card>

      <Card>
        <SectionHeader
          tag="P5"
          eyebrow="Entry points"
          title="Campaigns — how they got to the platform"
        />
        <div className="px-5 pb-5 pt-4">
          {data.smileAdvisor ? (
            <div className="mb-4 rounded-card border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="text-[12.5px] leading-snug text-ink">
                <strong>Talk to Smile Advisor</strong> —{' '}
                <span className="tabular-nums font-semibold">{int(data.smileAdvisor.enquiries)}</span> enquir
                {data.smileAdvisor.enquiries === 1 ? 'y' : 'ies'} (on <strong>WhatsApp</strong>).
              </p>
              <p className="mt-1 text-[11.5px] leading-snug text-ink-soft">
                This is a website → WhatsApp journey: the visitor clicked <em>“Talk to Smile Advisor”</em> on
                dentalnation.com, which opened the official Dental Nation WhatsApp, and the booking was made
                with an <strong>in-house human agent</strong>. So the platform reads <em>WhatsApp</em>, but the
                origin is the website — the campaign is what ties the two together.
              </p>
            </div>
          ) : null}
          {campaignBars.length === 0 ? (
            <DataGapInline detail="no campaign-tagged enquiries in range" owner={owner} />
          ) : (
            <>
              <HBarChart data={campaignBars} valueFormat="int" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3 font-medium">Campaign / entry point</th>
                      <th className="py-2 pr-3 font-medium">Platform</th>
                      <th className="py-2 pr-3 text-right font-medium">Enquiries</th>
                      <th className="py-2 pr-3 text-right font-medium">Qualified</th>
                      <th className="py-2 pl-3 text-right font-medium">Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => (
                      <tr key={c.name} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pr-3 font-medium text-ink">
                          {c.name}
                          {/smile\s*advisor/i.test(c.name) ? (
                            <span className="ml-1.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                              website → WhatsApp → human agent
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-2 text-ink-soft">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                            {c.platformLabel}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(c.enquiries)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(c.qualified)}</td>
                        <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{int(c.booked)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.untaggedEnquiries > 0 ? (
                <p className="mt-3 text-[11.5px] text-ink-faint">
                  {int(data.untaggedEnquiries)} enquir{data.untaggedEnquiries === 1 ? 'y has' : 'ies have'} no
                  campaign tagged in the tracker — counted in the platform totals above, not shown here.
                </p>
              ) : null}
              <Takeaway>
                The <strong>campaign</strong> is the entry point — it tells you <em>how</em> someone reached a
                platform, not just which platform. “Talk to Smile Advisor” is the on-site button that hands the
                visitor to WhatsApp for a human-agent booking; “Instagram Ads – Book my Offer” and the Ramadan /
                Eid pushes are paid/promo journeys that also land in WhatsApp. Same platform, very different
                intent.
              </Takeaway>
            </>
          )}
        </div>
      </Card>

      <Card>
        <SectionHeader
          tag="P6"
          eyebrow="Detail"
          title="Recent enquiries"
          right={<span className="text-[11px] text-ink-faint">{int(data.recent.length)} shown</span>}
        />
        <div className="px-5 pb-5 pt-4">
          {data.recent.length === 0 ? (
            <DataGapInline detail="no enquiries in range" owner={owner} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Platform</th>
                    <th className="py-2 pr-3 font-medium">Campaign / entry point</th>
                    <th className="py-2 pr-3 font-medium">Source type</th>
                    <th className="py-2 pr-3 font-medium">Offer</th>
                    <th className="py-2 pr-3 font-medium">Treatment</th>
                    <th className="py-2 pl-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 tabular-nums text-ink-soft">{r.date ? dubaiDateLabel(r.date) : '—'}</td>
                      <td className="py-2 pr-3 text-ink">{r.platformLabel}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.campaign ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.sourceType ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.offer ?? '—'}</td>
                      <td className="py-2 pr-3 text-ink-soft">{r.treatment ?? '—'}</td>
                      <td className="py-2 pl-3">
                        {r.booked ? (
                          <span className="text-[11px] text-good">booked</span>
                        ) : r.qualified ? (
                          <span className="text-[11px] text-accent">qualified</span>
                        ) : (
                          <span className="text-[11px] text-ink-faint">enquiry</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Website booking-widget enquiries — non-test, with Booked vs Failed-to-book
          status matched to ZAVIS/Practo, plus the CEO enquiry-detail table. */}
      <WidgetEnquiriesPanel report={widget} period={period} />
    </div>
  );
}
