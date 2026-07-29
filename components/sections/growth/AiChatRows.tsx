'use client';

import { useState } from 'react';
import type { ChannelPerf, GrowthReport } from '@/lib/growth/channelPerformance';

/**
 * AI Chat as a collapsible group: the parent row carries the total
 * AI-assistant referral sessions (GA4, latest sync) and CLICKING it reveals
 * one sub-row per assistant — ChatGPT, Claude, Perplexity, Others. Reach-level
 * ONLY, and the row says so: the booking widget doesn't capture the referrer,
 * so a booking that started in ChatGPT is indistinguishable from Organic SEO
 * today. The named engines always render (even at 0) — the CEO asked for the
 * tree, and an empty lane is information.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');

const NAMED_ENGINES: { key: string; label: string }[] = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'claude', label: 'Claude' },
  { key: 'perplexity', label: 'Perplexity' },
  { key: 'other-ai', label: 'Others (Gemini, Copilot…)' },
];

export function AiChatRows({ p, split }: { p: ChannelPerf; split: GrowthReport['organicSplit'] }) {
  const [open, setOpen] = useState(false);
  const sub = 'py-1.5 text-right align-top text-[11.5px] tabular-nums';
  const engines = NAMED_ENGINES.map((e) => ({
    ...e,
    sessions: split?.ai.find((a) => a.key === e.key)?.sessions ?? 0,
  }));
  const period = split ? `${split.periodStart}–${split.periodEnd}` : null;
  return (
    <>
      <tr className="cursor-pointer border-t border-line/70 hover:bg-panel/30" onClick={() => setOpen((v) => !v)}>
        <td className="py-2.5 pl-3 pr-2 align-top">
          <span className="block text-[12.5px] font-medium leading-tight text-ink">
            <span className="mr-1 inline-block w-3 text-[10px] text-ink-faint">{open ? '▾' : '▸'}</span>
            {p.label}
          </span>
          <span className="mt-0.5 block max-w-[230px] pl-4 text-[10.5px] leading-snug text-ink-faint">
            {open
              ? 'Sessions are measured (GA4). Bookings can’t be split from Organic SEO yet — the widget doesn’t capture the referrer.'
              : 'Click to expand by assistant.'}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className={`text-[12.5px] tabular-nums ${p.impressions == null ? 'text-ink-faint' : 'font-medium text-ink'}`}>
            {p.impressions == null ? '—' : int(p.impressions)}
          </span>
          {p.impressions != null && period ? (
            <span className="block max-w-[150px] text-[10px] leading-snug text-ink-faint">sessions {period}</span>
          ) : null}
        </td>
        <td className={`px-2 py-2.5 text-right align-top`}><span className="text-[12.5px] text-ink-faint" title="Folded into Organic SEO until the widget captures the referrer">—</span></td>
        <td className={`px-2 py-2.5 text-right align-top`}><span className="text-[12.5px] text-ink-faint">—</span></td>
        <td className={`px-2 py-2.5 text-right align-top`}><span className="text-[12.5px] text-ink-faint">—</span></td>
        <td className={`px-2 py-2.5 text-right align-top`}><span className="text-[12.5px] text-ink-faint">—</span></td>
        <td className={`px-2 py-2.5 text-right align-top`}><span className="text-[12.5px] text-ink-faint">—</span></td>
        <td className="py-2.5 pl-2 pr-3 text-right align-top"><span className="text-[11px] text-ink-faint">—</span></td>
      </tr>
      {open ? (
        <>
          {engines.map((e) => (
            <tr key={e.key} className="bg-panel/30">
              <td className="py-1.5 pl-7 pr-2 text-[11px] text-ink-soft">↳ {e.label}</td>
              <td className={`px-2 ${sub} ${e.sessions > 0 ? 'font-medium text-ink' : 'text-ink-faint'}`}>{e.sessions > 0 ? int(e.sessions) : '0'}</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className="py-1.5 pl-2 pr-3 text-right"><span className="text-[10.5px] text-ink-faint">GA4</span></td>
            </tr>
          ))}
          {!split ? (
            <tr className="bg-panel/30">
              <td colSpan={8} className="py-1.5 pl-7 pr-3 text-[10.5px] leading-snug text-watch">
                Per-assistant sessions appear after the next GA4 sync — source-level capture was just added.
              </td>
            </tr>
          ) : null}
        </>
      ) : null}
    </>
  );
}
