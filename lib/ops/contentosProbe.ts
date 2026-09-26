import 'server-only';
import type { getSupabaseAdmin } from '@/lib/supabase/server';

/**
 * One-off reader for the ContentOS Meta leads page (26 Sep). ContentOS is
 * Zavis's system and is not reachable from the build environment, so the live
 * dashboard reads it once from the server and stores what the page is made of
 * (headings, table columns, the data endpoints it calls and the SHAPE of their
 * data) in lane_e.app_secrets `contentos_probe`. That lets the morning
 * briefing read the right fields. Table rows, phone numbers, emails and
 * personal fields are never stored — only field names, counts, page labels
 * and short category values.
 * Delete the row to run it again; the whole module goes once the reader is built.
 */

type Sb = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

const BASE = 'https://contentos.dentalnation.com';
const PAGE = `${BASE}/ads/meta/leads`;
const KEY = 'contentos_probe';
const PRIVATE = /name|phone|mobile|email|whats|wa_?id|contact|msisdn|number|message|note|comment|address|birth|dob|text|body|remark/i;

const redact = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\+?\d[\d\s-]{5,}\d/g, '[num]');
const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** The whole read stays inside ~45 s so the sync cron is never held up. */
let deadline = 0;

async function get(url: string, accept = 'text/html,application/json;q=0.9,*/*;q=0.8') {
  if (Date.now() > deadline) return { status: 0, url, type: '', text: '', error: 'time budget used' };
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12_000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (DentalNation reports)', accept }, redirect: 'follow', cache: 'no-store', signal: ac.signal });
    const text = (await r.text()).slice(0, 4_000_000);
    return { status: r.status, url: r.url, type: r.headers.get('content-type') ?? '', text };
  } catch (e) {
    return { status: 0, url, type: '', text: '', error: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

/** Field names and types only; short category values for non-personal fields. */
function shape(v: unknown, key = '', depth = 0): unknown {
  if (depth > 6) return '…';
  if (Array.isArray(v)) return { array: v.length, item: v.length ? shape(v[0], key, depth + 1) : null, ...(v.length && v.every((x) => typeof x === 'object' && x) ? { values: sampleValues(v as Record<string, unknown>[]) } : {}) };
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v as Record<string, unknown>).slice(0, 80).map(([k, x]) => [k, shape(x, k, depth + 1)]));
  if (typeof v === 'string') return PRIVATE.test(key) ? `string(${v.length})` : v.length <= 60 ? redact(v) : `string(${v.length})`;
  return v === null ? null : typeof v;
}

