import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as clinics from '../config/gmb-clinics';
import * as plan from '../lib/gbp/plan';
import * as emails from '../lib/performance/emails';
import { gbpFixture } from './fixtures/dn015';

function load<T>(file: string, deps: Record<string, unknown>): T {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((name: string) => {
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name in deps) return deps[name];
    throw new Error(`Unmocked module ${name}`);
  }, module, module.exports);
  return module.exports as T;
}
function textOf(node: unknown): string {
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  if (!React.isValidElement<Record<string, unknown>>(node)) return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  if (typeof node.type === 'function') return textOf((node.type as (p: unknown) => unknown)(node.props));
  return textOf(node.props.children);
}
test('GBP server view filters branch logs and renders measured/missing results and read failures', async () => {
  let fail = false;
  const component = load<{ GbpPlan: (props: { branch?: string }) => Promise<React.ReactNode> }>('components/sections/opsreport/GbpPlan.tsx', {
    'next/link': { __esModule: true, default: (p: { children: React.ReactNode }) => p.children },
    '@/config/gmb-clinics': clinics, '@/lib/auth/role': { currentUser: async () => ({ role: 'viewer' }) },
    '@/lib/gbp/reader': { readGbpPlan: async () => { if (fail) throw new Error('synthetic'); return gbpFixture(); } },
    '@/lib/gbp/plan': plan, '@/lib/performance/reader': { readPerformanceNote: async () => ({ body: '', updatedAt: null }) },
    '@/lib/performance/emails': emails, './PerformanceNote': { PerformanceNote: () => null },
  });
  const wasl = textOf(await component.GbpPlan({ branch: 'dental-nation' }));
  assert.match(wasl, /Check opening hours/); assert.match(wasl, /28/); assert.match(wasl, /On track/);
  const tosun = textOf(await component.GbpPlan({ branch: 'dr-tosun' }));
  assert.match(tosun, /Not connected yet/); assert.ok(!tosun.includes('Check opening hours'));
  assert.match(tosun, /No real entries/); assert.match(tosun, /Plan of action: to be updated/);
  fail = true; assert.match(textOf(await component.GbpPlan({})), /data could not be read/);
});
test('action note enforces authenticated owner access, length and exact text with failed-save feedback', async (t) => {
  const keys = ['AUTH_SESSION_SECRET', 'DASHBOARD_PASSWORD'];
  const previous = keys.map((k) => process.env[k]);
  keys.forEach((k) => { process.env[k] = 'synthetic-test-only'; });
  t.after(() => keys.forEach((k, i) => { if (previous[i] == null) delete process.env[k]; else process.env[k] = previous[i]; }));
  let role: string | null = null; let stored = ''; let calls = 0; let fail = false;
  const action = load<{ savePerformanceNote: (previous: { message: string }, form: FormData) => Promise<{ message: string }> }>('app/(app)/performance-actions.ts', {
    'next/cache': { revalidatePath: () => undefined }, '@/lib/auth/role': { currentUser: async () => role ? { role } : null },
    '@/lib/supabase/server': { getSupabaseAdmin: () => { calls++; return { from: () => ({ upsert: async (row: { body: string }) => { stored = row.body; return { error: fail ? {} : null }; } }) }; } },
  }).savePerformanceNote;
  const form = new FormData(); form.set('body', ' Exact owner text\nLine two. ');
  for (const r of [null, 'staff', 'viewer']) { role = r; assert.match((await action({ message: '' }, form)).message, /Only the owner/); }
  assert.equal(calls, 0); role = 'admin'; delete process.env.AUTH_SESSION_SECRET;
  assert.match((await action({ message: '' }, form)).message, /Only the owner/); assert.equal(calls, 0);
  process.env.AUTH_SESSION_SECRET = 'synthetic-test-only';
  assert.match((await action({ message: '' }, form)).message, /Saved/); assert.equal(stored, form.get('body'));
  fail = true; assert.match((await action({ message: '' }, form)).message, /could not be saved/);
  form.set('body', 'x'.repeat(6001)); assert.match((await action({ message: '' }, form)).message, /6,000/);
});
