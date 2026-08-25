import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Domain authority & backlinks — the off-page half of SEO. Google's own Links
 * report has NO public API, so this reads third-party sources, best first:
 *
 *   1. DataForSEO Backlinks API (paid, credit-metered) — live backlink count,
 *      referring domains and a 0–1000 domain rank. Cached SEVEN DAYS per
 *      domain set: authority moves monthly, and each refresh costs credits,
 *      so a weekly reading is the honest spend/freshness trade.
 *   2. Open PageRank (free) — a 0–10 PageRank-style score only.
 *
 * Config lives in lane_e.app_secrets so it rotates without a deploy:
 *   dataforseo_login / dataforseo_password
 *   openpagerank_api_key
 *   seo_competitor_domains  — CSV of competitor domains to benchmark
 */

export interface DomainAuthority {
  domain: string;
  /** Normalised authority for the comparison bars (DataForSEO rank 0–1000, or OPR 0–10). */
  score: number | null;
  /** The provider's own scale for the score, for labelling. */
  scale: number;
  backlinks: number | null;
  referringDomains: number | null;
}

export interface AuthorityReport {
  configured: boolean;
  provider: 'dataforseo' | 'openpagerank' | null;
  note: string | null;
  site: DomainAuthority | null;
  competitors: DomainAuthority[];
}

const SITE_DOMAIN = 'dentalnation.com';

interface Secrets {
  dfsLogin: string | null;
  dfsPassword: string | null;
  oprKey: string | null;
  competitors: string[];
}

