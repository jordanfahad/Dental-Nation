import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
// Import the implementation directly: next/navigation also loads client-only
// React contexts, which cannot initialise under this suite's react-server flag.
import { notFound } from 'next/dist/client/components/not-found';
import ts from 'typescript';
import * as tabs from '../components/tabs';
import * as layers from '../config/platform-layers';

type Page = (props: Record<string, unknown>) => Promise<React.ReactNode>;
const MarketingPerformance = () => null;
const RoomSectionBar = () => null;
const stubComponent = () => null;

/** Execute the actual route/component with isolated IO and child components.
 * The real tab resolver, JSX output and Next 404 exception remain in use.
 * No live credentials, report reads or view-counter writes are involved. */
function loadTsx<T>(file: string, mocks: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const dependencies: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    'next/navigation': { notFound },
    'next/link': stubComponent,
    '@/components/tabs': tabs,
    '@/config/platform-layers': layers,
    '@/components/board/design': { C: {} },
    '@/config/evidence-room': { ROOM: {} },
    '@/components/sections/opsreport/MarketingPerformance': { MarketingPerformance },
    '@/components/room/EvidenceRoom': { RoomSectionBar },
    ...mocks,
  };
  const requireMock = (id: string) => {
    if (id in dependencies) return dependencies[id];
    if (id.startsWith('@/components/')) return new Proxy({}, { get: () => stubComponent });
    throw new Error(`Unmocked dependency: ${id}`);
  };
  new Function('require', 'module', 'exports', compiled)(requireMock, module, module.exports);
  return module.exports as T;
}

function elements(node: unknown): React.ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...Object.values(node.props).flatMap(elements)];
}

test('operations extra_tabs grants render the marketing sub-tab, without granting staff or ordinary viewers', async () => {
  for (const user of [
    { role: 'viewer', extraTabs: ['operations', 'smileclub'], removedTabs: [], allowed: true },
    { role: 'viewer', extraTabs: [], removedTabs: [], allowed: false },
    { role: 'staff', extraTabs: [], removedTabs: [], allowed: false },
    { role: 'viewer', extraTabs: ['operations'], removedTabs: ['operations'], allowed: false },
    { role: 'admin', extraTabs: [], removedTabs: [], allowed: true },
  ]) {
    const { default: DashboardPage } = loadTsx<{ default: Page }>('app/(app)/page.tsx', {
      '@/lib/report': { getRangeReport: async () => ({ range: {}, source: {}, ingestion: {} }) },
      '@/lib/analytics/demandToDesk': { lastFullMonth: () => ({}) },
      '@/lib/auth/role': { currentUser: async () => user },
      '@/config/clinics': { resolveClinic: () => 'all' },
    });
    const tree = elements(await DashboardPage({ searchParams: Promise.resolve({ tab: 'operations', otab: 'marketing' }) }));
    assert.equal(tree.some((node) => node.type === MarketingPerformance), user.allowed, JSON.stringify(user));
    assert.equal(tree.some((node) => node.props.href === '?tab=operations&otab=marketing'), user.allowed);
    const publicMarketing = elements(await DashboardPage({ searchParams: Promise.resolve({ tab: 'marketing', otab: 'marketing' }) }));
    assert.equal(publicMarketing.some((node) => node.type === MarketingPerformance), false);
  }
});

test('the marketing room route returns Next 404 for both investor tiers before counting or creating report output', async () => {
  for (const link of [null, { sections: { dash: false, kpis: false } }, { sections: { dash: false, kpis: true } }]) {
    const calls: string[] = [];
    const { default: RoomMarketingPage } = loadTsx<{ default: Page }>('app/share/room/[token]/marketing/page.tsx', {
      '@/lib/board/shareLinks': {
        resolveShareToken: async (_token: string, scope: string) => { calls.push(`resolve:${scope}`); return link; },
        bumpShareView: async () => { calls.push('bump'); },
      },
    });
    await assert.rejects(
      RoomMarketingPage({ params: Promise.resolve({ token: '' }) }),
      (error: unknown) => (error as { digest?: string }).digest === 'NEXT_HTTP_ERROR_FALLBACK;404',
    );
    assert.deepEqual(calls, ['resolve:room']);
  }
});

test('the marketing room route preserves the dashboard gate semantics for internal links', async () => {
  for (const sections of [null, {}, { dash: true }]) {
    const calls: string[] = [];
    const { default: RoomMarketingPage } = loadTsx<{ default: Page }>('app/share/room/[token]/marketing/page.tsx', {
      '@/lib/board/shareLinks': {
        resolveShareToken: async (_token: string, scope: string) => { calls.push(`resolve:${scope}`); return { sections }; },
        bumpShareView: async () => { calls.push('bump'); },
      },
    });
    const tree = elements(await RoomMarketingPage({ params: Promise.resolve({ token: '' }) }));
    assert.deepEqual(calls, ['resolve:room', 'bump']);
    assert.equal(tree.filter((node) => node.type === MarketingPerformance).length, 1);
    assert.equal(tree.find((node) => node.type === RoomSectionBar)?.props.showMarketing, true);
  }
});

test('room navigation and both layer report chips hide marketing unless internal access is passed', async () => {
  const { RoomSectionBar: Bar } = loadTsx<{ RoomSectionBar: (props: Record<string, unknown>) => React.ReactNode }>('components/room/EvidenceRoom.tsx', {});
  const { LayerPage } = loadTsx<{ LayerPage: Page }>('components/room/PlatformLayers.tsx', {
    '@/lib/room/layerKpis': { getLayerVisuals: () => { throw new Error('Unexpected KPI read'); } },
  });
  for (const showMarketing of [undefined, false, true]) {
    const nav = elements(Bar({ backHref: '/room', section: 'Marketing performance', showMarketing }));
    assert.equal(nav.some((node) => node.props.href === '/room/marketing'), showMarketing === true);
    for (const slug of ['demand-brand-growth', 'patient-coordination']) {
      const layer = layers.layerBySlug(slug)!;
      const tree = elements(await LayerPage({ base: '/room', layer, showKpis: false, showMarketing }));
      assert.equal(tree.some((node) => node.props.href === '/room/marketing'), showMarketing === true, slug);
    }
  }
});

test('existing room sections pass the same dash gate to the new navigation and layer chips', async () => {
  for (const dash of [false, true]) {
    for (const section of ['growth', 'finance', 'operations', 'smileclub', 'platform', 'platform/[layer]', ...(dash ? ['dash'] : [])]) {
      const { default: PageComponent } = loadTsx<{ default: Page }>(`app/share/room/[token]/${section}/page.tsx`, {
        '@/lib/board/shareLinks': {
          resolveShareToken: async () => ({ sections: { dash, kpis: false } }),
          bumpShareView: async () => undefined,
        },
      });
      const tree = elements(await PageComponent({
        params: Promise.resolve({ token: '', layer: 'demand-brand-growth' }),
        searchParams: Promise.resolve({}),
      }));
      assert.equal(tree.find((node) => node.type === RoomSectionBar)?.props.showMarketing, dash, section);
      if (section === 'platform/[layer]') {
        const layer = tree.find((node) => node.props.layer);
        assert.equal(layer?.props.showMarketing, dash);
        assert.equal(layer?.props.showKpis, false);
      }
    }
  }
});
