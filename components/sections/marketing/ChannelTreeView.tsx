'use client';

import { useEffect, useRef, useState } from 'react';
import type { MarketingReport, MktCampaign } from '@/lib/marketing/report';
import type { ArabyReport } from '@/lib/arabyads/report';
import { ownerFor } from '@/config/data-gap-owners';
import { isLiveCampaign, maxLastDate } from '@/lib/marketing/recency';

/**
 * Marketing channel tree — the fixed four-level hierarchy every marketing
 * number reports through:
 *
 *   Group (Online / Offline) → Channel → Partner → Campaign type
 *
 * Agencies are never channels: ArabyAds sits under Affiliates, any performance
 * agency under Performance. No data source is added or removed here — every
 * leaf re-maps a number that already exists elsewhere in the dashboard, and
 * each card names the LENS it counts in (Platform / GA4 / Tracker / Bookings):
 * distinct populations that are never summed silently.
 *
 * Styled in the McKinsey exhibit language of the Smile Club tab (Georgia
 * serif, exhibit tags, thesis bar, proportion bars) so the two flagship
 * strategy views read as one house style.
 */

const NAVY = '#244260';
const BLUE = '#5793A3';
const GOLD = '#E1C96E';
const CORAL = '#B45F53';
const OLIVE = '#767769';
const LINE = '#D8D8CC';
const INK = '#3a4148';
const TRACK = '#EEEFE1';

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number) => `${Math.round(n * 100)}%`;

type ChannelKey = 'performance' | 'affiliates' | 'seo' | 'social' | 'referrals' | 'direct' | 'crm';
type Mkt = MarketingReport;
type Lens = 'Platform' | 'GA4' | 'Tracker' | 'Bookings';

interface ChannelDef {
  key: ChannelKey;
  label: string;
  lens: Lens;
  leadNoun: string;
  partners: string;
  note: string;
}

const CHANNELS: ChannelDef[] = [
  { key: 'performance', label: 'Performance / Paid', lens: 'Platform', leadNoun: 'reported leads', partners: 'In-house · agency slot open', note: 'Meta + Google paid — spend and platform-reported conversions.' },
  { key: 'affiliates', label: 'Affiliates', lens: 'Bookings', leadNoun: 'confirmed bookings', partners: 'ArabyAds · Platformance soon', note: 'Pay-per-confirmed-booking network deals; cost accrues only on results.' },
  { key: 'seo', label: 'SEO / Organic Search', lens: 'GA4', leadNoun: 'site leads', partners: 'CRM-DN (in-house)', note: 'GA4 site-tagged leads whose first channel was organic search.' },
  { key: 'social', label: 'Social / Organic', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads from unpaid social; posting detail lives in Social & Local.' },
  { key: 'referrals', label: 'Referrals', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads arriving from other sites (incl. the W3Layouts backlink).' },
  { key: 'direct', label: 'Direct', lens: 'GA4', leadNoun: 'site leads', partners: 'In-house', note: 'GA4 leads with no attributed source — brand demand and untagged links.' },
  { key: 'crm', label: 'CRM', lens: 'Tracker', leadNoun: 'tracked leads', partners: 'CRM-DN (in-house)', note: 'Email / WhatsApp — in-house tracker leads logged from consented 1-to-1 contact.' },
];

const OFFLINE: { label: string; verdict: string; note: string }[] = [
  { label: 'Events', verdict: 'Case by case', note: 'CSR / community activations near the branches — costed per event before commitment; no reporting source connected yet.' },
  { label: 'Print / OOH', verdict: 'Deferred', note: 'Radio and billboards stay deferred by the evidence rule — broad reach, weak attribution, high cost.' },
  { label: 'Walk-ins / Word of mouth', verdict: 'Untagged', note: 'Captured clinically in Practo, not marketing-attributed; front-desk source codes will make this countable.' },
];

const LENS_COLOR: Record<Lens, string> = { Platform: NAVY, GA4: '#6D28D9', Tracker: '#2C5E3F', Bookings: BLUE };

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

export interface SocialLite {
  channels: { label: string; lastDay: string | null; metrics: { label: string; value: number; isStock: boolean }[] }[];
}

export interface SeoLite {
  organicSessions: number | null;
  pagesIndexed: number | null;
  gsc: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number | null;
    topQueries: { query: string; clicks: number; position: number }[];
  } | null;
}

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

/* ── McKinsey atoms (shared visual language with the Smile Club tab) ── */

function Exhibit({ n, title, right }: { n: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: CORAL }}>Exhibit {n}</span>
        <h2 className="text-[14px] font-semibold" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function Stat({ v, l, s, gap }: { v: string | null; l: string; s?: string; gap?: string }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2.5" style={{ borderColor: LINE }}>
      <p className="text-[17px] font-bold tabular-nums" style={{ color: v != null ? NAVY : CORAL, fontFamily: 'Georgia, serif' }}>{v ?? '—'}</p>
      <p className="text-[9.5px] font-bold uppercase tracking-wide" style={{ color: BLUE }}>{l}</p>
      <p className="mt-0.5 text-[9.5px] leading-snug" style={{ color: v != null ? OLIVE : CORAL }}>{v != null ? s : gap ?? s}</p>
    </div>
  );
}

