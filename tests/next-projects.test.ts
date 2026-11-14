import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { buildActivation } from '../lib/overview/activation';
import { buildSnapshot, PROJECT_KEYS } from '../lib/projects/snapshot';
import { TODAY, sampleActivation } from './fixtures/activation';

/**
 * Ms Shadi (14 Nov 2026): one home per project. The nav leads with Projects and
 * one tab per project; each project page shows its own detailed figures only.
 */
function render(script: string, env: Record<string, string>): string[] {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, TSX_DISABLE_CACHE: '1', ...env }, maxBuffer: 16_000_000,
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as string[];
}

const activation = buildActivation(sampleActivation());
const snapshot = buildSnapshot({ today: TODAY, activation, orthoFunnel: null, gbp: null, tasks: [], readAt: 'x' });

test('each project page shows only its own Clinic Activation sections', () => {
  const sets = [['leads', 'revenue'], ['smile-club'], ['gbp']];
  const html = render(`
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { ActivationView } = require('./components/next/activation/ActivationView.tsx');
    const data = JSON.parse(process.env.DATA);
    process.stdout.write(JSON.stringify(JSON.parse(process.env.SETS).map((only) =>
      renderToStaticMarkup(React.createElement(ActivationView, { data, only, embedPath: '/next/projects/x' })))));
  `, { DATA: JSON.stringify(activation), SETS: JSON.stringify(sets) });
  const all = ['leads', 'smile-club', 'gbp', 'revenue', 'ortho'];
  sets.forEach((only, i) => {
    for (const id of all) assert.equal(html[i].includes(`id="${id}"`), only.includes(id), `${only.join('+')}: ${id}`);
    // Embedded: no page heading of its own, no nested <main>, and the date control stays on the project page.
    assert.ok(!html[i].includes('<main') && !html[i].includes('<h1'), only.join('+'));
    assert.ok(html[i].includes('/next/projects/x?'), only.join('+'));
  });
});

test('nav: Projects first, one tab per project, group reports in their own row; home links every project page', () => {
  const [home, group] = render(`
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { PreviewShell } = require('./components/next/PreviewShell.tsx');
    const { ProjectsView } = require('./components/next/projects/ProjectsView.tsx');
    const data = JSON.parse(process.env.SNAP);
    process.stdout.write(JSON.stringify([
      renderToStaticMarkup(React.createElement(PreviewShell, { active: 'Projects' }, React.createElement(ProjectsView, { data }))),
      renderToStaticMarkup(React.createElement(PreviewShell, { active: 'Channels' }, React.createElement('p', null, 'x'))),
    ]));
  `, { SNAP: JSON.stringify(snapshot) });
  const order = ['/next/projects"', '/next/projects/clinic-activation"', '/next/projects/ortho"', '/next/projects/gbp"', '/next/projects/smile-club"', '/next/calendar"'];
  const at = order.map((h) => home.indexOf(`href="${h}`));
  assert.ok(at.every((x, i) => x > 0 && (i === 0 || x > at[i - 1])), `nav order ${at.join(',')}`);
  assert.equal(home.split('href="/next/projects" aria-current="page"').length - 1, 2);
  assert.ok(!home.includes('aria-label="Group reports"'), 'no group row on a project page');
  assert.ok(!home.includes('href="/next/activation"') && !home.includes('href="/next/ortho"'), 'old report pages are out of the menu');
  for (const key of PROJECT_KEYS) assert.ok(home.includes(`href="/next/projects/${key}"`), key);
  assert.ok(group.includes('aria-label="Group reports"'));
  assert.ok(group.includes('href="/next/channels" aria-current="page"'));
});
