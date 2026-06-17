'use client';

import { useMemo, useState } from 'react';
import type { ContentItem, ContentObjective } from '@/lib/types';
import { Card, SectionHeader, Takeaway } from '@/components/ui/Card';

const OBJECTIVES: (ContentObjective | 'all')[] = ['all', 'awareness', 'proof', 'conversion', 'retargeting'];

/** §E — Content / Creative Performance. Objective filter + content-mix bar +
 *  table. Premium/elegant tone — proof, doctor authority, testimonial. */
export function ContentPerformance({ content }: { content: ContentItem[] }) {
  const [objective, setObjective] = useState<ContentObjective | 'all'>('all');

  const filtered = useMemo(
    () => (objective === 'all' ? content : content.filter((c) => c.objective === objective)),
    [content, objective],
  );

  const mix = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of content) {
      const k = c.content_type ?? 'other';
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [content]);
  const mixTotal = mix.reduce((a, [, v]) => a + v, 0) || 1;

  return (
    <Card>
      <SectionHeader
        tag="E"
        eyebrow="Creative"
        title="Content & creative performance"
        right={
          <div className="flex flex-wrap gap-1">
            {OBJECTIVES.map((o) => (
              <button
                key={o}
                onClick={() => setObjective(o)}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium capitalize transition ${
                  objective === o
                    ? 'bg-accent text-white'
                    : 'bg-na/10 text-ink-soft hover:bg-na/20'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-5 pt-4">
        <p className="eyebrow mb-2">Content mix by type</p>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          {mix.map(([type, count], i) => (
            <div
              key={type}
              className="h-full bg-accent"
              style={{ width: `${(count / mixTotal) * 100}%`, opacity: 1 - i * 0.1 }}
              title={`${type}: ${count}`}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
          {mix.map(([type, count], i) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-accent" style={{ opacity: 1 - i * 0.1 }} />
              {type} <span className="tnum text-ink-faint">{count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto px-5 pb-5">
        <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line text-left text-ink-faint">
              <th className="py-2 pr-3 font-medium">Title</th>
              <th className="px-2 py-2 font-medium">Channel</th>
              <th className="px-2 py-2 font-medium">Objective</th>
              <th className="px-2 py-2 font-medium">CTA</th>
              <th className="px-2 py-2 font-medium">Performance</th>
              <th className="px-2 py-2 font-medium">Issue / learning</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-line/60 align-top last:border-0">
                <td className="py-2 pr-3 font-medium text-ink">{c.title ?? '—'}</td>
                <td className="px-2 py-2 text-ink-soft">{c.channel ?? '—'}</td>
                <td className="px-2 py-2 capitalize text-ink-soft">{c.objective ?? '—'}</td>
                <td className="px-2 py-2 text-ink-soft">{c.cta ?? '—'}</td>
                <td className="px-2 py-2 text-ink-soft">{c.perf_note ?? '—'}</td>
                <td className="px-2 py-2 text-watch">{c.issue_note ?? '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-ink-faint">
                  No content items for this objective.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="px-5 pb-5">
        <Takeaway>
          Proof and doctor-authority content lead the mix; the offer explainer reads too promotional —
          keep the tone premium, not discount-whitening.
        </Takeaway>
      </div>
    </Card>
  );
}
