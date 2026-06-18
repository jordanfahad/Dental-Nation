import 'server-only';
import { type AdminClient, getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { getSheetsClient, isGoogleConfigured } from './google-auth';
import { SheetsAdapter } from './adapters/sheets-adapter';
import { fetchGa4Summary } from './adapters/ga4-adapter';
import { syncPracto } from './adapters/practo-adapter';
import { isPractoConfigured } from '@/config/practo';
import { syncMeta } from './adapters/meta-adapter';
import { isMetaConfigured } from '@/config/meta';
import {
  normalizePerformance,
  normalizeBlockers,
  normalizeContent,
  normalizeLeads,
  normalizeBookings,
  type PerfRow,
  type NormalizedLead,
  type NormalizedBooking,
} from './normalize';
import { allSources } from '@/config/sheet-mapping';
import { reportDateForSync, previousDate } from '@/lib/dates';
import { computeFunnelFromPerformance, biggestLeakage } from '@/lib/metrics/funnel';
import { channelMixFromPerformance, rankChannels } from '@/lib/metrics/channels';
import { computeRates } from '@/lib/metrics/rates';
import { suggestDecision } from '@/lib/metrics/decision';
import { decisionRules } from '@/config/decision-rules';
import { ownerFor } from '@/config/data-gap-owners';
import type { Blocker, ChannelStatus, ContentItem, DataGap } from '@/lib/types';

export type SyncTrigger = 'cron' | 'manual';

export interface SyncSummary {
  status: 'success' | 'partial' | 'failed' | 'skipped';
  message: string;
  reportDate: string;
  sheetsOk: string[];
  sheetsFailed: string[];
  rowsIngested: number;
  dataGaps: DataGap[];
}

/** Truncate-and-reload a bronze mirror table. */
async function mirrorBronze(
  supabase: AdminClient,
  table: string,
  rows: { rowIndex: number; data: Record<string, string> }[],
) {
  await supabase.from(table).delete().gte('id', 0);
  if (rows.length === 0) return;
  const payload = rows.map((r) => ({ row_index: r.rowIndex, data: r.data }));
  for (let i = 0; i < payload.length; i += 500) {
    await supabase.from(table).insert(payload.slice(i, i + 500));
  }
}

/** Derive §B channel_status rows from the paid channels present in performance. */
function deriveChannelStatus(perf: PerfRow[]): ChannelStatus[] {
  const channels = [...new Set(perf.map((r) => r.channel).filter(Boolean))];
  return channels.map((channel) => ({
    channel,
    is_live: true,
    content_populated: true,
    cta_correct: true,
    destination_correct: true,
    tracking_active: true,
    owner: 'Acquisition',
    blocker: null,
  }));
}

/**
 * The full ingestion pipeline (§9). Orchestrates fetch → bronze → silver → gold
 * → log. A single sheet failing is recorded as `partial`, never aborting the run.
 * Idempotent: running twice in one Dubai day yields the same snapshots.
 */
export async function runSync(trigger: SyncTrigger): Promise<SyncSummary> {
  const reportDate = reportDateForSync();
  const startedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    return {
      status: 'skipped',
      message: 'Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      reportDate,
      sheetsOk: [],
      sheetsFailed: [],
      rowsIngested: 0,
      dataGaps: [],
    };
  }
  const supabase = getSupabaseAdmin()!;

  if (!isGoogleConfigured()) {
    const summary: SyncSummary = {
      status: 'skipped',
      message: 'Google service account not configured — sheets cannot be read yet.',
      reportDate,
      sheetsOk: [],
      sheetsFailed: [],
      rowsIngested: 0,
      dataGaps: [{ area: 'tracking', detail: 'Google service account not configured', owner: 'Data/Analytics' }],
    };
    await writeLog(supabase, startedAt, summary, `manual=${trigger}`);
    return summary;
  }

  const sheets = getSheetsClient();
  const sheetsOk: string[] = [];
  const sheetsFailed: string[] = [];
  const dataGaps: DataGap[] = [];
  let rowsIngested = 0;

  const perf: PerfRow[] = [];
  const blockers: Blocker[] = [];
  const content: ContentItem[] = [];
  const leads: NormalizedLead[] = [];
  const bookings: NormalizedBooking[] = [];

  for (const source of allSources) {
    try {
      const adapter = new SheetsAdapter(sheets, source);
      const { rows, warnings } = await adapter.fetch();
      rowsIngested += rows.length;
      for (const w of warnings) {
        dataGaps.push({ area: 'tracking', detail: `${source.label}: ${w}`, owner: 'Data/Analytics' });
      }
      await mirrorBronze(supabase, source.rawTable, rows);

      if (source.target === 'performance') {
        const { rows: perfRows, dataGaps: gaps } = normalizePerformance(source, rows);
        dataGaps.push(...gaps);
        perf.push(...perfRows);
      } else if (source.target === 'blockers') {
        const { rows: b, dataGaps: gaps } = normalizeBlockers(source, rows);
        dataGaps.push(...gaps);
        blockers.push(...b);
      } else if (source.target === 'content_items') {
        const { rows: c, dataGaps: gaps } = normalizeContent(source, rows);
        dataGaps.push(...gaps);
        content.push(...c);
      } else if (source.target === 'leads') {
        const { rows: l, dataGaps: gaps } = normalizeLeads(source, rows);
        dataGaps.push(...gaps);
        leads.push(...l);
      } else if (source.target === 'bookings') {
        const { rows: bk, dataGaps: gaps } = normalizeBookings(source, rows);
        dataGaps.push(...gaps);
        bookings.push(...bk);
      }
      sheetsOk.push(source.label);
    } catch (err) {
      sheetsFailed.push(source.label);
      dataGaps.push({
        area: 'tracking',
        detail: `${source.label} failed: ${(err as Error).message}`,
        owner: 'Data/Analytics',
      });
    }
  }

  // ----- GA4 (website analytics) — a decoupled single-row current summary.
  // A GA4 failure is just another failed source: it records a data gap but never
  // aborts the sheet sync (the status logic treats it like any other source).
  if (isGoogleConfigured()) {
    try {
      const ga4 = await fetchGa4Summary();
      await supabase
        .from('ga4_summary')
        .upsert({ id: 1, ...ga4, computed_at: new Date().toISOString() }, { onConflict: 'id' });
      sheetsOk.push('Google Analytics (GA4)');
    } catch (err) {
      sheetsFailed.push('Google Analytics (GA4)');
      dataGaps.push({
        area: 'tracking',
        detail: `Google Analytics (GA4) failed: ${(err as Error).message}`,
        owner: 'Data/Analytics',
      });
    }
  }

  // ----- Practo Insta (clinic PMS bills) — live token-based API. Best-effort:
  // a failure records a data gap but never aborts the sync. Bills land in the
  // bronze table (shape confirmed via /api/practo/probe, then normalized).
  if (isPractoConfigured()) {
    try {
      const p = await syncPracto(supabase);
      if (p.ok) {
        sheetsOk.push(`Practo Insta (bills) — ${p.stored} stored`);
        rowsIngested += p.stored;
      } else {
        sheetsFailed.push('Practo Insta (bills)');
        dataGaps.push({
          area: 'clinic',
          detail: `Practo Insta sync failed: ${p.error ?? 'unknown'}`,
          owner: 'Data/Analytics',
        });
      }
    } catch (err) {
      sheetsFailed.push('Practo Insta (bills)');
      dataGaps.push({
        area: 'clinic',
        detail: `Practo Insta sync failed: ${(err as Error).message}`,
        owner: 'Data/Analytics',
      });
    }
  }

  // ----- Meta (Facebook/Instagram) Ads — live campaign spend. Best-effort:
  // a failure records a data gap but never aborts the sync.
  if (isMetaConfigured()) {
    try {
      const m = await syncMeta(supabase);
      if (m.ok) {
        sheetsOk.push(`Meta Ads (insights) — ${m.stored} rows`);
        rowsIngested += m.stored;
      } else {
        sheetsFailed.push('Meta Ads (insights)');
        dataGaps.push({
          area: 'spend',
          detail: `Meta Ads sync failed: ${m.error ?? 'unknown'}`,
          owner: 'Acquisition',
        });
      }
    } catch (err) {
      sheetsFailed.push('Meta Ads (insights)');
      dataGaps.push({ area: 'spend', detail: `Meta Ads sync failed: ${(err as Error).message}`, owner: 'Acquisition' });
    }
  }

  // ----- Silver upserts -----
  if (blockers.length > 0) {
    for (let i = 0; i < blockers.length; i += 500) {
      await supabase.from('blockers').upsert(blockers.slice(i, i + 500), { onConflict: 'id' });
    }
  }
  if (leads.length > 0) {
    for (let i = 0; i < leads.length; i += 500) {
      await supabase.from('leads').upsert(leads.slice(i, i + 500), { onConflict: 'id' });
    }
  }
  // Bookings: store ONLY non-test rows (seed/zavis/test/sagar excluded).
  const realBookings = bookings
    .filter((b) => !b.is_test)
    .map((b) => ({ ...b, synced_at: new Date().toISOString() }));
  if (realBookings.length > 0) {
    for (let i = 0; i < realBookings.length; i += 500) {
      await supabase.from('bookings').upsert(realBookings.slice(i, i + 500), { onConflict: 'id' });
    }
  }
  if (content.length > 0) {
    for (let i = 0; i < content.length; i += 500) {
      await supabase.from('content_items').upsert(content.slice(i, i + 500), { onConflict: 'id' });
    }
  }
  const channelStatus = deriveChannelStatus(perf);
  if (channelStatus.length > 0) {
    await supabase.from('channel_status').upsert(channelStatus, { onConflict: 'channel' });
  }

  // ----- Gold: a snapshot per distinct perf date (most recent ~60) -----
  const hasHighImpactOpen = blockers.some(
    (b) => b.impact === 'high' && (b.type === 'tracking' || b.type === 'PAC') && b.status !== 'done',
  );

  const allDates = [...new Set(perf.map((r) => r.date).filter((d): d is string => !!d))].sort();
  const dates = allDates.slice(-60);
  for (const date of dates) {
    await computeAndUpsertSnapshot(supabase, date, perf, dataGaps, hasHighImpactOpen);
  }

  const status: SyncSummary['status'] =
    sheetsFailed.length === 0 ? 'success' : sheetsOk.length > 0 ? 'partial' : 'failed';
  const summary: SyncSummary = {
    status,
    message: `${status}: ${sheetsOk.length} ok, ${sheetsFailed.length} failed`,
    reportDate,
    sheetsOk,
    sheetsFailed,
    rowsIngested,
    dataGaps,
  };
  await writeLog(supabase, startedAt, summary, null);
  return summary;
}

