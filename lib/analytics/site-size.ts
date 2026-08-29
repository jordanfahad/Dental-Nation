import 'server-only';
import { gunzipSync } from 'node:zlib';
import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * Site size vs the competitor set — TOTAL pages each site publishes, counted
 * from its own public sitemap.xml (Mr Akbar's ask: total pages available, not
 * indexed pages — the sitemap is the honest public source for that).
 *
 * Per domain: read robots.txt for declared Sitemap: URLs (falling back to the
 * conventional /sitemap.xml, /sitemap_index.xml, /wp-sitemap.xml), walk any
 * sitemap index into its child sitemaps (gzip supported), and count the <url>
 * entries. Fetch caps and a wall-clock budget keep one slow site from stalling
 * the sync; a capped walk is flagged `approx` and rendered as "≥".
 *
 * A site with no reachable sitemap gets a note, never a made-up number.
 * Weekly cache, warmed by the cron like the other benchmark modules — page
 * counts move slowly and the walk costs dozens of fetches.
 */

export interface SiteSizeRow {
  domain: string;
  /** Total <url> entries across all sitemap files; null = no sitemap found. */
  pages: number | null;
  /** Sitemap files actually counted (index files not included). */
  sitemapFiles: number;
  /** Where the walk started (robots.txt declaration or a conventional path). */
  source: string | null;
  /** True when the walk hit a fetch/time cap — the count is a floor. */
  approx: boolean;
  /** True when `pages` is NOT a sitemap count but the DataForSEO fallback —
   *  the number of the site's pages ranking in Google (a floor for total
   *  published pages). Used when a site blocks or lacks a public sitemap, so
   *  the comparison never shows a blank (Mr Akbar's instruction). */
  estimated: boolean;
  note: string | null;
}

export interface SiteSizeReport {
  available: boolean;
  rows: SiteSizeRow[];
  note: string | null;
}

const SITE_DOMAIN = 'dentalnation.com';
const MAX_FETCHES_PER_DOMAIN = 60; // a sitemap index can fan out into hundreds
const FETCH_TIMEOUT_MS = 10_000;
// Under the dash route's 60s maxDuration with headroom: a COLD page render
// pays this walk (domains run in parallel) until the cron has warmed it.
const DOMAIN_BUDGET_MS = 40_000;
const MAX_BYTES = 15 * 1024 * 1024; // one huge sitemap file cap

interface SiteSizeConfig {
  competitors: string[];
  dfsLogin: string | null;
  dfsPassword: string | null;
}

async function readConfig(): Promise<SiteSizeConfig> {
  const db = getSupabaseAdmin();
  if (!db) return { competitors: [], dfsLogin: null, dfsPassword: null };
  try {
    const { data } = await db
      .from('app_secrets')
      .select('key, value')
      .in('key', ['seo_competitor_domains', 'dataforseo_login', 'dataforseo_password']);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, String(r.value ?? '').trim()]));
    return {
      competitors: (map.get('seo_competitor_domains') ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
        .filter(Boolean),
      dfsLogin: (process.env.DATAFORSEO_LOGIN ?? '').trim() || map.get('dataforseo_login') || null,
      dfsPassword: (process.env.DATAFORSEO_PASSWORD ?? '').trim() || map.get('dataforseo_password') || null,
    };
  } catch {
    return { competitors: [], dfsLogin: null, dfsPassword: null };
  }
}

/**
 * Fallback estimate when a site blocks or lacks a public sitemap: the number
 * of its pages that RANK in Google (DataForSEO Labs relevant_pages
 * total_count) — every ranking page necessarily exists, so this is an honest
 * floor for total published pages, labelled as an estimate on the card.
 */
async function dfsTotalCount(url: string, body: Record<string, unknown>, login: string, password: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([body]),
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status_code?: number;
      tasks?: { status_code?: number; result?: { total_count?: number }[] | null }[];
    };
    const task = json.tasks?.[0];
    if (json.status_code !== 20000 || task?.status_code !== 20000) return null;
    const n = task.result?.[0]?.total_count;
    return typeof n === 'number' && n > 0 ? n : null;
  } catch {
    return null;
  }
}

async function rankedPagesEstimate(domain: string, login: string, password: string): Promise<number | null> {
  // Best proxy first: every page DataForSEO's web crawler has seen on the
  // domain (Backlinks domain_pages) — close to true site size. The first live
  // run proved the UAE ranked-pages count alone badly undercounts (Dr Joy,
  // ~12 branches, came back as 76), so that stays only as the last fallback.
  return (
    (await dfsTotalCount('https://api.dataforseo.com/v3/backlinks/domain_pages/live', { target: domain, limit: 1 }, login, password)) ??
    (await dfsTotalCount(
      'https://api.dataforseo.com/v3/dataforseo_labs/google/relevant_pages/live',
      { target: domain, location_code: 2784, language_code: 'en', limit: 1 },
      login,
      password,
    ))
  );
}

/** Fetch a URL as text, transparently gunzipping .gz payloads. */
async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        // A real browser UA — WAFs on the competitor sites 403 anything that
        // self-identifies as a bot, and this is a public file read.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        accept: 'text/xml,application/xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return null;
    // Serverless fetch usually un-gzips by content-encoding, but .gz sitemap
    // FILES arrive as raw gzip bytes — detect by magic number, not extension.
    const body = buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
    return body.toString('utf8');
  } catch {
    return null;
  }
}

