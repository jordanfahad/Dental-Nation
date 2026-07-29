'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ChannelPerf, GrowthReport } from '@/lib/growth/channelPerformance';

/**
 * Paid Social (Meta) as a collapsible group. The parent row is the measured
 * patient funnel (same attribution engine as every other row); CLICKING it
 * reveals the Meta-side split — delivery platforms (Instagram / Facebook, once
 * the publisher_platform sync fills) and campaign types derived from campaign
 * names — plus the jump to the full Meta Ads Performance page. Meta-reported
 * leads on sub-rows are the platform's own count, marked as such: they are NOT
 * deduped against the funnel and never added to it.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(0)}k` : `AED ${Math.round(n)}`;

const platformLabel = (p: string) =>
  p === 'instagram' ? 'Instagram' : p === 'facebook' ? 'Facebook' : p === 'audience_network' ? 'Audience Network' : p;

export function PaidSocialRows({ p, split, traceQs }: { p: ChannelPerf; split: GrowthReport['metaSplit']; traceQs: string }) {
  const [open, setOpen] = useState(false);
  const sub = 'py-1.5 text-right align-top text-[11.5px] tabular-nums';
  const hasSplit = Boolean(split && (split.types.length > 0 || split.platforms.length > 0));
  return (
    <>
      <tr className="cursor-pointer border-t border-line/70 hover:bg-panel/30" onClick={() => setOpen((v) => !v)}>
        <td className="py-2.5 pl-3 pr-2 align-top">
          <span className="block text-[12.5px] font-medium leading-tight text-ink">
            <span className="mr-1 inline-block w-3 text-[10px] text-ink-faint">{open ? '▾' : '▸'}</span>
            <Link
              href="/?tab=marketing&mtab=meta"
              className="underline-offset-2 hover:text-accent hover:underline"
              title="Open Meta Ads Performance — campaigns, budgets, ad sets, creatives"
              onClick={(e) => e.stopPropagation()}
            >
              {p.label}
            </Link>
          </span>
          <span className="mt-0.5 block max-w-[230px] pl-4 text-[10.5px] leading-snug text-ink-faint">
            {open ? 'Sub-rows are Meta-reported delivery — not deduped with the patient funnel above.' : 'Click to expand by platform & campaign type.'}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className={`text-[12.5px] tabular-nums ${p.impressions == null ? 'text-ink-faint' : 'font-medium text-ink'}`}>
            {p.impressions == null ? '—' : int(p.impressions)}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right align-top"><span className={`text-[12.5px] tabular-nums ${p.enquiries === 0 ? 'text-ink-faint' : 'font-medium text-ink'}`}>{int(p.enquiries)}</span></td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className={`text-[13px] font-semibold tabular-nums ${p.booked === 0 ? 'text-ink-faint' : 'text-ink'}`}>{int(p.booked)}</span>
          {p.bookedPatients > 0 ? <span className="block text-[10px] text-ink-faint">{int(p.bookedPatients)} patients</span> : null}
        </td>
        <td className="px-2 py-2.5 text-right align-top"><span className={`text-[12.5px] tabular-nums ${p.showed === 0 ? 'text-ink-faint' : 'font-medium text-ink'}`}>{int(p.showed)}</span></td>
        <td className="px-2 py-2.5 text-right align-top"><span className={`text-[12.5px] tabular-nums ${p.treated === 0 ? 'text-ink-faint' : 'font-medium text-ink'}`}>{int(p.treated)}</span></td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className={`text-[12.5px] font-semibold tabular-nums ${p.revenue === 0 ? 'text-ink-faint' : 'text-ink'}`}>
            {p.revenue > 0 ? aedShort(p.revenue) : '—'}
          </span>
        </td>
        <td className="py-2.5 pl-2 pr-3 text-right align-top">
          {p.spend != null ? (
            <>
              <span className="text-[12px] font-medium tabular-nums text-ink">{aedShort(p.spend)}</span>
              <span className="block text-[10px] leading-snug text-ink-faint">campaigns paused since late Apr</span>
              <span className="block text-[10px] leading-snug text-ink-soft">
                {p.costPerEnquiry != null ? `enquiry ${aed(p.costPerEnquiry)}` : ''}
                {p.costPerBooked != null ? ` · booking ${aed(p.costPerBooked)}` : ''}
              </span>
              <span className="block text-[10px] leading-snug text-ink-soft">
                {p.costPerShowed != null ? `show ${aed(p.costPerShowed)}` : ''}
                {p.costPerPatient != null ? ` · treated ${aed(p.costPerPatient)}` : ''}
                {p.roas != null ? ` · ROAS ${p.roas.toFixed(1)}×` : ''}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-ink-faint">—</span>
          )}
        </td>
      </tr>
      {open ? (
        <>
          {split && split.platforms.length > 0 ? (
            split.platforms.map((pl) => (
              <tr key={pl.platform} className="bg-panel/30">
                <td className="py-1.5 pl-7 pr-2 text-[11px] text-ink-soft">
                  ↳ {platformLabel(pl.platform)} <span className="text-ink-faint">(delivery)</span>
                </td>
                <td className={`px-2 ${sub} text-ink`}>{int(pl.impressions)}</td>
                <td className={`px-2 ${sub} text-watch`} title="Meta-reported leads — not deduped with the funnel">{pl.leads > 0 ? int(pl.leads) : '—'}</td>
                <td className={`px-2 ${sub} text-ink-faint`}>—</td>
                <td className={`px-2 ${sub} text-ink-faint`}>—</td>
                <td className={`px-2 ${sub} text-ink-faint`}>—</td>
                <td className={`px-2 ${sub} text-ink-faint`}>—</td>
                <td className="py-1.5 pl-2 pr-3 text-right text-[11px] tabular-nums text-ink">{aedShort(pl.spend)}</td>
              </tr>
            ))
          ) : (
            <tr className="bg-panel/30">
              <td colSpan={8} className="py-1.5 pl-7 pr-3 text-[10.5px] leading-snug text-watch">
                No Instagram-vs-Facebook delivery split: Meta campaigns have been paused since late April, so there is
                no recent delivery to break down (historical split would need a fresh API token — not worth chasing
                while ads are off). Campaign types below are read from the historical campaign names.
              </td>
            </tr>
          )}
          {split?.types.map((t) => (
            <tr key={t.key} className="bg-panel/30">
              <td className="py-1.5 pl-7 pr-2 text-[11px] text-ink-soft">
                ↳ {t.label}
                {t.platformHint ? <span className="text-ink-faint"> · {t.platformHint}</span> : null}
              </td>
              <td className={`px-2 ${sub} text-ink`}>{int(t.impressions)}</td>
              <td className={`px-2 ${sub} text-watch`} title="Meta-reported leads — not deduped with the funnel">{t.leads > 0 ? int(t.leads) : '—'}</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className={`px-2 ${sub} text-ink-faint`}>—</td>
              <td className="py-1.5 pl-2 pr-3 text-right align-top">
                <span className="text-[11px] tabular-nums text-ink">{aedShort(t.spend)}</span>
                {t.cpl != null ? <span className="block text-[10px] text-ink-faint">CPL {aed(t.cpl)}</span> : null}
              </td>
            </tr>
          ))}
          <tr className="bg-panel/30">
            <td colSpan={8} className="py-1.5 pl-7 pr-3">
              <Link href="/?tab=marketing&mtab=meta" className="text-[10.5px] font-medium text-accent hover:underline">
                Full campaign detail — budgets, spend, ad sets, creatives →
              </Link>
              <Link href={`/?tab=group&gtab=growth&gchan=paid-social${traceQs}`} className="ml-4 text-[10.5px] font-medium text-accent hover:underline">
                trace patients →
              </Link>
              {!hasSplit ? (
                <span className="ml-4 text-[10.5px] text-ink-faint">No Meta campaign rows fall in this window.</span>
              ) : null}
            </td>
          </tr>
        </>
      ) : null}
    </>
  );
}
