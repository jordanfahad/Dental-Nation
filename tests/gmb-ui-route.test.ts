import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test, type TestContext } from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { NextRequest, NextResponse } from 'next/server';
import { buildGmbReport } from '../lib/social/gmb-report';
import { validGmbBackfillDate } from '../lib/sync/gmb-backfill';
import { gmbDiscoveryValues } from '../lib/sync/gmb-discovery';

/** Execute actual route/view logic with isolated IO, following marketing-access. */
function load<T>(file: string, dependencies: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id: string) => {
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'next/server') return { NextRequest, NextResponse };
    if (id in dependencies) return dependencies[id];
    throw new Error(`Unmocked dependency: ${id}`);
  }, module, module.exports);
  return module.exports as T;
}
function elements(node: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...Object.values(node.props).flatMap(elements)];
}
function gate(t: TestContext) {
  for (const key of ['AUTH_SESSION_SECRET', 'DASHBOARD_PASSWORD']) {
    const old = process.env[key];
    process.env[key] = 'synthetic-test-only';
    t.after(() => { if (old == null) delete process.env[key]; else process.env[key] = old; });
  }
}

test('Business Profile component renders not connected and dashes, with branch-specific chart lines on All', () => {
  const stub = () => null;
  const KpiBand = () => null;
  const TrendChart = () => null;
  const { BusinessProfileCard } = load<{ BusinessProfileCard: (props: { report: ReturnType<typeof buildGmbReport> }) => React.ReactNode }>(
    'components/sections/gmb/BusinessProfileCard.tsx', {
      '@/components/ui/Card': { Card: stub, SectionHeader: stub }, '@/components/charts/KpiBand': { KpiBand },
      '@/components/charts/Charts': { TrendChart, ChartLegend: stub }, './GmbClinicFilter': { GmbClinicFilter: stub },
    });
  const tree = elements(BusinessProfileCard({ report: buildGmbReport([], ['dental-nation'], 'dr-tosun') }));
  assert.ok(tree.some((e) => JSON.stringify(e.props.children)?.includes('not connected yet')));
  assert.ok((tree.find((e) => e.type === KpiBand)!.props.items as { value: string }[]).every((i) => i.value === '—'));
  const all = buildGmbReport([
    { clinic: 'dental-nation', metric: 'map_views_mobile', day: '2026-01-01', value: 1 },
    { clinic: 'dr-tosun', metric: 'map_views_mobile', day: '2026-01-01', value: 2 },
  ], ['dental-nation', 'dr-tosun']);
  const chart = elements(BusinessProfileCard({ report: all })).find((e) => e.type === TrendChart)!;
  assert.deepEqual((chart.props.series as { key: string }[]).map((s) => s.key), ['dental-nation', 'dr-tosun']);
});

type Handler = (request: NextRequest) => Promise<Response>;
function backfillRoute(user: unknown, calls: string[], result = { ok: true }) {
  return load<{ POST: Handler }>('app/api/gmb/probe/route.ts', {
    '@/lib/auth/role': { currentUser: async () => user, isAdmin: async () => false },
    '@/lib/supabase/server': { getSupabaseAdmin: () => { calls.push('db'); return {}; } },
    '@/config/gmb': { resolveGmbConfig: async () => { calls.push('config'); return {}; } },
    '@/lib/sync/adapters/gmb-adapter': {},
    '@/lib/sync/gmb-backfill': { validGmbBackfillDate, backfillGmb: async (_db: unknown, _cfg: unknown, from: string) => { calls.push(from); return result; } },
    'next/cache': { revalidatePath: () => calls.push('revalidate') },
  });
}
const request = (from = '2026-01-01', origin = 'https://synthetic.invalid') => new NextRequest('https://synthetic.invalid/api/gmb/probe', {
  method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ from }),
});

test('backfill refuses anonymous, staff, viewer and unconfigured auth before database access', async (t) => {
  gate(t);
  for (const user of [null, { role: 'staff' }, { role: 'viewer' }]) {
    const calls: string[] = [];
    assert.equal((await backfillRoute(user, calls).POST(request())).status, 401);
    assert.deepEqual(calls, []);
  }
  delete process.env.AUTH_SESSION_SECRET;
  const calls: string[] = [];
  assert.equal((await backfillRoute({ role: 'admin' }, calls).POST(request())).status, 401);
  assert.deepEqual(calls, []);
});

test('admin backfill rejects cross-origin and invalid dates, runs chosen date, and surfaces partial failure', async (t) => {
  gate(t);
  const calls: string[] = [];
  const route = backfillRoute({ role: 'admin' }, calls);
  assert.equal((await route.POST(request('2026-01-01', 'https://unrelated.invalid'))).status, 403);
  assert.equal((await route.POST(request('2026-02-30'))).status, 400);
  assert.deepEqual(calls, []);
  assert.equal((await route.POST(request())).status, 200);
  assert.deepEqual(calls, ['db', 'config', '2026-01-01', 'revalidate']);
  assert.equal((await backfillRoute({ role: 'admin' }, [], { ok: false }).POST(request())).status, 502);
});

test('legacy discovery store=1 is read-only and returns only the dental-group values', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ access_token: 'unused' }));
  const db = { from: () => { throw new Error('Discovery must not write'); } };
  const { GET } = load<{ GET: Handler }>('app/api/gmb/locations/route.ts', {
    '@/lib/auth/role': { isAdmin: async () => true },
    '@/lib/supabase/server': { getSupabaseAdmin: () => db },
    '@/config/gmb': { readGmbSecrets: async () => new Map([['gmb_client_id', 'unused'], ['gmb_client_secret', 'unused'], ['gmb_refresh_token', 'unused']]) },
    '@/lib/sync/gmb-discovery': { gmbDiscoveryValues, discoverGmbLocations: async () => ({ failedAccounts: 0, accounts: [{ account: 'accounts/synthetic', locations: [
      { id: 'locations/synthetic', title: 'Dental Nation' }, { id: 'locations/unrelated', title: 'Other Business' },
    ] }] }) },
  });
  const response = await GET(new NextRequest('https://synthetic.invalid/api/gmb/locations?store=1'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.app_secrets, { gmb_location_ids: 'locations/synthetic', gmb_location_labels: 'Dental Nation', gmb_location_clinics: 'dental-nation' });
  assert.ok(!JSON.stringify(body.app_secrets).includes('unrelated'));
});