/** Host variants to probe: some sites answer only on www., some only bare. */
function hostsOf(domain: string): string[] {
  return domain.startsWith('www.') ? [domain, domain.slice(4)] : [domain, `www.${domain}`];
}

/** Sitemap URLs declared in robots.txt, probing both host variants. */
async function sitemapsFromRobots(domain: string): Promise<string[]> {
  for (const host of hostsOf(domain)) {
    const robots = await fetchText(`https://${host}/robots.txt`);
    if (!robots) continue;
    const urls = [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1].trim()).filter((u) => /^https?:\/\//i.test(u));
    if (urls.length > 0) return urls;
  }
  return [];
}

const CONVENTIONAL = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap-index.xml', '/wp-sitemap.xml', '/sitemap1.xml'];

function isIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}
function childLocs(xml: string): string[] {
  // <loc> children of a sitemap index — each is another sitemap file.
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}
function countUrls(xml: string): number {
  return (xml.match(/<url[\s>]/gi) ?? []).length;
}

/** Walk a set of entry sitemap URLs; returns pages counted + files read. */
async function walk(entries: string[], started: number): Promise<{ pages: number; files: number; capped: boolean }> {
  const queue = [...entries];
  const seen = new Set<string>();
  let fetches = 0;
  let pages = 0;
  let files = 0;
  let capped = false;
  while (queue.length > 0) {
    if (fetches >= MAX_FETCHES_PER_DOMAIN || Date.now() - started > DOMAIN_BUDGET_MS) {
      capped = true; // count is a floor — the walk was capped
      break;
    }
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    fetches += 1;
    const xml = await fetchText(url);
    if (!xml) continue;
    if (isIndex(xml)) {
      queue.push(...childLocs(xml));
      continue;
    }
    const n = countUrls(xml);
    if (n > 0) {
      pages += n;
      files += 1;
    }
  }
  return { pages, files, capped };
}

async function measureDomain(domain: string): Promise<SiteSizeRow> {
  const started = Date.now();
  const row: SiteSizeRow = { domain, pages: null, sitemapFiles: 0, source: null, approx: false, estimated: false, note: null };

  // 1) robots.txt-declared sitemaps first — but if their walk yields nothing
  // (declared URL dead, children blocked), fall THROUGH to the conventional
  // paths rather than giving up: a stale robots line must not hide a live
  // /sitemap.xml.
  const fromRobots = await sitemapsFromRobots(domain);
  if (fromRobots.length > 0) {
    const r = await walk(fromRobots, started);
    if (r.files > 0) {
      row.pages = r.pages;
      row.sitemapFiles = r.files;
      row.approx = r.capped;
      row.source = 'robots.txt';
      return row;
    }
  }

  // 2) Conventional paths, on both host variants (bare + www).
  for (const host of hostsOf(domain)) {
    for (const path of CONVENTIONAL) {
      if (Date.now() - started > DOMAIN_BUDGET_MS) break;
      const url = `https://${host}${path}`;
      const xml = await fetchText(url);
      if (!xml || (!isIndex(xml) && countUrls(xml) === 0)) continue;
      const r = await walk([url], started);
      if (r.files > 0) {
        row.pages = r.pages;
        row.sitemapFiles = r.files;
        row.approx = r.capped;
        row.source = path;
        return row;
      }
    }
  }

  row.note =
    fromRobots.length > 0
      ? 'Sitemap declared in robots.txt but its files could not be read.'
      : 'No public sitemap found (robots.txt and conventional paths, both hosts).';
  return row;
}

const loadSiteSize = unstable_cache(
  async (domains: string[], dfsLogin: string | null, dfsPassword: string | null): Promise<SiteSizeReport> => {
    if (domains.length === 0) return { available: false, rows: [], note: 'No competitor domains configured.' };
    const rows = await Promise.all(domains.map(measureDomain));
    // No blanks: a blocked/missing sitemap falls back to the ranked-pages
    // estimate, clearly labelled — the comparison column always has a number
    // when the provider knows the site at all.
    if (dfsLogin && dfsPassword) {
      await Promise.all(
        rows.map(async (row) => {
          if (row.pages != null) return;
          const est = await rankedPagesEstimate(row.domain, dfsLogin, dfsPassword);
          if (est != null) {
            row.pages = est;
            row.estimated = true;
            row.note =
              (row.note?.startsWith('Sitemap declared')
                ? 'Sitemap blocked by the site — '
                : 'No public sitemap — ') + 'estimated from pages known to the web crawler (a floor).';
          }
        }),
      );
    }
    const any = rows.some((r) => r.pages != null);
    return {
      available: any,
      rows,
      note: any ? null : 'No sitemaps were reachable from any domain in the set.',
    };
  },
  // v4: crawler-known-pages estimate (domain_pages) — ranked-pages undercounted.
  ['site-size-v4'],
  { revalidate: 7 * 24 * 60 * 60 },
);

export async function getSiteSizeReport(): Promise<SiteSizeReport> {
  const cfg = await readConfig();
  return loadSiteSize(
    [SITE_DOMAIN, ...cfg.competitors.filter((c) => c !== SITE_DOMAIN)],
    cfg.dfsLogin,
    cfg.dfsPassword,
  );
}
