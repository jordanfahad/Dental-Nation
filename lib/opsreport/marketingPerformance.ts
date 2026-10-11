import 'server-only';
import { cache } from 'react';
import { clinicOfCenter } from '@/config/clinics';
import type { BillInput } from '@/lib/executive/acquisitionCore';
import { getFirstAppointmentChannels } from '@/lib/growth/channelPerformance';
import { getSupabaseAdmin, type AdminClient } from '@/lib/supabase/server';
import { selectAll } from '@/lib/supabase/selectAll';
import {
  computeMarketingPerformance,
  type FinanceRevenueInput,
  type MarketingPerformance,
  type MarketingPerformanceInput,
  type ManualSpendInput,
  type PerformanceBranch,
  type SpendInput,
} from './marketingPerformanceCore';

export type MarketingPerformanceReport = MarketingPerformance;
interface AdRow { date: string | null; spend: number | string | null }
interface RawRow { data: Record<string, unknown> | null }
interface LegacyRow { clinic: string; metric: string; txn_month: string | null; txn_year: number | null; gross: number | string | null }
interface FinanceRow { clinic: string; ym: string; gross: number | string | null }

function branchOfLabel(label: string): PerformanceBranch | null {
  const name = label.toLowerCase().replace(/[^a-z]/g, '');
  if (name.includes('tosun') || name === 'tdc') return 'dr-tosun';
  if (name.includes('maher') || name === 'amc') return 'al-maher';
  if (name.includes('wasl') || name.includes('dentalnation') || name === 'dn') return 'dn-alwasl';
  return null;
}

function numeric(value: unknown): number {
  const raw = String(value ?? '').trim().replace(/^(?:aed|dh)\s*/i, '').replace(/,/g, '');
  if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) throw new Error('Source amount is unavailable');
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error('Source amount is unavailable');
  return n;
}

/** RAW_Performance is explicitly month/day/year, including dates such as 3/1. */
function manualDate(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || /total/i.test(raw)) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const us = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!iso && !us) throw new Error('Manual campaign date is unavailable');
  const day = iso ? raw : `${us![3]}-${us![1].padStart(2, '0')}-${us![2].padStart(2, '0')}`;
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) throw new Error('Manual campaign date is unavailable');
  return day;
}

function manualRows(rows: RawRow[]): ManualSpendInput[] {
  const result: ManualSpendInput[] = [];
  for (const row of rows) {
    const d = row.data ?? {};
    // Only this separately recorded campaign is outside the Al Wasl account
    // feed. Other manual rows could duplicate the API and are not added.
    if (branchOfLabel(String(d.Clinic ?? '')) !== 'dr-tosun') continue;
    if (!/meta/i.test(String(d.Channel ?? ''))) continue;
    const date = manualDate(d.Date);
    if (date) result.push({ branch: 'dr-tosun', date, amount: numeric(d.Spend) });
  }
  return result;
}

const readOrNull = async <T>(read: () => Promise<T>): Promise<T | null> => {
  try { return await read(); } catch { return null; }
};

/** Read every source independently; a failed/limited source is never a zero. */
export async function readMarketingPerformance(
  asOf: string,
  db: AdminClient | null = getSupabaseAdmin(),
  attributionReader: (db: AdminClient) => Promise<ReadonlyMap<string, string>> = getFirstAppointmentChannels,
): Promise<MarketingPerformanceReport> {
  const empty: MarketingPerformanceInput = { asOf, bills: null, channels: null, metaSpend: null, googleSpend: null, manualSpend: null, financeRevenue: null };
  if (!db) return computeMarketingPerformance(empty);
  const ads = (table: string) => readOrNull(async (): Promise<SpendInput[]> => {
    const { data } = await selectAll(() => db.from(table).select('date, spend').lte('date', asOf), 'key');
    return (data as AdRow[]).map((r) => {
      if (!r.date) throw new Error('Ad date unavailable');
      return { date: r.date, amount: numeric(r.spend) };
    });
  });
  const [bills, channels, metaSpend, googleSpend, manualSpend, legacy, finance] = await Promise.all([
    readOrNull(async () => {
      const rows = (await selectAll(() => db.from('practo_bills_raw').select('bill_date, amount, data'), 'bill_key')).data as BillInput[];
      return rows.map((bill) => {
        if (String(bill.data?.bill_status ?? '').toUpperCase() === 'CANCELLED') return bill;
        if (!bill.bill_date || !String(bill.data?.mr_no ?? '').trim()) throw new Error('Bill identity or date is unavailable');
        return { ...bill, amount: numeric(bill.amount) };
      }).filter((bill) => bill.bill_date && bill.bill_date <= asOf);
    }),
    readOrNull(() => attributionReader(db)),
    ads('meta_insights_raw'),
    ads('google_ads_insights_raw'),
    readOrNull(async () => manualRows((await selectAll(() => db.from('raw_raw_social').select('data'), 'id')).data as RawRow[])),
    readOrNull(async (): Promise<FinanceRevenueInput[]> => {
      const { data } = await selectAll(() => db.from('clinic_revenue_raw').select('clinic, metric, txn_month, txn_year, gross'), 'id');
      return (data as LegacyRow[]).flatMap((r) => {
        const branch = branchOfLabel(r.clinic);
        if (!branch) return [];
        const month = r.txn_month && /^\d{4}-(0[1-9]|1[0-2])$/.test(r.txn_month) && (!r.txn_year || r.txn_month.startsWith(String(r.txn_year))) ? r.txn_month : null;
        return [{ branch, month, measure: r.metric === 'collected' ? 'collected' as const : 'legacy-billed' as const, amount: numeric(r.gross),
          note: branch === 'dn-alwasl' && r.txn_year === 2025 ? 'April 2025 is missing; March and May 2025 are partial exports.' : undefined }];
      });
    }),
    readOrNull(async (): Promise<FinanceRevenueInput[]> => {
      const { data } = await selectAll(() => db.from('finance_revenue_monthly').select('clinic, ym, gross'), 'id');
      return (data as FinanceRow[]).flatMap((r) => {
        const branch = branchOfLabel(r.clinic);
        return branch ? [{ branch, month: r.ym, measure: 'billed' as const, amount: numeric(r.gross) }] : [];
      });
    }),
  ]);
  const patientObservedThrough: Partial<Record<PerformanceBranch, string>> = {};
  for (const bill of bills ?? []) {
    if (!bill.bill_date || String(bill.data?.bill_status ?? '').toUpperCase() === 'CANCELLED') continue;
    const branch = clinicOfCenter(String(bill.data?.center_name ?? '')) === 'dr-tosun' ? 'dr-tosun' : 'dn-alwasl';
    if (!patientObservedThrough[branch] || bill.bill_date > patientObservedThrough[branch]!) patientObservedThrough[branch] = bill.bill_date;
  }
  return computeMarketingPerformance({
    asOf, bills, channels, metaSpend, googleSpend, manualSpend,
    financeRevenue: legacy === null && finance === null ? null : [...(legacy ?? []), ...(finance ?? [])],
    unavailableFinanceMeasures: [...(legacy === null ? ['collected' as const, 'legacy-billed' as const] : []), ...(finance === null ? ['billed' as const] : [])],
    patientObservedThrough,
    patientSourceNote: 'Al Wasl has no loaded bills from 24 April to 15 May 2026; this gap can shift a first observed bill and understate value or returns.',
  });
}

/** Request cache only: annual windows use the Dubai reporting day, not a preset. */
export const getMarketingPerformance = cache(async () => {
  const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return readMarketingPerformance(asOf);
});
