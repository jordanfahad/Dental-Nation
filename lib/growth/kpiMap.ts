import 'server-only';
import { getDigitalSeo, type DigitalSeoReport } from '@/lib/analytics/digital';
import { getChannelPerformance, type GrowthReport, type ChannelPerf } from '@/lib/growth/channelPerformance';
import { getGoogleAdsDetail } from '@/lib/sync/adapters/google-ads-adapter';
import { getMetaAdsDetail } from '@/lib/meta/detail';
import { KPI_MOTIONS, type KpiBenchmark, type KpiDef, type KpiMotion, type KpiUnit } from '@/config/kpi-benchmarks';
import { openFlagFor } from '@/config/marketing-os';

/**
 * KPI map read layer — joins the curated industry benchmarks
 * (config/kpi-benchmarks.ts) with LIVE actuals from the read layers that
 * already power the dashboard: the Growth Platform channel report (enquiries →
 * bookings → revenue per channel), Digital & SEO (GA4 organic/AI split, Search
 * Console, social snapshots) and the paid-ads detail feeds (clicks for CTR/CPC,
 * which the channel report doesn't carry).
 *
 * Every actual is computed here, deterministically, from the SAME functions the
 * other tabs render — so a number on the KPI map always agrees with the tab its
 * "in the dashboard" link points at. No new data sources, no re-attribution.
 */

export type KpiStatus = 'ahead' | 'onpar' | 'behind' | 'na';

export interface KpiRow {
  def: KpiDef;
  /** Native-unit value (pct as 0..1); null = not measurable this window. */
  value: number | null;
  /** Formatted for display, '—' when null. */
  display: string;
  status: KpiStatus;
  /** Why a value is missing / any caveat specific to this window. */
  note: string | null;
  /**
   * Open measurement-integrity flag title (config/marketing-os.ts) — when set,
   * the value's denominator is known-corrupt and NO ahead/behind verdict is
   * rendered ("unreliable denominator" instead).
   */
  flagged: string | null;
}

export interface KpiMotionResolved {
  motion: KpiMotion;
  rows: KpiRow[];
}

export interface KpiMapReport {
  from: string | null;
  to: string | null;
  motions: KpiMotionResolved[];
  /** Data-source problems worth stating up front (feed down, empty window…). */
  caveats: string[];
}

/* ------------------------------------------------------------- formatting */

const fmtPct = (v: number): string => {
  const p = v * 100;
  return `${p >= 10 ? Math.round(p) : p.toFixed(1)}%`;
};
const fmtAed = (v: number): string => `AED ${Math.round(v).toLocaleString('en-US')}`;
const fmtCount = (v: number): string => Math.round(v).toLocaleString('en-US');

function fmt(unit: KpiUnit | null, v: number): string {
  switch (unit) {
    case 'pct': return fmtPct(v);
    case 'aed': return fmtAed(v);
    case 'x': return `${v.toFixed(1)}×`;
    case 'pos': return `#${v.toFixed(1)}`;
    default: return fmtCount(v);
  }
}

function statusFor(b: KpiBenchmark | null, v: number | null): KpiStatus {
  if (!b || v == null) return 'na';
  if (b.better === 'higher') return v >= b.hi ? 'ahead' : v >= b.lo ? 'onpar' : 'behind';
  return v <= b.lo ? 'ahead' : v <= b.hi ? 'onpar' : 'behind';
}

/** Safe ratio: null when the denominator is 0/absent (never Infinity/NaN). */
const ratio = (num: number | null | undefined, den: number | null | undefined): number | null =>
  num == null || den == null || den <= 0 ? null : num / den;

/* -------------------------------------------------------------- resolving */

interface Actual {
  value: number | null;
  /** Unit override for context metrics whose def has no benchmark. */
  unit?: KpiUnit;
  note?: string | null;
}