/**
 * Compute and upsert the daily_snapshot for a single performance date. Pure
 * enough to be exercised by the dry-run validation. funnel(today=date,
 * yesterday=prevDate, total=all rows); real spend → real cost metrics.
 */
export async function computeAndUpsertSnapshot(
  supabase: AdminClient,
  date: string,
  perf: PerfRow[],
  baseGaps: DataGap[],
  hasHighImpactOpen: boolean,
) {
  const snapshot = buildSnapshotRow(date, perf, baseGaps, hasHighImpactOpen);
  await supabase.from('daily_snapshot').upsert(snapshot, { onConflict: 'report_date' });
}

/** Pure snapshot builder — used by the sync and the dry-run validator. */
export function buildSnapshotRow(
  date: string,
  perf: PerfRow[],
  baseGaps: DataGap[],
  hasHighImpactOpen: boolean,
) {
  const prevDate = previousDate(date);
  const funnel = computeFunnelFromPerformance(perf, date, prevDate);
  // Preserve null (data gap) — never coerce a missing stage to 0.
  const stageRaw = (key: string) => funnel.find((f) => f.key === key)?.today ?? null;
  const stage = (key: string) => stageRaw(key) ?? 0;

  const todayRows = perf.filter((r) => r.date === date);
  const totalSpendToday = todayRows.reduce((a, r) => a + r.spend, 0);

  const mix = channelMixFromPerformance(perf);
  const { best, worst } = rankChannels(mix);

  const rates = computeRates({
    qualified_inquiries: stageRaw('qualified_inquiries'),
    glow_up_bookings: stageRaw('glow_up_bookings'),
    attended_visits: stageRaw('attended_visits'),
    valid_inquiries: stageRaw('valid_inquiries'),
    total_spend: totalSpendToday,
  });

  // Paid attribution is channel-level: every perf row has a Channel → 0 unattributed.
  const unattributed = 0;

  // Trailing qualified (= leads) for the Stop rule.
  const qualifiedTrailing: number[] = [];
  for (let i = decisionRules.stopWindowDays - 1; i >= 0; i--) {
    let d = date;
    for (let k = 0; k < i; k++) d = previousDate(d);
    qualifiedTrailing.push(perf.filter((r) => r.date === d).reduce((a, r) => a + r.leads, 0));
  }

  const decision = suggestDecision({
    qualifiedTrailing,
    qualifiedToday: stage('qualified_inquiries'),
    leadToBookingRate: rates.lead_to_booking_rate,
    unattributedShare: 0,
    hasOpenHighImpactTrackingOrPac: hasHighImpactOpen,
  });

  const leakage = biggestLeakage(funnel);

  const gaps: DataGap[] = [
    ...baseGaps,
    ...rates.dataGaps,
    {
      area: 'attribution',
      detail:
        'Paid attribution is channel-level (every performance row has a Channel). Lead-level UTM/creative detail is a data gap.',
      owner: ownerFor('attribution'),
    },
  ];

  return {
    report_date: date,
    decision: decision.decision,
    decision_reason: decision.reason,
    best_channel: best,
    worst_channel: worst,
    main_bottleneck: leakage ? `${leakage.from} → ${leakage.to} (${Math.round(leakage.drop * 100)}% drop)` : null,
    founder_decision: 'No',
    funnel,
    inquiries_by_channel: mix.inquiries_by_channel,
    bookings_by_channel: mix.bookings_by_channel,
    qualified_by_channel: mix.qualified_by_channel,
    lead_to_booking_rate: rates.lead_to_booking_rate,
    cost_per_inquiry: rates.cost_per_inquiry,
    cost_per_booking: rates.cost_per_booking,
    show_rate: rates.show_rate,
    unattributed_leads: unattributed,
    data_gaps: gaps,
    computed_at: new Date().toISOString(),
  };
}

async function writeLog(
  supabase: AdminClient,
  startedAt: string,
  summary: SyncSummary,
  error: string | null,
) {
  await supabase.from('ingestion_log').insert({
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: summary.status,
    sheets_ok: summary.sheetsOk,
    sheets_failed: summary.sheetsFailed,
    rows_ingested: summary.rowsIngested,
    data_gaps: summary.dataGaps,
    error,
  });
}
