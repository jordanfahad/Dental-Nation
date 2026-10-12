import type { AdminClient } from '@/lib/supabase/server';
import { parseDailyLog } from '@/lib/gbp/plan';
import type { RawRow } from './adapters/types';

export async function mirrorGbpDailyLog(db: AdminClient, rows: RawRow[]) {
  const raw = rows.map((r) => ({ row_index: r.rowIndex, data: r.data }));
  const parsed = parseDailyLog(raw);
  const { error } = await db.rpc('replace_gbp_daily_log', { rows: raw, invalid_count: parsed.invalid.length });
  if (error) throw new Error('GBP snapshot could not be saved; previous snapshot retained');
  return { invalid: parsed.invalid.length, examples: parsed.examples };
}