function resolveActuals(
  digital: DigitalSeoReport | null,
  growth: GrowthReport | null,
  gads: { available: boolean; totals: { cost: number; impressions: number; clicks: number } } | null,
  meta: { available: boolean; totals: { spend: number; impressions: number; clicks: number; leads: number } } | null,
): Record<string, Actual> {
  const ch = (key: string): ChannelPerf | null => growth?.channels.find((c) => c.key === key) ?? null;
  const sc = digital?.search && digital.search.available ? digital.search : null;
  const organic = digital?.organic ?? null;
  const sessions = digital?.traffic?.sessions ?? null;

  const seoCh = ch('website');
  const aiCh = ch('ai-chat');
  const psCh = ch('paid-search');
  const soCh = ch('paid-social');
  const sgCh = ch('social-organic');
  const afCh = ch('affiliate');
  const gmbCh = ch('gmb');
  const totals = growth?.totals ?? null;

  const scNote = sc ? null : 'Search Console unavailable for this window';
  const gadsNote = gads?.available ? null : 'Google Ads feed unavailable for this window';
  const metaNote = meta?.available ? null : 'Meta Ads feed unavailable for this window';

  // Social organic: sum the per-channel snapshots (IG + FB) from Digital & SEO.
  const socials = digital?.social ?? [];
  const followers = socials.reduce((a, s) => a + (s.followers ?? 0), 0);
  const reach = socials.reduce((a, s) => a + (s.reach ?? 0), 0);
  const engagement = socials.reduce((a, s) => a + (s.engagement ?? 0), 0);

  return {
    // Programmatic SEO
    'pseo.indexed': {
      value: digital?.pagesIndexed ?? (sc && sc.pagesInSearch > 0 ? sc.pagesInSearch : null),
      unit: 'count',
      note: digital?.pagesIndexed == null && sc?.pagesInSearch
        ? 'floor: pages seen in search results (sitemap count unavailable)'
        : null,
    },
    'pseo.impressions': { value: sc?.impressions ?? null, unit: 'count', note: scNote },
    'pseo.ctr': { value: sc ? sc.ctr : null, note: scNote },
    'pseo.position': { value: sc?.position ?? null, note: scNote },
    'pseo.sessions': { value: organic?.seoSessions ?? null, unit: 'count' },
    'pseo.conv': {
      value: ratio(seoCh?.enquiries, organic?.seoSessions),
      note: seoCh && organic?.seoSessions
        ? `${fmtCount(seoCh.enquiries)} organic enquiries ÷ ${fmtCount(organic.seoSessions)} SEO sessions`
        : 'needs both organic sessions (GA4) and organic enquiries (funnel)',
    },

    // AI SEO
    'aiseo.citations': { value: null },
    'aiseo.sessions': { value: organic?.aiSessions ?? null, unit: 'count' },
    'aiseo.share': { value: ratio(organic?.aiSessions, sessions) },
    'aiseo.conv': {
      value: ratio(aiCh?.enquiries, organic?.aiSessions),
      note: aiCh && organic?.aiSessions
        ? `${fmtCount(aiCh.enquiries)} AI-chat enquiries ÷ ${fmtCount(organic.aiSessions)} AI sessions`
        : 'AI sessions are still few — the rate is only meaningful once volume grows',
    },

    // Paid Search
    'ps.ctr': { value: gads?.available ? ratio(gads.totals.clicks, gads.totals.impressions) : null, note: gadsNote },
    'ps.cpc': { value: gads?.available ? ratio(gads.totals.cost, gads.totals.clicks) : null, note: gadsNote },
    'ps.conv': {
      value: gads?.available ? ratio(psCh?.enquiries, gads.totals.clicks) : null,
      note: gads?.available && psCh
        ? `${fmtCount(psCh.enquiries)} measured enquiries ÷ ${fmtCount(gads.totals.clicks)} clicks`
        : gadsNote,
    },
    'ps.cpl': { value: psCh?.costPerEnquiry ?? null },
    'ps.cpb': { value: psCh?.costPerBooked ?? null },
    'ps.roas': {
      value: psCh?.roas ?? null,
      note: psCh?.roas != null ? 'measured revenue only — MTA-MVM call estimates are shown separately in the Growth Platform' : null,
    },

    // Paid Social
    'so.ctr': { value: meta?.available ? ratio(meta.totals.clicks, meta.totals.impressions) : null, note: metaNote },
    'so.cpl': {
      value: soCh?.costPerEnquiry ?? (meta?.available ? ratio(meta.totals.spend, meta.totals.leads) : null),
      note: soCh?.costPerEnquiry == null && meta?.available && meta.totals.leads > 0
        ? 'spend ÷ Meta platform leads (funnel enquiries not yet attributed this window)'
        : null,
    },
    'so.conv': { value: ratio(soCh?.booked, soCh?.enquiries) },

    // Organic Social
    'sg.followers': { value: followers > 0 ? followers : null, unit: 'count' },
    'sg.engage': {
      value: ratio(engagement, reach),
      note: reach > 0 ? `${fmtCount(engagement)} engagements ÷ ${fmtCount(reach)} reached` : 'no reach data this window',
    },
    'sg.enquiries': { value: sgCh?.enquiries ?? null, unit: 'count' },

    // Affiliates & collabs
    'af.leads': { value: afCh?.enquiries ?? null, unit: 'count' },
    'af.conv': {
      value: ratio(afCh?.booked, afCh?.enquiries),
      note: afCh ? `${fmtCount(afCh.booked)} booked of ${fmtCount(afCh.enquiries)} affiliate leads` : null,
    },
    'af.influencer': { value: null },

    // GMB
    'gmb.views': { value: gmbCh?.impressions ?? null, unit: 'count' },
    'gmb.enquiries': { value: gmbCh?.enquiries ?? null, unit: 'count' },
    'gmb.conv': { value: ratio(gmbCh?.booked, gmbCh?.enquiries) },

    // Overall funnel
    'fu.enq2book': {
      value: ratio(totals?.booked, totals?.enquiries),
      note: totals ? `${fmtCount(totals.booked)} bookings ÷ ${fmtCount(totals.enquiries)} enquiries, all channels` : null,
    },
    'fu.show': { value: totals?.showRate ?? null },
    'fu.treat': { value: totals?.treatRate ?? null },
  };
}

