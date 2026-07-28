import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * Shared-secret auth for machine callers (GitHub Actions, external schedulers)
 * on endpoints that sit outside the password gate.
 *
 * Accepts EITHER secret:
 *   - WIDGET_HEALTH_SECRET — dedicated to the widget monitor. Preferred, because
 *     it can be added without touching CRON_SECRET, which Vercel stores as
 *     write-only ("Sensitive"): its value can never be read back, so wiring the
 *     monitor to it would have meant rotating it — and a rotation briefly breaks
 *     the 15-minute sync cron until the app redeploys.
 *   - CRON_SECRET — the existing secret, still honoured so nothing has to change
 *     if it's ever consolidated.
 *
 * Both are the operator's own trusted secrets, so accepting either widens
 * nothing meaningfully; it just avoids a lockout when only one is configured.
 */
export function authorizeService(req: NextRequest): boolean {
  const header = req.headers.get('authorization');
  if (!header) return false;
  const accepted = [process.env.WIDGET_HEALTH_SECRET, process.env.CRON_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  if (accepted.length === 0) return false; // never accept writes unprotected
  return accepted.some((s) => header === `Bearer ${s}`);
}
