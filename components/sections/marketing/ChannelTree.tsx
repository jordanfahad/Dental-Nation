import { getMarketingReport, type MktCampaign } from '@/lib/marketing/report';
import { getArabyAdsReport, type ArabyReport } from '@/lib/arabyads/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');

/**
 * Marketing channel tree — the fixed four-level hierarchy the CEO asked the
 * whole marketing view to follow:
 *
 *   Group (Online / Offline) → Channel → Partner → Campaign type
 *
 * Agencies are never channels: ArabyAds sits under Affiliates, any performance
 * agency under Performance. No data source is added or removed here — every
 * leaf re-maps a number that already exists elsewhere in the dashboard, and
 * each card names the LENS it counts in (platform / GA4 / tracker / bookings),
 * because those are distinct populations that must never be summed silently.
 */

type ChannelKey = 'performance' | 'affiliates' | 'seo' | 'social' | 'referrals' | 'direct' | 'crm';

interface ChannelDef {
  key: ChannelKey;
  label: string;
  lens: 'Platform' | 'GA4' | 'Tracker' | 'Bookings';
  leadNoun: string;
  partners: { name: string; status: 'live' | 'soon' | 'open slot' }[];
  deepDive?: { label: string; href: string };
  note: string;
}

const CHANNELS: ChannelDef[] = [
  {
    key: 'performance', label: 'Performance / Paid', lens: 'Platform', leadNoun: 'reported leads',
    partners: [{ name: 'In-house', status: 'live' }, { name: 'Performance agency', status: 'open slot' }],
    deepDive: { label: 'Google · Meta deep-dives', href: '?tab=marketing&mtab=google' },
    note: 'Meta + Google paid — spend and platform-reported conversions.',
  },
  {
    key: 'affiliates', label: 'Affiliates', lens: 'Bookings', leadNoun: 'confirmed bookings',
    partners: [{ name: 'ArabyAds', status: 'live' }, { name: 'Platformance', status: 'soon' }],
    deepDive: { label: 'Araby Ads tab', href: '?tab=arabyads' },
    note: 'Pay-per-confirmed-booking network deals; cost accrues only on results.',
  },
  {
    key: 'seo', label: 'SEO / Organic Search', lens: 'GA4', leadNoun: 'site leads',
    partners: [{ name: 'ZAVIS (in-house)', status: 'live' }],
    deepDive: { label: 'Digital & SEO tab', href: '?tab=digital' },
    note: 'GA4 site-tagged leads whose first channel was organic search.',
  },
  {
    key: 'social', label: 'Social / Organic', lens: 'GA4', leadNoun: 'site leads',
    partners: [{ name: 'In-house', status: 'live' }],
    deepDive: { label: 'Social & Local tab', href: '?tab=social' },
    note: 'GA4 leads from unpaid social; posting/engagement lives in Social & Local.',
  },
  {
    key: 'referrals', label: 'Referrals', lens: 'GA4', leadNoun: 'site leads',
    partners: [{ name: 'In-house', status: 'live' }],
    note: 'GA4 leads arriving from other sites (incl. the W3Layouts backlink).',
  },
  {
    key: 'direct', label: 'Direct', lens: 'GA4', leadNoun: 'site leads',
    partners: [{ name: 'In-house', status: 'live' }],
    note: 'GA4 leads with no attributed source — brand demand and untagged links.',
  },
  {
    key: 'crm', label: 'Email / WhatsApp', lens: 'Tracker', leadNoun: 'tracked leads',
    partners: [{ name: 'In-house (ZAVIS CRM)', status: 'live' }],
    deepDive: { label: 'CRM — Zavis tab', href: '?tab=crm' },
    note: 'In-house tracker leads logged from WhatsApp/CRM contact.',
  },
];

const OFFLINE: { label: string; note: string }[] = [
  { label: 'Events', note: 'CSR / community activations near the branches — costed per event; no reporting source connected yet.' },
  { label: 'Print / OOH', note: 'Radio and billboards stay deferred by the evidence rule; no spend, no source.' },
  { label: 'Walk-ins / Word of mouth', note: 'Captured clinically in Practo, not marketing-attributed; front-desk source codes will make this countable.' },
];

