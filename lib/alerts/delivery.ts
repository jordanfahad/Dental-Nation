/**
 * Delivery rules for the four daily 09:00 alert emails (lib/alerts/registry.ts).
 * Pure apart from the injected dependencies, so tests exercise the same time,
 * preview, claim and failure logic as the cron with no network.
 *
 *  - Owner pause (app_secrets alerts_paused) stops everything, previews included;
 *    a pending preview request is kept until the pause is lifted.
 *  - Preview: a request row (PREVIEW_KEY) is consumed atomically; only the run
 *    that deleted it emails every preview, to Fahad only, subject "[Preview] ".
 *  - Live: only 09:00 to 10:59 Dubai and only from LIVE_FROM. Each kind is
 *    claimed before sending and the claim is kept even when the transport fails
 *    or is uncertain: at most one email per kind per day, no automatic retry.
 *  - One failing email never stops the others.
 */
import { LIVE_FROM, PREVIEW_TO, SEND_HOURS, nextSendDay, previewNote, recipientsLine, type AlertEmail, type BuildOpts, type DailyAlert, type Who } from './registry';

export interface Mail { to: string[]; cc: string[]; subject: string; html: string }

export interface DailyAlertDeps {
  alerts: readonly DailyAlert[];
  /** True when alerts_paused is 'true' OR the pause flag cannot be read (fail closed). */
  paused: () => Promise<boolean>;
  /** An email transport is configured. */
  configured: boolean;
  address: (who: Who) => string | null | undefined;
  /** Reads and builds one email. */
  render: (alert: DailyAlert, today: string, opts: BuildOpts) => Promise<AlertEmail>;
  /** Atomically deletes the preview request; true only when this call deleted a row. */
  consumePreview: () => Promise<boolean>;
  /** Whether the kind is already claimed for the day (read only). */
  claimed: (kind: string, day: string) => Promise<boolean>;
  /** Inserts the daily claim; false when another run holds it. */
  claim: (kind: string, day: string) => Promise<boolean>;
  log: (kind: string, day: string, ok: boolean, recipients: string[], note: string) => Promise<void>;
  send: (mail: Mail) => Promise<{ ok: boolean }>;
}

export const dubaiDay = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
export const dubaiHour = (at: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }).format(at)) % 24;

/** True only in the 09:00 to 10:59 Dubai window on or after LIVE_FROM. */
export const liveWindow = (now: Date) => dubaiDay(now) >= LIVE_FROM && (SEND_HOURS as readonly number[]).includes(dubaiHour(now));

/** Trimmed addresses, or null when any is missing or two are the same (case-insensitive). */
export function resolveRecipients(alert: Pick<DailyAlert, 'to' | 'cc'>, address: DailyAlertDeps['address']): { to: string[]; cc: string[] } | null {
  const pick = (who: readonly Who[]) => who.map((w) => address(w)?.trim() ?? '');
  const to = pick(alert.to), cc = pick(alert.cc);
  const all = [...to, ...cc];
  if (!to.length || all.some((a) => !a)) return null;
  if (new Set(all.map((a) => a.toLowerCase())).size !== all.length) return null;
  return { to, cc };
}

async function previews(now: Date, today: string, deps: DailyAlertDeps, out: string[]) {
  if (!deps.configured) { out.push('preview: email transport not configured; request kept'); return; }
  const fahad = deps.address(PREVIEW_TO)?.trim();
  if (!fahad) { out.push('preview: no address for Fahad; request kept'); return; }
  let consumed = false;
  try { consumed = await deps.consumePreview(); } catch { out.push('preview: request could not be read; kept'); return; }
  if (!consumed) return;
  const sendDay = nextSendDay(today, dubaiHour(now));
  for (const alert of deps.alerts) {
    const kind = `preview:${alert.kind}`;
    let delivered = false;
    try {
      const email = await deps.render(alert, today, { preview: previewNote(alert, sendDay), recipients: recipientsLine(alert) });
      const result = await deps.send({ to: [fahad], cc: [], subject: `[Preview] ${email.subject}`, html: email.html });
      delivered = result.ok;
      await deps.log(kind, today, result.ok, [fahad], result.ok ? 'Preview sent to Fahad' : 'Preview transport failed');
      out.push(`${kind}: ${result.ok ? 'sent to Fahad' : 'transport failed'}`);
    } catch {
      if (delivered) { out.push(`${kind}: sent to Fahad; log unavailable`); continue; }
      // No raw exception text: upstream errors can contain row contents or URLs.
      await deps.log(kind, today, false, [], 'Preview could not be built or sent').catch(() => undefined);
      out.push(`${kind}: build or send failed`);
    }
  }
}