function BarRow({ label, value, max, color, display }: { label: string; value: number; max: number; color: string; display: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-[150px] shrink-0 truncate text-[10.5px]" style={{ color: INK }} title={label}>{label}</span>
      <div className="h-3.5 flex-1 rounded-full" style={{ backgroundColor: TRACK }}>
        <div className="h-3.5 rounded-full" style={{ width: `${Math.max(3, Math.round((value / Math.max(1, max)) * 100))}%`, backgroundColor: color }} />
      </div>
      <span className="w-[64px] shrink-0 text-right text-[10.5px] font-semibold tabular-nums" style={{ color: NAVY }}>{display}</span>
    </div>
  );
}

function GapNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg px-3 py-2 text-[11px] font-medium leading-snug" style={{ backgroundColor: '#FBEFEC', color: CORAL }}>{children}</p>;
}

function PartnerHeading({ name, status }: { name: string; status: 'live' | 'coming soon' | 'open slot' }) {
  const tone = status === 'live' ? { bg: '#e7efe6', fg: '#2C5E3F' } : status === 'coming soon' ? { bg: '#f5ecd8', fg: '#8a6a1e' } : { bg: '#efede6', fg: OLIVE };
  return (
    <div className="mb-2.5 flex items-center gap-2 border-b pb-2" style={{ borderColor: '#EEEFE1' }}>
      <p className="text-[12.5px] font-bold" style={{ color: NAVY }}>{name}</p>
      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide" style={{ backgroundColor: tone.bg, color: tone.fg }}>{status}</span>
    </div>
  );
}

