'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ChannelPerf } from '@/lib/growth/channelPerformance';

/**
 * Paid Search as a collapsible group: the parent row carries the combined
 * story (≈ marks totals containing estimates) and CLICKING it reveals the two
 * sub-rows — website bookings (measured) and phone-call bookings (estimated).
 * Client component purely for the open/closed state.
 */

const int = (n: number) => Math.round(n).toLocaleString('en-US');
const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`;
const aedShort = (n: number) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `AED ${(n / 1_000).toFixed(0)}k` : `AED ${Math.round(n)}`;

export function PaidSearchRows({ p, traceQs, mktQs = '' }: { p: ChannelPerf; traceQs: string; mktQs?: string }) {
  const [open, setOpen] = useState(false);
  const est = p.estExtraBookings ?? 0;
  const combined = (a: number, b?: number) => `≈${int(a + (b ?? 0))}`;
  const sub = 'py-1.5 text-right align-top text-[11.5px] tabular-nums';
  return (
    <>
      <tr className="cursor-pointer border-t border-line/70 hover:bg-panel/30" onClick={() => setOpen((v) => !v)}>
        <td className="py-2.5 pl-3 pr-2 align-top">
          <span className="block text-[12.5px] font-medium leading-tight text-ink">
            <span className="mr-1 inline-block w-3 text-[10px] text-ink-faint">{open ? '▾' : '▸'}</span>
            <Link
              href={`/?tab=marketing&mtab=google${mktQs}`}
              className="underline-offset-2 hover:text-accent hover:underline"
              title="Open Google Ads Performance — campaigns, budgets, ad groups, ads"
              onClick={(e) => e.stopPropagation()}
            >
              {p.label}
            </Link>
          </span>
          <span className="mt-0.5 block max-w-[230px] pl-4 text-[10.5px] leading-snug text-ink-faint">
            {open ? 'Website bookings (measured) + phone-call bookings (MTA-MVM · multi-touch attribution Markov model). ≈ = includes MTA-MVM figures.' : 'Click to expand the split.'}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className="text-[12.5px] font-medium tabular-nums text-ink">{p.impressions == null ? '—' : int(p.impressions)}</span>
        </td>
        <td className="px-2 py-2.5 text-right align-top"><span className="text-[12.5px] font-medium tabular-nums text-ink">{combined(p.enquiries, p.estEnquiries)}</span></td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className="text-[13px] font-semibold tabular-nums text-ink">{combined(p.booked, est)}</span>
          <span className="block text-[10px] text-ink-faint">{int(p.booked)} measured + {int(est)} MTA-MVM</span>
        </td>
        <td className="px-2 py-2.5 text-right align-top"><span className="text-[12.5px] font-medium tabular-nums text-ink">{combined(p.showed, p.estShowed)}</span></td>
        <td className="px-2 py-2.5 text-right align-top"><span className="text-[12.5px] font-medium tabular-nums text-ink">{combined(p.treated, p.estTreated)}</span></td>
        <td className="px-2 py-2.5 text-right align-top">
          <span className="text-[12.5px] font-semibold tabular-nums text-ink">≈{aedShort(p.revenue + (p.estRevenue ?? 0))}</span>
        </td>
        <td className="py-2.5 pl-2 pr-3 text-right align-top">
          {p.spend != null ? (
            <>
              <span className="text-[12px] font-medium tabular-nums text-ink">{aedShort(p.spend)}</span>
              <span className="block text-[10px] leading-snug text-ink-soft">
                {p.estCostPerEnquiry != null ? `enquiry ≈${aed(p.estCostPerEnquiry)}` : ''}
                {p.estCostPerBooked != null ? ` · booking ≈${aed(p.estCostPerBooked)}` : ''}
              </span>
              <span className="block text-[10px] leading-snug text-ink-soft">
                {p.estCostPerShowed != null ? `show ≈${aed(p.estCostPerShowed)}` : ''}
                {p.estCostPerTreated != null ? ` · treated ≈${aed(p.estCostPerTreated)}` : ''}
              </span>
              <span className="block text-[10px] leading-snug text-ink-soft">
                {p.estCostPerPatient != null ? `CPA ≈${aed(p.estCostPerPatient)}` : ''}
                {p.estRoas != null ? ` · ROAS ≈${p.estRoas.toFixed(1)}×` : ''}
              </span>
              {p.spendThrough ? <span className="block text-[10px] text-watch">spend synced to {p.spendThrough}</span> : null}
            </>
          ) : <span className="text-[11px] text-ink-faint">—</span>}
        </td>
      </tr>
      {open ? (
        <>
          <tr className="bg-panel/30">
            <td className="py-1.5 pl-7 pr-2 text-[11px] text-ink-soft">↳ Website bookings <span className="text-ink-faint">(measured)</span></td>
            <td className={`px-2 ${sub} text-ink-faint`}>—</td>
            <td className={`px-2 ${sub} text-ink`}>{int(p.enquiries)}</td>
            <td className={`px-2 ${sub} font-medium text-ink`}>{int(p.booked)}</td>
            <td className={`px-2 ${sub} text-ink`}>{int(p.showed)}</td>
            <td className={`px-2 ${sub} text-ink`}>{int(p.treated)}</td>
            <td className={`px-2 ${sub} text-ink`}>{p.revenue > 0 ? aedShort(p.revenue) : '—'}</td>
            <td className="py-1.5 pl-2 pr-3 text-right">
              <Link href={`/?tab=group&gtab=growth&gchan=paid-search${traceQs}`} className="text-[10.5px] font-medium text-accent hover:underline" onClick={(e) => e.stopPropagation()}>trace →</Link>
            </td>
          </tr>
          <tr className="bg-panel/30">
            <td className="py-1.5 pl-7 pr-2 text-[11px] text-watch">↳ Phone-call bookings <span className="opacity-80">(MTA-MVM)</span></td>
            <td className={`px-2 ${sub} text-ink-faint`}>—</td>
            <td className={`px-2 ${sub} text-watch`}>{int(p.estEnquiries ?? 0)}</td>
            <td className={`px-2 ${sub} font-medium text-watch`}>{int(est)}</td>
            <td className={`px-2 ${sub} text-watch`}>{int(p.estShowed ?? 0)}</td>
            <td className={`px-2 ${sub} text-watch`}>{int(p.estTreated ?? 0)}</td>
            <td className={`px-2 ${sub} text-watch`}>{p.estRevenue ? aedShort(p.estRevenue) : '—'}</td>
            <td className="py-1.5 pl-2 pr-3 text-right">
              <Link href={`/?tab=group&gtab=growth&gchan=direct-walkin${traceQs}`} className="text-[10.5px] font-medium text-accent hover:underline" onClick={(e) => e.stopPropagation()}>patients →</Link>
            </td>
          </tr>
        </>
      ) : null}
    </>
  );
}
