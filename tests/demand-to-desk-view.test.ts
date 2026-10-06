import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('Demand to desk renders empty and populated HTML without exposing patient fields', () => {
  // React DOM's renderer needs ordinary React rather than the suite's react-server condition.
  const script = `
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { DemandToDeskView } = require('./components/sections/marketing/DemandToDeskView.tsx');
    const { aggregateDemandToDesk, emptyDemandInput } = require('./lib/analytics/demandToDesk.ts');
    const { fixtureReport, fixtureRange } = require('./tests/fixtures/demand-to-desk.ts');
    const outputs = [aggregateDemandToDesk(emptyDemandInput(), fixtureRange), fixtureReport()].map(report => renderToStaticMarkup(React.createElement(DemandToDeskView, { report })));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const result = spawnSync(process.execPath, ['--import', 'tsx', '-e', script], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, TSX_DISABLE_CACHE: '1' }, maxBuffer: 2_000_000 });
  assert.equal(result.status, 0, result.stderr);
  const [empty, populated] = JSON.parse(result.stdout) as string[];
  assert.match(empty, /No synced activity/); assert.match(empty, /no target set/);
  assert.match(populated, /Demand to desk/); assert.match(populated, /What we learned and what we do next/);
  assert.match(populated, /Three decisions for Mr Akbar/); assert.match(populated, /keywords<\/summary>/);
  assert.match(populated, /Below Google&#x27;s reporting floor/);
  assert.doesNotMatch(populated, /Product focus|Modelled screening rule|MVM|MTA|—/);
  assert.match(populated, /name="from"/); assert.match(populated, /value="2026-09-01"/);
  assert.doesNotMatch(populated, /PRIVATE_NAME|PRIVATE_PHONE|PRIVATE_CLINIC|DN-FIXTURE|NaN|Infinity/);
  assert.match(populated, /scope="col"/); assert.match(populated, /aria-labelledby="demand-title"/);
});