/* ------------------------------------------------------------------ entry */

export async function getKpiMap(range: { from?: string; to?: string } = {}): Promise<KpiMapReport> {
  // All four sources are best-effort: one failing feed degrades its own rows
  // to "unavailable" notes, never the whole view.
  const [digital, growth, gads, meta] = await Promise.all([
    getDigitalSeo(range).catch(() => null),
    getChannelPerformance(range).catch(() => null),
    getGoogleAdsDetail(range).catch(() => null),
    getMetaAdsDetail(range).catch(() => null),
  ]);

  const actuals = resolveActuals(digital, growth, gads, meta);

  const motions: KpiMotionResolved[] = KPI_MOTIONS.map((motion) => ({
    motion,
    rows: motion.kpis.map((def): KpiRow => {
      const a = actuals[def.key];
      const unit = def.benchmark?.unit ?? a?.unit ?? 'count';
      const value = a?.value ?? null;
      // No resolver at all (CRM / Smile Club rows until their feeds land):
      // say where the data will come from instead of a bare dash.
      const note =
        a?.note ??
        (a === undefined && def.mapsTo
          ? 'no live feed yet — arrives via Marketing OS (Phase 1 manual entry, Phase 2 API)'
          : null);
      // A known-corrupt denominator gets NO verdict, per the integrity rule.
      const flag = value != null ? openFlagFor(def.key) : null;
      return {
        def,
        value,
        display: value == null ? '—' : fmt(unit, value),
        status: flag ? 'na' : statusFor(def.benchmark, value),
        note,
        flagged: flag ? flag.title : null,
      };
    }),
  }));

  const caveats: string[] = [];
  if (!growth || growth.source !== 'live') caveats.push('Channel funnel (enquiries/bookings/revenue) is empty for this window.');
  if (!digital) caveats.push('Digital & SEO sources (GA4 / Search Console) did not respond — SEO and AI rows show no actuals.');
  if (gads && !gads.available) caveats.push('Google Ads feed unavailable — CTR/CPC rows show no actuals.');
  if (meta && !meta.available) caveats.push('Meta Ads feed unavailable — paid-social CTR row shows no actuals.');

  return {
    from: growth?.from ?? range.from ?? null,
    to: growth?.to ?? range.to ?? null,
    motions,
    caveats,
  };
}
