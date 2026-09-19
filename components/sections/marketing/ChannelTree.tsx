import { getMarketingReport, type MarketingReport, type MktCampaign } from '@/lib/marketing/report';
import { getArabyAdsReport, type ArabyReport } from '@/lib/arabyads/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';
import { DataGapInline } from '@/components/ui/DataGap';
import { KpiBand, type KpiItem } from '@/components/charts/KpiBand';
import { HBarChart, TOKENS, type BarDatum } from '@/components/charts/Charts';
import { ownerFor } from '@/config/data-gap-owners';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Marketing channel tree — the fixed four-level hierarchy the whole marketing
 * view follows:
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
type Mkt = MarketingReport;

interface ChannelDef {
  key: ChannelKey;
  label: string;
  lens: 'Platform' | 'GA4' | 'Tracker' | 'Bookings';
  leadNoun: string;
  partners: string;
  note: string;
}

const CHANNELS: ChannelDef[] = [
  { key: 'performance', label: 'Performance / Paid', lens: 'Platform', leadNoun: 'reported leads', partners: 'In-house · agency slot open', note: 'Meta + Google paid — spend and platform-reported conversions.' },
  { key: 'affiliates', label: 'Affiliates', lens: 'Bookings', leadNoun: 'confirmed bookings', partners: 'ArabyAds · Platformance soon', note: 'Pay-per-confirmed-booking network deals; cost accrues only on results.' },
  { key: 'seo', label: 'SEO / Organic Search', lens: 'GA4', leadNoun: 'site leads', partners: 'ZAVIS (in-house)', note: 'GA4 site-tagged leads whose first channel was organic search.' },
  { key: 'social', label: 'Social / Organic', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads from unpaid social; posting detail lives in Social & Local.' },
  { key: 'referrals', label: 'Referrals', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads arriving from other sites (incl. the W3Layouts backlink).' },
  { key: 'direct', label: 'Direct', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads with no attributed source — brand demand and untagged links.' },
  { key: 'crm', label: 'Email / WhatsApp', lens: 'Tracker', leadNoun: 'tracked leads', partners: 'In-house (ZAVIS CRM)', note: 'In-house tracker leads logged from WhatsApp/CRM contact.' },
];

const OFFLINE: { label: string; note: string }[] = [
  { label: 'Events', note: 'CSR / community activations near the branches — costed per event; no reporting source connected yet.' },
  { label: 'Print / OOH', note: 'Radio and billboards stay deferred by the evidence rule; no spend, no source.' },
  { label: 'Walk-ins / Word of mouth', note: 'Captured clinically in Practo, not marketing-attributed; front-desk source codes will make this countable.' },
];

const LENS_COLOR: Record<ChannelDef['lens'], string> = {
  Platform: TOKENS.accent,
  GA4: '#6D28D9',
  Tracker: TOKENS.good,
  Bookings: TOKENS.accent600,
};

function ga4For(mkt: Mkt, re: RegExp): number | null {
  if (!mkt.ga4.available) return null;
  return mkt.ga4.byChannel.filter((c) => re.test(c.channel)).reduce((a, c) => a + c.leads, 0);
}

const GA4_RE: Partial<Record<ChannelKey, RegExp>> = {
  seo: /^organic search$/i,
  social: /^organic (social|video)$/i,
  referrals: /^referral$/i,
  direct: /^direct$/i,
};

interface LeafNumbers { leads: number | null; spend: number | null; cpl: number | null; gap?: string }

function numbersFor(key: ChannelKey, mkt: Mkt, araby: ArabyReport | null): LeafNumbers {
  switch (key) {
    case 'performance':
      if (mkt.source === 'empty') return { leads: null, spend: null, cpl: null, gap: 'ad-platform data not yet synced' };
      return { leads: mkt.totals.reportedLeads, spend: mkt.totals.adSpend, cpl: mkt.totals.costPerReported };
    case 'affiliates': {
      if (!araby || !araby.configured || araby.source === 'empty') return { leads: null, spend: null, cpl: null, gap: 'no ArabyAds bookings in this window' };
      const b = araby.bookings.total;
      const cost = araby.cost.windowCost;
      return { leads: b, spend: cost, cpl: b > 0 ? cost / b : null };
    }
    case 'crm': {
      const rows = mkt.trackedByChannel.filter((c) => /whatsapp|email|sms/i.test(c.label));
      if (rows.length === 0) return { leads: null, spend: null, cpl: null, gap: 'no WhatsApp/email rows in the tracker window' };
      return { leads: rows.reduce((a, c) => a + c.value, 0), spend: null, cpl: null };
    }
    default: {
      const v = ga4For(mkt, GA4_RE[key]!);
      return { leads: v, spend: null, cpl: null, gap: mkt.ga4.note ?? 'GA4 lead lens unavailable' };
    }
  }
}

/* ── presentation ─────────────────────────────────────────────── */

function LensDot({ lens }: { lens: ChannelDef['lens'] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: LENS_COLOR[lens] }} />
      {lens} lens
    </span>
  );
}

function ChannelCard({ def, n, href, active }: { def: ChannelDef; n: LeafNumbers; href: string; active: boolean }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group block rounded-card border bg-card p-4 transition ${
        active ? 'border-accent shadow-sm' : 'border-line hover:border-accent/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-semibold leading-tight text-ink">{def.label}</p>
        <LensDot lens={def.lens} />
      </div>
      {n.leads == null ? (
        <>
          <p className="mt-3 text-[24px] font-semibold leading-none tabular-nums text-ink-faint">—</p>
          <p className="mt-1 text-[11px] leading-snug text-ink-faint">{n.gap}</p>
        </>
      ) : (
        <>
          <p className="mt-3 text-[24px] font-semibold leading-none tabular-nums text-ink">{int(n.leads)}</p>
          <p className="mt-1 text-[11px] text-ink-faint">{def.leadNoun}</p>
        </>
      )}
      <div className="mt-3 flex items-baseline justify-between border-t border-line/60 pt-2.5 text-[11.5px] tabular-nums">
        <span className="text-ink-soft">{n.spend != null ? aed(n.spend) : 'no media cost'}</span>
        <span className="text-ink-soft">{n.cpl != null ? `${aed(n.cpl)} / lead` : ''}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-[10.5px] text-ink-faint">{def.partners}</p>
        <span className={`shrink-0 text-[10.5px] font-medium ${active ? 'text-accent' : 'text-ink-faint group-hover:text-accent'}`}>
          {active ? 'open below' : 'drill in →'}
        </span>
      </div>
    </a>
  );
}

function PartnerHeading({ name, status }: { name: string; status: 'live' | 'coming soon' | 'open slot' }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-line/60 pb-2">
      <p className="text-[12.5px] font-semibold text-ink">{name}</p>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          status === 'live' ? 'bg-good-50 text-good' : status === 'coming soon' ? 'bg-watch-50 text-watch' : 'bg-line/40 text-ink-faint'
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function CampaignTable({ rows }: { rows: { type: string; name: string; spend: number | null; leads: number | null; cpl: number | null }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-[10.5px] uppercase tracking-wide text-ink-faint">
            <th className="py-2 pr-3 font-medium">Campaign type</th>
            <th className="py-2 pr-3 font-medium">Campaign</th>
            <th className="py-2 pl-3 text-right font-medium">Spend</th>
            <th className="py-2 pl-3 text-right font-medium">Leads</th>
            <th className="py-2 pl-3 text-right font-medium">Cost / lead</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.type}-${r.name}-${i}`} className="border-b border-line/60 last:border-0">
              <td className="whitespace-nowrap py-2 pr-3 text-ink-soft">{r.type}</td>
              <td className="py-2 pr-3 text-ink" title={r.name}><span className="block max-w-[300px] truncate">{r.name}</span></td>
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

function DeepDiveLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <p className="text-[12px]">
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? <span className="mx-2 text-ink-faint">·</span> : null}
          <a href={l.href} className="font-medium text-accent hover:underline">{l.label} →</a>
        </span>
      ))}
    </p>
  );
}

function PerformanceDrill({ mkt, rangeQs }: { mkt: Mkt; rangeQs: string }) {
  const meta = mkt.platforms.find((p) => p.platform === 'Meta');
  const google = mkt.platforms.find((p) => p.platform === 'Google');
  const kpis: KpiItem[] = [
    { label: 'Paid spend', value: mkt.source === 'empty' ? null : aed(mkt.totals.adSpend), hint: 'Meta + Google', gapDetail: 'no spend synced', gapOwner: ownerFor('spend') },
    { label: 'Google spend', value: google ? aed(google.spend) : null, gapDetail: 'no Google rows', gapOwner: ownerFor('spend') },
    { label: 'Meta spend', value: meta ? aed(meta.spend) : null, gapDetail: 'no Meta rows', gapOwner: ownerFor('spend') },
    { label: 'Reported leads', value: int(mkt.totals.reportedLeads), hint: 'platform-attributed' },
    { label: 'Cost / reported lead', value: mkt.totals.costPerReported != null ? aed(mkt.totals.costPerReported) : null, goodWhenUp: false, gapDetail: 'no reported leads', gapOwner: ownerFor('attribution') },
    { label: 'GA4 paid leads', value: mkt.ga4.available ? int(mkt.ga4.paidLeads) : null, hint: 'independent site check', gapDetail: mkt.ga4.note ?? 'GA4 unavailable', gapOwner: ownerFor('channel') },
  ];
  return (
    <div className="space-y-5">
      <KpiBand items={kpis} />
      <div>
        <PartnerHeading name="In-house" status="live" />
        {mkt.topCampaigns.length === 0 ? (
          <DataGapInline detail="no campaign rows in the synced window" owner={ownerFor('spend')} />
        ) : (
          <CampaignTable rows={mkt.topCampaigns.map((c: MktCampaign) => ({ type: c.platform === 'Google' ? 'Paid Search' : 'Paid Social', name: c.campaign, spend: c.spend, leads: c.reportedLeads, cpl: c.costPerReported }))} />
        )}
        <div className="mt-3">
          <DeepDiveLinks links={[
            { label: 'Google Ads deep-dive', href: `?tab=marketing&mtab=google${rangeQs}` },
            { label: 'Meta Ads deep-dive', href: `?tab=marketing&mtab=meta${rangeQs}` },
            { label: 'Reconciliation & leakage', href: `?tab=marketing&mtab=recon${rangeQs}` },
          ]} />
        </div>
      </div>
      <div>
        <PartnerHeading name="Performance agency" status="open slot" />
        <p className="text-[12.5px] leading-snug text-ink-soft">
          No external agency is engaged — paid runs in-house. The slot exists so agency-run campaigns would land
          here, under Performance, never as their own channel.
        </p>
      </div>
    </div>
  );
}

function AffiliatesDrill({ araby, rangeQs }: { araby: ArabyReport | null; rangeQs: string }) {
  if (!araby || !araby.configured || araby.source === 'empty') {
    return (
      <div className="space-y-4">
        <PartnerHeading name="ArabyAds" status="live" />
        <DataGapInline detail="no ArabyAds bookings in the selected window" owner={ownerFor('channel')} />
        <PartnerHeading name="Platformance" status="coming soon" />
        <p className="text-[12.5px] leading-snug text-ink-soft">Placeholder until the partnership goes live — it will report here, under Affiliates.</p>
      </div>
    );
  }
  const cpb = araby.bookings.total > 0 ? araby.cost.windowCost / araby.bookings.total : null;
  const kpis: KpiItem[] = [
    { label: 'Confirmed bookings', value: int(araby.bookings.total), hint: 'the billable event' },
    { label: 'Booking revenue', value: aed(araby.bookings.revenue), hint: 'clinic value of those bookings' },
    { label: 'Cost (this window)', value: aed(araby.cost.windowCost), hint: 'bookings × rate card' },
    { label: 'Cost / booking', value: cpb != null ? aed(cpb) : null, goodWhenUp: false, gapDetail: 'no bookings to divide by', gapOwner: ownerFor('channel') },
    { label: 'Budget used (lifetime)', value: pct(araby.cost.utilization), hint: `${aed(araby.cost.toDateCost)} of ${aed(araby.cost.budgetCap)} cap` },
  ];
  const laneMix: BarDatum[] = araby.cost.perLane
    .filter((l) => l.bookings > 0)
    .map((l) => ({ label: `${l.lane} (${l.laneCode})`, value: l.bookings }));
  return (
    <div className="space-y-5">
      <KpiBand items={kpis} />
      <div>
        <PartnerHeading name="ArabyAds" status="live" />
        {laneMix.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Bookings by lane</p>
            <HBarChart data={laneMix} valueFormat="int" />
          </div>
        ) : null}
        <CampaignTable
          rows={araby.cost.perLane.map((l) => ({
            type: 'Lead Gen · pay-per-booking',
            name: `${l.lane} — ${l.laneCode} · rate ${aed(l.rate)}`,
            spend: l.cost,
            leads: l.bookings,
            cpl: l.bookings > 0 ? l.cost / l.bookings : null,
          }))}
        />
        <div className="mt-3">
          <DeepDiveLinks links={[{ label: 'Full Araby Ads tab (publishers, drop-off, Practo outcomes)', href: '?tab=arabyads' }]} />
        </div>
      </div>
      <div>
        <PartnerHeading name="Platformance" status="coming soon" />
        <p className="text-[12.5px] leading-snug text-ink-soft">
          Second affiliate partner in onboarding. When live it reports here with the same leaf card — same
          shape, same funnel spine, its own source codes.
        </p>
      </div>
    </div>
  );
}

function Ga4Drill({ def, mkt, n }: { def: ChannelDef; mkt: Mkt; n: LeafNumbers }) {
  const share = n.leads != null && mkt.ga4.available && mkt.ga4.totalLeads > 0 ? n.leads / mkt.ga4.totalLeads : null;
  const kpis: KpiItem[] = [
    { label: def.leadNoun, value: n.leads != null ? int(n.leads) : null, hint: 'GA4 first-user channel', gapDetail: n.gap ?? 'GA4 unavailable', gapOwner: ownerFor('channel') },
    { label: 'Share of GA4 site leads', value: share != null ? pct(share) : null, hint: `of ${mkt.ga4.available ? int(mkt.ga4.totalLeads) : '—'} site leads`, gapDetail: 'GA4 unavailable', gapOwner: ownerFor('channel') },
    { label: 'Media cost', value: 'AED 0', hint: 'organic — staffed work, not free' },
  ];
  const deepDive =
    def.key === 'seo'
      ? [{ label: 'Digital & SEO tab (rankings, pages, keywords)', href: '?tab=digital' }, { label: 'Google Analytics tab', href: '?tab=analytics' }]
      : def.key === 'social'
        ? [{ label: 'Social & Local tab (posts, demographics)', href: '?tab=social' }, { label: 'Google Analytics tab', href: '?tab=analytics' }]
        : [{ label: 'Google Analytics tab', href: '?tab=analytics' }];
  return (
    <div className="space-y-5">
      <KpiBand items={kpis} />
      <div>
        <PartnerHeading name={def.partners} status="live" />
        <p className="text-[12.5px] leading-snug text-ink-soft">{def.note}</p>
        <div className="mt-3"><DeepDiveLinks links={deepDive} /></div>
      </div>
    </div>
  );
}

function CrmDrill({ mkt }: { mkt: Mkt }) {
  const rows = mkt.trackedByChannel.filter((c) => /whatsapp|email|sms/i.test(c.label));
  const total = rows.reduce((a, c) => a + c.value, 0);
  const kpis: KpiItem[] = [
    { label: 'Tracked leads', value: rows.length ? int(total) : null, hint: 'WhatsApp / email in the tracker', gapDetail: 'no WhatsApp/email tracker rows', gapOwner: ownerFor('channel') },
    { label: 'Bulk sends', value: '0', hint: 'held at zero per the Smile Club mandate' },
    { label: 'Media cost', value: 'AED 0', hint: 'consented 1-to-1 contact only' },
  ];
  const mix: BarDatum[] = rows.map((c) => ({ label: c.label, value: c.value }));
  return (
    <div className="space-y-5">
      <KpiBand items={kpis} />
      <div>
        <PartnerHeading name="In-house (ZAVIS CRM)" status="live" />
        {mix.length > 0 ? <HBarChart data={mix} valueFormat="int" /> : <DataGapInline detail="no channel-attributed tracker rows" owner={ownerFor('channel')} />}
        <div className="mt-3">
          <DeepDiveLinks links={[{ label: 'CRM — Zavis tab', href: '?tab=crm' }]} />
        </div>
      </div>
    </div>
  );
}

/* ── the tab ──────────────────────────────────────────────────── */

export async function ChannelTree({ range, grp, chan }: { range: { from: string; to: string }; grp?: string; chan?: string }) {
  const group: 'online' | 'offline' = grp === 'offline' ? 'offline' : 'online';
  const [mktRes, arabyRes] = await Promise.allSettled([getMarketingReport(), getArabyAdsReport(range)]);
  const mkt = mktRes.status === 'fulfilled' ? mktRes.value : null;
  const araby = arabyRes.status === 'fulfilled' ? arabyRes.value : null;
  if (!mkt) {
    return (
      <Card>
        <SectionHeader tag="T" eyebrow="Marketing · Channel tree" title="Marketing — channel tree" />
        <div className="px-5 pb-5 pt-4"><DataGapInline detail="marketing report unavailable" owner={ownerFor('spend')} /></div>
      </Card>
    );
  }
  const rangeQs = `&from=${range.from}&to=${range.to}&preset=custom`;
  const active = CHANNELS.find((c) => c.key === chan) ?? null;

  // Summary strip. Spend = paid platforms + affiliate cost (both real, both
  // AED). Lead lenses stay separate — GA4 vs tracker — never summed.
  const affiliateCost = araby && araby.configured && araby.source !== 'empty' ? araby.cost.windowCost : 0;
  const totalSpend = (mkt.source === 'empty' ? 0 : mkt.totals.adSpend) + affiliateCost;
  const attributedRevenue = araby?.bookings.revenue ?? null;
  const kpis: KpiItem[] = [
    { label: 'Marketing spend', value: totalSpend > 0 ? aed(totalSpend) : null, hint: 'paid platforms + affiliate cost', gapDetail: 'no spend synced', gapOwner: ownerFor('spend') },
    { label: 'GA4 site leads', value: mkt.ga4.available ? int(mkt.ga4.totalLeads) : null, hint: 'site-tagged · all online channels', gapDetail: mkt.ga4.note ?? 'GA4 lens unavailable', gapOwner: ownerFor('channel') },
    { label: 'Tracked leads', value: int(mkt.totals.trackedLeads), hint: 'in-house tracker' },
    { label: 'Blended cost / tracked lead', value: mkt.totals.costPerTracked != null ? aed(mkt.totals.costPerTracked) : null, goodWhenUp: false, gapDetail: 'no tracked leads to divide by', gapOwner: ownerFor('attribution') },
    { label: 'Revenue attributed', value: attributedRevenue != null && attributedRevenue > 0 ? aed(attributedRevenue) : null, hint: 'ArabyAds bookings only today', gapDetail: 'only affiliate bookings carry revenue attribution', gapOwner: ownerFor('attribution') },
    { label: 'ROAS', value: null, gapDetail: 'needs per-channel revenue attribution (UTM/source tagging) — honest gap, not a guess', gapOwner: ownerFor('attribution') },
  ];

  const ga4Mix: BarDatum[] = mkt.ga4.available ? mkt.ga4.byChannel.map((c) => ({ label: c.channel, value: c.leads })) : [];

  return (
    <div className="space-y-5">
      <Card>
        <SectionHeader
          tag="T"
          eyebrow="Marketing · Channel tree"
          title="One tree: Group → Channel → Partner → Campaign type"
          right={
            <div className="flex gap-1.5">
              {(['online', 'offline'] as const).map((g) => (
                <a
                  key={g}
                  href={`?tab=marketing&mtab=overview${g === 'offline' ? '&mgrp=offline' : ''}${rangeQs}`}
                  aria-current={group === g ? 'page' : undefined}
                  className={`inline-block rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${group === g ? 'border-accent bg-accent text-white' : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'}`}
                >
                  {g === 'online' ? 'Online / Digital' : 'Offline'}
                </a>
              ))}
            </div>
          }
        />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] leading-snug text-ink-soft">
            Every marketing number has a fixed address in this tree. Agencies are{' '}
            <span className="font-medium text-ink">never channels</span> — ArabyAds sits under Affiliates, an
            agency would sit under Performance. Each card names its counting lens; different lenses sit side by
            side and are never summed into one total.
          </p>
          <div className="mt-4"><KpiBand items={kpis} /></div>
        </div>
      </Card>

      {group === 'online' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CHANNELS.map((c) => (
              <ChannelCard
                key={c.key}
                def={c}
                n={numbersFor(c.key, mkt, araby)}
                href={`?tab=marketing&mtab=overview&mchan=${c.key}${rangeQs}`}
                active={active?.key === c.key}
              />
            ))}
          </div>

          {active ? (
            <Card>
              <SectionHeader
                tag="T2"
                eyebrow={`Online › ${active.label} · ${active.lens} lens`}
                title={`${active.label} — partners & campaign types`}
                right={
                  <a href={`?tab=marketing&mtab=overview${rangeQs}`} className="text-[11.5px] font-medium text-accent hover:underline">
                    ← all channels
                  </a>
                }
              />
              <div className="px-5 pb-5 pt-4">
                {active.key === 'performance' ? (
                  <PerformanceDrill mkt={mkt} rangeQs={rangeQs} />
                ) : active.key === 'affiliates' ? (
                  <AffiliatesDrill araby={araby} rangeQs={rangeQs} />
                ) : active.key === 'crm' ? (
                  <CrmDrill mkt={mkt} />
                ) : (
                  <Ga4Drill def={active} mkt={mkt} n={numbersFor(active.key, mkt, araby)} />
                )}
                <div className="mt-4">
                  <Takeaway>
                    {active.note} Numbers here match the {active.lens} source&apos;s own tab exactly — lenses are
                    never mixed into one total.
                  </Takeaway>
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <SectionHeader tag="T2" eyebrow="Same lens" title="GA4 site leads by channel — the one comparable mix" />
              <div className="px-5 pb-5 pt-4">
                {ga4Mix.length === 0 ? (
                  <DataGapInline detail={mkt.ga4.note ?? 'GA4 lead lens unavailable'} owner={ownerFor('channel')} />
                ) : (
                  <>
                    <HBarChart data={ga4Mix} valueFormat="int" />
                    <Takeaway>
                      Shares are only honest within one lens, so this mix uses GA4&apos;s site-tagged leads alone.
                      Click a channel card above to drill into its partners and campaign types; the Reconciliation
                      sub-tab keeps the three-lens leakage analysis.
                    </Takeaway>
                  </>
                )}
              </div>
            </Card>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          {OFFLINE.map((o) => (
            <div key={o.label} className="rounded-card border border-dashed border-line bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12.5px] font-semibold text-ink">{o.label}</p>
                <span className="rounded-full bg-line/40 px-2 py-0.5 text-[10px] font-medium text-ink-faint">no source</span>
              </div>
              <p className="mt-2 text-[11.5px] leading-snug text-ink-soft">{o.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