function McTable({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
            {head.map((h, i) => <th key={h} className={`px-3 py-2 font-bold ${i >= head.length - 3 ? 'text-right' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top" style={{ borderColor: '#EEEFE1' }}>
              {r.map((cell, j) => (
                <td key={j} className={`px-3 py-1.5 ${j >= r.length - 3 ? 'text-right tabular-nums' : ''}`} style={{ color: j === 0 ? NAVY : INK }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeepDive({ links }: { links: { label: string; href: string }[] }) {
  return (
    <p className="mt-3 text-[11.5px]">
      {links.map((l, i) => (
        <span key={l.href}>
          {i > 0 ? <span className="mx-2" style={{ color: OLIVE }}>·</span> : null}
          <a href={l.href} className="font-semibold hover:underline" style={{ color: BLUE }}>{l.label} →</a>
        </span>
      ))}
    </p>
  );
}

/* ── drilldowns ───────────────────────────────────────────────── */

function PlatformPill({ p }: { p: 'Meta' | 'Google' }) {
  const tone = p === 'Google' ? { bg: `${NAVY}14`, fg: NAVY } : { bg: `${BLUE}1F`, fg: BLUE };
  return <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold" style={{ backgroundColor: tone.bg, color: tone.fg }}>{p}</span>;
}

/**
 * The campaign ladder — every campaign, ranked by spend. The top ten carry a
 * share-of-spend bar; the long tail folds into a native <details> so the page
 * stays scannable without JavaScript. One row shape at every rank.
 */
function CampaignRow({ c, rank, totalSpend, anchor }: { c: MktCampaign; rank: number; totalSpend: number; anchor: string | null }) {
  const share = totalSpend > 0 ? c.spend / totalSpend : 0;
  const live = isLiveCampaign(c, anchor);
  return (
    <tr className="border-t align-middle" style={{ borderColor: '#EEEFE1' }}>
      <td className="px-3 py-1.5 text-right text-[10px] font-bold tabular-nums" style={{ color: OLIVE }}>{rank}</td>
      <td className="px-3 py-1.5"><PlatformPill p={c.platform} /></td>
      <td className="px-3 py-1.5">
        <span className="flex max-w-[300px] items-center gap-1.5">
          <span className="truncate text-[11px] font-semibold" style={{ color: NAVY }} title={c.campaign}>{c.campaign}</span>
          {live ? <span className="shrink-0 rounded-full px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide" style={{ backgroundColor: '#e7efe6', color: '#2C5E3F' }}>live</span> : null}
        </span>
        <span className="mt-1 block h-1.5 w-full max-w-[300px] rounded-full" style={{ backgroundColor: TRACK }}>
          <span className="block h-1.5 rounded-full" style={{ width: `${Math.max(2, Math.round(share * 100))}%`, backgroundColor: c.platform === 'Google' ? NAVY : BLUE }} />
        </span>
      </td>
      <td className="px-3 py-1.5 text-right text-[11px] tabular-nums" style={{ color: INK }}>{aed(c.spend)}</td>
      <td className="px-3 py-1.5 text-right text-[11px] tabular-nums" style={{ color: OLIVE }}>{pct(share)}</td>
      <td className="px-3 py-1.5 text-right text-[11px] tabular-nums" style={{ color: INK }}>{int(c.reportedLeads)}</td>
      <td className="px-3 py-1.5 text-right text-[11px] tabular-nums" style={{ color: INK }}>{c.costPerReported != null ? aed(c.costPerReported) : '—'}</td>
    </tr>
  );
}

function CampaignLadder({ campaigns, totalSpend }: { campaigns: MktCampaign[]; totalSpend: number }) {
  const anchor = maxLastDate(campaigns);
  const top = campaigns.slice(0, 10);
  const rest = campaigns.slice(10);
  const restSpend = rest.reduce((a, c) => a + c.spend, 0);
  const head = (
    <tr className="text-left text-[9.5px] uppercase tracking-wide" style={{ color: OLIVE, backgroundColor: '#F7F7F0' }}>
      <th className="px-3 py-2 text-right font-bold">#</th>
      <th className="px-3 py-2 font-bold">Type</th>
      <th className="px-3 py-2 font-bold">Campaign · share of paid spend</th>
      <th className="px-3 py-2 text-right font-bold">Spend</th>
      <th className="px-3 py-2 text-right font-bold">Share</th>
      <th className="px-3 py-2 text-right font-bold">Leads</th>
      <th className="px-3 py-2 text-right font-bold">Cost / lead</th>
    </tr>
  );
  return (
    <div className="overflow-x-auto rounded-xl border bg-white" style={{ borderColor: LINE }}>
      <table className="w-full border-collapse">
        <thead>{head}</thead>
        <tbody>
          {top.map((c, i) => <CampaignRow key={`${c.platform}|${c.campaign}`} c={c} rank={i + 1} totalSpend={totalSpend} anchor={anchor} />)}
        </tbody>
      </table>
      {rest.length > 0 ? (
        <details>
          <summary className="cursor-pointer border-t px-3 py-2 text-[11px] font-bold" style={{ borderColor: '#EEEFE1', color: BLUE }}>
            Show the remaining {int(rest.length)} campaigns ({aed(restSpend)} · {pct(totalSpend > 0 ? restSpend / totalSpend : 0)} of paid spend)
          </summary>
          <table className="w-full border-collapse">
            <tbody>
              {rest.map((c, i) => <CampaignRow key={`${c.platform}|${c.campaign}`} c={c} rank={i + 11} totalSpend={totalSpend} anchor={anchor} />)}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Running now — the campaigns with insight rows in the trailing week, pinned
 * ABOVE the lifetime ladder. This is what makes a fresh September launch
 * visible on day one instead of ranking last by lifetime spend.
 */
function RunningNow({ campaigns }: { campaigns: MktCampaign[] }) {
  const anchor = maxLastDate(campaigns);
  const live = campaigns.filter((c) => isLiveCampaign(c, anchor));
  if (live.length === 0) return null;
  return (
    <div className="rounded-xl border-2 p-3.5" style={{ borderColor: '#2C5E3F33', backgroundColor: '#f4f8f3' }}>
      <p className="mb-2 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: '#2C5E3F' }}>
        <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: '#2C5E3F' }} />
        Running now — {int(live.length)} campaign{live.length === 1 ? '' : 's'} with delivery this week (as of {anchor})
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {live.map((c) => (
          <div key={`${c.platform}|${c.campaign}`} className="rounded-lg border bg-white px-3 py-2" style={{ borderColor: LINE }}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-bold" style={{ color: NAVY }} title={c.campaign}>{c.campaign}</span>
              <PlatformPill p={c.platform} />
            </div>
            <p className="mt-1 text-[10px] tabular-nums" style={{ color: INK }}>
              {aed(c.spend)} · {int(c.reportedLeads)} leads{c.costPerReported != null ? ` · ${aed(c.costPerReported)}/lead` : ''}
            </p>
            <p className="mt-0.5 text-[9.5px]" style={{ color: OLIVE }}>{c.firstDate ?? '—'} → {c.lastDate ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceDrill({ mkt, rangeQs }: { mkt: Mkt; rangeQs: string }) {
  const meta = mkt.platforms.find((p) => p.platform === 'Meta');
  const google = mkt.platforms.find((p) => p.platform === 'Google');
  const gCount = mkt.campaigns.filter((c) => c.platform === 'Google').length;
  const mCount = mkt.campaigns.filter((c) => c.platform === 'Meta').length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat v={mkt.source === 'empty' ? null : aed(mkt.totals.adSpend)} l="Paid spend" s="Meta + Google" gap="no spend synced" />
        <Stat v={google ? aed(google.spend) : null} l="Google spend" s={google ? `${int(google.reportedLeads)} reported` : undefined} gap="no Google rows" />
        <Stat v={meta ? aed(meta.spend) : null} l="Meta spend" s={meta ? `${int(meta.reportedLeads)} reported` : undefined} gap="no Meta rows" />
        <Stat v={mkt.totals.costPerReported != null ? aed(mkt.totals.costPerReported) : null} l="Cost / reported lead" s="platform-attributed" gap="no reported leads" />
        <Stat v={mkt.ga4.available ? int(mkt.ga4.paidLeads) : null} l="GA4 paid leads" s="independent site check" gap={mkt.ga4.note ?? 'GA4 unavailable'} />
      </div>

      <RunningNow campaigns={mkt.campaigns} />

      {google || meta ? (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Where the paid money sits</p>
          {google ? <BarRow label={`Paid Search — Google (${int(gCount)} campaigns)`} value={google.spend} max={Math.max(google?.spend ?? 0, meta?.spend ?? 0)} color={NAVY} display={aed(google.spend)} /> : null}
          {meta ? <BarRow label={`Paid Social — Meta (${int(mCount)} campaigns)`} value={meta.spend} max={Math.max(google?.spend ?? 0, meta?.spend ?? 0)} color={BLUE} display={aed(meta.spend)} /> : null}
        </div>
      ) : null}

      <div>
        <PartnerHeading name="In-house" status="live" />
        <p className="mb-2 text-[11px]" style={{ color: OLIVE }}>
          <span className="font-bold" style={{ color: NAVY }}>{int(mkt.campaigns.length)} campaigns</span> in the
          selected window — Google {int(gCount)} · Meta {int(mCount)} — spend-sorted; the ladder shows the top
          ten, the rest expand below. Campaign type: Google = Paid Search, Meta = Paid Social.
        </p>
        {mkt.campaigns.length === 0 ? (
          <GapNote>No campaign rows in the synced window — owner: {ownerFor('spend')}.</GapNote>
        ) : (
          <CampaignLadder campaigns={mkt.campaigns} totalSpend={mkt.totals.adSpend} />
        )}
        <DeepDive links={[
          { label: 'Google Ads deep-dive', href: `?tab=marketing&mtab=google${rangeQs}` },
          { label: 'Meta Ads deep-dive', href: `?tab=marketing&mtab=meta${rangeQs}` },
          { label: 'Reconciliation & leakage', href: `?tab=marketing&mtab=recon${rangeQs}` },
        ]} />
      </div>

      <div>
        <PartnerHeading name="Performance agency" status="open slot" />
        <p className="text-[11.5px] leading-snug" style={{ color: INK }}>
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
        <GapNote>No ArabyAds bookings in the selected window — widen the date range to cover the campaign, or check the Araby Ads tab. Owner: {ownerFor('channel')}.</GapNote>
        <PartnerHeading name="Platformance" status="coming soon" />
        <p className="text-[11.5px] leading-snug" style={{ color: INK }}>Second affiliate partner in onboarding — reports here when live.</p>
      </div>
    );
  }
  const cpb = araby.bookings.total > 0 ? araby.cost.windowCost / araby.bookings.total : null;
  const maxLane = Math.max(...araby.cost.perLane.map((l) => l.bookings), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <Stat v={int(araby.bookings.total)} l="Confirmed bookings" s="the billable event" />
        <Stat v={aed(araby.bookings.revenue)} l="Booking revenue" s="clinic value of those bookings" />
        <Stat v={aed(araby.cost.windowCost)} l="Cost · this window" s="bookings × rate card" />
        <Stat v={cpb != null ? aed(cpb) : null} l="Cost / booking" s="blended across lanes" gap="no bookings to divide by" />
        <Stat v={pct(araby.cost.utilization)} l="Budget used · lifetime" s={`${aed(araby.cost.toDateCost)} of ${aed(araby.cost.budgetCap)} cap`} />
      </div>

      <div>
        <PartnerHeading name="ArabyAds" status="live" />
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Bookings by lane — pay only on results</p>
        <div className="mb-3">
          {araby.cost.perLane.map((l) => (
            <BarRow key={l.laneCode} label={`${l.lane} (${l.laneCode})`} value={l.bookings} max={maxLane} color={BLUE} display={int(l.bookings)} />
          ))}
        </div>
        <McTable
          head={['Campaign type', 'Lane · rate card', 'Cost', 'Bookings', 'Cost / booking']}
          rows={araby.cost.perLane.map((l) => [
            'Lead Gen · pay-per-booking',
            <span key="n" className="font-semibold">{l.lane} — {l.laneCode} · {aed(l.rate)}/booking</span>,
            aed(l.cost),
            int(l.bookings),
            l.bookings > 0 ? aed(l.cost / l.bookings) : '—',
          ])}
        />
        <DeepDive links={[{ label: 'Full Araby Ads tab — publishers, drop-off, Practo outcomes', href: `?tab=arabyads${rangeQs}` }]} />
      </div>

      <div>
        <PartnerHeading name="Platformance" status="coming soon" />
        <p className="text-[11.5px] leading-snug" style={{ color: INK }}>
          Second affiliate partner in onboarding. When live it reports here with the same leaf card — same shape,
          same funnel spine, its own source codes.
        </p>
      </div>
    </div>
  );
}

function Ga4Drill({ def, mkt, n, rangeQs, social, seo }: { def: ChannelDef; mkt: Mkt; n: LeafNumbers; rangeQs: string; social: SocialLite | null; seo: SeoLite | null }) {
  const share = n.leads != null && mkt.ga4.available && mkt.ga4.totalLeads > 0 ? n.leads / mkt.ga4.totalLeads : null;
  const deepDive =
    def.key === 'seo'
      ? [{ label: 'Digital & SEO tab — rankings, pages, keywords', href: `?tab=digital${rangeQs}` }, { label: 'Google Analytics tab', href: `?tab=analytics${rangeQs}` }]
      : def.key === 'social'
        ? [{ label: 'Social & Local tab — posts, demographics', href: `?tab=social${rangeQs}` }, { label: 'Google Analytics tab', href: `?tab=analytics${rangeQs}` }]
        : [{ label: 'Google Analytics tab', href: `?tab=analytics${rangeQs}` }];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat v={n.leads != null ? int(n.leads) : null} l={def.leadNoun} s="GA4 first-user channel" gap={n.gap ?? 'GA4 unavailable'} />
        <Stat v={share != null ? pct(share) : null} l="Share of GA4 site leads" s={mkt.ga4.available ? `of ${int(mkt.ga4.totalLeads)} site leads` : undefined} gap="GA4 unavailable" />
        <Stat v="AED 0" l="Media cost" s="organic — staffed work, not free" />
      </div>
      {share != null ? (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Position in the GA4 mix</p>
          <BarRow label={def.label} value={n.leads ?? 0} max={mkt.ga4.totalLeads} color={LENS_COLOR.GA4} display={pct(share)} />
        </div>
      ) : null}
      {def.key === 'seo' && seo ? (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>
            Search reality in the window — the Digital &amp; SEO numbers, in place
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Stat v={seo.organicSessions != null ? int(seo.organicSessions) : null} l="Organic sessions" s="GA4 · organic search" gap="GA4 unavailable" />
            <Stat v={seo.gsc ? int(seo.gsc.clicks) : null} l="Search clicks" s={seo.gsc ? `${int(seo.gsc.impressions)} impressions · ${(seo.gsc.ctr * 100).toFixed(1)}% CTR` : undefined} gap="Search Console unavailable" />
            <Stat v={seo.gsc?.position != null ? seo.gsc.position.toFixed(1) : null} l="Avg position" s="Google Search Console" gap="Search Console unavailable" />
            <Stat v={seo.pagesIndexed != null ? int(seo.pagesIndexed) : null} l="Pages indexed" s="sitemaps · incl. programmatic SEO" gap="index count unavailable" />
          </div>
          {seo.gsc && seo.gsc.topQueries.length > 0 ? (
            <div className="mt-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>Top queries by clicks</p>
              <div className="flex flex-wrap gap-1.5">
                {seo.gsc.topQueries.map((q) => (
                  <span key={q.query} className="rounded-full border px-2.5 py-1 text-[10.5px]" style={{ borderColor: LINE, color: INK }}>
                    <span className="font-semibold" style={{ color: NAVY }}>{q.query}</span>
                    <span style={{ color: OLIVE }}> · {int(q.clicks)} clicks · pos {q.position.toFixed(1)}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {def.key === 'social' && social ? (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: OLIVE }}>
            Channel accounts in the window — the Social &amp; Local numbers, in place
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {social.channels.map((c) => (
              <div key={c.label} className="rounded-lg border bg-white px-3 py-2.5" style={{ borderColor: LINE }}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[11.5px] font-bold" style={{ color: NAVY }}>{c.label}</p>
                  {c.lastDay ? <span className="shrink-0 text-[9px]" style={{ color: OLIVE }}>to {c.lastDay}</span> : null}
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
                  {c.metrics.map((m) => (
                    <div key={m.label}>
                      <p className="text-[13px] font-bold tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{int(m.value)}</p>
                      <p className="text-[8.5px] uppercase tracking-wide" style={{ color: OLIVE }}>{m.label}{m.isStock ? ' · total' : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <PartnerHeading name={def.partners} status="live" />
        <p className="text-[11.5px] leading-snug" style={{ color: INK }}>{def.note}</p>
        <DeepDive links={deepDive} />
      </div>
    </div>
  );
}

function CrmDrill({ mkt, rangeQs }: { mkt: Mkt; rangeQs: string }) {
  const rows = mkt.trackedByChannel.filter((c) => /whatsapp|email|sms/i.test(c.label));
  const total = rows.reduce((a, c) => a + c.value, 0);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat v={rows.length ? int(total) : null} l="Tracked leads" s="WhatsApp / email in the tracker" gap="no WhatsApp/email tracker rows" />
        <Stat v="0" l="Bulk sends" s="held at zero per the Smile Club mandate" />
        <Stat v="AED 0" l="Media cost" s="consented 1-to-1 contact only" />
      </div>
      <div>
        <PartnerHeading name="CRM-DN (in-house)" status="live" />
        {rows.length > 0 ? (
          <div>{rows.map((r) => <BarRow key={r.label} label={r.label} value={r.value} max={max} color={LENS_COLOR.Tracker} display={int(r.value)} />)}</div>
        ) : (
          <GapNote>No channel-attributed tracker rows in this window — owner: {ownerFor('channel')}.</GapNote>
        )}
        <DeepDive links={[{ label: 'CRM-DN tab', href: `?tab=crm${rangeQs}` }]} />
      </div>
    </div>
  );
}

/* ── the tab ──────────────────────────────────────────────────── */

export function ChannelTreeView({ mkt, araby, social, seo, rangeQs, initialChan, initialGroup }: {
  mkt: Mkt; araby: ArabyReport | null; social: SocialLite | null; seo: SeoLite | null; rangeQs: string;
  initialChan?: string; initialGroup: 'online' | 'offline';
}) {
  // The whole tree is data-complete after ONE server fetch — every drilldown
  // renders from the same two objects, so switching channels is pure client
  // state: instant, no server round-trip, no skeleton.
  const [group, setGroup] = useState<'online' | 'offline'>(initialGroup);
  const [chan, setChan] = useState<string | null>(initialChan ?? null);
  const drillRef = useRef<HTMLElement | null>(null);
  const treeRef = useRef<HTMLElement | null>(null);
  const mounted = useRef(false);

  // Keep the URL shareable without navigating (replaceState = zero reload).
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (chan) u.searchParams.set('mchan', chan); else u.searchParams.delete('mchan');
      if (group === 'offline') u.searchParams.set('mgrp', 'offline'); else u.searchParams.delete('mgrp');
      window.history.replaceState(null, '', u.toString());
    } catch { /* URL sync is a convenience, never a failure mode */ }
  }, [chan, group]);

  // Land the eye on the drilldown when a channel is picked (smooth after the
  // first paint; instant when arriving on a deep link).
  useEffect(() => {
    if (chan && drillRef.current) {
      drillRef.current.scrollIntoView({ behavior: mounted.current ? 'smooth' : 'auto', block: 'start' });
    }
    mounted.current = true;
  }, [chan]);

  const active = CHANNELS.find((c) => c.key === chan) ?? null;

  // Spend = paid platforms + affiliate cost (both real, both AED). Lead lenses
  // stay separate — GA4 vs tracker — never summed.
  const affiliateCost = araby && araby.configured && araby.source !== 'empty' ? araby.cost.windowCost : 0;
  const totalSpend = (mkt.source === 'empty' ? 0 : mkt.totals.adSpend) + affiliateCost;
  const attributedRevenue = araby?.bookings.revenue ?? null;
  const maxGa4 = Math.max(...mkt.ga4.byChannel.map((c) => c.leads), 1);

  return (
    <div className="space-y-5">
      <p className="rounded-xl border-l-4 bg-white px-4 py-3 text-[12.5px] font-medium leading-snug" style={{ borderColor: GOLD, color: NAVY, fontFamily: 'Georgia, serif' }}>
        <span className="font-bold">Every marketing dirham and lead has one fixed address:</span>{' '}
        Group → Channel → Partner → Campaign type. Agencies are never channels — ArabyAds reports under
        Affiliates, an agency would report under Performance. Each leaf names its counting lens
        (Platform · GA4 · Tracker · Bookings); different lenses sit side by side and are never summed into one
        invented total.
      </p>

      <section>
        <Exhibit
          n="T1"
          title="The operating picture"
          right={
            <div className="flex gap-1.5">
              {(['online', 'offline'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  aria-current={group === g ? 'page' : undefined}
                  className="rounded-full px-3 py-1 text-[11px] font-bold transition"
                  style={group === g ? { backgroundColor: NAVY, color: 'white' } : { backgroundColor: '#F1F1EA', color: OLIVE }}
                >
                  {g === 'online' ? 'Online / Digital' : 'Offline'}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Stat v={totalSpend > 0 ? aed(totalSpend) : null} l="Marketing spend" s="paid platforms + affiliate cost" gap="no spend synced" />
          <Stat v={mkt.ga4.available ? int(mkt.ga4.totalLeads) : null} l="GA4 site leads" s="site-tagged · all online" gap={mkt.ga4.note ?? 'GA4 unavailable'} />
          <Stat v={int(mkt.totals.trackedLeads)} l="Tracked leads" s="in-house tracker" />
          <Stat v={mkt.totals.costPerTracked != null ? aed(mkt.totals.costPerTracked) : null} l="Blended cost / tracked" s="all spend ÷ tracker leads" gap="no tracked leads" />
          <Stat v={attributedRevenue != null && attributedRevenue > 0 ? aed(attributedRevenue) : null} l="Revenue attributed" s="ArabyAds bookings only today" gap="only affiliate bookings attribute revenue" />
          <Stat v={null} l="ROAS" gap="needs UTM/source tagging — honest gap, not a guess" />
        </div>
      </section>

      {group === 'online' ? (
        <>
          <section id="tree" ref={treeRef} className="scroll-mt-4">
            <Exhibit n="T2" title="The tree — seven online channels, one shape" />
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              {CHANNELS.map((c) => {
                const n = numbersFor(c.key, mkt, araby);
                const isActive = active?.key === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setChan(isActive ? null : c.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className="block w-full rounded-xl border-2 bg-white p-3.5 text-left transition"
                    style={isActive ? { borderColor: NAVY, boxShadow: `0 0 0 3px ${GOLD}44` } : { borderColor: LINE }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-bold leading-tight" style={{ color: NAVY }}>{c.label}</p>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: LENS_COLOR[c.lens] }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: LENS_COLOR[c.lens] }} />{c.lens}
                      </span>
                    </div>
                    {n.leads == null ? (
                      <>
                        <p className="mt-2.5 text-[22px] font-bold leading-none tabular-nums" style={{ color: '#C9C9BC', fontFamily: 'Georgia, serif' }}>—</p>
                        <p className="mt-1 text-[10px] leading-snug" style={{ color: CORAL }}>{n.gap}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2.5 text-[22px] font-bold leading-none tabular-nums" style={{ color: NAVY, fontFamily: 'Georgia, serif' }}>{int(n.leads)}</p>
                        <p className="mt-1 text-[10px]" style={{ color: OLIVE }}>{c.leadNoun}</p>
                      </>
                    )}
                    <div className="mt-2.5 flex items-baseline justify-between border-t pt-2 text-[10.5px] tabular-nums" style={{ borderColor: '#EEEFE1', color: INK }}>
                      <span>{n.spend != null ? aed(n.spend) : 'no media cost'}</span>
                      <span>{n.cpl != null ? `${aed(n.cpl)}/lead` : ''}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[9.5px]" style={{ color: OLIVE }}>{c.partners}</p>
                      <span className="shrink-0 text-[10px] font-bold" style={{ color: isActive ? NAVY : BLUE }}>{isActive ? 'open below' : 'drill in →'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {active ? (
            <section id="drill" ref={drillRef} className="scroll-mt-4">
              <Exhibit
                n="T3"
                title={`Online › ${active.label} — partners & campaign types`}
                right={
                  <button
                    type="button"
                    onClick={() => { setChan(null); treeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    className="text-[11px] font-bold hover:underline"
                    style={{ color: BLUE }}
                  >
                    ← all channels
                  </button>
                }
              />
              <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
                {active.key === 'performance' ? (
                  <PerformanceDrill mkt={mkt} rangeQs={rangeQs} />
                ) : active.key === 'affiliates' ? (
                  <AffiliatesDrill araby={araby} rangeQs={rangeQs} />
                ) : active.key === 'crm' ? (
                  <CrmDrill mkt={mkt} rangeQs={rangeQs} />
                ) : (
                  <Ga4Drill def={active} mkt={mkt} n={numbersFor(active.key, mkt, araby)} rangeQs={rangeQs} social={social} seo={seo} />
                )}
              </div>
              <p className="mt-2 rounded-lg px-3 py-2 text-[11px] font-medium" style={{ backgroundColor: '#FDF9EC', color: '#6d5a1d' }}>
                {active.note} Numbers match the {active.lens} source&apos;s own tab exactly — lenses are never mixed
                into one total.
              </p>
            </section>
          ) : (
            <section>
              <Exhibit n="T3" title="GA4 site leads by channel — the one comparable mix" />
              <div className="rounded-xl border bg-white p-4" style={{ borderColor: LINE }}>
                {mkt.ga4.byChannel.length === 0 ? (
                  <GapNote>{mkt.ga4.note ?? 'GA4 lead lens unavailable'} — owner: {ownerFor('channel')}.</GapNote>
                ) : (
                  <>
                    {mkt.ga4.byChannel.map((c) => (
                      <BarRow key={c.channel} label={c.channel} value={c.leads} max={maxGa4} color={LENS_COLOR.GA4} display={int(c.leads)} />
                    ))}
                    <p className="mt-2 text-[10px]" style={{ color: OLIVE }}>
                      Shares are only honest within one lens, so this mix uses GA4&apos;s site-tagged leads alone.
                      Click a channel card above to drill in; the Reconciliation sub-tab keeps the three-lens
                      leakage analysis.
                    </p>
                  </>
                )}
              </div>
            </section>
          )}
        </>
      ) : (
        <section>
          <Exhibit n="T2" title="Offline — three channels, none yet countable" />
          <div className="grid gap-2.5 sm:grid-cols-3">
            {OFFLINE.map((o) => (
              <div key={o.label} className="rounded-xl border-2 border-dashed bg-white p-3.5" style={{ borderColor: LINE }}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12px] font-bold" style={{ color: NAVY }}>{o.label}</p>
                  <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold" style={{ backgroundColor: '#f5ecd8', color: '#8a6a1e' }}>{o.verdict}</span>
                </div>
                <p className="mt-2 text-[11px] leading-snug" style={{ color: INK }}>{o.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
