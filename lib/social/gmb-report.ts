import { GMB_CLINICS, type GmbClinicFilter, type GmbClinicKey } from '@/config/gmb-clinics';

export interface GmbMetricRow {
  clinic: string;
  metric: string;
  day: string;
  value: number | null;
}

export type GmbMetricKey = 'calls' | 'directions' | 'websiteClicks' | 'mapViews';
const SOURCE_METRICS: Record<GmbMetricKey, string[]> = {
  calls: ['calls'], directions: ['directions'], websiteClicks: ['website_clicks'], mapViews: ['map_views_desktop', 'map_views_mobile'],
};
export const GMB_METRIC_KEYS = Object.keys(SOURCE_METRICS) as GmbMetricKey[];
/** Per metric: the last day Google has reported (null = no reported day found). */
export type GmbReportedThrough = Record<GmbMetricKey, string | null>;

/**
 * The last day Google has reported each metric, across the connected
 * branches: the latest day on which the branches' total is above zero.
 * Google sends a day's calls and website clicks about a day after its map
 * views, and the sync stores a day Google has not sent yet as 0, so a zero
 * after this day means "not reported yet", not "none". Google reports every
 * branch at once, so the branches' total is the evidence.
 */
export function reportedThrough(rows: GmbMetricRow[], connected: GmbClinicKey[]): GmbReportedThrough {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (r.value == null || !connected.includes(r.clinic as GmbClinicKey)) continue;
    const key = GMB_METRIC_KEYS.find((k) => SOURCE_METRICS[k].includes(r.metric));
    if (key) totals.set(`${key}|${r.day}`, (totals.get(`${key}|${r.day}`) ?? 0) + Number(r.value));
  }
  const out = Object.fromEntries(GMB_METRIC_KEYS.map((k) => [k, null])) as GmbReportedThrough;
  for (const [k, v] of totals) {
    const [key, day] = k.split('|') as [GmbMetricKey, string];
    if (v > 0 && (!out[key] || day > out[key]!)) out[key] = day;
  }
  return out;
}

export interface GmbBranchReport {
  clinic: GmbClinicKey;
  label: string;
  connected: boolean;
  calls: number | null;
  directions: number | null;
  websiteClicks: number | null;
  mapViews: number | null;
}

/**
 * The Social tab's Business Profile card. With `coverage`, days after a
 * metric's reported-through day are left out of that metric (they are
 * placeholders, not zeros); `pending` lists, per metric, the reported-through
 * day when the window runs past it, so the card can say so.
 */
export function buildGmbReport(rows: GmbMetricRow[], connected: GmbClinicKey[], active: GmbClinicFilter = 'all',
  coverage?: { through: GmbReportedThrough; to: string }) {
  const reported = (r: GmbMetricRow) => {
    const key = coverage && GMB_METRIC_KEYS.find((k) => SOURCE_METRICS[k].includes(r.metric));
    const through = key ? coverage.through[key] : null;
    return !through || r.day <= through;
  };
  const branches: GmbBranchReport[] = GMB_CLINICS.map(({ key, label }) => {
    const isConnected = connected.includes(key);
    const source = isConnected ? rows.filter((r) => r.clinic === key && r.value != null && reported(r)) : [];
    const sum = (...metrics: string[]): number | null => {
      const values = source.filter((r) => metrics.includes(r.metric));
      return values.length ? values.reduce((n, r) => n + Number(r.value), 0) : null;
    };
    return { clinic: key, label, connected: isConnected, calls: sum('calls'), directions: sum('directions'),
      websiteClicks: sum('website_clicks'), mapViews: sum('map_views_desktop', 'map_views_mobile') };
  });
  const selected = branches.filter((b) => active === 'all' || b.clinic === active);
  const total = (key: 'calls' | 'directions' | 'websiteClicks' | 'mapViews') => {
    const values = selected.flatMap((b) => b[key] == null ? [] : [b[key]!]);
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };
  const byDay = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    if (!selected.some((b) => b.clinic === row.clinic && b.connected) || row.value == null ||
        !['map_views_desktop', 'map_views_mobile'].includes(row.metric) || !reported(row)) continue;
    const day = byDay.get(row.day) ?? { date: row.day };
    day[row.clinic] = Number(day[row.clinic] ?? 0) + Number(row.value);
    byDay.set(row.day, day);
  }
  const pending = Object.fromEntries(GMB_METRIC_KEYS.map((k) => {
    const through = coverage?.through[k];
    return [k, coverage && through && coverage.to > through ? through : null];
  })) as GmbReportedThrough;
  return { active, branches: selected, calls: total('calls'), directions: total('directions'),
    websiteClicks: total('websiteClicks'), mapViews: total('mapViews'), pending,
    trend: [...byDay.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))) };
}

export type BusinessProfileReport = ReturnType<typeof buildGmbReport>;
