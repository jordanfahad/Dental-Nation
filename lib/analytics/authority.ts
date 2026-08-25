import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Domain authority — Open PageRank (openpagerank.com), the one credible free
 * source of a PageRank-style 0–10 authority score. Google's own Links report
 * (backlink counts, linking sites) has NO public API, so authority is what can
 * be measured live; raw backlink counts arrive via the manual metrics form
 * (Ahrefs/Moz free-checker readings) when someone records them.
 *
 * Config lives in lane_e.app_secrets so it rotates without a deploy:
 *   openpagerank_api_key     — free key from openpagerank.com
 *   seo_competitor_domains   — CSV of competitor domains to benchmark against
 *
 * Cached 24h: authority moves on a timescale of months.
 */

export interface DomainAuthority {
  domain: string;
  /** Open PageRank decimal, 0–10 (log-scale, like the original PageRank). */
  score: number | null;
  /** Global rank position among all domains Open PageRank tracks. */
  rank: number | null;
}

export interface AuthorityReport {
  configured: boolean;
  note: string | null;
  site: DomainAuthority | null;
  competitors: DomainAuthority[];
}

const SITE_DOMAIN = 'dentalnation.com';

async function readSecrets(): Promise<{ key: string | null; competitors: string[] }> {
  const db = getSupabaseAdmin();
  if (!db) return { key: null, competitors: [] };
  try {
    const { data } = await db
      .from('app_secrets')
      .select('key, value')
      .in('key', ['openpagerank_api_key', 'seo_competitor_domains']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
    const competitors = (map.get('seo_competitor_domains') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean);
    return { key: (process.env.OPENPAGERANK_API_KEY ?? '').trim() || map.get('openpagerank_api_key') || null, competitors };
  } catch {
    return { key: null, competitors: [] };
  }
}

interface OprRow {
  status_code?: number;
  page_rank_decimal?: number | string;
  rank?: number | string;
  domain?: string;
}

const fetchAuthority = unstable_cache(
  async (key: string, domains: string[]): Promise<DomainAuthority[]> => {
    const u = new URL('https://openpagerank.com/api/v1.0/getPageRank');
    for (const d of domains) u.searchParams.append('domains[]', d);
    const res = await fetch(u.toString(), { headers: { 'API-OPR': key }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Open PageRank ${res.status}`);
    const json = (await res.json()) as { response?: OprRow[] };
    return (json.response ?? []).map((r) => ({
      domain: r.domain ?? '',
      score: r.status_code === 200 && r.page_rank_decimal != null ? Number(r.page_rank_decimal) : null,
      rank: r.status_code === 200 && r.rank != null ? Number(r.rank) : null,
    }));
  },
  ['domain-authority-v1'],
  { revalidate: 86400 },
);

export async function getAuthorityReport(): Promise<AuthorityReport> {
  const { key, competitors } = await readSecrets();
  if (!key) {
    return {
      configured: false,
      note: 'No Open PageRank key configured — a free key from openpagerank.com (stored as app_secrets key openpagerank_api_key) turns this on.',
      site: null,
      competitors: [],
    };
  }
  try {
    const rows = await fetchAuthority(key, [SITE_DOMAIN, ...competitors.filter((c) => c !== SITE_DOMAIN)]);
    const site = rows.find((r) => r.domain === SITE_DOMAIN) ?? null;
    return {
      configured: true,
      note: competitors.length === 0 ? 'Add competitor domains (app_secrets key seo_competitor_domains, comma-separated) to benchmark the authority gap.' : null,
      site,
      competitors: rows.filter((r) => r.domain !== SITE_DOMAIN),
    };
  } catch (err) {
    return { configured: true, note: `Authority lookup failed: ${(err as Error).message}`, site: null, competitors: [] };
  }
}
