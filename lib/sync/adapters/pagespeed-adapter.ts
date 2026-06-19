import 'server-only';

/**
 * Google PageSpeed Insights (Lighthouse + CrUX field data) adapter. Returns
 * Core Web Vitals for both mobile and desktop. Field data ("real users", from
 * the Chrome UX Report) is only present once a URL has enough traffic; until
 * then we still surface the lab (Lighthouse) result. Each strategy is fetched
 * independently so one failure never blanks the other.
 */

export type CwvCategory = 'FAST' | 'AVERAGE' | 'SLOW' | 'NONE';

export interface FieldMetric {
  /** Raw percentile — ms for time metrics, ×100 for CLS. */
  value: number;
  category: CwvCategory;
}

export interface LabMetric {
  key: string;
  label: string;
  display: string;
  numeric: number;
}

export interface StrategyResult {
  strategy: 'mobile' | 'desktop';
  performanceScore: number | null; // 0–100
  overallCategory: CwvCategory; // field overall
  field: {
    lcp: FieldMetric | null;
    inp: FieldMetric | null;
    cls: FieldMetric | null;
    fcp: FieldMetric | null;
    ttfb: FieldMetric | null;
  };
  lab: LabMetric[];
}

export interface SiteSpeed {
  url: string;
  fetchedAt: string;
  mobile: StrategyResult | null;
  desktop: StrategyResult | null;
  error: string | null;
}

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const LAB_AUDITS: { key: string; label: string }[] = [
  { key: 'first-contentful-paint', label: 'First Contentful Paint' },
  { key: 'largest-contentful-paint', label: 'Largest Contentful Paint' },
  { key: 'speed-index', label: 'Speed Index' },
  { key: 'total-blocking-time', label: 'Total Blocking Time' },
  { key: 'cumulative-layout-shift', label: 'Cumulative Layout Shift' },
  { key: 'interactive', label: 'Time to Interactive' },
];

function fieldMetric(metrics: Record<string, { percentile?: number; category?: string }>, key: string): FieldMetric | null {
  const m = metrics?.[key];
  if (!m || typeof m.percentile !== 'number') return null;
  return { value: m.percentile, category: (m.category as CwvCategory) ?? 'NONE' };
}

async function runStrategy(url: string, strategy: 'mobile' | 'desktop', apiKey: string | null): Promise<StrategyResult> {
  const u = new URL(PSI_ENDPOINT);
  u.searchParams.set('url', url);
  u.searchParams.set('strategy', strategy);
  u.searchParams.append('category', 'PERFORMANCE');
  if (apiKey) u.searchParams.set('key', apiKey);

  const res = await fetch(u.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PSI ${strategy} ${res.status}: ${body.slice(0, 140)}`);
  }
  const json = (await res.json()) as {
    loadingExperience?: { metrics?: Record<string, { percentile?: number; category?: string }>; overall_category?: string };
    lighthouseResult?: {
      categories?: { performance?: { score?: number | null } };
      audits?: Record<string, { title?: string; displayValue?: string; numericValue?: number }>;
    };
  };

  const le = json.loadingExperience?.metrics ?? {};
  const perf = json.lighthouseResult?.categories?.performance?.score;
  const audits = json.lighthouseResult?.audits ?? {};

  return {
    strategy,
    performanceScore: typeof perf === 'number' ? Math.round(perf * 100) : null,
    overallCategory: (json.loadingExperience?.overall_category as CwvCategory) ?? 'NONE',
    field: {
      lcp: fieldMetric(le, 'LARGEST_CONTENTFUL_PAINT_MS'),
      inp: fieldMetric(le, 'INTERACTION_TO_NEXT_PAINT'),
      cls: fieldMetric(le, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      fcp: fieldMetric(le, 'FIRST_CONTENTFUL_PAINT_MS'),
      ttfb: fieldMetric(le, 'EXPERIMENTAL_TIME_TO_FIRST_BYTE'),
    },
    lab: LAB_AUDITS.filter((a) => audits[a.key]).map((a) => {
      const audit = audits[a.key];
      return {
        key: a.key,
        label: a.label,
        display: audit.displayValue ?? String(audit.numericValue ?? ''),
        numeric: audit.numericValue ?? 0,
      };
    }),
  };
}

export async function fetchSiteSpeed(url: string, apiKey: string | null): Promise<SiteSpeed> {
  const [mobile, desktop] = await Promise.allSettled([
    runStrategy(url, 'mobile', apiKey),
    runStrategy(url, 'desktop', apiKey),
  ]);
  const ok = (r: PromiseSettledResult<StrategyResult>) => (r.status === 'fulfilled' ? r.value : null);
  const err = [mobile, desktop]
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => (r.reason as Error).message)[0] ?? null;

  return { url, fetchedAt: new Date().toISOString(), mobile: ok(mobile), desktop: ok(desktop), error: err };
}