const LENS_STYLE: Record<ChannelDef['lens'], { bg: string; fg: string }> = {
  Platform: { bg: `${TOKENS.accent}14`, fg: TOKENS.accent },
  GA4: { bg: '#6D28D914', fg: '#6D28D9' },
  Tracker: { bg: `${TOKENS.good}14`, fg: TOKENS.good },
  Bookings: { bg: `${TOKENS.accent400}1F`, fg: TOKENS.accent600 },
};

function ga4For(report: Awaited<ReturnType<typeof getMarketingReport>>, re: RegExp): number | null {
  if (!report.ga4.available) return null;
  const rows = report.ga4.byChannel.filter((c) => re.test(c.channel));
  if (rows.length === 0) return 0;
  return rows.reduce((a, c) => a + c.leads, 0);
}

interface LeafNumbers {
  leads: number | null;
  spend: number | null;
  cpl: number | null;
  gap?: string;
}

function numbersFor(
  key: ChannelKey,
  mkt: Awaited<ReturnType<typeof getMarketingReport>>,
  araby: ArabyReport | null,
): LeafNumbers {
  switch (key) {
    case 'performance': {
      if (mkt.source === 'empty') return { leads: null, spend: null, cpl: null, gap: 'ad-platform data not yet synced' };
      return { leads: mkt.totals.reportedLeads, spend: mkt.totals.adSpend, cpl: mkt.totals.costPerReported };
    }
    case 'affiliates': {
      if (!araby || !araby.configured || araby.source === 'empty') return { leads: null, spend: null, cpl: null, gap: 'no ArabyAds bookings in this window' };
      const b = araby.bookings.total;
      const cost = araby.cost.windowCost;
      return { leads: b, spend: cost, cpl: b > 0 ? cost / b : null };
    }
    case 'seo': {
      const v = ga4For(mkt, /^organic search$/i);
      return { leads: v, spend: null, cpl: null, gap: mkt.ga4.note ?? 'GA4 lead lens unavailable' };
    }
    case 'social': {
      const v = ga4For(mkt, /^organic (social|video)$/i);
      return { leads: v, spend: null, cpl: null, gap: mkt.ga4.note ?? 'GA4 lead lens unavailable' };
    }
    case 'referrals': {
      const v = ga4For(mkt, /^referral$/i);
      return { leads: v, spend: null, cpl: null, gap: mkt.ga4.note ?? 'GA4 lead lens unavailable' };
    }
    case 'direct': {
      const v = ga4For(mkt, /^direct$/i);
      return { leads: v, spend: null, cpl: null, gap: mkt.ga4.note ?? 'GA4 lead lens unavailable' };
    }
    case 'crm': {
      const rows = mkt.trackedByChannel.filter((c) => /whatsapp|email|sms/i.test(c.label));
      if (rows.length === 0) return { leads: null, spend: null, cpl: null, gap: 'no WhatsApp/email rows in the tracker window' };
      return { leads: rows.reduce((a, c) => a + c.value, 0), spend: null, cpl: null };
    }
  }
}

/** The identical leaf KPI row — same fields at every level of the tree. */
function LeafKpis({ n, leadNoun }: { n: LeafNumbers; leadNoun: string }) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {[
        [leadNoun, n.leads != null ? int(n.leads) : '—'],
        ['spend', n.spend != null ? aed(n.spend) : '—'],
        ['CPL', n.cpl != null ? aed(n.cpl) : '—'],
      ].map(([l, v]) => (
        <div key={l}>
          <p className="text-[15px] font-semibold tabular-nums text-ink">{v}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-faint">{l}</p>
        </div>
      ))}
    </div>
  );
}

