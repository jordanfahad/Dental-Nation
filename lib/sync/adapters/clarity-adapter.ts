import 'server-only';

/**
 * Microsoft Clarity Data Export API adapter. The "project-live-insights"
 * endpoint returns an array of metric objects for the last N days (1–3). It is
 * rate-limited to 10 calls/day, so callers must cache aggressively. Numbers
 * arrive as strings; we coerce defensively and tolerate missing metrics.
 *
 * Docs: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export
 */

const ENDPOINT = 'https://www.clarity.ms/export-data/api/v1/project-live-insights';

export interface ClaritySignal {
  key: string;
  label: string;
  /** % of sessions exhibiting this behaviour. */
  sessionsPct: number | null;
  /** Absolute count (sub-total) where Clarity provides it. */
  count: number | null;
}

export interface ClarityInsights {
  numOfDays: number;
  traffic: { sessions: number; bots: number; users: number; pagesPerSession: number | null };
  scrollDepth: number | null; // avg %
  engagementTime: { totalSec: number | null; activeSec: number | null };
  signals: ClaritySignal[];
}

interface RawMetric {
  metricName?: string;
  information?: Array<Record<string, string | number | undefined>>;
}

const num = (v: string | number | undefined): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

// Behavioural "frustration" metrics → friendly labels, in display order.
const SIGNAL_DEFS: { metric: string; key: string; label: string }[] = [
  { metric: 'RageClickCount', key: 'rage', label: 'Rage clicks' },
  { metric: 'DeadClickCount', key: 'dead', label: 'Dead clicks' },
  { metric: 'ExcessiveScroll', key: 'scroll', label: 'Excessive scrolling' },
  { metric: 'QuickbackClick', key: 'quickback', label: 'Quick-backs' },
  { metric: 'ScriptErrorCount', key: 'jserror', label: 'JavaScript errors' },
  { metric: 'ErrorClickCount', key: 'errorclick', label: 'Error clicks' },
];

export async function fetchClarityInsights(token: string, numOfDays: 1 | 2 | 3 = 3): Promise<ClarityInsights> {
  const url = `${ENDPOINT}?numOfDays=${numOfDays}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Clarity ${res.status}: ${body.slice(0, 160)}`);
  }
  const rows = (await res.json()) as RawMetric[];
  const byName = new Map<string, Record<string, string | number | undefined>>();
  for (const r of rows ?? []) {
    if (r.metricName) byName.set(r.metricName, r.information?.[0] ?? {});
  }

  const traffic = byName.get('Traffic') ?? {};
  const scroll = byName.get('ScrollDepth') ?? {};
  const engagement = byName.get('EngagementTime') ?? {};

  const signals: ClaritySignal[] = SIGNAL_DEFS.map((s) => {
    const info = byName.get(s.metric) ?? {};
    return {
      key: s.key,
      label: s.label,
      sessionsPct: num(info.sessionsWithMetricPercentage),
      count: num(info.subTotal),
    };
  });

  // Clarity reports engagement time in ms; expose seconds.
  const toSec = (v: number | null) => (v == null ? null : Math.round(v / 1000));

  return {
    numOfDays,
    traffic: {
      sessions: num(traffic.totalSessionCount) ?? 0,
      bots: num(traffic.totalBotSessionCount) ?? 0,
      users: num(traffic.distinctUserCount) ?? 0,
      pagesPerSession: num(traffic.pagesPerSessionPercentage),
    },
    scrollDepth: num(scroll.averageScrollDepth),
    engagementTime: { totalSec: toSec(num(engagement.totalTime)), activeSec: toSec(num(engagement.activeTime)) },
    signals,
  };
}
