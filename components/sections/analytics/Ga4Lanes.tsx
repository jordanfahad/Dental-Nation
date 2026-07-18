'use client';

import { useState } from 'react';
import type { LaneReportRow } from '@/lib/analytics/report';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

export function Ga4Lanes({ lanes, note }: { lanes: LaneReportRow[]; note: string | null }) {
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

  const shown = active === 'all' ? lanes : lanes.filter((l) => l.key === active);
  const sum = (f: (l: LaneReportRow) => number) => lanes.reduce((s, l) => s + f(l), 0);

  const chips = [{ key: 'all', label: 'All lanes' }, ...lanes.map((l) => ({ key: l.key, label: l.label }))];

  return (
    <Card>
      <SectionHeader
        tag="GA"
        eyebrow="GA4 · landing pages"
        title="Landing-page traffic by lane"
        right={<span className="text-[11px] text-ink-faint">{int(sum((l) => l.sessions))} sessions total</span>}
      />
      <div className="px-5 pb-5 pt-4">
        {/* Lane filter */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                active === c.key ? 'bg-accent text-white' : 'bg-panel-2 text-ink-soft hover:text-ink'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[12.5px]">
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
              {shown.map((l) => (
                <tr key={l.key} className="border-b border-line/60">
                  <td className="py-2 pr-3">
                    <span className="block font-medium text-ink">{l.label}</span>
                    <span className="block font-mono text-[10.5px] text-ink-faint">{l.path}</span>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(l.sessions)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(l.users)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(l.newUsers)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(l.leads)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(l.widgetViews)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(l.bookingIntent)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums font-medium text-ink">{int(l.booked)}</td>
                </tr>
              ))}
              {active === 'all' ? (
                <tr className="border-t border-line font-semibold">
                  <td className="py-2 pr-3 text-ink">All lanes</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.sessions))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.users))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.newUsers))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.leads))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.widgetViews))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(sum((l) => l.bookingIntent))}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink">{int(sum((l) => l.booked))}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {active !== 'all' && shown[0] ? (
          <p className="mt-3 text-[12px] text-ink-soft">
            <strong>{shown[0].label}:</strong> {int(shown[0].newUsers)} new of {int(shown[0].users)} users landed here (
            {pct(shown[0].newUsers, shown[0].users)} new); {int(shown[0].leads)} on-site leads and {int(shown[0].booked)} real
            widget bookings.
          </p>
        ) : null}

        <Takeaway>
          Sessions / users / new users are GA4 traffic to each lane&apos;s landing page. <strong>On-site leads</strong> and
          <strong> booking intent</strong> are GA4 events fired on that page; <strong>Booked (widget)</strong> is real
          (non-test) website-widget bookings whose campaign Source maps to the lane — only the three ArabyAds lanes
          (Glow-Up / SOS / Scan) carry a widget campaign tag, so Restore &amp; First-look show booked as 0 until they run a
          tagged campaign. &ldquo;Completed&rdquo; / &ldquo;qualified&rdquo; per lane need CRM attribution that isn&apos;t
          wired to a landing page yet — tracked as a known gap.
        </Takeaway>
      </div>
    </Card>
  );
}
