import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { AdminClient } from '../lib/supabase/server';
import { getChannelPerformance, getFirstAppointmentChannels } from '../lib/growth/channelPerformance';
import { getAdSpendForRange } from '../lib/marketing/report';

type Row = Record<string, unknown>;

/** In-memory source only; deliberately no production identities or credentials. */
function syntheticDb(tables: Record<string, Row[]>, failTable?: string) {
  const pages: { table: string; from: number; to: number; order: string[] }[] = [];
  const db = { from(table: string) {
    let rows = [...(tables[table] ?? [])];
    const order: string[] = [];
    const q = {
      select() { return q; },
      order(column: string) { order.push(column); return q; },
      in() { return q; },
      limit() { return q; },
      gte(column: string, value: string) { rows = rows.filter((r) => String(r[column]) >= value); return q; },
      lte(column: string, value: string) { rows = rows.filter((r) => String(r[column]) <= value); return q; },
      async range(from: number, to: number) {
        pages.push({ table, from, to, order });
        rows.sort((a, b) => {
          for (const column of order) {
            const comparison = String(a[column] ?? '').localeCompare(String(b[column] ?? ''));
            if (comparison) return comparison;
          }
          return 0;
        });
        return table === failTable
          ? { data: null, error: new Error('Synthetic source failure') }
          : { data: rows.slice(from, to + 1), error: null };
      },
      then(resolve: (value: unknown) => void) { resolve({ data: rows, error: null }); },
    };
    return q;
  } } as unknown as AdminClient;
  return { db, pages };
}

test('marketing attribution shares Growth first-appointment verdicts and stable same-day ordering', async () => {
  const file = 'DN-SYNTHETIC-A';
  const appointment = (key: string, day: string, bookedBy: string) => ({
    appt_key: key, appt_date: day, status: 'Completed', mr_no: file,
    patient_phone: null, patient_name: null, doctor: '', data: { booked_by: bookedBy },
  });
  const { db } = syntheticDb({
    practo_appointments_raw: [
      appointment('c', '2026-06-01', ''),
      appointment('b', '2026-05-01', ''),
      appointment('a', '2026-05-01', 'APIPatient'),
      { ...appointment('d', '2026-04-01', ''), data: { remarks: 'test' } },
    ],
    practo_bills_raw: [{ bill_date: '2026-06-01', amount: 250, data: { mr_no: file } }],
  });
  const channels = await getFirstAppointmentChannels(db);
  const growth = await getChannelPerformance({ from: '2026-06-01', to: '2026-06-30' }, 'all', db);
  assert.equal(channels.size, 1);
  assert.equal(channels.get(file), 'website');
  assert.equal(growth.channels.find((channel) => channel.key === channels.get(file))?.revenue, 250);
  assert.equal(growth.channels.find((channel) => channel.key === 'direct-walkin')?.revenue, 0);
});

test('marketing attribution reads every appointment page and preserves unavailable sources as errors', async () => {
  const { db, pages } = syntheticDb({
    practo_appointments_raw: Array.from({ length: 1001 }, (_, index) => ({
      appt_key: String(index).padStart(4, '0'), appt_date: '2026-05-01',
      status: 'Completed', mr_no: `DN-SYNTHETIC-${index}`, patient_phone: null,
      patient_name: null, doctor: '', data: {},
    })),
  });
  assert.equal((await getFirstAppointmentChannels(db)).size, 1001);
  assert.deepEqual(pages.filter((page) => page.table === 'practo_appointments_raw'), [
    { table: 'practo_appointments_raw', from: 0, to: 999, order: ['appt_key'] },
    { table: 'practo_appointments_raw', from: 1000, to: 1999, order: ['appt_key'] },
  ]);
  await assert.rejects(getFirstAppointmentChannels(null), /sources unavailable/);
  await assert.rejects(getFirstAppointmentChannels(syntheticDb({}, 'leads').db), /Source read failed/);
});

test('Executive ad spend includes both platforms beyond the first page, inside the inclusive window', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => ({
    key: String(index).padStart(4, '0'), date: index % 2 ? '2026-05-01' : '2026-05-31', spend: 2,
  }));
  const { db, pages } = syntheticDb({
    meta_insights_raw: [...rows, { key: 'outside', date: '2026-04-30', spend: 900 }],
    google_ads_insights_raw: [...rows, { key: 'outside', date: '2026-06-01', spend: 900 }],
  });
  const spend = await getAdSpendForRange('2026-05-01', '2026-05-31', db);
  assert.equal(spend.meta, 2002);
  assert.equal(spend.google, 2002);
  assert.equal(spend.total, 4004);
  assert.equal(spend.rows, 2002);
  assert.deepEqual(spend.daily, [{ date: '2026-05-01', spend: 2000 }, { date: '2026-05-31', spend: 2004 }]);
  assert.equal(spend.metaLatest, '2026-05-31');
  assert.equal(spend.googleLatest, '2026-05-31');
  assert.equal(pages.length, 4);
  assert.ok(pages.every((page) => page.order.length === 1 && page.order[0] === 'key'));
});
