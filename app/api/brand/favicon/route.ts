import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Brand favicon — mirrors the LIVE dentalnation.com site icon so the dashboard
 * tab always matches the website (the CEO's ask: one brand mark everywhere).
 * Fetched server-side at request time and cached at the edge for a day; if the
 * site (or its bot protection) won't serve us, we fall back to the bundled
 * tooth-and-star mark rather than a broken tab icon. Never throws.
 */

const CANDIDATES = [
  'https://dentalnation.com/favicon.ico',
  'https://www.dentalnation.com/favicon.ico',
  'https://dentalnation.com/favicon.png',
  'https://dentalnation.com/apple-touch-icon.png',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

/** Parse <link rel="…icon…" href="…"> out of the homepage as a last resort. */
async function iconFromHomepage(): Promise<string | null> {
  try {
    const res = await fetch('https://dentalnation.com', {
      headers: { 'user-agent': UA, accept: 'text/html' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const links = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi) ?? [];
    for (const tag of links) {
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (href) return new URL(href, 'https://dentalnation.com').toString();
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchIcon(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'image/*,*/*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (/text\/html/i.test(type)) return null; // an error page, not an icon
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength < 16) return null;
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': type || 'image/x-icon',
        // A day at the edge; browsers cache favicons aggressively anyway.
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  for (const url of CANDIDATES) {
    const hit = await fetchIcon(url);
    if (hit) return hit;
  }
  const discovered = await iconFromHomepage();
  if (discovered) {
    const hit = await fetchIcon(discovered);
    if (hit) return hit;
  }
  // Bundled fallback — the dashboard's own tooth-and-star mark.
  return NextResponse.redirect(new URL('/brand-icon.svg', req.url), {
    status: 307,
    headers: { 'Cache-Control': 'public, max-age=3600' },
  });
}
