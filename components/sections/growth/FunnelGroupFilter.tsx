'use client';

import { useState } from 'react';
import { FunnelViz } from '@/components/charts/FunnelViz';

/**
 * The one funnel, filterable by channel group. Pills switch the funnel between
 * All channels and a single group (Paid / Organic / Referral / Collaboration /
 * Retention); the stage numbers realign to the selected group's attributed
 * counts. Client component purely for the selection state — every number is
 * precomputed on the server and passed down.
 */

export interface GroupFunnel {
  key: string; // 'all' or the ChannelGroupKey
  label: string;
  enquiries: number;
  booked: number;
  showed: number;
  treated: number;
  revenue: number;
}

const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(1)}k` : `AED ${Math.round(n)}`;

export function FunnelGroupFilter({ groups }: { groups: GroupFunnel[] }) {
  const [active, setActive] = useState('all');
  const g = groups.find((x) => x.key === active) ?? groups[0];
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {groups.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setActive(x.key)}
            aria-pressed={x.key === active}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition ${
              x.key === active
                ? 'border-accent bg-accent text-white'
                : 'border-line bg-card text-ink-soft hover:border-accent/40 hover:text-ink'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
      <FunnelViz
        stages={[
          { label: 'Enquiries', value: g.enquiries },
          { label: 'Booked (Practo)', value: g.booked },
          { label: 'Showed up', value: g.showed },
          { label: 'Treated (billed)', value: g.treated },
        ]}
      />
      {active !== 'all' ? (
        <p className="mt-2 text-[11px] leading-snug text-ink-faint">
          {g.label} only — {g.revenue > 0 ? `${aedShort(g.revenue)} attributed revenue in this window.` : 'no attributed revenue in this window.'}{' '}
          Measured figures; the estimated Paid Search phone path is shown on its own row below, not here.
        </p>
      ) : null}
    </div>
  );
}
