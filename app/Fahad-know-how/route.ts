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
 */
export function GET() {
  const html = Buffer.from(KNOWHOW_HTML_B64, 'base64').toString('utf8');
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
      'x-robots-tag': 'noindex',
    },
  });
}
