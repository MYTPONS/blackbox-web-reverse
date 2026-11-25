import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('summarizes redacted HAR into an endpoint inventory', () => {
  const output = execFileSync(process.execPath, ['scripts/summarize_har.mjs', 'fixtures/har/sample.json'], {
    encoding: 'utf8',
  });
  assert.match(output, /app\.example\.test/);
  assert.match(output, /api\/examples\/<number>/);
  assert.match(output, /GET/);
  assert.match(output, /application\/json/);
});
