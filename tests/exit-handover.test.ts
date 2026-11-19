import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { EXIT_HANDOVER, exitPendingCount } from '../config/exit-handover';

const text = JSON.stringify(EXIT_HANDOVER);

test('exit handover: no credentials, no contact details, no dashes', () => {
  assert.doesNotMatch(text, /[\w.+-]+@[\w-]+\.[\w.]+/, 'no email addresses');
  assert.doesNotMatch(text, /password\s*[:=]|token=|access=|api[_ ]?key\s*[:=]|secret\s*[:=]/i);
  assert.doesNotMatch(text, /\+?971[\s\d]{7,}|\b05\d{8}\b/, 'no phone numbers');
  assert.doesNotMatch(text, /\d{3}-\d{3}-\d{4}/, 'no ad account numbers');
  assert.doesNotMatch(text, /[–—]/);
});

test('exit handover: links are internal pages; pending items are counted', () => {
  for (const l of EXIT_HANDOVER.links) assert.match(l.href, /^\//, l.label);
  assert.ok(exitPendingCount() > 0);
});
