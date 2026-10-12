import { addDays, dubaiDay, type GbpPlan } from '@/lib/gbp/plan';
import type { PerformanceBrief } from './core';
import { buildAkbarPerformance, buildGbpDaily, PERFORMANCE_RECIPIENTS, type PerformanceKind } from './emails';

export interface DeliveryDependencies {
  configured: boolean;
  address: (who: 'shadi' | 'akbar' | 'fahad') => string | null;
  alreadySent: (kind: PerformanceKind, day: string, primary: string) => Promise<boolean>;
  claim: (kind: PerformanceKind, day: string) => Promise<boolean>;
  log: (kind: PerformanceKind, day: string, ok: boolean, recipients: string[], note: string) => Promise<void>;
  gbp: (asOf: string) => Promise<GbpPlan>;
  brief: (today: string, gbp: GbpPlan) => Promise<PerformanceBrief>;
  send: (mail: { to: string[]; cc: string[]; subject: string; html: string }) => Promise<{ ok: boolean }>;
}
/** Injectable runner: synthetic tests exercise the same time, skip and cap logic as cron. */
export async function deliverPerformance(now: Date, deps: DeliveryDependencies): Promise<string[]> {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(now));
  if (hour < 9 || hour >= 11) return [];
  const today = dubaiDay(now);
  const out: string[] = [];
  let plan: Promise<GbpPlan> | undefined;
  for (const kind of ['am:gbp-daily', 'am:akbar-perf'] as const) {
    try {
      const target = PERFORMANCE_RECIPIENTS[kind];
      const to = deps.address(target.to);
      const cc = deps.address(target.cc);
      if (!deps.configured || !to || !cc || to.toLowerCase() === cc.toLowerCase()) {
        await deps.log(kind, today, false, [], 'Not sent: transport or distinct To/cc addresses unavailable');
        out.push(`${kind}: configuration unavailable`); continue;
      }
      if (await deps.alreadySent(kind, today, to)) { out.push(`${kind}: daily cap reached`); continue; }
      plan ??= deps.gbp(addDays(today, -1));
      const gbp = await plan;
      const email = kind === 'am:gbp-daily' ? buildGbpDaily(gbp, today) : buildAkbarPerformance(await deps.brief(today, gbp));
      if (!email) {
        await deps.log(kind, today, false, [], 'Skipped: nothing new and no Off track status');
        out.push(`${kind}: nothing new`); continue;
      }
      if (!await deps.claim(kind, today)) { out.push(`${kind}: already claimed today`); continue; }
      // Claim stays even after transport failure: an ambiguous provider timeout
      // must never trigger a duplicate. Read failures above acquire no claim.
      const result = await deps.send({ to: [to], cc: [cc], ...email });
      await deps.log(kind, today, result.ok, [to, cc], result.ok ? 'Sent' : 'Transport failed or delivery uncertain; daily claim retained');
      out.push(`${kind}: ${result.ok ? 'sent' : 'transport failed; claim retained'}`);
    } catch {
      // No raw exception text: upstream errors can contain row contents or URLs.
      await deps.log(kind, today, false, [], 'Read/delivery failed; no automatic retry after a delivery claim').catch(() => undefined);
      out.push(`${kind}: read/delivery failed`);
    }
  }
  return out;
}
