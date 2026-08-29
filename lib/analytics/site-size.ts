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

async function competitorDomains(): Promise<string[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  try {
    const { data } = await db.from('app_secrets').select('value').eq('key', 'seo_competitor_domains').maybeSingle();
    return String((data as { value?: string } | null)?.value ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
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
  const row: SiteSizeRow = { domain, pages: null, sitemapFiles: 0, source: null, approx: false, note: null };

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
  async (domains: string[]): Promise<SiteSizeReport> => {
    if (domains.length === 0) return { available: false, rows: [], note: 'No competitor domains configured.' };
    const rows = await Promise.all(domains.map(measureDomain));
    const any = rows.some((r) => r.pages != null);
    return {
      available: any,
      rows,
      note: any ? null : 'No sitemaps were reachable from any domain in the set.',
    };
  },
  // v2: browser UA, www/bare host probing, robots->conventional fallback.
  ['site-size-v2'],
  { revalidate: 7 * 24 * 60 * 60 },
);

export async function getSiteSizeReport(): Promise<SiteSizeReport> {
  const competitors = await competitorDomains();
  return loadSiteSize([SITE_DOMAIN, ...competitors.filter((c) => c !== SITE_DOMAIN)]);
}
