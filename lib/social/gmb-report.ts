import { GMB_CLINICS, type GmbClinicFilter, type GmbClinicKey } from '@/config/gmb-clinics';

export interface GmbMetricRow {
  clinic: string;
  metric: string;
  day: string;
  value: number | null;
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

export function buildGmbReport(rows: GmbMetricRow[], connected: GmbClinicKey[], active: GmbClinicFilter = 'all') {
  const branches: GmbBranchReport[] = GMB_CLINICS.map(({ key, label }) => {
    const isConnected = connected.includes(key);
    const source = isConnected ? rows.filter((r) => r.clinic === key && r.value != null) : [];
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
        !['map_views_desktop', 'map_views_mobile'].includes(row.metric)) continue;
    const day = byDay.get(row.day) ?? { date: row.day };
    day[row.clinic] = Number(day[row.clinic] ?? 0) + Number(row.value);
    byDay.set(row.day, day);
  }
  return { active, branches: selected, calls: total('calls'), directions: total('directions'),
    websiteClicks: total('websiteClicks'), mapViews: total('mapViews'),
    trend: [...byDay.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))) };
}

export type BusinessProfileReport = ReturnType<typeof buildGmbReport>;
