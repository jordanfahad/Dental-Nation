'use client';

import { useMemo, useState } from 'react';

/**
 * Interactive search-query table: type-to-filter and click-to-sort over the
 * full query set the API returned (not just the visible top slice). Pure
 * client-side — the data arrives fully rendered from the server component,
 * so filtering and sorting never trigger a request.
 */

export interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  branded: boolean;
}

type SortKey = 'clicks' | 'impressions' | 'ctr' | 'position';

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const pct1 = (n: number) => `${(n * 100).toFixed(1)}%`;

export function QueryTable({ rows }: { rows: QueryRow[] }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('clicks');
  const [desc, setDesc] = useState(true);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle ? rows.filter((r) => r.query.toLowerCase().includes(needle)) : rows;
    const dir = desc ? -1 : 1;
    return filtered
      .slice()
      .sort((a, b) => (a[sortKey] - b[sortKey]) * dir || b.clicks - a.clicks || b.impressions - a.impressions);
  }, [rows, q, sortKey, desc]);

  const header = (key: SortKey, label: string) => (
    <th className="py-2 pr-3 text-right">
      <button
        type="button"
        onClick={() => {
          if (sortKey === key) setDesc((v) => !v);
          else {
            setSortKey(key);
            // Position: ascending first (rank 1 is best); volumes: descending first.
            setDesc(key !== 'position');
          }
        }}
        className={`inline-flex items-center gap-1 uppercase tracking-wide ${sortKey === key ? 'font-semibold text-ink' : 'text-ink-faint'}`}
      >
        {label}
        <span className="text-[9px]">{sortKey === key ? (desc ? '▼' : '▲') : '↕'}</span>
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter queries — e.g. implant, al wasl, veneers…"
          className="w-full max-w-xs rounded-card border border-line bg-card px-3 py-1.5 text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <span className="text-[11px] tabular-nums text-ink-faint">
          {int(shown.length)} of {int(rows.length)} queries
        </span>
      </div>
      <div className="max-h-[460px] overflow-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-line text-left text-[10px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pl-3 pr-3">#</th>
              <th className="py-2 pr-3">Query</th>
              {header('clicks', 'Clicks')}
              {header('impressions', 'Impressions')}
              {header('ctr', 'CTR')}
              {header('position', 'Avg pos')}
              <th className="py-2 pl-3">Type</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.query} className="border-b border-line/60">
                <td className="py-2 pl-3 pr-3 tabular-nums text-ink-faint">{i + 1}</td>
                <td className="py-2 pr-3 text-ink">{r.query}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink">{int(r.clicks)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{int(r.impressions)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{pct1(r.ctr)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-ink-soft">{r.position.toFixed(1)}</td>
                <td className="py-2 pl-3">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${r.branded ? 'bg-panel text-ink-soft' : 'bg-good/10 text-good'}`}>
                    {r.branded ? 'branded' : 'non-branded'}
                  </span>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-[12px] text-ink-faint">
                  No queries match &ldquo;{q}&rdquo;
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
