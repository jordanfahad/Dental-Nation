import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getSheetsClient, isGoogleConfigured } from '@/lib/sync/google-auth';
import { SheetsAdapter } from '@/lib/sync/adapters/sheets-adapter';
import { sheetMapping } from '@/config/sheet-mapping';
import { emailConfigured } from '@/lib/notify/email';
import { sendNewLeadAlerts, type LeadAlertResult } from '@/lib/ops/alerts';

/**
 * Fast lead-alert lane. The full sync runs every 15 minutes, which meant a
 * website lead could sit up to 15 minutes before its alert email went out.
 * This pulse runs on its own every-minute cron and does ONLY the two steps
 * that matter for alert latency:
 *
 *   1. refresh raw_zavis from the booking-widget sheet (Bookings +
 *      Cancellations tabs — one cheap Sheets read, same adapter and same
 *      delete-then-insert mirror the sync uses, so the two writers are
 *      interchangeable and idempotent);
 *   2. run sendNewLeadAlerts(), which emails anything newer than the
 *      high-water mark and advances it.
 *
 * Everything else (silver/gold tables, ad APIs, snapshots) stays on the
 * 15-minute sync. Cheap no-op when nothing is configured: no Google service
 * account or no email transport → skip without touching the table.
 */
export interface LeadPulseResult {
  ok: boolean;
  refreshed: number | null;
  alerts: LeadAlertResult | null;
  note?: string;
}

export async function runLeadAlertPulse(): Promise<LeadPulseResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, refreshed: null, alerts: null, note: 'supabase not configured' };
  if (!isGoogleConfigured()) return { ok: false, refreshed: null, alerts: null, note: 'google service account not configured' };
  if (!emailConfigured()) return { ok: true, refreshed: null, alerts: null, note: 'email transport not configured — nothing to alert with' };

  const source = sheetMapping.bookingWidget;
  const adapter = new SheetsAdapter(getSheetsClient(), source);
  const { rows } = await adapter.fetch();

  // Same bronze mirror as the sync (delete + batched insert). Skip the wipe if
  // the sheet read came back empty — an API hiccup must not blank the table.
  if (rows.length > 0) {
    await supabase.from(source.rawTable).delete().gte('id', 0);
    const payload = rows.map((r) => ({ row_index: r.rowIndex, data: r.data }));
    for (let i = 0; i < payload.length; i += 500) {
      await supabase.from(source.rawTable).insert(payload.slice(i, i + 500));
    }
  }

  const alerts = await sendNewLeadAlerts(supabase);
  return { ok: !alerts.error, refreshed: rows.length, alerts };
}
