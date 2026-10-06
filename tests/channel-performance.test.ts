import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import { getChannelPerformance } from '../lib/growth/channelPerformance';
import { luviAnswersHtml } from '../lib/smileclub/briefingNotes';
import { phonePathSentence } from '../lib/growth/phonePath';

test('growth report reads 2,345 synthetic appointments and the email shares its capped three-input result', async () => {
  const pages: number[][] = [];
  const tables: Record<string, Record<string, unknown>[]> = {
    practo_appointments_raw: Array.from({ length: 2345 }, (_, i) => ({ appt_date: '2026-09-20', mr_no: `DN-FIXTURE-${i}`, status: 'Completed', doctor: '', patient_name: null, patient_phone: null, data: {} })),
    google_ads_click_types: [{ date: '2026-09-20', click_type: 'CALLS', clicks: 5, campaign_name: 'Synthetic campaign' }],
    ga4_lead_events_source: [
      { day: '2026-09-20', event_name: 'whatsapp_click', source_medium: 'google / cpc', event_count: 78 },
      { day: '2026-09-20', event_name: 'phone_click', source_medium: 'google / cpc', event_count: 41 },
    ],
  };
  const db = { from(table: string) {
    const rows = tables[table] ?? [];
    const q = {
      select() { return q; }, order() { return q; }, in() { return q; }, limit() { return q; },
      async range(from: number, to: number) { if (table === 'practo_appointments_raw') pages.push([from, to]); return { data: rows.slice(from, to + 1), error: null }; },
      then(resolve: (value: unknown) => void) { resolve({ data: rows, error: null }); },
    };
    return q;
  } } as unknown as AdminClient;
  const report = await getChannelPerformance({ from: '2026-09-01', to: '2026-09-30' }, 'dn-alwasl', db);
  assert.deepEqual(pages, [[0, 999], [1000, 1999], [2000, 2999]]);
  assert.equal(report.totals.booked, 2345); assert.equal(report.phonePath?.untracedPool, 2345);
  assert.equal(report.phonePath?.estBookingsReconciled, 23); assert.equal(report.mvmSelection?.keys.length, 23);
  assert.equal(report.channels.find((c) => c.key === 'paid-search')?.estExtraBookings, 23);
  assert.ok(luviAnswersHtml(null, report).includes(phonePathSentence(report.phonePath!)));
});
