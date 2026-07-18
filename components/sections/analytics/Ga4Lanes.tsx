'use client';

import { useState } from 'react';
import type { LaneReportRow } from '@/lib/analytics/report';
import type { LaneGeoMetrics } from '@/lib/sync/adapters/ga4-adapter';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

const int = (n: number) => Math.round(n).toLocaleString('en-US');

// Geography tabs (top). UAE = the emirate buckets; VPN = non-UAE traffic.
const GEO_TABS = [
  { key: 'all', label: 'All traffic' },
  { key: 'uae', label: 'UAE only' },
  { key: 'dubai', label: 'Dubai' },
  { key: 'abudhabi', label: 'Abu Dhabi' },
  { key: 'sharjah', label: 'Sharjah' },
  { key: 'ajman', label: 'Ajman' },
  { key: 'uaq', label: 'Umm Al Quwain' },
  { key: 'rak', label: 'Ras Al Khaimah' },
  { key: 'fujairah', label: 'Fujairah' },
  { key: 'vpn', label: 'Non-UAE / VPN' },
];
const UAE_KEYS = ['dubai', 'abudhabi', 'sharjah', 'ajman', 'uaq', 'rak', 'fujairah', 'uaeother'];
const empty: LaneGeoMetrics = { sessions: 0, users: 0, newUsers: 0, leads: 0, widgetViews: 0, bookingIntent: 0 };

function sumGeo(geo: Record<string, LaneGeoMetrics>, keys: string[]): LaneGeoMetrics {
  return keys.reduce<LaneGeoMetrics>((acc, k) => {
    const m = geo[k];
    if (!m) return acc;
    return {
      sessions: acc.sessions + m.sessions,
      users: acc.users + m.users,
      newUsers: acc.newUsers + m.newUsers,
      leads: acc.leads + m.leads,
      widgetViews: acc.widgetViews + m.widgetViews,
      bookingIntent: acc.bookingIntent + m.bookingIntent,
    };
  }, { ...empty });
}

/** Roll a lane's geo breakdown up for the selected geo tab. Defensive against a
 *  missing/old-shape `geo` (never throw — that would blank the whole tab). */
function metricsFor(l: LaneReportRow, geo: string): LaneGeoMetrics {
  const g = l.geo ?? {};
  if (geo === 'all') return sumGeo(g, Object.keys(g));
  if (geo === 'uae') return sumGeo(g, UAE_KEYS);
  if (geo === 'vpn') return g['nonuae'] ?? empty;
  return g[geo] ?? empty;
}

export function Ga4Lanes({ lanes, note }: { lanes: LaneReportRow[]; note: string | null }) {
  const [geo, setGeo] = useState<string>('all');
  const [active, setActive] = useState<string>('all');

  if ((!lanes || lanes.length === 0) && note) {
    return (
      <Card>
        <SectionHeader eyebrow="GA4 · landing pages" title="Traffic by lane" />
        <div className="px-5 pb-5 pt-4">
          <p className="text-[12.5px] text-ink-soft">Landing-page traffic unavailable: {note}</p>
        </div>
      </Card>
    );
  }

  const rows = lanes.map((l) => ({ lane: l, m: metricsFor(l, geo) }));
  const shown = active === 'all' ? rows : rows.filter((r) => r.lane.key === active);
  const bookedShown = geo === 'all' || geo === 'uae';
  const totalSessions = rows.reduce((s, r) => s + r.m.sessions, 0);
  const sum = (f: (m: LaneGeoMetrics) => number) => rows.reduce((s, r) => s + f(r.m), 0);
  const laneChips = [{ key: 'all', label: 'All lanes' }, ...lanes.map((l) => ({ key: l.key, label: l.label }))];
  const geoLabel = GEO_TABS.find((g) => g.key === geo)?.label ?? 'All traffic';

  return (
    <Card>
      <SectionHeader
        tag="GA"
        eyebrow="GA4 · landing pages"
        title="Landing-page traffic by lane"
        right={<span className="text-[11px] text-ink-faint">{int(totalSessions)} sessions · {geoLabel}</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {/* Geography filter (top) */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {GEO_TABS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGeo(g.key)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                geo === g.key
                  ? g.key === 'vpn'
                    ? 'bg-stop text-white'
                    : 'bg-ink text-panel'
                  : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        {/* Lane filter */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {laneChips.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active === c.key ? 'bg-accent text-white' : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-3">Lane / landing page</th>
                <th className="py-2 pr-3 text-right">Sessions</th>
                <th className="py-2 pr-3 text-right">Users</th>
                <th className="py-2 pr-3 text-right">New users</th>
                <th className="py-2 pr-3 text-right">On-site leads</th>
                <th className="py-2 pr-3 text-right">Widget opened</th>
                <th className="py-2 pr-3 text-right">Booking intent</th>
                <th className="py-2 pl-3 text-right">Booked (widget)</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ lane, m }) => (
                <tr key={lane.key} className="border-b border-line/60">
                  <td className="py-2 pr-3">
                    <span className="block font-medium text-ink">{lane.label}</span>
                    <span className="block font-mono text-[10.5px] text-ink-faint">{lane.path}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(m.sessions)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.users)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.newUsers)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(m.leads)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.widgetViews)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(m.bookingIntent)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums font-medium text-ink">
                    {bookedShown ? int(lane.booked) : '—'}
                  </td>
                </tr>
              ))}
              {active === 'all' ? (
                <tr className="border-t border-line font-semibold">
                  <td className="py-2 pr-3 text-ink">All lanes · {geoLabel}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.sessions))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.users))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.newUsers))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.leads))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.widgetViews))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((m) => m.bookingIntent))}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink">
                    {bookedShown ? int(lanes.reduce((s, l) => s + l.booked, 0)) : '—'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <Takeaway>
          Sessions / users / new users are GA4 traffic to each lane&apos;s landing page, filtered by geography above:{' '}
          <strong>UAE only</strong> is all seven emirates; each emirate filters to GA4&apos;s region; <strong>Non-UAE / VPN</strong>{' '}
          is traffic from outside the UAE (GA4 can&apos;t flag a VPN directly, so out-of-country traffic is the closest signal —
          useful for spotting inflated/irrelevant visits). <strong>Booked (widget)</strong> isn&apos;t geo-tagged, so it shows only
          under All / UAE. &ldquo;Completed&rdquo; / &ldquo;qualified&rdquo; per lane still need CRM-per-landing-page attribution
          (a known gap).
        </Takeaway>
      </div>
    </Card>
  );
}
