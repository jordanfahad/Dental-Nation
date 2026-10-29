/**
 * Shared checks for the /next pages' date range tests (tests/next-*.test.ts):
 * every proof URL in rendered markup, and whether its dates are allowed.
 */
import { strict as assert } from 'node:assert';
import type { Range } from '../../lib/alerts/links';

/** Every drawer proof URL in renderToStaticMarkup output (data-proof JSON, HTML-escaped). */
export function proofUrls(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/&quot;url&quot;:&quot;(.*?)&quot;/g)) out.push(m[1].replace(/&amp;/g, '&'));
  return out;
}

/**
 * Assert every dated proof URL is pinned (preset=custom) to one of `allowed`,
 * except URLs `ownWindow` accepts (sources that keep their own reporting
 * window). Returns the dated URLs so callers can check more.
 */
export function assertDatedUrls(html: string, allowed: Range[], ownWindow: (u: URL) => boolean = () => false): URL[] {
  const dated = proofUrls(html).map((s) => new URL(s)).filter((u) => u.searchParams.has('from') || u.searchParams.has('to'));
  assert.ok(dated.length > 0, 'expected dated proof URLs');
  for (const u of dated) {
    if (ownWindow(u)) continue;
    assert.equal(u.searchParams.get('preset'), 'custom', `${u} is not pinned`);
    const from = u.searchParams.get('from');
    const to = u.searchParams.get('to');
    assert.ok(allowed.some((r) => r.from === from && r.to === to), `${u} carries ${from}..${to}, outside the selected range windows`);
  }
  return dated;
}
