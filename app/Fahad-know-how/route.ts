import { KNOWHOW_HTML_B64 } from './content';

/**
 * Fahad Know-How — a self-contained, interactive 3D map of the entire Dental
 * Nation system (Performance Report, Growth Projects, Creative Desk, Account
 * Architecture, the full deliverables repository, and Mr. Akbar's CEO view).
 *
 * Served as raw HTML (no app shell) at /Fahad-know-how. The page sits behind the
 * same auth gate as the rest of the dashboard (middleware), so the CEO opens it
 * once with the viewer link (?access=…) and then everything — including the
 * deliverable files under /reports/ — loads with the viewer session.
 *
 * Two things are injected into the packed HTML at serve time (so the map's
 * source stays untouched): a fixed breadcrumb bar back to the dashboard, and a
 * reference-library link to the interactive operating-model page nested below
 * this route — neither existed in the original map and both were unreachable
 * from here without editing the URL.
 */

const NAV_BAR = `<nav aria-label="Breadcrumb" style="position:fixed;top:12px;left:12px;z-index:9999;display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(16,34,52,.78);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:600 11.5px/1 'Inter',-apple-system,sans-serif">
<a href="/" style="color:#C9E2E1;text-decoration:none">← Dashboard</a>
<span style="color:rgba(255,255,255,.35)">/</span>
<a href="/impact" style="color:#C9E2E1;text-decoration:none">Growth Projects</a>
<span style="color:rgba(255,255,255,.35)">/</span>
<span style="color:#fff">Know-How map</span>
</nav>`;

const LIBRARY_LINK = `<div class="how" style="margin-top:10px;border-color:rgba(159,224,192,.45)">
<b>Reference library:</b> <a href="/Fahad-know-how/operating-model" style="color:#9fe0c0;font-weight:700;text-decoration:none">The operating model — how a large-scale retail business runs, flipped into dental terms (interactive) →</a>
</div>`;

// Decode + inject once at module load; every request serves the same string.
const HTML = Buffer.from(KNOWHOW_HTML_B64, 'base64')
  .toString('utf8')
  .replace('<body>', `<body>${NAV_BAR}`)
  .replace('</header>', `${LIBRARY_LINK}</header>`);

export function GET() {
  return new Response(HTML, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex',
    },
  });
}