/** For arrays of rows: the distinct values of each short, non-personal field (≤ 25). */
function sampleValues(rows: Record<string, unknown>[]) {
  const out: Record<string, unknown> = {};
  const keys = [...new Set(rows.slice(0, 200).flatMap((r) => Object.keys(r)))].slice(0, 80);
  for (const k of keys) {
    if (PRIVATE.test(k)) continue;
    const vals = [...new Set(rows.map((r) => r[k]).filter((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean').map((x) => (typeof x === 'string' ? redact(x).slice(0, 60) : x)))];
    out[k] = vals.length <= 25 ? vals : { distinct: vals.length, sample: vals.slice(0, 5) };
  }
  return out;
}

const all = (re: RegExp, s: string) => [...s.matchAll(re)].map((m) => m[1] ?? m[0]);

/** Arrays of row objects embedded in server-rendered data (bracket-matched, strings respected). */
function rowArrays(src: string): unknown[] {
  const found: unknown[] = [];
  let from = 0;
  while (found.length < 6) {
    const i = src.indexOf('[{"', from);
    if (i < 0) break;
    let depth = 0, inStr = false, j = i;
    for (; j < src.length && j - i < 3_000_000; j++) {
      const c = src[j];
      if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true;
      else if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') { depth--; if (depth === 0) break; }
    }
    from = j + 1;
    try {
      const arr = JSON.parse(src.slice(i, j + 1)) as unknown[];
      if (Array.isArray(arr) && arr.length >= 3) found.push(shape(arr));
    } catch { /* not JSON */ }
  }
  return found;
}

export async function runContentosProbe(sb: Sb): Promise<string> {
  const { data: have } = await sb.from('app_secrets').select('key').eq('key', KEY).limit(1);
  if (have?.length) return 'contentos probe: already stored';
  deadline = Date.now() + 45_000;

  const page = await get(PAGE);
  const html = page.text;
  const scripts = [...new Set(all(/<script[^>]+src="([^"]+)"/g, html))].map((s) => new URL(s, BASE).toString());
  const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  let nextShape: unknown = null;
  if (nextData) { try { nextShape = shape(JSON.parse(nextData)); } catch { nextShape = 'unparsable'; } }
  // Page labels and KPI tiles only: scripts, styles and table bodies (the lead rows) are cut first.
  const visible = redact(strip(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<tbody[\s\S]*?<\/tbody>/g, ' [rows] ')));
  // Server-rendered data (React flight payload): the field names it carries and how often.
  const flight = all(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g, html).map((x) => { try { return JSON.parse(`"${x}"`) as string; } catch { return ''; } }).join('');
  const keyFreq: Record<string, number> = {};
  for (const k of all(/"([a-zA-Z_][a-zA-Z0-9_]{1,40})":/g, flight)) keyFreq[k] = (keyFreq[k] ?? 0) + 1;
  const flightKeys = Object.entries(keyFreq).sort((a, b) => b[1] - a[1]).slice(0, 120);

  // Data endpoints the page's own code calls.
  const candidates = new Set<string>();
  const hosts = new Set<string>();
  for (const src of scripts.filter((s) => s.startsWith(BASE)).slice(0, 40)) {
    const js = (await get(src, '*/*')).text;
    for (const p of all(/["'`](\/api\/[A-Za-z0-9_\-/.:?=&]{2,140})["'`]/g, js)) candidates.add(p);
    for (const p of all(/["'`](\/(?:ads|meta|leads)[A-Za-z0-9_\-/.:?=&]{0,120})["'`]/g, js)) candidates.add(p);
    for (const u of all(/(https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[A-Za-z0-9_\-/.]*)?)/g, js)) {
      if (/w3\.org|reactjs|nextjs\.org|vercel|googleapis\.com\/css|fonts\.|github\.com|mozilla|schema\.org/.test(u)) continue;
      hosts.add(u.slice(0, 140));
    }
    for (const p of all(/(\/api\/[A-Za-z0-9_\-/]*lead[A-Za-z0-9_\-/]*)/gi, js)) candidates.add(p);
  }
  for (const p of all(/["'](\/api\/[A-Za-z0-9_\-/.:?=&]{2,140})["']/g, html)) candidates.add(p);

  const probes: Record<string, unknown>[] = [];
  const toTry = [...candidates].filter((c) => /lead|meta|ads|campaign|form|insight/i.test(c) && !c.includes('${')).slice(0, 20);
  for (const c of toTry) {
    const r = await get(new URL(c, BASE).toString(), 'application/json,*/*;q=0.5');
    let body: unknown = null;
    if (/json/.test(r.type) || /^[\s]*[[{]/.test(r.text)) {
      try { body = shape(JSON.parse(r.text)); } catch { body = 'unparsable json'; }
    } else body = redact(strip(r.text)).slice(0, 300);
    probes.push({ path: c, status: r.status, type: r.type, finalUrl: r.url, bytes: r.text.length, body });
  }

  const result = {
    at: new Date().toISOString(),
    page: { status: page.status, finalUrl: page.url, type: page.type, bytes: html.length, error: (page as { error?: string }).error ?? null },
    title: strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? ''),
    headings: all(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g, html).map(strip).filter(Boolean).slice(0, 40),
    tableHeads: all(/<th[^>]*>([\s\S]*?)<\/th>/g, html).map(strip).filter(Boolean).slice(0, 60),
    buttons: all(/<button[^>]*>([\s\S]*?)<\/button>/g, html).map(strip).filter(Boolean).slice(0, 40),
    links: [...new Set(all(/href="(\/[^"]*)"/g, html))].slice(0, 60),
    scripts: scripts.slice(0, 60),
    nextData: nextShape,
    rscPayload: html.includes('self.__next_f'),
    flightBytes: flight.length,
    flightKeys,
    flightRows: rowArrays(flight),
    htmlRows: flight ? [] : rowArrays(html.replace(/<script[^>]+src=[^>]*><\/script>/g, '')),
    tableRows: (html.match(/<tr[\s>]/g) ?? []).length,
    visibleText: visible.slice(0, 6000),
    candidates: [...candidates].slice(0, 120),
    hosts: [...hosts].slice(0, 60),
    probes,
  };
  const value = JSON.stringify(result).slice(0, 240_000);
  await sb.from('app_secrets').upsert({ key: KEY, value }, { onConflict: 'key' });
  return `contentos probe: stored (page ${page.status}, ${probes.length} endpoints tried)`;
}