function PartnerChips({ partners }: { partners: ChannelDef['partners'] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {partners.map((p) => (
        <span
          key={p.name}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            p.status === 'live' ? 'bg-good/10 text-good' : p.status === 'soon' ? 'bg-watch/10 text-watch' : 'bg-line/40 text-ink-faint'
          }`}
        >
          {p.name}
          {p.status !== 'live' ? ` · ${p.status}` : ''}
        </span>
      ))}
    </div>
  );
}

const campaignType = (c: MktCampaign) => (c.platform === 'Google' ? 'Paid Search' : 'Paid Social');

function CampaignTable({ rows }: { rows: { type: string; name: string; spend: number | null; leads: number | null; cpl: number | null }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-3 font-medium">Campaign type</th>
            <th className="py-2 pr-3 font-medium">Campaign</th>
            <th className="py-2 pl-3 text-right font-medium">Spend</th>
            <th className="py-2 pl-3 text-right font-medium">Leads</th>
            <th className="py-2 pl-3 text-right font-medium">CPL</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.type}-${r.name}-${i}`} className="border-b border-line/60 last:border-0">
              <td className="py-2 pr-3 whitespace-nowrap text-ink-soft">{r.type}</td>
              <td className="py-2 pr-3 text-ink" title={r.name}><span className="block max-w-[280px] truncate">{r.name}</span></td>
              <td className="py-2 pl-3 text-right tabular-nums text-ink">{r.spend != null ? aed(r.spend) : '—'}</td>
              <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{r.leads != null ? int(r.leads) : '—'}</td>
              <td className="py-2 pl-3 text-right tabular-nums text-ink-soft">{r.cpl != null ? aed(r.cpl) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Drilldown({
  def, n, mkt, araby, rangeQs,
}: {
  def: ChannelDef; n: LeafNumbers; mkt: Awaited<ReturnType<typeof getMarketingReport>>; araby: ArabyReport | null; rangeQs: string;
}) {
  return (
    <Card>
      <SectionHeader
        tag="T3"
        eyebrow={`Drilldown · Online › ${def.label}`}
        title={`${def.label} — partners & campaign types`}
        right={
          <a href={`?tab=marketing&mtab=overview${rangeQs}`} className="text-[11.5px] font-medium text-accent hover:underline">
            ← all channels
          </a>
        }
      />
      <div className="space-y-4 px-5 pb-5 pt-4">
        {def.key === 'performance' ? (
          <>
            <PartnerBlock name="In-house" status="live">
              {mkt.topCampaigns.length === 0 ? (
                <DataGapInline detail="no campaign rows in the synced window" owner={ownerFor('spend')} />
              ) : (
                <CampaignTable
                  rows={mkt.topCampaigns.map((c) => ({ type: campaignType(c), name: c.campaign, spend: c.spend, leads: c.reportedLeads, cpl: c.costPerReported }))}
                />
              )}
              {def.deepDive ? (
                <p className="mt-2 text-[11.5px]">
                  <a href={`?tab=marketing&mtab=google${rangeQs}`} className="font-medium text-accent hover:underline">Google Ads deep-dive →</a>
                  <span className="mx-2 text-ink-faint">·</span>
                  <a href={`?tab=marketing&mtab=meta${rangeQs}`} className="font-medium text-accent hover:underline">Meta Ads deep-dive →</a>
                </p>
              ) : null}
            </PartnerBlock>
            <PartnerBlock name="Performance agency" status="open slot">
              <p className="text-[12px] leading-snug text-ink-soft">
                No external performance agency is engaged — paid runs in-house. The slot exists so agency-run
                campaigns land here (never as their own channel) if one is ever appointed.
              </p>
            </PartnerBlock>
          </>
        ) : def.key === 'affiliates' ? (
          <>
            <PartnerBlock name="ArabyAds" status="live">
              {!araby || !araby.configured || araby.source === 'empty' ? (
                <DataGapInline detail="no ArabyAds bookings in this window" owner={ownerFor('channel')} />
              ) : (
                <>
                  <CampaignTable
                    rows={araby.cost.perLane.map((l) => ({
                      type: 'Lead Gen (pay-per-booking)', name: `${l.lane} — ${l.laneCode} @ ${aed(l.rate)}/booking`,
                      spend: l.cost, leads: l.bookings, cpl: l.bookings > 0 ? l.cost / l.bookings : null,
                    }))}
                  />
                  <p className="mt-2 text-[11.5px] text-ink-soft">
                    Budget cap {aed(araby.cost.budgetCap)} · used to date {aed(araby.cost.toDateCost)} ·{' '}
                    <a href="?tab=arabyads" className="font-medium text-accent hover:underline">full Araby Ads tab →</a>
                  </p>
                </>
              )}
            </PartnerBlock>
            <PartnerBlock name="Platformance" status="soon">
              <p className="text-[12px] leading-snug text-ink-soft">
                Coming soon — placeholder until the partnership goes live. It will report here, under
                Affiliates, with the same leaf card as every other partner.
              </p>
            </PartnerBlock>
          </>
        ) : def.key === 'crm' ? (
          <PartnerBlock name="In-house (ZAVIS CRM)" status="live">
            {mkt.trackedByChannel.length === 0 ? (
              <DataGapInline detail="no channel-attributed tracker rows" owner={ownerFor('channel')} />
            ) : (
              <CampaignTable
                rows={mkt.trackedByChannel
                  .filter((c) => /whatsapp|email|sms/i.test(c.label))
                  .map((c) => ({ type: 'Triggered 1-to-1', name: c.label, spend: null, leads: c.value, cpl: null }))}
              />
            )}
            <p className="mt-2 text-[11.5px] text-ink-soft">
              Consented, event-triggered contact only — bulk sends are held at zero per the Smile Club mandate.{' '}
              <a href="?tab=crm" className="font-medium text-accent hover:underline">CRM — Zavis tab →</a>
            </p>
          </PartnerBlock>
        ) : (
          <PartnerBlock name={def.partners[0].name} status="live">
            {n.leads == null ? (
              <DataGapInline detail={n.gap ?? 'source unavailable'} owner={ownerFor('channel')} />
            ) : (
              <CampaignTable
                rows={[{
                  type: def.key === 'seo' ? 'Programmatic + editorial SEO' : def.key === 'social' ? 'Organic posting' : 'Inbound',
                  name: `${def.label} (GA4 first-user channel)`, spend: null, leads: n.leads, cpl: null,
                }]}
              />
            )}
            {def.deepDive ? (
              <p className="mt-2 text-[11.5px]">
                <a href={def.deepDive.href} className="font-medium text-accent hover:underline">{def.deepDive.label} →</a>
              </p>
            ) : null}
          </PartnerBlock>
        )}
        <Takeaway>
          {def.note} Lens: <span className="font-medium text-ink">{def.lens}</span> — numbers here match that
          source&apos;s own tab exactly; lenses are never mixed into one total.
        </Takeaway>
      </div>
    </Card>
  );
}

function PartnerBlock({ name, status, children }: { name: string; status: 'live' | 'soon' | 'open slot'; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line p-4">
      <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink">
        {name}
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${status === 'live' ? 'bg-good/10 text-good' : status === 'soon' ? 'bg-watch/10 text-watch' : 'bg-line/40 text-ink-faint'}`}>
          {status}
        </span>
      </p>
      {children}
    </div>
  );
}

export async function ChannelTree({ range, grp, chan }: { range: { from: string; to: string }; grp?: string; chan?: string }) {
  const group: 'online' | 'offline' = grp === 'offline' ? 'offline' : 'online';
  const [mkt, arabyRes] = await Promise.allSettled([getMarketingReport(), getArabyAdsReport(range)]);
  const report = mkt.status === 'fulfilled' ? mkt.value : null;
  const araby = arabyRes.status === 'fulfilled' ? arabyRes.value : null;
  if (!report) {
    return (
      <Card>
        <SectionHeader tag="T" eyebrow="Marketing · Channel tree" title="Marketing — channel tree" />
        <div className="px-5 pb-5 pt-4"><DataGapInline detail="marketing report unavailable" owner={ownerFor('spend')} /></div>
      </Card>
    );
  }
  const rangeQs = `&from=${range.from}&to=${range.to}&preset=custom`;
  const active = CHANNELS.find((c) => c.key === chan) ?? null;

  // Summary strip. Spend = paid platforms + affiliate cost (both real, both AED).
  // Lead lenses stay separate — GA4 site leads vs tracker — never summed.
  const affiliateCost = araby && araby.configured && araby.source !== 'empty' ? araby.cost.windowCost : 0;
  const totalSpend = (report.source === 'empty' ? 0 : report.totals.adSpend) + affiliateCost;
  const attributedRevenue = araby?.bookings.revenue ?? null;
  const kpis: KpiItem[] = [
    { label: 'Marketing spend', value: totalSpend > 0 ? aed(totalSpend) : null, hint: 'paid platforms + affiliate cost', gapDetail: 'no spend synced', gapOwner: ownerFor('spend') },
    { label: 'GA4 site leads', value: report.ga4.available ? int(report.ga4.totalLeads) : null, hint: 'site-tagged · all online channels', gapDetail: report.ga4.note ?? 'GA4 lens unavailable', gapOwner: ownerFor('channel') },
    { label: 'Tracked leads', value: int(report.totals.trackedLeads), hint: 'in-house tracker' },
    { label: 'Blended cost / tracked lead', value: report.totals.costPerTracked != null ? aed(report.totals.costPerTracked) : null, goodWhenUp: false, gapDetail: 'no tracked leads to divide by', gapOwner: ownerFor('attribution') },
    { label: 'Revenue attributed', value: attributedRevenue != null && attributedRevenue > 0 ? aed(attributedRevenue) : null, hint: 'ArabyAds bookings only today', gapDetail: 'only affiliate bookings carry revenue attribution', gapOwner: ownerFor('attribution') },
    { label: 'ROAS', value: null, gapDetail: 'needs per-channel revenue attribution (UTM/source tagging) — honest gap, not a guess', gapOwner: ownerFor('attribution') },
  ];

  // The one same-lens mix chart: GA4 site leads by channel.
  const ga4Mix: BarDatum[] = report.ga4.available ? report.ga4.byChannel.map((c) => ({ label: c.channel, value: c.leads })) : [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="T"
          eyebrow="Marketing · Channel tree"
          title="One tree: Group → Channel → Partner → Campaign type"
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Every marketing number lives at a fixed address in this tree. Agencies are{' '}
            <span className="font-medium text-ink">never channels</span> — ArabyAds sits under Affiliates, an
            agency would sit under Performance. Each card names its counting lens (Platform · GA4 · Tracker ·
            Bookings); different lenses are shown side by side, never summed.
          </p>
          <div className="mt-4"><KpiBand items={kpis} /></div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        {(['online', 'offline'] as const).map((g) => (
          <a
            key={g}
            href={`?tab=marketing&mtab=overview${g === 'offline' ? '&mgrp=offline' : ''}${rangeQs}`}
            aria-current={group === g ? 'page' : undefined}
            className={`inline-block rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${group === g ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'}`}
          >
            {g === 'online' ? 'Online / Digital' : 'Offline'}
          </a>
        ))}
      </div>

      {group === 'online' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((c) => {
              const n = numbersFor(c.key, report, araby);
              const isActive = active?.key === c.key;
              const lens = LENS_STYLE[c.lens];
              return (
                <a
                  key={c.key}
                  href={`?tab=marketing&mtab=overview&mchan=${c.key}${rangeQs}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block rounded-card border bg-card p-4 transition hover:border-accent/50 ${isActive ? 'border-accent shadow-sm' : 'border-line'}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-ink">{c.label}</p>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: lens.bg, color: lens.fg }}>{c.lens}</span>
                  </div>
                  {n.leads == null && n.gap ? (
                    <p className="mt-2 text-[11px] leading-snug text-ink-faint">{n.gap}</p>
                  ) : (
                    <LeafKpis n={n} leadNoun={c.leadNoun} />
                  )}
                  <PartnerChips partners={c.partners} />
                </a>
              );
            })}
          </div>

          {active ? (
            <Drilldown def={active} n={numbersFor(active.key, report, araby)} mkt={report} araby={araby} rangeQs={rangeQs} />
          ) : (
            <Card>
              <SectionHeader tag="T2" eyebrow="Same lens" title="GA4 site leads by channel — the one comparable mix" />
              <div className="px-5 pb-5 pt-4">
                {ga4Mix.length === 0 ? (
                  <DataGapInline detail={report.ga4.note ?? 'GA4 lead lens unavailable'} owner={ownerFor('channel')} />
                ) : (
                  <>
                    <HBarChart data={ga4Mix} valueFormat="int" />
                    <Takeaway>
                      Shares are only honest within one lens, so the mix uses GA4&apos;s site-tagged leads alone.
                      Click any channel card above to drill into its partners and campaign types; the
                      Reconciliation sub-tab keeps the three-lens leakage analysis.
                    </Takeaway>
                  </>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFLINE.map((o) => (
            <div key={o.label} className="rounded-card border border-dashed border-line bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">{o.label}</p>
                <span className="rounded bg-line/40 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">no source</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">{o.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
