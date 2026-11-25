import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('extracts route and API clues from a bundle', () => {
  const output = execFileSync(process.execPath, ['scripts/extract_endpoints.mjs', 'fixtures/bundle.js'], {
    encoding: 'utf8',
  });
  assert.match(output, /\/api\/examples/);
  assert.match(output, /\/api\/examples\/:id/);
  assert.match(output, /wss:\/\/app\.example\.test\/ws/);
  assert.match(output, /x-request-id/);
  assert.match(output, /signing/);
});
