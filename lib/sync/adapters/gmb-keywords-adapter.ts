import 'server-only';
import type { AdminClient } from '@/lib/supabase/server';
import { resolveGmbConfig, type GmbConfig } from '@/config/gmb';

/**
 * Local search keywords adapter — the terms people typed into Google Search or
 * Maps when the Business Profile appeared, per month, from the Business
 * Profile Performance API (already enabled for the daily metrics pull).
 *
 *   GET businessprofileperformance.googleapis.com/v1/
 *       {location}/searchkeywords/impressions/monthly
 *       ?monthlyRange.startMonth.year=…&…  (one call per month → true monthly rows)
 *
 * Counts under Google's privacy threshold arrive as a ceiling (e.g. "<15");
 * those are stored with is_threshold = true so the UI can show "<15" honestly.
 * The trailing months are re-upserted every run because Google keeps revising
 * a month for a couple of weeks after it closes. Best-effort, never throws.
 */

export interface GmbKeywordsSyncResult {
  ok: boolean;
  months: number;
  stored: number;
  error?: string;
}

const PERF = 'https://businessprofileperformance.googleapis.com/v1';

async function accessToken(cfg: GmbConfig): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(`OAuth token exchange failed (${res.status}): ${data.error_description ?? 'no access_token'}`);
  }
  return data.access_token;
}

interface KeywordCount {
  searchKeyword?: string;
  insightsValue?: { value?: string; threshold?: string };
}
interface KeywordsPage {
  searchKeywordsCounts?: KeywordCount[];
  nextPageToken?: string;
  error?: { message?: string };
}

function monthUrl(locationPath: string, year: number, month: number, pageToken?: string): string {
  const p = new URLSearchParams();
  p.set('monthlyRange.startMonth.year', String(year));
  p.set('monthlyRange.startMonth.month', String(month));
  p.set('monthlyRange.endMonth.year', String(year));
  p.set('monthlyRange.endMonth.month', String(month));
  p.set('pageSize', '100');
  if (pageToken) p.set('pageToken', pageToken);
  return `${PERF}/${locationPath}/searchkeywords/impressions/monthly?${p.toString()}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export async function syncGmbSearchKeywords(
  supabase: AdminClient,
  opts: { config?: GmbConfig; months?: number } = {},
): Promise<GmbKeywordsSyncResult> {
  const cfg = opts.config ?? (await resolveGmbConfig(supabase));
  if (!cfg) return { ok: false, months: 0, stored: 0, error: 'GMB not configured' };

  let token: string;
  try {
    token = await accessToken(cfg);
  } catch (err) {
    return { ok: false, months: 0, stored: 0, error: (err as Error).message };
  }

  // Trailing window incl. the current (partial) month — re-upserted every run.
  const span = Math.max(1, Math.min(opts.months ?? 4, 12));
  const now = new Date();
  const monthsList: { year: number; month: number }[] = [];
  for (let i = 0; i < span; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthsList.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
  }

  let stored = 0;
  for (const loc of cfg.locations) {
    for (const { year, month } of monthsList) {
      let pageToken: string | undefined;
      do {
        let data: KeywordsPage;
        try {
          const res = await fetch(monthUrl(loc.path, year, month, pageToken), {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          data = (await res.json().catch(() => ({}))) as KeywordsPage;
          if (!res.ok) {
            return { ok: false, months: span, stored, error: `searchkeywords ${res.status}: ${data.error?.message ?? 'request failed'}` };
          }
        } catch (err) {
          return { ok: false, months: span, stored, error: (err as Error).message };
        }

        const rows = (data.searchKeywordsCounts ?? [])
          .map((k) => {
            const raw = k.insightsValue?.value ?? k.insightsValue?.threshold;
            const n = Number(raw);
            if (!k.searchKeyword || !Number.isFinite(n)) return null;
            return {
              month: `${year}-${pad2(month)}`,
              keyword: k.searchKeyword,
              location_path: loc.path,
              impressions: n,
              is_threshold: k.insightsValue?.value == null,
              synced_at: new Date().toISOString(),
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (rows.length > 0) {
          const { error } = await supabase.from('gmb_search_keywords').upsert(rows, { onConflict: 'month,keyword,location_path' });
          if (error) return { ok: false, months: span, stored, error: `upsert failed: ${error.message}` };
          stored += rows.length;
        }
        pageToken = data.nextPageToken;
      } while (pageToken);
    }
  }

  return { ok: true, months: span, stored };
}