const LIVE_FAILURE = {
  build: ['Read or build failed; tried again on the next run', 'read or build failed'],
  claim: ['Not sent: daily claim unavailable; tried again on the next run', 'daily claim unavailable'],
  send: ['Delivery failed after the daily claim; no automatic retry', 'delivery failed; claim retained'],
} as const;

/**
 * Failure log for a run that does not hold the daily claim. Skipped when the
 * kind is claimed by now (or the check fails): an overlapping run claimed and
 * sent, and its audit row must not be overwritten with "not sent".
 */
async function failBeforeClaim(deps: DailyAlertDeps, kind: string, today: string, note: string) {
  const already = await deps.claimed(kind, today).catch(() => true);
  if (!already) await deps.log(kind, today, false, [], note);
}

async function live(today: string, deps: DailyAlertDeps, out: string[]) {
  for (const alert of deps.alerts) {
    const { kind } = alert;
    // Checked first; a failed check is never followed by a log write. The audit
    // row is keyed (kind, day), so any failure before this run holds the claim
    // re-checks the claim before logging (failBeforeClaim): an overlapping run
    // that claimed and sent in the meantime keeps its "Sent" row.
    try {
      if (await deps.claimed(kind, today)) { out.push(`${kind}: already sent today`); continue; }
    } catch { out.push(`${kind}: claim check unavailable`); continue; }
    let stage: keyof typeof LIVE_FAILURE = 'build';
    let delivered = false;
    try {
      const rcpt = resolveRecipients(alert, deps.address);
      if (!deps.configured || !rcpt) {
        await failBeforeClaim(deps, kind, today, deps.configured ? 'Not sent: recipient addresses missing or not distinct' : 'Not sent: email transport not configured');
        out.push(`${kind}: configuration unavailable`); continue;
      }
      const email = await deps.render(alert, today, { recipients: recipientsLine(alert) });
      stage = 'claim';
      if (!await deps.claim(kind, today)) { out.push(`${kind}: already claimed today`); continue; }
      stage = 'send';
      // The claim stays even after a transport failure: an ambiguous provider
      // timeout must never cause a second copy. Failures before the claim retry next run.
      const result = await deps.send({ to: rcpt.to, cc: rcpt.cc, ...email });
      delivered = result.ok;
      await deps.log(kind, today, result.ok, [...rcpt.to, ...rcpt.cc], result.ok ? 'Sent' : 'Transport failed or delivery uncertain; daily claim retained');
      out.push(`${kind}: ${result.ok ? 'sent' : 'transport failed; claim retained'}`);
    } catch {
      if (delivered) { out.push(`${kind}: sent; log unavailable`); continue; }
      // No raw exception text: upstream errors can contain row contents or URLs.
      // Before the claim is ours (build, claim), the row may belong to another run.
      const note = LIVE_FAILURE[stage][0];
      await (stage === 'send' ? deps.log(kind, today, false, [], note) : failBeforeClaim(deps, kind, today, note)).catch(() => undefined);
      out.push(`${kind}: ${LIVE_FAILURE[stage][1]}`);
    }
  }
}

/** One cron tick. Returns a line per action for the cron response. */
export async function deliverDailyAlerts(now: Date, deps: DailyAlertDeps): Promise<string[]> {
  let paused = true;
  try { paused = await deps.paused(); } catch { paused = true; }
  if (paused) return ['paused by owner'];
  const today = dubaiDay(now);
  const out: string[] = [];
  await previews(now, today, deps, out);
  if (liveWindow(now)) await live(today, deps, out);
  return out;
}
