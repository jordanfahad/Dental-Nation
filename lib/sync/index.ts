import 'server-only';
import { type AdminClient, getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase/server';
import { getSheetsClient, isGoogleConfigured } from './google-auth';
import { SheetsAdapter } from './adapters/sheets-adapter';
import { normalizeLeads, type NormalizedLead } from './normalize';
import { allSources } from '@/config/sheet-mapping';
import { reportDateForSync, previousDate } from '@/lib/dates';
import { computeFunnel } from '@/lib/metrics/funnel';
import { computeChannelMix, rankChannels } from '@/lib/metrics/channels';
import { computeRates } from '@/lib/metrics/rates';
import { suggestDecision } from '@/lib/metrics/decision';
import { decisionRules } from '@/config/decision-rules';
import type { DataGap } from '@/lib/types';

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
  // Insert in chunks to stay well within payload limits.
  for (let i = 0; i < payload.length; i += 500) {
    await supabase.from(table).insert(payload.slice(i, i + 500));
  }
}

/**
 * The full ingestion pipeline (§9). Orchestrates fetch → bronze → silver → gold
 * → log. A single sheet failing is recorded as `partial`, never aborting the run.
 * Idempotent: running twice in one Dubai day yields the same snapshot.
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
  const allLeads: NormalizedLead[] = [];

  for (const source of allSources) {
    try {
      const adapter = new SheetsAdapter(sheets, source);
      const { rows, warnings } = await adapter.fetch();
      rowsIngested += rows.length;
      for (const w of warnings) {
        dataGaps.push({ area: 'tracking', detail: `${source.label}: ${w}`, owner: 'Data/Analytics' });
      }
      await mirrorBronze(supabase, source.rawTable, rows);

      // Silver — currently the leads spine (build step 2). Other targets follow
      // the same pattern once Phase 0 confirms their column mappings.
      if (source.target === 'leads') {
        const { rows: leads, dataGaps: gaps } = normalizeLeads(source, rows);
        dataGaps.push(...gaps);
        allLeads.push(...leads);
        if (leads.length > 0) {
          for (let i = 0; i < leads.length; i += 500) {
            await supabase.from('leads').upsert(leads.slice(i, i + 500), { onConflict: 'id' });
          }
        }
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

  // ----- Gold: compute and upsert today's snapshot -----
  await computeSnapshot(supabase, reportDate, allLeads, dataGaps);

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

async function computeSnapshot(
  supabase: AdminClient,
  reportDate: string,
  leads: NormalizedLead[],
  dataGaps: DataGap[],
) {
  const funnel = computeFunnel(leads, reportDate);
  const stage = (key: string) => funnel.find((f) => f.key === key)?.today ?? 0;

  const mix = computeChannelMix(leads);
  const { best, worst } = rankChannels(mix);

  const rates = computeRates({
    qualified_inquiries: stage('qualified_inquiries'),
    glow_up_bookings: stage('glow_up_bookings'),
    attended_visits: stage('attended_visits'),
    valid_inquiries: stage('valid_inquiries'),
    total_spend: null, // no spend source in Sheets-v1
  });

  const unattributed = leads.filter(
    (l) => !l.channel_source || l.channel_source.trim() === '',
  ).length;
  const inquiriesToday = stage('valid_inquiries');
  const unattributedShare = inquiriesToday > 0 ? unattributed / inquiriesToday : 0;

  // Trailing qualified counts for the Stop rule.
  const qualifiedTrailing: number[] = [];
  for (let i = decisionRules.stopWindowDays - 1; i >= 0; i--) {
    let d = reportDate;
    for (let k = 0; k < i; k++) d = previousDate(d);
    qualifiedTrailing.push(
      leads.filter((l) => l.is_qualified && l.inquiry_date?.slice(0, 10) === d).length,
    );
  }

  const decision = suggestDecision({
    qualifiedTrailing,
    qualifiedToday: stage('qualified_inquiries'),
    leadToBookingRate: rates.lead_to_booking_rate,
    unattributedShare,
    hasOpenHighImpactTrackingOrPac: false, // wired once blockers silver lands
  });

  const allGaps = [...dataGaps, ...rates.dataGaps];

  await supabase.from('daily_snapshot').upsert(
    {
      report_date: reportDate,
      decision: decision.decision,
      decision_reason: decision.reason,
      best_channel: best,
      worst_channel: worst,
      main_bottleneck: null,
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
      data_gaps: allGaps,
      computed_at: new Date().toISOString(),
    },
    { onConflict: 'report_date' },
  );
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
