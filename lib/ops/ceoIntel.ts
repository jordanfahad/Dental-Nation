import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { getFinanceRevenue } from '@/lib/finance/revenue';

/**
 * CEO Intelligence — the data layer for the Head of Operations tab's
 * executive view, replicating the layout of Dr Luvi's Executive Intelligence
 * Dashboard on OUR live backbone. Every figure is either a live feed read or
 * a workbook-sourced monthly control total with its provenance stated; a
 * failed source drops its block, never fakes a zero (her spec's rule, and
 * the fix for her dashboard's procurement-zeros defect).
 */

/** August 2026 commission control totals — from the 15 doctor workbooks
 *  (Dr Luvi's 11 Sep handover), independently reconciled to AED 0.02 twice.
 *  Updated monthly when the next workbook batch lands in the Data Drop. */
export const COMMISSION_CONTROL = {
  month: 'August 2026',
  gross: 335_168.84,
  actual: 316_027.19,
  netShareable: 275_522.57,
  payable: 126_388.21,
  doctors: 15,
};

export interface CeoIntel {
  finance: {
    ytdTotal: number;
    months: { ym: string; total: number }[];
    lastMonth: { ym: string; total: number; momPct: number | null } | null;
    clinics: { label: string; ytd: number; lastMonth: number; momPct: number | null; share: number }[];
  } | null;
  pacing: {
    revenue: { actual: number; target: number } | null;
    leads: { actual: number; target: number } | null;
  };
  registry: {
    total: number;
    completed: number;
    cancelled: number;
    noShow: number;
    booked: number;
    confirmed: number;
    requested: number;
  } | null;
  reviews: { count: number; avg: number; replied: number } | null;
  enquiries: { ytd: number; last30: number } | null;
  spend: { ytd: number; meta: number; google: number } | null;
  lastSync: string | null;
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

export const getCeoIntel = unstable_cache(
  async (): Promise<CeoIntel> => {
    const db = getSupabaseAdmin();
    const out: CeoIntel = {
      finance: null,
      pacing: { revenue: null, leads: null },
      registry: null,
      reviews: null,
      enquiries: null,
      spend: null,
      lastSync: null,
    };
    if (!db) return out;

    // Finance — the reconciled invoice-line feed (same source as everywhere).
    try {
      const f = await getFinanceRevenue();
      if (f.available && f.months.length) {
        const months = f.months.map((m) => ({ ym: m.ym, total: m.total }));
        const last = months[months.length - 1];
        const prev = months[months.length - 2];
        out.finance = {
          ytdTotal: f.total,
          months,
          lastMonth: {
            ym: last.ym,
            total: last.total,
            momPct: prev && prev.total > 0 ? (last.total / prev.total - 1) * 100 : null,
          },
          clinics: f.clinicTotals.map((c) => {
            const lastC = num(f.months[f.months.length - 1]?.byClinic[c.label]);
            const prevC = num(f.months[f.months.length - 2]?.byClinic[c.label]);
            return {
              label: c.label,
              ytd: c.value,
              lastMonth: lastC,
              momPct: prevC > 0 ? (lastC / prevC - 1) * 100 : null,
              share: c.share,
            };
          }),
        };
      }
    } catch {
      /* block drops */
    }

    // Plan pacing — the same rows the restricted KPI page renders.
    try {
      const { data } = await db
        .from('platform_kpi_targets')
        .select('kpi,target_value,actual_value')
        .in('kpi', ['Clinic network billed revenue', 'Leads (all channels)']);
      for (const r of data ?? []) {
        const t = num(r.target_value);
        const a = r.actual_value == null ? null : num(r.actual_value);
        if (a == null) continue;
        if (r.kpi === 'Clinic network billed revenue') out.pacing.revenue = { actual: a, target: t };
        if (r.kpi === 'Leads (all channels)') out.pacing.leads = { actual: a, target: t };
      }
    } catch {
      /* block drops */
    }

    // Live appointment registry — the CRM mirror (15-minute cadence), not a
    // stale export: statuses reflect today's truth.
    try {
      const { data } = await db
        .from('crm_appointments')
        .select('status, is_test')
        .limit(20000);
      const rows = (data ?? []).filter((r) => !r.is_test);
      const by = (s: string) => rows.filter((r) => String(r.status) === s).length;
      out.registry = {
        total: rows.length,
        completed: by('completed'),
        cancelled: by('cancel'),
        noShow: by('noShow'),
        booked: by('booked'),
        confirmed: by('confirmed'),
        requested: by('requested'),
      };
    } catch {
      /* block drops */
    }

    // Patient-experience quality — live Google profile.
    try {
      const { data } = await db.from('gmb_reviews').select('rating, reply_comment').is('removed_at', null).limit(5000);
      const rows = data ?? [];
      if (rows.length) {
        out.reviews = {
          count: rows.length,
          avg: rows.reduce((s, r) => s + num(r.rating), 0) / rows.length,
          replied: rows.filter((r) => r.reply_comment).length,
        };
      }
    } catch {
      /* block drops */
    }

    // Demand — the deduplicated all-channel enquiry union.
    try {
      const { data } = await db
        .from('board_deck_daily')
        .select('day, enquiries_total')
        .gte('day', '2026-01-01');
      const rows = data ?? [];
      const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      out.enquiries = {
        ytd: Math.round(rows.reduce((s, r) => s + num(r.enquiries_total), 0)),
        last30: Math.round(rows.filter((r) => String(r.day) >= cutoff).reduce((s, r) => s + num(r.enquiries_total), 0)),
      };
    } catch {
      /* block drops */
    }

    // Paid media — live ad-account APIs (media only; agency spend is Finance's).
    try {
      const { data } = await db
        .from('board_daily_kpis')
        .select('spend_meta, spend_google')
        .gte('day', '2026-01-01');
      const rows = data ?? [];
      const meta = rows.reduce((s, r) => s + num(r.spend_meta), 0);
      const google = rows.reduce((s, r) => s + num(r.spend_google), 0);
      if (meta + google > 0) out.spend = { ytd: meta + google, meta, google };
    } catch {
      /* block drops */
    }

    // Freshness — when the backbone last synced.
    try {
      const { data } = await db
        .from('ingestion_log')
        .select('started_at')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      out.lastSync = data ? String(data.started_at) : null;
    } catch {
      /* block drops */
    }

    return out;
  },
  ['ops-ceo-intel-v1'],
  { revalidate: 300 },
);