async function readSecrets(): Promise<Secrets> {
  const db = getSupabaseAdmin();
  const none: Secrets = { dfsLogin: null, dfsPassword: null, oprKey: null, competitors: [] };
  if (!db) return none;
  try {
    const { data } = await db
      .from('app_secrets')
      .select('key, value')
      .in('key', ['dataforseo_login', 'dataforseo_password', 'openpagerank_api_key', 'seo_competitor_domains']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
    const competitors = (map.get('seo_competitor_domains') ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean);
    return {
      dfsLogin: (process.env.DATAFORSEO_LOGIN ?? '').trim() || map.get('dataforseo_login') || null,
      dfsPassword: (process.env.DATAFORSEO_PASSWORD ?? '').trim() || map.get('dataforseo_password') || null,
      oprKey: (process.env.OPENPAGERANK_API_KEY ?? '').trim() || map.get('openpagerank_api_key') || null,
      competitors,
    };
  } catch {
    return none;
  }
}

/* ── DataForSEO — one summary task per domain, weekly cache ── */

interface DfsSummary {
  target?: string;
  rank?: number;
  backlinks?: number;
  referring_main_domains?: number;
  referring_domains?: number;
}
interface DfsResponse {
  status_code?: number;
  status_message?: string;
  tasks?: { status_code?: number; status_message?: string; result?: DfsSummary[] | null }[];
}

const fetchDataForSeo = unstable_cache(
  async (login: string, password: string, domains: string[]): Promise<DomainAuthority[]> => {
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/summary/live', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(domains.map((d) => ({ target: d, include_subdomains: true }))),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
    const json = (await res.json()) as DfsResponse;
    if (json.status_code !== 20000) throw new Error(`DataForSEO: ${json.status_message ?? `code ${json.status_code}`}`);
    const out: DomainAuthority[] = [];
    for (let i = 0; i < (json.tasks ?? []).length; i++) {
      const task = json.tasks![i];
      const r = task.result?.[0];
      const domain = r?.target ?? domains[i] ?? '';
      if (task.status_code !== 20000 || !r) {
        out.push({ domain, score: null, scale: 1000, backlinks: null, referringDomains: null });
        continue;
      }
      out.push({
        domain,
        score: r.rank ?? null,
        scale: 1000,
        backlinks: r.backlinks ?? null,
        referringDomains: r.referring_main_domains ?? r.referring_domains ?? null,
      });
    }
    return out;
  },
  ['authority-dataforseo-v1'],
  { revalidate: 604800 }, // 7 days — each refresh spends API credits
);

/* ── Open PageRank fallback — free, score only ── */

interface OprRow {
  status_code?: number;
  page_rank_decimal?: number | string;
  domain?: string;
}

const fetchOpenPageRank = unstable_cache(
  async (key: string, domains: string[]): Promise<DomainAuthority[]> => {
    const u = new URL('https://openpagerank.com/api/v1.0/getPageRank');
    for (const d of domains) u.searchParams.append('domains[]', d);
    const res = await fetch(u.toString(), { headers: { 'API-OPR': key }, cache: 'no-store' });
    if (!res.ok) throw new Error(`Open PageRank ${res.status}`);
    const json = (await res.json()) as { response?: OprRow[] };
    return (json.response ?? []).map((r) => ({
      domain: r.domain ?? '',
      score: r.status_code === 200 && r.page_rank_decimal != null ? Number(r.page_rank_decimal) : null,
      scale: 10,
      backlinks: null,
      referringDomains: null,
    }));
  },
  ['domain-authority-v1'],
  { revalidate: 86400 },
);

/* ── Backlink detail — who links, to which pages, and how good the links are ── */

export interface ReferringDomain {
  domain: string;
  /** DataForSEO rank of the LINKING domain (0–1000) — the quality signal. */
  rank: number | null;
  backlinks: number;
  firstSeen: string | null;
}

export interface LinkedPage {
  path: string;
  backlinks: number;
  referringDomains: number;
}

export interface BacklinkSample {
  from: string;
  toPath: string;
  anchor: string | null;
  dofollow: boolean;
  domainRank: number | null;
  spamScore: number | null; // 0–100, higher = spammier
}

export interface BacklinkDetail {
  available: boolean;
  note: string | null;
  referringDomains: ReferringDomain[];
  linkedPages: LinkedPage[];
  links: BacklinkSample[];
  /** Quality split of referring domains by linking-domain rank. */
  quality: { strong: number; moderate: number; weak: number };
}

interface DfsRefDomainRow {
  domain?: string;
  rank?: number;
  backlinks?: number;
  first_seen?: string;
}
interface DfsBacklinkRow {
  url_from?: string;
  url_to?: string;
  anchor?: string | null;
  dofollow?: boolean;
  domain_from_rank?: number;
  backlink_spam_score?: number;
}

const pathOf = (u: string): string => {
  try {
    const p = new URL(u).pathname;
    return p === '' ? '/' : p;
  } catch {
    return u;
  }
};

const fetchBacklinkDetail = unstable_cache(
  async (login: string, password: string): Promise<BacklinkDetail> => {
    const auth = `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`;
    const post = async (endpoint: string, body: unknown) => {
      const res = await fetch(`https://api.dataforseo.com/v3/backlinks/${endpoint}/live`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify([body]),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`DataForSEO ${endpoint} ${res.status}`);
      const json = (await res.json()) as DfsResponse & { tasks?: { status_code?: number; status_message?: string; result?: { items?: unknown[] }[] | null }[] };
      if (json.status_code !== 20000) throw new Error(`DataForSEO ${endpoint}: ${json.status_message ?? json.status_code}`);
      const task = json.tasks?.[0];
      if (task?.status_code !== 20000) throw new Error(`DataForSEO ${endpoint}: ${task?.status_message ?? task?.status_code}`);
      return task.result?.[0]?.items ?? [];
    };

    const [refRows, linkRows] = await Promise.all([
      post('referring_domains', { target: SITE_DOMAIN, include_subdomains: true, limit: 100, order_by: ['rank,desc'] }) as Promise<DfsRefDomainRow[]>,
      post('backlinks', { target: SITE_DOMAIN, include_subdomains: true, limit: 200, mode: 'as_is' }) as Promise<DfsBacklinkRow[]>,
    ]);

    const referringDomains: ReferringDomain[] = refRows.map((r) => ({
      domain: r.domain ?? '',
      rank: r.rank ?? null,
      backlinks: r.backlinks ?? 0,
      firstSeen: r.first_seen ? r.first_seen.slice(0, 10) : null,
    }));

    const links: BacklinkSample[] = linkRows.map((l) => ({
      from: l.url_from ?? '',
      toPath: pathOf(l.url_to ?? ''),
      anchor: l.anchor ?? null,
      dofollow: Boolean(l.dofollow),
      domainRank: l.domain_from_rank ?? null,
      spamScore: l.backlink_spam_score ?? null,
    }));

    // Which of OUR pages actually receive links — grouped from the raw links.
    const byPage = new Map<string, { backlinks: number; domains: Set<string> }>();
    for (const l of links) {
      const cur = byPage.get(l.toPath) ?? { backlinks: 0, domains: new Set<string>() };
      cur.backlinks += 1;
      try {
        cur.domains.add(new URL(l.from).hostname.replace(/^www\./, ''));
      } catch {
        /* unparseable source URL — count the link, skip the domain */
      }
      byPage.set(l.toPath, cur);
    }
    const linkedPages: LinkedPage[] = [...byPage.entries()]
      .map(([path, v]) => ({ path, backlinks: v.backlinks, referringDomains: v.domains.size }))
      .sort((a, b) => b.backlinks - a.backlinks)
      .slice(0, 15);

    const ranked = referringDomains.filter((r) => r.rank != null);
    return {
      available: true,
      note: null,
      referringDomains: referringDomains.slice(0, 25),
      linkedPages,
      links: links.slice(0, 200),
      quality: {
        strong: ranked.filter((r) => r.rank! >= 200).length,
        moderate: ranked.filter((r) => r.rank! >= 50 && r.rank! < 200).length,
        weak: ranked.filter((r) => r.rank! < 50).length,
      },
    };
  },
  ['backlink-detail-v1'],
  { revalidate: 604800 }, // 7 days — spends API credits
);

export async function getBacklinkDetail(): Promise<BacklinkDetail> {
  const s = await readSecrets();
  const none: BacklinkDetail = { available: false, note: null, referringDomains: [], linkedPages: [], links: [], quality: { strong: 0, moderate: 0, weak: 0 } };
  if (!s.dfsLogin || !s.dfsPassword) return { ...none, note: 'DataForSEO credentials not configured.' };
  try {
    return await fetchBacklinkDetail(s.dfsLogin, s.dfsPassword);
  } catch (err) {
    return { ...none, note: `Backlink detail lookup failed: ${(err as Error).message}` };
  }
}

export async function getAuthorityReport(): Promise<AuthorityReport> {
  const s = await readSecrets();
  const domains = [SITE_DOMAIN, ...s.competitors.filter((c) => c !== SITE_DOMAIN)];
  const competitorNote =
    s.competitors.length === 0
      ? 'Add competitor domains (app_secrets key seo_competitor_domains, comma-separated) to benchmark the authority gap.'
      : null;

  if (s.dfsLogin && s.dfsPassword) {
    try {
      const rows = await fetchDataForSeo(s.dfsLogin, s.dfsPassword, domains);
      return {
        configured: true,
        provider: 'dataforseo',
        note: competitorNote,
        site: rows.find((r) => r.domain === SITE_DOMAIN) ?? null,
        competitors: rows.filter((r) => r.domain !== SITE_DOMAIN),
      };
    } catch (err) {
      // Fall through to Open PageRank if it is configured; else surface.
      if (!s.oprKey) return { configured: true, provider: 'dataforseo', note: `Backlinks lookup failed: ${(err as Error).message}`, site: null, competitors: [] };
    }
  }

  if (s.oprKey) {
    try {
      const rows = await fetchOpenPageRank(s.oprKey, domains);
      return {
        configured: true,
        provider: 'openpagerank',
        note: competitorNote,
        site: rows.find((r) => r.domain === SITE_DOMAIN) ?? null,
        competitors: rows.filter((r) => r.domain !== SITE_DOMAIN),
      };
    } catch (err) {
      return { configured: true, provider: 'openpagerank', note: `Authority lookup failed: ${(err as Error).message}`, site: null, competitors: [] };
    }
  }

  return {
    configured: false,
    provider: null,
    note: 'No backlinks API configured — DataForSEO credentials (app_secrets dataforseo_login / dataforseo_password) or a free openpagerank.com key turns this on.',
    site: null,
    competitors: [],
  };
}
